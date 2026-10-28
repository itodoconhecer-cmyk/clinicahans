# Diagramas de sequência

Cada caso de uso possui uma pasta própria com o diagrama Mermaid e sua documentação:

```text
docs/diagrams/sequencias/
└── <caso-de-uso>/
    ├── <caso-de-uso>.mmd
    └── README.md
```

O primeiro caso documentado é [login](login/README.md). Novos casos devem ser adicionados sem misturar atores, regras ou fluxos de casos de uso diferentes.

O fluxo de [avisos de exames](avisos-exames/README.md) cobre resultado, job de 12 horas, outbox, S3, SQS e SMTP.
