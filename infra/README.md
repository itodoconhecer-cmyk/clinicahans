# Alocação da infraestrutura — Clínica Hans

Dois destinos: containers locais para executar a aplicação com serviços AWS emulados; Terraform para alocar a topologia AWS real. Os arquivos não foram aplicados em uma conta AWS.

Veja os [diagramas de infraestrutura, software e sequência, com os passos de funcionamento](../docs/diagrams/system-architecture.md).

Também disponíveis em [draw.io editável](../docs/diagrams/system-architecture.drawio), com [inventário dos containers e recursos LocalStack](../docs/diagrams/localstack-inventory.md).

## Mapa de alocação

| Elemento | Ambiente local | AWS |
|---|---|---|
| Frontend HTML/CSS/JS | Container Nginx, porta 8090 | EC2 privadas em ASG, 2 a 4 instâncias |
| Gateway | Nginx do frontend, proxy `/api/`, limite por IP | Mesmo Nginx nas EC2 web; TLS no ALB público |
| Balanceamento externo | Porta local do frontend | ALB público em duas zonas, HTTPS e redirecionamento HTTP |
| Balanceamento da API | Nginx `backend-lb` | ALB interno em duas zonas |
| Backend Spring Boot | Container Java 25 | EC2 privadas em ASG; inicialmente 0, depois 1 para inicialização e 2 a 6 para escala |
| Workers | Container `notification-worker`, mesma imagem do backend | EC2/ASG com modo worker explícito; capacidade inicial zero |
| Redis | Container com 256 MB, cache descartável | ElastiCache Redis, primário e réplica, TLS e failover |
| PostgreSQL | Container PostgreSQL 16 e volume existente | RDS PostgreSQL 16 Multi-AZ, armazenamento criptografado e backup |
| Receitas NoSQL | DynamoDB no LocalStack | DynamoDB sob demanda, PITR e proteção contra exclusão |
| Exames | S3 no LocalStack | S3 privado, versionado e criptografado |
| Mensageria | SQS + duas DLQs no LocalStack | SQS de jobs e notificações, DLQ para cada fila |
| Job a cada 12h | Scheduler no LocalStack | EventBridge Scheduler às 00h e 12h de São Paulo |
| E-mail | Worker envia ao Mailpit; painel na porta 8025 | SMTP/TLS configurável, incluindo SES com credenciais próprias |
| Segredos | `.env.localstack`, fora do Git | Secrets Manager, acesso por IAM role das EC2 |
| Logs e alertas | Docker logs e logs Spring | CloudWatch por grupo e alarmes de DLQ |
| Rede e administração | Rede Compose, portas de apoio internas | VPC em duas zonas, sub-redes públicas/app/dados, NAT por zona e SSM; sem SSH público |
| Imagens | Build Docker local | ECR para frontend, backend e futuro worker |

```mermaid
flowchart TB
    U[Navegador] -->|HTTPS| ALB[ALB público: duas zonas]
    subgraph VPC[VPC AWS]
        subgraph APP[Sub-redes privadas de aplicação: duas zonas]
            WEB[EC2 Auto Scaling: frontend + gateway Nginx]
            ILB[ALB interno]
            API[EC2 Auto Scaling: monólito Spring Boot]
            W[EC2 Auto Scaling: modo worker do monólito]
            WEB -->|REST /api/v1| ILB --> API
        end
        subgraph DATA[Sub-redes privadas de dados]
            PG[(RDS PostgreSQL Multi-AZ)]
            R[(ElastiCache Redis + réplica)]
        end
        API --> PG
        API -. Integração pendente .-> R
        W --> PG
    end
    ALB --> WEB
    CRON[Scheduler: 00h e 12h] --> J[SQS jobs + DLQ]
    J --> W
    W --> N[SQS notificações + DLQ]
    N --> W
    W --> SES[SMTP: e-mails para paciente e médico]
    W -->|Verificar existência do arquivo| S3
    API -.-> S3[(S3: exames)]
    API -.-> DDB[(DynamoDB: proposta para receitas)]
    SEC[Secrets Manager] -.-> API
    OBS[CloudWatch: logs e alarmes] -.-> API
```

