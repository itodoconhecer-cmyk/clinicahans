# Inventário local — Clínica Hans

Nomes, tipos, imagens e portas consultados no Docker e nas APIs do LocalStack em **28/10/2026**. Os recursos aqui descritos são locais. A topologia AWS real está preparada em Terraform, sem implantação.

Abra o [arquivo editável do draw.io](system-architecture.drawio). Ele contém cinco abas:

1. **Docker local:** os oito containers, comunicação e volumes.
2. **Recursos LocalStack:** nomes e tipos dos recursos AWS emulados.
3. **Software:** frontend, API, serviços internos, repositories e worker.
4. **Fluxo dos exames:** recebimento, job de 12 horas, validação, envio e falhas.
5. **AWS prevista:** alocação futura em EC2, ALB, RDS e serviços gerenciados.

Todos os blocos, textos e conectores são objetos editáveis; o arquivo não contém imagens de diagramas achatados. Para abrir: draw.io Desktop → **Arquivo → Abrir**; ou diagrams.net → **Abrir diagrama existente → Dispositivo**.

O draw.io usa ícones vetoriais nativos AWS, com referência no AWS Shape Pack do Miro. Os nomes locais permanecem nos rótulos e os tipos reais continuam explícitos. Consulte a [referência visual e correspondência dos ícones](aws-icons-reference.md).

## Containers exibidos no Docker Desktop

Projeto Docker Compose: `clinicahans`. Rede compartilhada: `clinicahans_default`, tipo **bridge**.

| Serviço Compose | Nome real do container | Tipo / função | Imagem | Portas |
|---|---|---|---|---|
| `frontend` | `clinicahans-frontend-1` | Servidor de arquivos do frontend e gateway HTTP Nginx | `clinicahans-frontend` | Host `127.0.0.1:8090` → container `80` |
| `backend-lb` | `clinicahans-backend-lb-1` | Balanceador HTTP Nginx para a API | `nginx:1.28-alpine` | Listener interno `8080`; sem publicação no host |
| `backend` | `clinicahans-backend-1` | API REST, Java 25 / Spring Boot | `clinicahans-backend:local` | Interna `8080`; sem publicação no host |
| `notification-worker` | `clinicahans-notification-worker-1` | Consumidor de jobs, publicador da outbox e envio de avisos | `clinicahans-backend:local` | HTTP interno `8080`; sem publicação no host |
| `db` | `clinicahans-db` | Banco relacional PostgreSQL 16 | `postgres:16-alpine` | Host `5433` → container `5432` |
| `redis` | `clinicahans-redis-1` | Cache Redis, integração de aplicação pendente | `redis:7.4-alpine` | Interna `6379`; sem publicação no host |
| `localstack` | `clinicahans-localstack-1` | Emulador de APIs AWS | `localstack/localstack:2026.10.0` | Host `127.0.0.1:4566` → container `4566` |
| `mailpit` | `clinicahans-mailpit-1` | Captura local de e-mail SMTP | `axllent/mailpit:v1.27` | SMTP interno `1025`; painel host `127.0.0.1:8025` → container `8025` |

No `backend-lb`, a imagem Nginx declara `EXPOSE 80`, mas a configuração do projeto faz o servidor **escutar em 8080**. A coluna de portas do Docker pode mostrar o metadado da imagem; o listener é definido em `infra/containers/backend-lb.conf`.

A API e o worker usam a mesma imagem em processos separados. O navegador executa o JavaScript servido pelo frontend. PostgreSQL, Redis, Nginx e Mailpit executam como containers próprios; as APIs AWS abaixo são emuladas dentro do container `localstack`.

## Serviços habilitados no LocalStack

| Identificador em `SERVICES` | Tipo de serviço | Uso no projeto |
|---|---|---|
| `s3` | Amazon Simple Storage Service | Objetos/arquivos de exames; o worker usa `HeadObject` |
| `sqs` | Amazon Simple Queue Service | Filas de jobs, avisos e respectivas DLQs |
| `dynamodb` | Amazon DynamoDB | Tabela NoSQL preparada para receitas; integração clínica pendente |
| `scheduler` | Amazon EventBridge Scheduler | Job das 00h e 12h de São Paulo |
| `iam` | AWS Identity and Access Management | Role e políticas do Scheduler |
| `sts` | AWS Security Token Service | `AssumeRole` usado pelo Scheduler antes de enviar ao SQS |

Região: **`us-east-1`**. Conta de teste: **`000000000000`**.

Endpoint pelo host: `http://localhost:4566`. Endpoint entre containers: `http://localstack:4566`.

## Recursos nomeados dentro do LocalStack

