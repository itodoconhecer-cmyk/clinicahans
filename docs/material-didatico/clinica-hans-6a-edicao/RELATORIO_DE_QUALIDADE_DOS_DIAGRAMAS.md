# Auditoria de diagramas - Clinica Hans

## Escopo realizado

- Livro-mestre original preservado; **26 figuras tecnicas do corpo do livro** substituidas in situ.
- **9 pranchas anteriores de UX no Apendice G** mantidas como prototipos visuais; nao estao certificadas como modelos UML.
- Arquivos nativos: 26 `*.drawio` individuais e 1 atlas `ATLAS_FORMAL_CLINICA_HANS.drawio` de 26 paginas.
- Publicacao: SVG vetorial, PNG com 3.600 x 2.280 px, atlas vetorial A3 e livro PDF A4.
- Fontes formais auxiliares: BPMN 2.0 XML e PlantUML de classes, sequencia e estados.
- Referencias dentro do texto: commit fixado `a1907d6297fe7fd0c00cf8f968435ef0f575ede3`, link do codigo e especificacao da notacao junto de cada figura.

## Validacao automatizada

- Modelos verificados: **26**. Alertas de geometria detectados apos as correcoes: **0**.
- Regras verificadas: intersecao de areas de objetos, trajetorias cruzando objetos nao incidentes, intersecoes entre conectores independentes, largura e altura de labels e notas.
- XML do draw.io parseado: **26 arquivos**; vertices: **720**, conectores: **208**.
- BPMN XML: referencias de fluxo existentes, dois finais, gateway com duas saidas. A validacao formal completa contra todas as regras da OMG nao foi executada.
- Render do documento final: **195 paginas**.
- Sumario: 210 entradas recalculadas; lista de ilustracoes: 35 entradas recalculadas.
- Amostragem visual das paginas de BPMN (45), UML classes (53), LocalStack (115) e apendice K (192).

## Validacao semantica e limites

A geracao mecanica nao garante, por si so, semantica correta. A revisao manual confrontou os casos principais com os objetos reais: `Patient`, `Doctor`, `Appointment`, `AppointmentUseCase`, `V001__initial_schema.sql`, `V013__exam_notification_outbox.sql`, `infra/localstack/README.md` e `docs/diagrams/localstack-inventory.md`. O diagrama de classes evita heranca ficticia entre paciente, medico e usuario. O DER conserva FKs UUID e unicidade do vinculo de atendimento. A arquitetura separa conteineres reais dos servicos emulados e distingue infraestrutura prevista da infraestrutura implantada.

Os diagramas sao **recortes didaticos**, nao especificacoes completas de producao. Um modelo visualmente alinhado pode omitir fluxo alternativo ou restricao: nao substituir testes, revisao por especialista ou leitura de codigo. O arquivo do repositorio `professorpaulojca/arquitetura` continua indisponivel para a conexao; a maquina daquele repo nao foi executada. Nao foi operado o Miro. Nenhum sistema real foi implantado ou testado com os diagramas nesta revisao.

## Referencias tecnicas utilizadas

- OMG: BPMN 2.0.2, https://www.omg.org/spec/BPMN/ .
- OMG: UML, https://www.omg.org/spec/UML/ .
- Simon Brown: C4 Model, https://c4model.com/diagrams .
- LocalStack: https://docs.localstack.cloud/ .
- PostgreSQL: https://www.postgresql.org/docs/current/ddl-constraints.html .
- W3C: https://www.w3.org/WAI/WCAG22/quickref/ .

## Recomendacao de uso

Estudante: ler a secao, abrir o codigo fixado e confrontar a figura; editar o `.drawio` quando houver divergencia. Docente: avaliar semantica e dominio de competencia, nao apenas aparencia. Para projetar em sala ou estudar detalhes, usar o atlas A3 vetorial, sem deixar de consultar a figura no local do texto.