# Painel de atividade Docker

Página educacional independente da aplicação Clínica Hans. Exibe os containers pertencentes ao projeto Docker Compose `clinicahans`, o estado atual e uma lâmpada que permanece acesa por cinco segundos quando o container produz uma nova linha em `docker logs`.

O coletor roda no host e usa somente `docker ps` e `docker logs`, sem inspecionar variáveis de ambiente. Ele não monta nem publica o socket do Docker. O painel escuta apenas em `127.0.0.1:8091`, não mostra o texto dos logs e mantém contagens em memória enquanto está aberto.

## Executar

Com Docker Desktop iniciado, abra outro terminal na raiz do repositório:

```powershell
.\scripts\localstack.ps1 dashboard
```

Abra [http://localhost:8091](http://localhost:8091). O comando fica em primeiro plano; `Ctrl+C` encerra o servidor e os leitores de log. Mantenha a aplicação em execução em outro terminal. Para um projeto Compose com outro nome, defina `DOCKER_DASHBOARD_PROJECT` antes de abrir o painel.

As ações `start-app` e `start-all` recompilam a aplicação e reiniciam o balanceador para aplicar os logs seguros adicionados aos Nginx.

## Como ler

- **Estado verde “RODANDO”**: o Docker informa que o container está ativo.
- **Lâmpada âmbar acesa**: o coletor observou ao menos uma linha nova no container nos últimos cinco segundos.
- **Feed “Quem acendeu”**: nome e tipo do container, sem conteúdo da mensagem.
- O contador é local à sessão do painel; ele não substitui os logs persistidos pelo Docker.

Frontend/gateway, balanceador interno e API emitem logs HTTP compactos para que o acesso à aplicação acenda essas etapas. Registram somente método, status, duração e correlação; URL, query string, IP, cabeçalhos, tokens e corpo não entram nesses logs. Serviços não precisam gerar um log para cada operação: PostgreSQL e Redis podem processar consultas mantendo a lâmpada apagada. Isso representa a política real de logs; o painel não inventa eventos para eles.

## Limites

Este painel é para demonstração local. Ele observa containers Compose, não EC2 nem recursos internos do LocalStack como se fossem containers separados. A lâmpada representa atividade de log recente, não uma verificação de saúde. O estado “RODANDO” também não substitui readiness/healthcheck. Conteúdo bruto, identificadores de pacientes, corpo de requisição, tokens e endereços não são enviados à página.
