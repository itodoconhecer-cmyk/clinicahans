[CmdletBinding()]
param(
    [ValidateSet('init', 'start', 'stop', 'status', 'logs', 'verify', 'provision', 'start-all', 'stop-all', 'start-app', 'stop-app', 'status-app', 'verify-app', 'start-notifications', 'stop-notifications', 'dashboard')]
    [string]$Action = 'start'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot '.env.localstack'
if ($Action -eq 'init') {
    if (Test-Path -LiteralPath $envFile) {
        Write-Output 'Configuracao existente preservada em .env.localstack.'
        return
    }
    function New-LocalSecret {
        $secretBytes = New-Object byte[] 48
        $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $generator.GetBytes($secretBytes); [Convert]::ToBase64String($secretBytes) }
        finally { $generator.Dispose() }
    }
    $content = Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot '.env.localstack.example')
    $content = $content -replace '(?m)^JWT_SECRET=[^\r\n]*', ('JWT_SECRET=' + (New-LocalSecret))
    $content = $content -replace '(?m)^BOOTSTRAP_ADMIN_PASSWORD=[^\r\n]*', ('BOOTSTRAP_ADMIN_PASSWORD=' + (New-LocalSecret))
    # CreateNew protege contra sobrescrita mesmo se outro processo criar o arquivo.
    $stream = [System.IO.File]::Open($envFile, [System.IO.FileMode]::CreateNew)
    try {
        $writer = New-Object System.IO.StreamWriter($stream, (New-Object System.Text.UTF8Encoding($false)))
        try { $writer.Write($content) } finally { $writer.Dispose() }
    } finally { $stream.Dispose() }
    Write-Output 'Criado .env.localstack com JWT e senha aleatorios. Valores nao exibidos. Preencha o token LocalStack para usar o emulador.'
    return
}
$appOnly = $Action -in @('start-app', 'stop-app', 'status-app', 'verify-app')
$composeArgs = @('-f', (Join-Path $repoRoot 'docker-compose.yml'))
if (-not $appOnly) { $composeArgs += @('-f', (Join-Path $repoRoot 'docker-compose.localstack.yml')) }
if ($appOnly -or $Action -in @('start-all', 'stop-all', 'start-notifications', 'stop-notifications')) {
    $composeArgs += @('-f', (Join-Path $repoRoot 'docker-compose.application.yml'))
}
if ($Action -in @('start-all', 'stop-all', 'start-notifications', 'stop-notifications')) {
    $composeArgs += @('-f', (Join-Path $repoRoot 'docker-compose.notifications.yml'))
}
if (Test-Path -LiteralPath $envFile) { $composeArgs += @('--env-file', $envFile) }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Instale o Docker Desktop com Docker Compose v2.' }
& docker info --format '{{.ServerVersion}}' *> $null
if ($LASTEXITCODE -ne 0) { throw 'Inicie o Docker Desktop no modo Linux containers e tente novamente.' }

switch ($Action) {
    'start' { & docker compose @composeArgs up -d --wait --wait-timeout 240 localstack }
    'stop' { & docker compose @composeArgs stop localstack }
    'status' { & docker compose @composeArgs ps localstack }
    'logs' { & docker compose @composeArgs logs --tail 100 localstack }
    'verify' { & docker compose @composeArgs exec -T localstack /opt/code/localstack/.venv/bin/python /opt/clinicahans/verify.py }
    'provision' { & docker compose @composeArgs exec -T localstack /opt/code/localstack/.venv/bin/python /etc/localstack/init/ready.d/10-clinicahans.py }
    'start-all' {
        & docker compose @composeArgs up -d --build --wait --wait-timeout 360
        if ($LASTEXITCODE -eq 0) { & docker compose @composeArgs restart backend-lb }
    }
    'stop-all' { & docker compose @composeArgs stop }
    'start-notifications' { & docker compose @composeArgs up -d --no-build --wait --wait-timeout 180 notification-worker }
    'stop-notifications' { & docker compose @composeArgs stop notification-worker }
    'dashboard' {
        if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Instale Python 3 para iniciar o painel Docker.' }
        & python (Join-Path $repoRoot 'tools/docker-dashboard/server.py')
    }
    'start-app' {
        & docker compose @composeArgs up -d --build --wait --wait-timeout 360
        if ($LASTEXITCODE -eq 0) { & docker compose @composeArgs restart backend-lb }
    }
    'stop-app' { & docker compose @composeArgs stop }
    'status-app' { & docker compose @composeArgs ps }
    'verify-app' {
        if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Instale Python 3 para executar a verificacao HTTP.' }
        & python (Join-Path $repoRoot 'infra/containers/verify-app.py')
    }
}
if ($LASTEXITCODE -ne 0) { throw "Falha na acao '$Action'. Consulte o erro acima e os logs do servico afetado." }
