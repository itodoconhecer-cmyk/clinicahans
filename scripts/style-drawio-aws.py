"""Aplica simbolos AWS nativos ao draw.io, preservando posicoes e nomes locais.

Referencia visual: AWS Shape Pack do Miro. Usa a biblioteca AWS4 do draw.io;
nao depende de imagens externas nem cria recursos AWS/Miro.
"""
from pathlib import Path
from html import escape
import json
import re
import xml.etree.ElementTree as ET

TARGET = Path(__file__).resolve().parents[1] / "docs/diagrams/system-architecture.drawio"


def label(name, *lines):
    return "<b>" + escape(name) + "</b>" + "".join("<br>" + escape(line) for line in lines)


# simbolo, cor AWS. Containers locais usam simbolos genericos de arquitetura;
# recursos emulados usam o simbolo do servico AWS correspondente.
CONTAINER = ("container_1", "#ED7100")
DATABASE = ("generic_database", "#545B64")
QUEUE = ("sqs", "#E7157B")
S3 = ("s3", "#7AA116")
DYNAMO = ("dynamodb", "#C925D1")
SCHEDULER = ("eventbridge_scheduler", "#E7157B")
MAIL = ("email_notification", "#545B64")
ICON_MAPS = [
    {
        "browser": ("client", "#545B64"), "frontend": CONTAINER,
        "lb": ("elastic_load_balancing", "#8C4FFF"), "api": CONTAINER,
        "db": DATABASE, "pgvol": ("volume", "#545B64"), "redis": DATABASE,
        "worker": CONTAINER, "mail": MAIL, "localstack": ("aws_cloud", "#545B64"),
        "lsvol": ("volume", "#545B64"),
    },
    {
        "schedule": SCHEDULER, "jobs": QUEUE, "notices": QUEUE,
        "jobsdlq": ("queue", "#D13212"), "noticesdlq": ("queue", "#D13212"),
        "role": ("role", "#DD344C"), "policyjob": ("policy", "#DD344C"),
        "policydlq": ("policy", "#DD344C"), "sts": ("sts", "#DD344C"),
        "s3": S3, "dynamo": DYNAMO, "consumer": CONTAINER,
        "schedulegroup": ("event_time_based", "#E7157B"),
    },
    {
        "screen": ("client", "#545B64"), "gateway": ("elastic_load_balancing", "#8C4FFF"),
        "security": ("authenticated_user", "#545B64"), "controllers": ("generic_application", "#545B64"),
        "repo": DATABASE, "nrepo": DATABASE, "pg": DATABASE,
        "sqs": QUEUE, "s3": S3, "smtp": MAIL,
    },
    {"cron": SCHEDULER, "qjob": QUEUE, "publish": QUEUE, "consume": QUEUE,
     "transaction": DATABASE, "mail": MAIL},
    {
        "browser": ("client", "#545B64"), "alb": ("elastic_load_balancing", "#8C4FFF"),
        "internal": ("elastic_load_balancing", "#8C4FFF"),
        "web": ("ec2", "#ED7100"), "api": ("ec2", "#ED7100"), "worker": ("ec2", "#ED7100"),
        "pg": ("rds", "#C925D1"), "redis": ("elasticache", "#C925D1"),
        "ecr": ("ecr", "#ED7100"), "secrets": ("secrets_manager", "#DD344C"),
        "cw": ("cloudwatch", "#E7157B"), "cron": SCHEDULER,
        "jobs": QUEUE, "notices": QUEUE, "s3": S3, "dynamo": DYNAMO,
        "smtp": ("simple_email_service", "#E7157B"), "nat": ("nat_gateway", "#8C4FFF"),
    },
]

