# Backend — Clínica Hans

Backend gerado pelo Prompt 03 com foco em segurança clínica, rastreabilidade e SQL explícito.

## Stack
Java 21, Spring Boot 3.5.6, Spring Web/Security/JDBC, PostgreSQL 16, JWT, OpenAPI e migrations próprias. Não usa JPA/Hibernate.

## Subir localmente
1. Suba o PostgreSQL da raiz: `docker compose up -d db`.
2. Exporte um segredo JWT com pelo menos 32 caracteres.
3. Para o primeiro acesso, informe `BOOTSTRAP_ADMIN_USERNAME` e `BOOTSTRAP_ADMIN_PASSWORD`.
4. Execute `mvn spring-boot:run` dentro de `backend/`.

Exemplo:
```bash
export JWT_SECRET='troque-por-um-segredo-forte-com-32-ou-mais-caracteres'
export BOOTSTRAP_ADMIN_USERNAME='admin'
export BOOTSTRAP_ADMIN_PASSWORD='troque-esta-senha'
mvn spring-boot:run
```

Swagger: `/swagger-ui.html`.
Health: `/actuator/health`.

## Segurança
- Usuários são individuais e possuem roles.
- Médico autenticado deve estar vinculado ao cadastro de médico.
- Recepção não possui endpoints de prontuário.
- Leitura de prontuário gera auditoria.
- Atendimento finalizado não é editável pelo fluxo comum; correção usa adendo.
- Logs técnicos não devem receber texto clínico sensível.
- SQL é parametrizado.

## Fluxo inicial
1. Bootstrap do primeiro ADMIN por variável de ambiente.
2. ADMIN cria usuários.
3. ADMIN/GESTÃO cadastra médico.
4. ADMIN vincula o usuário MEDICO ao cadastro do médico.
5. Recepção cadastra paciente e agenda.
6. Recepção confirma/check-in.
7. Médico abre safety snapshot e inicia atendimento.
8. Atendimento pode gerar exame e follow-up.
9. Atendimento finalizado pode gerar lançamento financeiro.

## Migrations
O runner próprio mantém `schema_migration` e executa os scripts em ordem. A inclusão de nova migration exige acrescentá-la à lista em `DatabaseMigrationRunner`.

## Observação de produção
As metas de disponibilidade/RPO/RTO e integrações TISS/TUSS são requisitos planejados e precisam de validação operacional antes de produção real.

## Validação contínua
O workflow `Backend CI` compila o projeto com Java 21 e executa `mvn clean test` em alterações do backend.

## Integração com frontend
O CORS é configurável por `CORS_ALLOWED_ORIGINS`; alterações em backend continuam protegidas pelo Backend CI.
