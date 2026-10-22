# Domain Model

Este arquivo deverá ser preenchido pelo Prompt 02 com entidades, atributos, relacionamentos e observações de domínio.

## Entidades de alto volume
- `Appointment` e `Encounter`: partições semanais por `starts_at` e `started_at`.
- `Receivable` e `Payment`: partições semanais por `created_at` e `paid_at`.
- `ExamResult`: partições semanais por `received_at`.
- `Prescription` e `PrescriptionItem`: armazenamento semanal por `issued_at`; o fluxo funcional de emissão/assinatura não está exposto pela API.
- Tabelas locator mantêm a unicidade global do UUID e a associação ao timestamp da partição. Tabelas filhas referenciam o locator; consultas por ID juntam locator e partição.
- Os limites de cada semana usam segunda-feira 00:00 no fuso `America/Sao_Paulo`. O timestamp do evento é imutável após inserção.