Linhas pontilhadas indicam integrações que a infraestrutura prepara, mas o código atual ainda não implementa. Redis atua ao lado da aplicação; as requisições HTTP não passam pela fila. EC2 é capacidade computacional real na AWS; localmente containers executam a aplicação, sem fingir que instâncias EC2 emuladas executariam seus servidores.

## Subir tudo localmente

Para preparar a configuração sem expor senhas no terminal:

```powershell
.\scripts\localstack.ps1 init
.\scripts\localstack.ps1 start-app
.\scripts\localstack.ps1 verify-app
```

`init` cria `.env.localstack` com JWT e senha inicial aleatórios e não sobrescreve um arquivo existente. O usuário inicial e a senha podem ser consultados nesse arquivo local ignorado pelo Git. Preserve a senha PostgreSQL de volumes já existentes. `start-app` sobe banco, backend, balanceador, frontend, Redis e Mailpit sem depender de token LocalStack. `verify-app` requer Python 3 e testa por HTTP a tela de login, configuração da API na mesma origem, rejeição de credenciais inválidas e acesso autenticado. O smoke lê a senha local sem imprimi-la; se o usuário já existia, o bootstrap não troca sua senha e o teste exige as credenciais originais. `status-app` e `stop-app` consultam e param esse conjunto.

Para incluir LocalStack e o worker, preencha o token e use `start-all` e `verify` conforme abaixo. `start-app` não executa Scheduler, SQS, S3, DynamoDB ou worker; esses serviços continuam pendentes quando não houver token.

Requisitos e ativação: [guia LocalStack](localstack/README.md). Na raiz:

```powershell
Copy-Item .env.localstack.example .env.localstack
# Edite o arquivo: token LocalStack, JWT_SECRET de pelo menos 32 caracteres
# e senha inicial do administrador. Preserve a senha do PostgreSQL existente.
.\scripts\localstack.ps1 start-all
.\scripts\localstack.ps1 verify
```

Aplicação: `http://localhost:8090/login/login.html`. E-mails capturados pelo Mailpit: `http://localhost:8025`. `start-all` inclui `docker-compose.notifications.yml` e sobe oito serviços, com entrega de e-mails restrita ao Mailpit. O worker usa a imagem `clinicahans-backend:local`, também usada pela API (substituível por `CLINICAHANS_BACKEND_IMAGE`). Banco usa a porta configurada no Compose original/`POSTGRES_PORT`; nenhum volume existente é removido. `stop-all` para todos sem apagar volumes. LocalStack pode ser usado sozinho com `start`. Após construir/iniciar a API atualizada, `start-notifications`/`stop-notifications` controlam apenas o worker.

Resultados novos recebidos pela API geram duas intenções na outbox V013, mas não enviam imediatamente. O job das 00h/12h libera as intenções; o worker verifica endereço ativo e existência do objeto no S3 antes de enviar. Resultados históricos não são notificados automaticamente. O formulário atual registra a chave do objeto; não faz upload real. Enquanto o arquivo não existir no bucket, o aviso fica bloqueado. [Contrato e regras do fluxo](../docs/specs/exam-ready-notifications.md).

Frontend e backend são construídos dos fontes atuais. A imagem web configura a API na mesma origem; não altera `frontend/config.js` no repositório. Somente o gateway publica a aplicação; o backend fica na rede interna. Perfil de demonstração desabilitado. JWT e permissões continuam validados pelo Spring; o Nginx limita requisições e encaminha a API.

Execute a primeira inicialização com um backend; o worker só inicia após a API saudável. Depois de verificar migrations e bootstrap, a alocação local pode crescer com `docker compose --env-file .env.localstack -f docker-compose.yml -f docker-compose.localstack.yml -f docker-compose.application.yml -f docker-compose.notifications.yml up -d --scale backend=2`. Em atualizações com migrations novas, parar o worker e retornar a uma API antes de atualizar, retomando o worker após a migração. O runner atual não possui lock distribuído. Aumentar réplicas requer verificar tarefas agendadas e orçamento total de conexões.