| Nome exato | Tipo | Configuração / finalidade |
|---|---|---|
| `clinicahans-exames-local` | **S3 Bucket** | Arquivos de exames; bloqueio de acesso público, versionamento e criptografia AES256 |
| `clinicahans-receitas-local` | **DynamoDB Table** | Chave `pk`: string/HASH; `sk`: string/RANGE; capacidade `PAY_PER_REQUEST`; integração pendente |
| `clinicahans-jobs` | **SQS Standard Queue** | Recebe `CHECK_READY_EXAMS`, versão 1; visibilidade 300 segundos e retenção de 4 dias |
| `clinicahans-jobs-dlq` | **SQS Standard Queue / Dead-Letter Queue** | Falhas da fila de jobs e de entrega do Scheduler; retenção de 14 dias |
| `clinicahans-notificacoes` | **SQS Standard Queue** | Recebe `EXAM_READY_EMAIL`, versão 1 e UUID da intenção; visibilidade 300 segundos e retenção de 4 dias |
| `clinicahans-notificacoes-dlq` | **SQS Standard Queue / Dead-Letter Queue** | Falhas persistentes no processamento de avisos; retenção de 14 dias |
| `default` | **EventBridge Scheduler Schedule Group** | Grupo do agendamento de exames |
| `clinicahans-exames-prontos-12h` | **EventBridge Scheduler Schedule** | `cron(0 0,12 * * ? *)`, fuso `America/Sao_Paulo`, estado `ENABLED`; destino: `clinicahans-jobs` |
| `clinicahans-scheduler-local` | **IAM Role** | Trust para `scheduler.amazonaws.com`; assumida via STS |
| `send-exam-check-job` | **IAM Inline Policy**, vinculada à role | Autoriza `sqs:SendMessage` na fila `clinicahans-jobs` |
| `send-scheduler-dlq` | **IAM Inline Policy**, vinculada à role | Autoriza `sqs:SendMessage` na fila `clinicahans-jobs-dlq` |

STS é um serviço usado durante a execução; não há um recurso persistente nomeado do STS no projeto. As filas principais têm `maxReceiveCount=5`, depois do qual uma mensagem não concluída pode ir à DLQ. As DLQs são filas SQS, com função de receber falhas.

O Scheduler publica somente `{"type":"CHECK_READY_EXAMS","schemaVersion":1}`. Sua entrega usa até três tentativas e idade máxima de uma hora. A role possui duas políticas inline; elas não são containers nem políticas IAM independentes do tipo managed policy.

## Identificadores para localizar os recursos

| Recurso | Identificador |
|---|---|
| Bucket | `s3://clinicahans-exames-local` |
| Tabela DynamoDB | `clinicahans-receitas-local` |
| ARN da fila de jobs | `arn:aws:sqs:us-east-1:000000000000:clinicahans-jobs` |
| ARN da DLQ de jobs | `arn:aws:sqs:us-east-1:000000000000:clinicahans-jobs-dlq` |
| ARN da fila de avisos | `arn:aws:sqs:us-east-1:000000000000:clinicahans-notificacoes` |
| ARN da DLQ de avisos | `arn:aws:sqs:us-east-1:000000000000:clinicahans-notificacoes-dlq` |
| ARN do grupo do Scheduler | `arn:aws:scheduler:us-east-1:000000000000:schedule-group/default` |
| ARN do agendamento | `arn:aws:scheduler:us-east-1:000000000000:schedule/default/clinicahans-exames-prontos-12h` |
| ARN da role | `arn:aws:iam::000000000000:role/clinicahans-scheduler-local` |

URL canônica retornada pela API SQS neste ambiente:

```text
http://localhost:4566/queue/us-east-1/000000000000/<nome-da-fila>
```

Entre containers, substituir o hostname por `localstack`. Aplicação e worker devem usar o endpoint interno, enquanto ferramentas no host usam `localhost`.

## Volumes e arquivos montados

| Nome / origem | Tipo | Destino | Função |
|---|---|---|---|
| `clinicahans_clinicahans_pgdata` | Docker named volume | `/var/lib/postgresql/data` em `clinicahans-db` | Persistência do PostgreSQL |
| `clinicahans_clinicahans_localstack_data` | Docker named volume | `/var/lib/localstack` | Persistência dos recursos/dados emulados |
| `infra/localstack/ready.d` | Bind mount, somente leitura | `/etc/localstack/init/ready.d` | Hook de provisionamento automático |
| `infra/localstack/verify.py` | Bind mount, somente leitura | `/opt/clinicahans/verify.py` | Verificações de storage, fila e agendamento |

As credenciais e o token de ativação ficam no `.env.localstack`, ignorado pelo Git; nenhum segredo foi incluído no diagrama ou neste inventário.

Referências do projeto: [guia de arquitetura](system-architecture.md), [infraestrutura](../../infra/README.md), [bootstrap LocalStack](../../infra/localstack/ready.d/10-clinicahans.py) e [fluxo dos avisos](../specs/exam-ready-notifications.md).
