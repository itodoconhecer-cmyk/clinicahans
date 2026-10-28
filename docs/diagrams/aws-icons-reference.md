# Referência visual AWS e nomenclatura local

O arquivo [system-architecture.drawio](system-architecture.drawio) usa ícones nativos da biblioteca **AWS4 do draw.io**, seguindo o padrão de ícones por serviço, cores e agrupamentos apresentado pelo **AWS Shape Pack do Miro**. Não foi criado ou alterado um board Miro.

## Referências consultadas

- [Miro — guia de ícones AWS e AWS Shape Pack](https://miro.com/diagramming/aws-icons/).
- [Miro — AWS Architecture Diagram Template](https://miro.com/templates/aws-architecture-diagram/).
- [AWS — Architecture Icons](https://aws.amazon.com/architecture/icons/).
- [draw.io — AWS architecture diagrams](https://www.drawio.com/docs/diagram-types/aws-diagrams/).
- [AWS Samples — catálogo AWS4 para draw.io](https://github.com/aws-samples/sample-drawio-mcp/blob/develop/mcp/src/catalogs/aws4.json).

Os nomes dos símbolos utilizados foram conferidos nas paletas `Sidebar-AWS4.js` e `Sidebar-AWS4b.js` do draw.io instalado. Os ícones são objetos vetoriais nativos (`mxgraph.aws4.*`), não imagens remotas. Blocos, textos, ícones e conectores continuam editáveis.

## Regra para os nomes

As abas locais mantêm os nomes do Docker e do LocalStack como identificação principal. O nome do serviço AWS aparece como **tipo**, sem substituir o nome real do recurso.

| Nome no diagrama | Tipo real | Referência visual |
|---|---|---|
| `clinicahans-frontend-1` | Container Nginx: frontend/gateway | Símbolo genérico de container |
| `clinicahans-backend-lb-1` | Container Nginx: balanceador HTTP | Símbolo AWS de balanceamento, com tipo Nginx explícito |
| `clinicahans-backend-1` | Container Java/Spring Boot: API | Símbolo genérico de container |
| `clinicahans-notification-worker-1` | Container do mesmo monólito: worker | Símbolo genérico de container |
| `clinicahans-db` | Container PostgreSQL | Símbolo genérico de banco |
| `clinicahans-redis-1` | Container Redis | Símbolo genérico de banco/cache, integração pendente |
| `clinicahans-mailpit-1` | Container de captura SMTP | Símbolo genérico de notificação por e-mail |
| `clinicahans-localstack-1` | Container emulador de APIs AWS | Símbolo de nuvem AWS, identificado como emulação |
| `clinicahans-exames-local` | S3 Bucket emulado | Amazon S3 |
| `clinicahans-receitas-local` | DynamoDB Table emulada | Amazon DynamoDB |
| `clinicahans-jobs`, `clinicahans-notificacoes` | SQS Standard Queues emuladas | Amazon SQS |
| `clinicahans-jobs-dlq`, `clinicahans-notificacoes-dlq` | Filas SQS com função de DLQ | Símbolo de fila, com destaque para falhas |
| `clinicahans-exames-prontos-12h` | EventBridge Scheduler Schedule | EventBridge Scheduler |
| `default` | Scheduler Schedule Group | Símbolo de evento temporal |
| `clinicahans-scheduler-local` | IAM Role | IAM Role |
| `send-exam-check-job`, `send-scheduler-dlq` | IAM Inline Policies | IAM Policy |
| `STS` | Serviço STS, sem recurso persistente nomeado | AWS STS |

Na aba **AWS prevista**, EC2, ALB, RDS, ElastiCache, ECR, Secrets Manager, CloudWatch, NAT e SES recebem os ícones AWS correspondentes. Os nomes locais são referências de correspondência; os nomes definitivos de implantação vêm do Terraform. Essa aba não representa recursos AWS já implantados.

Na aba de software, as classes permanecem identificadas pelos nomes de código, dentro dos processos `clinicahans-backend-1` e `clinicahans-notification-worker-1`. Na aba do fluxo, os passos são ações do processo; containers, filas, bucket e agendamento são identificados pelos nomes locais.

## Atualização reproduzível

```powershell
python scripts/style-drawio-aws.py
```

O script atualiza estilos, ícones e os rótulos de correspondência, preservando coordenadas e conexões. Não altera configurações Docker, recursos LocalStack ou infraestrutura AWS. O resultado foi validado estruturalmente: XML, IDs, conectores, posição dos ícones e presença dos nomes locais. A renderização no aplicativo não foi conferida automaticamente nesta atualização.

Para ver recursos e portas: [inventário local](localstack-inventory.md).
