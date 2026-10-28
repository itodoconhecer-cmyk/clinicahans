"""Smoke HTTP local: arquivos, autenticacao e protecao da API pelo gateway."""
import json
from pathlib import Path
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8090"
# O smoke deve falar diretamente com o gateway local, sem proxy corporativo.
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def request(path, payload=None, token=None):
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, headers=headers)
    try:
        with HTTP.open(req, timeout=10) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def verify():
    env_file = Path(__file__).resolve().parents[2] / ".env.localstack"
    values = {}
    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        if line.strip() and not line.lstrip().startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    status, html = request("/login/login.html")
    check(status == 200 and b"login-form" in html, "Tela de login indisponivel")
    status, config = request("/config.js")
    check(status == 200 and b"apiBaseUrl: ''" in config, "Frontend nao usa gateway na mesma origem")
    status, _ = request("/api/v1/patients?limit=1")
    check(status == 401, "API protegida deveria recusar acesso sem token")
    status, _ = request("/api/v1/auth/login", {"username": "synthetic-invalid-user", "password": "synthetic-invalid-password"})
    check(status == 401, "Login deveria recusar credenciais invalidas")
    status, body = request("/api/v1/auth/login", {
        "username": values.get("BOOTSTRAP_ADMIN_USERNAME", "admin"),
        "password": values["BOOTSTRAP_ADMIN_PASSWORD"],
    })
    check(status == 200, "Login do bootstrap falhou; usuario existente pode ter outra senha")
    token = json.loads(body)["accessToken"]
    status, _ = request("/api/v1/patients?limit=1", token=token)
    check(status == 200, "Consulta autorizada pela API falhou")
    print("OK: frontend, gateway, login, rejeicao de acesso anonimo e consulta autenticada.")


if __name__ == "__main__":
    verify()
