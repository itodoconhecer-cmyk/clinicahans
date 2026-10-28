#!/usr/bin/env python3
"""Local-only Docker log activity dashboard for classroom demonstrations."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = int(os.environ.get("DOCKER_DASHBOARD_PORT", "8091"))
PROJECT = os.environ.get("DOCKER_DASHBOARD_PROJECT", "clinicahans")
REFRESH_SECONDS = 2
ACTIVE_SECONDS = 5

SERVICE_TYPES = {
    "frontend": "Frontend + gateway Nginx",
    "backend-lb": "Balanceador interno Nginx",
    "backend": "API / monólito Spring Boot",
    "notification-worker": "Worker de notificações Spring Boot",
    "db": "Banco relacional PostgreSQL",
    "redis": "Cache Redis",
    "localstack": "Emulador AWS: S3, SQS, DynamoDB e Scheduler",
    "mailpit": "SMTP de teste / captura de e-mails",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def command_output(args: list[str], timeout: float = 8) -> str:
    result = subprocess.run(
        args,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    return result.stdout


class DockerCollector:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._stop = threading.Event()
        self._containers: dict[str, dict[str, Any]] = {}
        self._processes: dict[str, subprocess.Popen[str]] = {}
        self._watchers: dict[str, threading.Thread] = {}
        self._events: deque[dict[str, str]] = deque(maxlen=12)
        self._total_lines = 0
        self._connected = False
        self._last_error_at: float | None = None
        self._thread = threading.Thread(target=self._run, name="docker-discovery", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        with self._lock:
            processes = list(self._processes.values())
        for process in processes:
            try:
                process.terminate()
            except OSError:
                pass
        self._thread.join(timeout=3)

    def snapshot(self) -> dict[str, Any]:
        now = time.time()
        with self._lock:
            containers = []
            for item in self._containers.values():
                last_log = item.get("lastLogEpoch")
                containers.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "service": item["service"],
                        "type": SERVICE_TYPES.get(item["service"], "Serviço Docker Compose"),
                        "image": item["image"],
                        "state": item["state"],
                        "status": item["status"],
                        "logsSinceStart": item.get("logsSinceStart", 0),
                        "lastLogAt": item.get("lastLogAt"),
                        "lampOn": last_log is not None and now - last_log < ACTIVE_SECONDS,
                    }
                )
            containers.sort(key=lambda item: (item["service"], item["name"]))
            recent_events = list(self._events)
            connected = self._connected
            total_lines = self._total_lines
            last_error_at = self._last_error_at

        return {
            "project": PROJECT,
            "connected": connected,
            "updatedAt": utc_now(),
            "totalLogLines": total_lines,
            "runningContainers": sum(1 for item in containers if item["state"] == "running"),
            "activeLamps": sum(1 for item in containers if item["lampOn"]),
            "containers": containers,
            "events": recent_events,
            "dockerUnavailable": not connected and (last_error_at is None or now - last_error_at >= 2),
        }

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                self._discover()
                with self._lock:
                    self._connected = True
                    self._last_error_at = None
            except (OSError, subprocess.SubprocessError, json.JSONDecodeError):
                with self._lock:
                    self._connected = False
                    self._last_error_at = time.time()
            self._stop.wait(REFRESH_SECONDS)

    def _discover(self) -> None:
        template = '{{.ID}}|{{.Names}}|{{.Image}}|{{.State}}|{{.Status}}|{{.Label "com.docker.compose.service"}}'
        rows = command_output(
            [
                "docker",
                "ps",
                "-a",
                "--no-trunc",
                "--filter",
                f"label=com.docker.compose.project={PROJECT}",
                "--format",
                template,
            ]
        ).splitlines()
        current: dict[str, dict[str, Any]] = {}
        for row in rows:
            fields = row.split("|", 5)
            if len(fields) != 6:
                continue
            container_id, name, image, state, status, service = fields
            if not container_id or not name:
                continue
            current[container_id] = {
                "id": container_id,
                "name": name,
                "service": service,
                "image": image or "imagem indisponível",
                "state": state,
                "status": self._status_text(status, state),
            }

        with self._lock:
            for container_id, item in current.items():
                previous = self._containers.get(container_id, {})
                item["logsSinceStart"] = previous.get("logsSinceStart", 0)
                item["lastLogAt"] = previous.get("lastLogAt")
                item["lastLogEpoch"] = previous.get("lastLogEpoch")
            self._containers = current

        for container_id, item in current.items():
            if item["state"] == "running":
                with self._lock:
                    watcher = self._watchers.get(container_id)
                    if watcher is None or not watcher.is_alive():
                        watcher = threading.Thread(
                            target=self._follow_logs,
                            args=(container_id,),
                            name=f"docker-logs-{container_id}",
                            daemon=True,
                        )
                        self._watchers[container_id] = watcher
                        watcher.start()

    @staticmethod
    def _status_text(status: str, state: str) -> str:
        if state == "running" and "(healthy)" in status:
            return "Rodando · health saudável"
        if state == "running" and "(unhealthy)" in status:
            return "Rodando · health com falha"
        return {
            "running": "Rodando",
            "exited": "Parado",
            "created": "Criado",
            "restarting": "Reiniciando",
            "paused": "Pausado",
            "dead": "Falha",
        }.get(state, state.capitalize())

    def _follow_logs(self, container_id: str) -> None:
        process: subprocess.Popen[str] | None = None
        try:
            if self._stop.is_set():
                return
            process = subprocess.Popen(
                ["docker", "logs", "--follow", "--tail", "0", "--timestamps", container_id],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            with self._lock:
                self._processes[container_id] = process
            if self._stop.is_set():
                process.terminate()
            assert process.stdout is not None
            for line in process.stdout:
                if self._stop.is_set():
                    break
                if line:
                    self._record_log(container_id)
        except (OSError, subprocess.SubprocessError):
            pass
        finally:
            if process is not None:
                if process.poll() is None:
                    try:
                        process.terminate()
                    except OSError:
                        pass
                try:
                    process.wait(timeout=1)
                except (subprocess.TimeoutExpired, OSError):
                    try:
                        process.kill()
                    except OSError:
                        pass
                with self._lock:
                    if self._processes.get(container_id) is process:
                        self._processes.pop(container_id, None)

    def _record_log(self, container_id: str) -> None:
        epoch = time.time()
        with self._lock:
            item = self._containers.get(container_id)
            if item is None:
                return
            item["logsSinceStart"] = item.get("logsSinceStart", 0) + 1
            item["lastLogEpoch"] = epoch
            item["lastLogAt"] = utc_now()
            self._total_lines += 1
            self._events.appendleft(
                {
                    "id": f"{container_id}-{self._total_lines}",
                    "container": item["name"],
                    "service": item["service"],
                    "type": SERVICE_TYPES.get(item["service"], "Serviço Docker Compose"),
                    "occurredAt": item["lastLogAt"],
                }
            )


collector = DockerCollector()


class DashboardHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "ClínicaHansDashboard/1.0"
    sys_version = ""

    def _allowed_origin(self) -> bool:
        host = self.headers.get("Host", "").lower()
        if host not in {f"localhost:{PORT}", f"127.0.0.1:{PORT}"}:
            return False
        origin = self.headers.get("Origin")
        return origin is None or origin in {f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}"}

    def _headers(self, content_type: str, length: int | None = None) -> None:
        self.send_header("Content-Type", content_type)
        if length is not None:
            self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'")

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        if not self._allowed_origin():
            self.send_error(403)
            return
        if self.path == "/api/snapshot":
            self._json(collector.snapshot())
            return

        assets = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/index.html": ("index.html", "text/html; charset=utf-8"),
            "/styles.css": ("styles.css", "text/css; charset=utf-8"),
            "/app.js": ("app.js", "text/javascript; charset=utf-8"),
        }
        asset = assets.get(self.path)
        if asset is None:
            self.send_error(404)
            return
        content = (ROOT / asset[0]).read_bytes()
        self.send_response(200)
        self._headers(asset[1], len(content))
        self.end_headers()
        self.wfile.write(content)

    def _json(self, value: dict[str, Any]) -> None:
        body = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(200)
        self._headers("application/json; charset=utf-8", len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format: str, *_args: Any) -> None:
        # The UI's own HTTP access log is intentionally quiet; Docker activity is the signal.
        return


def main() -> int:
    try:
        server = ThreadingHTTPServer((HOST, PORT), DashboardHandler)
    except OSError as exc:
        print(f"Não foi possível abrir o painel em http://localhost:{PORT}: {exc}", file=sys.stderr)
        return 1

    server.daemon_threads = True
    collector.start()
    print(f"Painel Docker da Clínica Hans: http://localhost:{PORT}")
    print(f"Observando containers Compose do projeto '{PROJECT}'. Ctrl+C encerra o painel.")
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("\nEncerrando painel e leitores de log.")
    finally:
        server.server_close()
        collector.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
