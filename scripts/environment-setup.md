# Pré-requisitos da Máquina

Antes de rodar os prompts, garanta que estas ferramentas estão instaladas:

## Obrigatório
- VS Code atualizado
- GitHub Copilot Pro ativo (extensão no VS Code)
- Docker Desktop (para o PostgreSQL)
- JDK 25 LTS
- Maven 3.9+
- Node.js 20+

## Subir o banco de dados

```bash
docker compose up -d
```

Isso sobe o PostgreSQL 16 com o banco `academy_db` já criado, na porta 5432.

Credenciais padrão: `postgres` / `postgres`.

Para parar:
```bash
docker compose down
```

Para apagar os dados do banco:
```bash
docker compose down -v
```

## Serviços AWS locais (opcional)

Para criar S3, SQS/DLQs, DynamoDB e o agendamento de exames a cada 12 horas,
consulte [LocalStack da Clínica Hans](../infra/localstack/README.md).
O PostgreSQL continua usando o Compose existente.
Para subir também frontend, backend, balanceador, Redis e SMTP de teste,
consulte a [alocação completa](../infra/README.md), que inclui os scripts Terraform de EC2/AWS.

## Fluxo de geração

Tudo o mais é gerado pela IA:

1. Abrir o projeto no VS Code
2. Subir o banco com `docker compose up -d`
3. Colar a história em `input/application-story.md`
4. Rodar os prompts na ordem (01 a 05) no chat do Copilot
5. A IA cria as pastas, gera o código, instala dependências e valida o build

Não é necessário criar nenhuma pasta de código manualmente.