RENAMES = [
    {},
    {"consumer": label("clinicahans-notification-worker-1", "Tipo: container Docker / worker Java", "Consumidor externo ao LocalStack: jobs, avisos e HEAD S3.")},
    {
        "screen": label("clinicahans-frontend-1", "HTML, CSS e JavaScript executados no navegador"),
        "gateway": label("clinicahans-frontend-1", "→ clinicahans-backend-lb-1", "Gateway Nginx e balanceamento HTTP"),
        "apiScope": "clinicahans-backend-1 | Processo API / Spring Boot",
        "workerScope": "clinicahans-notification-worker-1 | ExamNotificationUseCase",
        "pg": label("clinicahans-db", "Tipo: PostgreSQL", "Dados, partições, outbox e auditoria"),
        "sqs": label("clinicahans-jobs", "clinicahans-notificacoes", "Tipo: SQS + DLQs"),
        "s3": label("clinicahans-exames-local", "Tipo: S3 Bucket", "Verificar existência do objeto"),
        "smtp": label("clinicahans-mailpit-1", "Tipo: captura SMTP local"),
    },
    {
        "apiLane": "clinicahans-backend-1 + clinicahans-db | API e transação",
        "jobLane": "clinicahans-localstack-1 + clinicahans-notification-worker-1 | Jobs / outbox",
        "sendLane": "clinicahans-notification-worker-1 → clinicahans-mailpit-1 | Envio",
        "cron": label("clinicahans-exames-prontos-12h", "EventBridge Scheduler: 00h e 12h", "America/Sao_Paulo"),
        "qjob": label("clinicahans-jobs", "Tipo: SQS Standard Queue", "CHECK_READY_EXAMS v1"),
        "publish": label("clinicahans-notificacoes", "Publicar UUID da intenção", "Tipo: SQS Standard Queue"),
        "consume": label("clinicahans-notificacoes", "Consumir EXAM_READY_EMAIL", "UUID da intenção, sem dados clínicos"),
        "mail": label("clinicahans-mailpit-1", "Envio SMTP individual", "Sem resultado ou anexo"),
        "claim": label("Publicador da outbox", "Worker: claim exclusivo por lease/token", "Verifica clinicahans-exames-local no S3"),
        "claim2": label("Claim + revalidação", "Destinatário atual e objeto no bucket", "clinicahans-exames-local · até 5 tentativas"),
    },
    {
        "alb": label("clinicahans-frontend-1", "Equivalente AWS: ALB público", "Entrada HTTPS / ACM"),
        "web": label("clinicahans-frontend-1", "Equivalente AWS: EC2 Web + ASG", "Nginx / frontend / gateway"),
        "internal": label("clinicahans-backend-lb-1", "Equivalente AWS: ALB interno"),
        "api": label("clinicahans-backend-1", "Equivalente AWS: EC2 API + ASG", "Spring Boot"),
        "worker": label("clinicahans-notification-worker-1", "Equivalente AWS: EC2 Worker", "Imagem compartilhada com a API"),
        "pg": label("clinicahans-db", "Equivalente AWS: RDS PostgreSQL", "Multi-AZ / outbox / auditoria"),
        "redis": label("clinicahans-redis-1", "Equivalente AWS: ElastiCache", "Integração pendente"),
        "s3": label("clinicahans-exames-local", "Referência local → AWS S3", "Bucket privado de exames"),
        "dynamo": label("clinicahans-receitas-local", "Referência local → DynamoDB", "Integração pendente"),
        "cron": label("clinicahans-exames-prontos-12h", "EventBridge Scheduler", "00h e 12h de São Paulo"),
        "jobs": label("clinicahans-jobs", "SQS + clinicahans-jobs-dlq"),
        "notices": label("clinicahans-notificacoes", "SQS + respectiva DLQ"),
        "smtp": label("clinicahans-mailpit-1", "Equivalente de envio: SMTP / SES", "Produção exige habilitação"),
        "nat": label("clinicahans_default", "Referência de rede local", "AWS: NAT Gateway por zona"),
        "ecr": label("Imagens locais de referência", "clinicahans-frontend", "clinicahans-backend:local", "Destino previsto: ECR"),
        "secrets": label("Configuração do projeto", "IAM / Secrets Manager / SSM", "Previstos para AWS"),
        "cw": label("Origens locais de logs", "clinicahans-backend-1", "clinicahans-notification-worker-1", "Destino previsto: CloudWatch"),
        "subtitle": "AWS prevista, sem implantação. Rótulos mostram correspondência com Docker/LocalStack; os nomes definitivos AWS são definidos pelo Terraform.",
    },
]


def style_map(value):
    return dict(part.split("=", 1) for part in value.split(";") if "=" in part)


def set_style(cell, updates, remove=()):
    values = style_map(cell.get("style", ""))
    for key in remove:
        values.pop(key, None)
    values.update(updates)
    cell.set("style", ";".join(key + "=" + str(value) for key, value in values.items()) + ";")


def add_icon(root, card, symbol, color):
    geo = card.find("mxGeometry")
    width, height = float(geo.get("width")), float(geo.get("height"))
    tiny = height < 40
    size = 20 if tiny else 40 if width < 245 else 52 if width < 310 else 60
    gap = 8 if tiny else 12
    left = 6 if tiny else 14
    font = 11 if width < 245 and not tiny else 12 if width < 310 else 13
    previous = style_map(card.get("style", ""))
    pending = previous.get("dashed") == "1"
    set_style(card, {"shape": "rectangle", "rounded": "1", "fillColor": "#FFFFFF",
        "strokeColor": "#B7791F" if pending else "#CBD5E1", "align": "left",
        "verticalAlign": "middle", "spacing": "8", "spacingLeft": left + size + gap,
        "spacingRight": "10", "fontSize": font, "fontColor": "#232F3E"},
        remove=("size", "boundedLbl", "backgroundOutline"))
    icon_style = ("shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4." + symbol + ";"
        "sketch=0;html=1;aspect=fixed;outlineConnect=0;gradientColor=none;"
        "fillColor=" + color + ";strokeColor=#ffffff;strokeWidth=0;"
        "fontColor=#232F3E;connectable=0;pointerEvents=1;movable=1;resizable=1;")
    icon = ET.SubElement(root, "mxCell", id="aws-icon-" + card.get("id"),
        value="", style=icon_style, vertex="1", parent=card.get("id"), connectable="0")
    ET.SubElement(icon, "mxGeometry", x=str(left), y=str((height - size) / 2),
        width=str(size), height=str(size), attrib={"as": "geometry"})


