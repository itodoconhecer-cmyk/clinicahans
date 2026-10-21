$ErrorActionPreference = 'Stop'

$containerRunning = docker inspect --format '{{.State.Running}}' clinicahans-db
if ($LASTEXITCODE -ne 0 -or $containerRunning.Trim() -ne 'true') {
  throw 'Inicie primeiro o PostgreSQL com: docker compose up -d --wait db'
}

$databaseExists = docker exec clinicahans-db psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'clinicahans_e2e'"
if ($LASTEXITCODE -ne 0) {
  throw 'Não foi possível consultar o PostgreSQL do ambiente local.'
}

if (($databaseExists -join '').Trim() -ne '1') {
  docker exec clinicahans-db createdb -U postgres clinicahans_e2e
  if ($LASTEXITCODE -ne 0) {
    throw 'Não foi possível criar o banco isolado clinicahans_e2e.'
  }
}

Write-Host 'Banco clinicahans_e2e pronto. Nenhuma base existente foi removida ou reinicializada.'
