# Testing Standards

## Filosofia
Testes devem proteger comportamento de negócio, contratos e persistência crítica, e não detalhes acidentais de implementação.

## Backend — Java / Spring Boot

### Stack sugerida
- JUnit 5
- Mockito
- AssertJ
- Spring Boot Test para integração pontual
- PostgreSQL de teste ou estratégia equivalente para validar SQL real quando necessário

### O que testar
- Services: regras, validações e fluxos condicionais.
- Controllers: contrato HTTP, validação e autorização.
- Repository/DAO: SQL customizado, mapeamento e integridade dos casos críticos.
- Security: token, perfis e acessos negados/permitidos.
- Mappers/DTOs: apenas quando houver lógica relevante.

### Padrões
- Given-When-Then.
- Nomes `should_[resultado]_when_[condição]`.
- Cenários felizes e negativos.
- Mocks apenas nas fronteiras da unidade.
- Dados de teste claros e reprodutíveis.
- Não testar framework nem getters/setters triviais.

## Frontend — HTML/CSS/JavaScript puro

### Stack sugerida
- Test runner JavaScript simples (por exemplo, Vitest ou Node Test Runner) apenas se já fizer parte da solução.
- Testes de navegador/integração para fluxos críticos quando necessário.

### O que testar
- serviços de API: URL, método, serialização, erros e autenticação;
- módulos de estado e regras de interface;
- renderização condicional relevante;
- fluxos críticos de navegação e formulários;
- funções utilitárias com comportamento significativo.

### Diretrizes
- Testar comportamento observável, não implementação interna.
- Preferir seletores e elementos semânticos.
- Evitar dependência de framework de UI inexistente.
- Manter a suíte proporcional à complexidade da aplicação.

## Banco
- Validar scripts versionados em PostgreSQL compatível.
- Testar constraints, FKs e consultas críticas quando houver impacto de negócio.

## Regra de geração
Sempre que a IA gerar código de negócio relevante, deve gerar ou atualizar os testes correspondentes na mesma entrega.
