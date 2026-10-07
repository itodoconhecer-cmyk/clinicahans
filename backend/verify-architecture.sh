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
for domain in patient workforce scheduling clinical continuity billing identity; do
  test -d "$base/model/$domain" || { echo "Subpacote de domínio ausente: model/$domain"; exit 1; }
done
test -d "$base/model/valueObjects" || { echo "Pacote compartilhado model/valueObjects ausente."; exit 1; }
if find "$base/model" -mindepth 1 -maxdepth 1 -type f -name '*.java' | grep -q .; then
  echo "Tipos de domínio devem ficar em subpacotes de model; valueObjects permanece compartilhado."
  exit 1
fi
for type in \
  scheduling/Appointment scheduling/AppointmentStatus patient/Patient workforce/Doctor workforce/Specialty \
  scheduling/ScheduleBlock scheduling/Availability scheduling/WaitlistEntry identity/UserAccount \
  clinical/Encounter clinical/Addendum clinical/ClinicalDocument clinical/Alert clinical/Allergy \
  clinical/Medication clinical/Condition continuity/ExamOrder continuity/ExamResult continuity/FollowUp \
  billing/Receivable billing/Payment; do
  test -f "$base/model/$type.java" || { echo "Modelo de domínio ausente: model/$type.java"; exit 1; }
done
test -f "$base/DTO/LoginResult.java" || { echo "DTO/LoginResult.java deve permanecer como DTO independente."; exit 1; }
for type in Appointment Patient Doctor Specialty ScheduleBlock Availability WaitlistEntry UserAccount Encounter Addendum ClinicalDocument Alert Allergy Medication Condition ExamOrder ExamResult FollowUp Receivable Payment; do
  if grep -R -E "record[[:space:]]+$type[[:space:]]*\\(" "$base/repository" >/dev/null; then
    echo "Modelo de domínio $type não pode estar aninhado em repository."
    exit 1
  fi
done
if find "$base" -maxdepth 2 -type f -name '*Service.java' | grep -v '/config/JwtService.java' | grep -q .; then
  echo "Service de negócio encontrado; use UseCase conforme padrão UMC"
  exit 1
fi
grep -R "public record .*Request" "$base/controller" && { echo "DTO aninhado em controller"; exit 1; } || true
if grep -R -E 'UseCase[[:space:]]+(service|useCase)\b' "$base/controller" >/dev/null; then
  echo "Controllers devem nomear suas dependências com o UseCase específico, não service/useCase genérico."
  exit 1
fi
echo "Arquitetura backend compatível com padrão UMC."