### Painel didÃ¡tico das luzes Docker

Para demonstrar a atividade em uma pÃ¡gina separada da clÃ­nica, mantenha a aplicaÃ§Ã£o em execuÃ§Ã£o e abra outro terminal:

```powershell
.\scripts\localstack.ps1 dashboard
```

Acesse `http://localhost:8091`. O painel observa os containers do projeto Compose `clinicahans`; cada card mostra o nome real, a imagem e o tipo do serviÃ§o. O estado indica se o container estÃ¡ rodando; a lÃ¢mpada fica acesa por cinco segundos apÃ³s uma nova linha no Docker logs. Frontend/gateway, balanceador interno e API registram apenas mÃ©todo, status, duraÃ§Ã£o e correlaÃ§Ã£o, sem URL nem dados da requisiÃ§Ã£o, para que o acesso real ilumine essas etapas. O coletor usa o CLI do Docker no host, vincula o servidor somente a `127.0.0.1`, e nÃ£o mostra o texto das linhas. Encerre com `Ctrl+C`. Detalhes e limites: [Painel Docker](../tools/docker-dashboard/README.md).

## Preparar AWS sem criar recursos

Requisitos: Terraform >= 1.9, credenciais AWS apropriadas para o ambiente, domínio e certificado ACM regional validado. O Terraform não usa LocalStack; este diretório aponta para AWS real.

```powershell
Copy-Item infra/aws/terraform.tfvars.example infra/aws/terraform.tfvars
# Ajuste ARNs, domínio, região e referências das imagens.
terraform -chdir=infra/aws init
terraform -chdir=infra/aws fmt -check
terraform -chdir=infra/aws validate
terraform -chdir=infra/aws plan -out=allocation.tfplan
```

O `plan` consulta AWS e produz a proposta concreta de alocação; não cria recursos. Aplicar o plano cria recursos pagos, incluindo dois NAT Gateways, dois ALBs, EC2, RDS Multi-AZ e ElastiCache. Nenhum `apply` foi executado por esta entrega.

### Sequência de implantação