def main():
    tree = ET.parse(TARGET)
    diagrams = tree.getroot().findall("diagram")
    assert len(diagrams) == 5, "Expected the five architecture pages"
    tree.getroot().set("libraries", "general;aws4;aws4b")
    count = 0
    used = set()
    for index, diagram in enumerate(diagrams):
        root = diagram.find("mxGraphModel/root")
        for cell in list(root):
            if cell.get("id", "").startswith("aws-icon-"):
                root.remove(cell)
        cells = {c.get("id"): c for c in root.findall("mxCell")}
        for id, value in RENAMES[index].items():
            assert id in cells, (index, id)
            cells[id].set("value", value)
        if index == 0:
            cells["subtitle"].set("value", "Ícones de referência AWS, conforme o AWS Shape Pack do Miro. Nomes e tipos reais do Docker nos rótulos; tracejado = integração pendente.")
        if index == 1:
            cells["ls"].set("value", "clinicahans-localstack-1 | AWS emulado: S3, SQS, DynamoDB, Scheduler, IAM e STS")
        if index == 3:
            for id in ("apiLane", "jobLane", "sendLane"):
                set_style(cells[id], {"startSize": "56", "fontSize": "13"})
        for id, (symbol, color) in ICON_MAPS[index].items():
            assert id in cells, (index, id)
            add_icon(root, cells[id], symbol, color)
            count += 1
            used.add(symbol)
        if index == 4:
            for id, color in (("public", "#7AA116"), ("app", "#8C4FFF"), ("data", "#C925D1")):
                set_style(cells[id], {"shape": "mxgraph.aws4.group", "grIcon": "mxgraph.aws4.group_subnet",
                    "fillColor": "none", "strokeColor": color, "fontColor": "#232F3E",
                    "spacingLeft": "34", "spacingTop": "8", "align": "left", "verticalAlign": "top",
                    "fontSize": "13", "container": "1", "collapsible": "0"}, remove=("startSize", "horizontal"))
    ET.indent(tree, space="  ")
    tree.write(TARGET, encoding="utf-8", xml_declaration=True)
    validate(TARGET, count)
    print("Native AWS icons:", count)
    print("AWS symbols:", ", ".join(sorted(used)))
    print(TARGET)


def validate(path, icon_count):
    root = ET.parse(path).getroot()
    for diagram in root.findall("diagram"):
        cells = diagram.findall("mxGraphModel/root/mxCell")
        ids = {cell.get("id") for cell in cells}
        assert len(ids) == len(cells), diagram.get("name")
        by_id = {cell.get("id"): cell for cell in cells}
        for cell in cells:
            for field in ("parent", "source", "target"):
                if field in cell.attrib:
                    assert cell.get(field) in ids, (diagram.get("name"), cell.get("id"), field)
            if cell.get("id", "").startswith("aws-icon-"):
                geo = cell.find("mxGeometry")
                parent_geo = by_id[cell.get("parent")].find("mxGeometry")
                assert float(geo.get("x")) + float(geo.get("width")) <= float(parent_geo.get("width"))
                assert float(geo.get("y")) + float(geo.get("height")) <= float(parent_geo.get("height"))
    text = path.read_text(encoding="utf-8")
    names = ["clinicahans-frontend-1", "clinicahans-backend-lb-1", "clinicahans-backend-1",
        "clinicahans-notification-worker-1", "clinicahans-db", "clinicahans-redis-1", "clinicahans-mailpit-1",
        "clinicahans-localstack-1", "clinicahans-exames-local", "clinicahans-receitas-local",
        "clinicahans-jobs", "clinicahans-jobs-dlq", "clinicahans-notificacoes", "clinicahans-notificacoes-dlq",
        "clinicahans-exames-prontos-12h", "clinicahans-scheduler-local", "send-exam-check-job", "send-scheduler-dlq"]
    for name in names:
        assert name in text, name
    assert text.count('id="aws-icon-') == icon_count
    assert "image=data:" not in text and "shape=image;" not in text
    print("Validated: XML, connectors, native icons, geometry and Docker/LocalStack names.")


if __name__ == "__main__":
    main()
