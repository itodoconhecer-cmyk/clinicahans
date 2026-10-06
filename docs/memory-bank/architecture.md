# Memory Bank — Arquitetura

## Visão arquitetural
- **Frontend oficial multipágina:** HTML5 + CSS3 + JavaScript ES2022+ puro.
- Cada tela/fluxo funcional possui pasta própria com HTML, CSS e JS homônimos.
- Não existe SPA centralizada; navegação ocorre entre páginas HTML reais.
- CSS geral compartilhado é permitido, mas não substitui o CSS próprio de cada tela.
- Backend Java + Spring Boot.
- PostgreSQL.
- JWT.
- SQL explícito, sem JPA/Hibernate.
- Swagger/OpenAPI.

## Regra permanente do frontend

Exemplo obrigatório:

```text
frontend/pacientes/
  pacientes.html
  pacientes.css
  pacientes.js
```

Para qualquer nova tela, criar um novo diretório seguindo exatamente o mesmo padrão.

### Compartilhado
- `frontend/shared/global.css`
- `frontend/shared/screen.js`
- `frontend/services/api.js`
- `frontend/state/session.js`
- `frontend/components/`
- `frontend/utils/`

### Integração
- browser consome somente endpoints REST `/api/v1/**`;
- somente `services/api.js` usa `fetch`;
- telas nunca usam mock como fonte funcional;
- nenhuma etapa de build ou framework.


## Estrutura obrigatória do backend
A referência normativa é:
https://github.com/itodoconhecer-cmyk/aulas_umc_2026_1_spring_boot/tree/master/src/main/java/aulas/umc/oo

A Clínica Hans usa `DTO/UseCase/command/controller/mapper/model/repository/utilities`, com `DatabaseInitializer.java` no pacote raiz. Organização raiz por feature é considerada divergência arquitetural e deve falhar no CI.
