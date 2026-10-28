[CmdletBinding()]
param(
    [ValidateSet('start', 'stop', 'status', 'logs', 'verify', 'provision', 'start-all', 'stop-all')]
    [string]$Action = 'start'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$composeArgs = @('-f', (Join-Path $repoRoot 'docker-compose.yml'),
                 '-f', (Join-Path $repoRoot 'docker-compose.localstack.yml'))
if ($Action -in @('start-all', 'stop-all')) {
    $composeArgs += @('-f', (Join-Path $repoRoot 'docker-compose.application.yml'))
}
$envFile = Join-Path $repoRoot '.env.localstack'
if (Test-Path -LiteralPath $envFile) { $composeArgs += @('--env-file', $envFile) }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Instale o Docker Desktop com Docker Compose v2.' }
& docker info --format '{{.ServerVersion}}' *> $null
if ($LASTEXITCODE -ne 0) { throw 'Inicie o Docker Desktop no modo Linux containers e tente novamente.' }

switch ($Action) {
    'start' { & docker compose @composeArgs up -d --wait --wait-timeout 240 localstack }
    'stop' { & docker compose @composeArgs stop localstack }
    'status' { & docker compose @composeArgs ps localstack }
    'logs' { & docker compose @composeArgs logs --tail 100 localstack }
    'verify' { & docker compose @composeArgs exec -T localstack python /opt/clinicahans/verify.py }
    'provision' { & docker compose @composeArgs exec -T localstack python /etc/localstack/init/ready.d/10-clinicahans.py }
    'start-all' { & docker compose @composeArgs up -d --build --wait --wait-timeout 360 }
    'stop-all' { & docker compose @composeArgs stop }
}
if ($LASTEXITCODE -ne 0) { throw "Falha na acao '$Action'. Consulte os logs do LocalStack." }
