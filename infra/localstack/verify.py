"""Verifica configuracao e faz round-trip sintetico; nao consome mensagens das filas reais."""
import importlib.util
import json
import uuid
from datetime import datetime, timedelta, timezone

spec = importlib.util.spec_from_file_location("bootstrap", "/etc/localstack/init/ready.d/10-clinicahans.py")
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)
client = bootstrap.client


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


sqs = client("sqs")
for name in ("clinicahans-jobs", "clinicahans-notificacoes"):
    url = sqs.get_queue_url(QueueName=name)["QueueUrl"]
    attrs = sqs.get_queue_attributes(QueueUrl=url, AttributeNames=["All"])["Attributes"]
    dlq_url = sqs.get_queue_url(QueueName=name + "-dlq")["QueueUrl"]
    dlq_arn = sqs.get_queue_attributes(QueueUrl=dlq_url, AttributeNames=["QueueArn"])["Attributes"]["QueueArn"]
    policy = json.loads(attrs["RedrivePolicy"])
    check(policy["deadLetterTargetArn"] == dlq_arn and int(policy["maxReceiveCount"]) == 5, "DLQ incorreta")

s3 = client("s3")
check(all(s3.get_public_access_block(Bucket=bootstrap.BUCKET)["PublicAccessBlockConfiguration"].values()), "Bucket publico")
check(s3.get_bucket_versioning(Bucket=bootstrap.BUCKET)["Status"] == "Enabled", "Versionamento desativado")
check(s3.get_bucket_encryption(Bucket=bootstrap.BUCKET)["ServerSideEncryptionConfiguration"]["Rules"][0]["ApplyServerSideEncryptionByDefault"]["SSEAlgorithm"] == "AES256", "Criptografia incorreta")
db = client("dynamodb")
check(db.describe_table(TableName=bootstrap.TABLE)["Table"]["TableStatus"] == "ACTIVE", "Tabela indisponivel")
schedule = client("scheduler").get_schedule(Name=bootstrap.SCHEDULE)
check(schedule["ScheduleExpression"] == "cron(0 0,12 * * ? *)" and schedule["ScheduleExpressionTimezone"] == "America/Sao_Paulo" and schedule["State"] == "ENABLED", "Agendamento incorreto")
check(json.loads(schedule["Target"]["Input"])["type"] == "CHECK_READY_EXAMS", "Comando incorreto")
check(schedule["Target"]["Arn"].endswith(":clinicahans-jobs"), "Fila do agendador incorreta")

# Recursos temporarios exclusivos; nunca le ou altera dados clinicos.
suffix = uuid.uuid4().hex
queue_url = None
schedule_name = None
role_name = None
key = "_smoke/" + suffix
version = None
item_key = {"pk": {"S": "SMOKE#" + suffix}, "sk": {"S": "TEST"}}
try:
    queue_url = sqs.create_queue(QueueName="clinicahans-smoke-" + suffix)["QueueUrl"]
    sqs.send_message(QueueUrl=queue_url, MessageBody="synthetic-smoke-test")
    messages = sqs.receive_message(QueueUrl=queue_url, WaitTimeSeconds=5).get("Messages", [])
    check(any(m["Body"] == "synthetic-smoke-test" for m in messages), "Round-trip SQS falhou")
    # Entrega real do Scheduler em fila isolada; nao dispara o job clinico.
    iam = client("iam")
    scheduler = client("scheduler")
    role_name = "clinicahans-smoke-" + suffix
    role_arn = iam.create_role(RoleName=role_name, AssumeRolePolicyDocument=json.dumps({
        "Version": "2012-10-17", "Statement": [{"Effect": "Allow",
        "Principal": {"Service": "scheduler.amazonaws.com"}, "Action": "sts:AssumeRole"}],
    }))["Role"]["Arn"]
    queue_arn = sqs.get_queue_attributes(QueueUrl=queue_url, AttributeNames=["QueueArn"])["Attributes"]["QueueArn"]
    iam.put_role_policy(RoleName=role_name, PolicyName="send-smoke-message", PolicyDocument=json.dumps({
        "Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "sqs:SendMessage", "Resource": queue_arn}],
    }))
    schedule_name = "clinicahans-smoke-" + suffix
    target_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).strftime("%Y-%m-%dT%H:%M:%S")
    scheduler.create_schedule(Name=schedule_name, ScheduleExpression="at(" + target_time + ")",
        ScheduleExpressionTimezone="UTC", FlexibleTimeWindow={"Mode": "OFF"},
        Target={"Arn": queue_arn, "RoleArn": role_arn, "Input": "synthetic-scheduler-" + suffix})
    delivered = False
    # Exclui a primeira mensagem do round-trip antes de esperar o Scheduler.
    for message in messages:
        sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=message["ReceiptHandle"])
    for _ in range(3):
        received = sqs.receive_message(QueueUrl=queue_url, WaitTimeSeconds=20).get("Messages", [])
        if any(m["Body"] == "synthetic-scheduler-" + suffix for m in received):
            delivered = True
            break
    check(delivered, "Scheduler nao entregou mensagem na fila de teste em ate 60 segundos")
    version = s3.put_object(Bucket=bootstrap.BUCKET, Key=key, Body=b"synthetic-smoke-test")["VersionId"]
    check(s3.get_object(Bucket=bootstrap.BUCKET, Key=key, VersionId=version)["Body"].read() == b"synthetic-smoke-test", "Round-trip S3 falhou")
    db.put_item(TableName=bootstrap.TABLE, Item=item_key)
    check("Item" in db.get_item(TableName=bootstrap.TABLE, Key=item_key, ConsistentRead=True), "Round-trip DynamoDB falhou")
finally:
    if schedule_name:
        client("scheduler").delete_schedule(Name=schedule_name)
    if role_name:
        client("iam").delete_role_policy(RoleName=role_name, PolicyName="send-smoke-message")
        client("iam").delete_role(RoleName=role_name)
    if queue_url:
        sqs.delete_queue(QueueUrl=queue_url)
    if version:
        s3.delete_object(Bucket=bootstrap.BUCKET, Key=key, VersionId=version)
    db.delete_item(TableName=bootstrap.TABLE, Key=item_key)
print("OK: configuracao, round-trip SQS/S3/DynamoDB e entrega Scheduler -> SQS.")
