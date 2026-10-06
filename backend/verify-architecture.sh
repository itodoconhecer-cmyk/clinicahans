#!/usr/bin/env bash
set -euo pipefail
base="src/main/java/br/com/clinicahans"
for dir in DTO UseCase command controller mapper model repository utilities; do
  test -d "$base/$dir" || { echo "Pacote obrigatório ausente: $dir"; exit 1; }
done
for old in admin appointment audit auth clinical continuity doctor finance management patient security waitlist exception; do
  test ! -d "$base/$old" || { echo "Pacote por feature proibido: $old"; exit 1; }
done
test -f "$base/DatabaseInitializer.java"
test -f "$base/ClinicHansApplication.java"
if find "$base" -maxdepth 2 -type f -name '*Service.java' | grep -v '/config/JwtService.java' | grep -q .; then
  echo "Service de negócio encontrado; use UseCase conforme padrão UMC"
  exit 1
fi
grep -R "public record .*Request" "$base/controller" && { echo "DTO aninhado em controller"; exit 1; } || true
echo "Arquitetura backend compatível com padrão UMC."