1. Criar previamente no Secrets Manager um secret JSON com `JWT_SECRET` (32+ caracteres), `DB_USER`, `DB_PASSWORD` e, no primeiro acesso, `BOOTSTRAP_ADMIN_USERNAME`/`BOOTSTRAP_ADMIN_PASSWORD`. Informar apenas seu ARN ao Terraform. Não versionar valores nem passá-los por user-data ou tfvars.
2. Revisar/aplicar a infraestrutura com `api_desired_capacity=0` e `worker_desired_capacity=0`. As EC2 web poderão repetir a inicialização até as imagens ECR serem publicadas. O estado Terraform precisa de armazenamento remoto criptografado e locking do time antes de uso compartilhado; o exemplo começa com estado local ignorado pelo Git.
3. Usar os outputs para autenticar no ECR, construir e publicar imagens imutáveis. Backend: `docker build -t <backend-image> backend`. Frontend: `docker build -f infra/containers/frontend.Dockerfile -t <frontend-image> .`. `worker_image` pode apontar para a mesma imagem publicada do backend; o launch template habilita o modo de notificações apenas nas EC2 worker.
4. Preparar no RDS o usuário de aplicação compatível com as credenciais do secret, por uma sessão administrativa SSM com acesso ao SG da API. O secret mestre gerenciado do RDS é separado, e a role da aplicação não tem permissão para lê-lo. O usuário que executa migrations precisa de propriedade/permissões de DDL no schema; em produção separar executor de migrations do usuário de operação quando o backend suportar esse fluxo.
5. Definir `api_desired_capacity=1`, revisar/aplicar a atualização e aguardar migrations, bootstrap e readiness do target no ALB interno. Só então ampliar para 2 ou mais; a política de CPU é habilitada quando a capacidade informada excede 1. Durante nova migration, manter uma instância até concluir ou implementar locking antes de rollout concorrente.
6. Criar DNS alias/CNAME do hostname público para o ALB externo. O certificado precisa cobrir esse nome. Sessões administrativas usam SSM, sem chave SSH. Verificar login, autorização, agendamento e acesso ao prontuário antes de liberar usuários.
7. Antes de elevar `worker_desired_capacity`, publicar a imagem atual, informar `worker_image` e adicionar ao secret da aplicação `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `NOTIFICATION_FROM` e `NOTIFICATION_EXTERNAL_ENABLED=true`. O SMTP externo exige STARTTLS; a permissão de IAM para API SES não substitui credenciais SMTP SES. Sem habilitação explícita, o código rejeita hosts SMTP externos. Ajustar quantidade de workers por idade/backlog após medir duração das tarefas.
8. Para SES, informar `email_domain`, publicar TXT de verificação e três CNAME DKIM retornados e verificar sandbox/região/limites antes de envio real. O Terraform não envia e-mails nem solicita saída do sandbox. Alarmes DLQ existem no CloudWatch; configurar o destino de atendimento do time antes da produção.

EC2 usam Amazon Linux 2023, discos criptografados, IMDSv2 obrigatório e roles de instância, sem access keys estáticas. O secret é lido a cada início do serviço e gravado em `/run` com permissão 600; rotação exige reiniciar/renovar instâncias. O tráfego externo é HTTPS; comunicação HTTP entre balanceadores e containers fica na rede privada com security groups restritos. Para exigência de TLS também nesses saltos, adicionar certificados internos e listeners/targets HTTPS antes da produção.

## Limites da entrega

Validação local realizada em 28/10/2026: imagens frontend/Nginx e backend/Java 25 construídas e sete serviços iniciados, preservando o volume PostgreSQL. `verify-app` confirmou tela de login, API pela mesma origem, rejeição de acesso anônimo/credenciais inválidas e consulta autenticada. `verify` confirmou SQS, S3, DynamoDB e entrega real Scheduler → SQS em recursos sintéticos isolados. O emulador exige STS para essa entrega. O comando de verificação usa o Python do ambiente virtual do LocalStack, que contém boto3.

Validação automatizada sem conta AWS: `terraform -chdir=infra/aws test` usa provider simulado para conferir isolamento, proteção do banco, horário do job, escala da API e bloqueio de worker sem imagem. `python -m unittest discover -s infra/localstack/tests -v` verifica reaplicação do bootstrap e propagação de erro de permissão. Esses testes não substituem execução real do emulador.

- Redis foi alocado, mas cache, invalidação e rate limiting distribuído ainda precisam de integração. O limite Nginx é por instância; não usa Redis.
- O worker usa S3 apenas para `HeadObject` antes do aviso. Upload/download de exames e receitas NoSQL ainda exigem integração. Prescrições existentes continuam no PostgreSQL; fonte oficial e modelo NoSQL precisam de definição antes da migração.
- As partições PostgreSQL são criadas pelas migrations existentes e pela manutenção do backend, não pelo Terraform.
- Avisos usam outbox transacional, leases, deduplicação por resultado/destinatário e até cinco tentativas SMTP. Aceitação SMTP não comprova entrega. Uma falha após aceitação e antes da confirmação no banco ainda pode duplicar e-mail; Message-ID determinístico não garante deduplicação pelo provedor.
- A réplica RDS Multi-AZ é para disponibilidade, não leitura. O particionamento semanal não distribui escrita entre servidores. A configuração inicial é uma base, sem comprovação de capacidade para o volume alvo.
- Permanecem pendentes restauração, teste de carga, permissões SQL/IAM e implantação em AWS real. Os testes isolados comprovaram PostgreSQL → SQS → Mailpit, incluindo bloqueio de arquivo ausente e reentrega sem novo envio. Alertas de filas não substituem monitoramento completo de latência, banco e disponibilidade.

Referências: [LocalStack](https://docs.localstack.cloud/aws/getting-started/installation/), [Nginx proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html), [provider AWS Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs).
