---
applyTo: "frontend/**"
---

# Instruções para Frontend

## Stack obrigatória
- HTML5 sem framework de UI
- CSS3 responsivo
- JavaScript moderno puro (ES2022+)
- ES Modules
- Fetch API para integração REST

## Diretrizes
- Interface clara, direta, acessível e responsiva.
- Organizar código em módulos pequenos e com responsabilidade única.
- Separar páginas/views, componentes, serviços HTTP, estado e utilitários.
- Não colocar regra de negócio crítica na interface.
- Centralizar comunicação com API.
- Tratar loading, erro, sucesso e estado vazio.
- Implementar autenticação e controle de sessão de forma desacoplada da UI.
- Reutilizar componentes por funções/módulos JS, templates e classes quando fizer sentido.

## Estrutura recomendada
- `pages/` ou `views/` para telas
- `components/` para elementos reaproveitáveis
- `services/` para chamadas HTTP
- `state/` para estado da aplicação
- `utils/` para utilitários
- `assets/` para recursos estáticos

## Restrições
- Não introduzir React, Vue, Angular, TypeScript ou outra camada de framework sem uma decisão arquitetural explícita registrada no memory bank.
- Não usar chamadas HTTP diretamente espalhadas pelas páginas.

## UX
- Feedback visível de carregamento, erro e sucesso.
- Navegação por teclado e labels claros.
- Respeitar os protótipos e especificações geradas anteriormente.
