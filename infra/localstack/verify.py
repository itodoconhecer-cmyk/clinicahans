"""Verifica configuracao e faz round-trip sintetico; nao consome mensagens das filas reais."""
import importlib.util
import json
import uuid

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
key = "_smoke/" + suffix
version = None
item_key = {"pk": {"S": "SMOKE#" + suffix}, "sk": {"S": "TEST"}}
try:
    queue_url = sqs.create_queue(QueueName="clinicahans-smoke-" + suffix)["QueueUrl"]
    sqs.send_message(QueueUrl=queue_url, MessageBody="synthetic-smoke-test")
    messages = sqs.receive_message(QueueUrl=queue_url, WaitTimeSeconds=5).get("Messages", [])
    check(any(m["Body"] == "synthetic-smoke-test" for m in messages), "Round-trip SQS falhou")
    version = s3.put_object(Bucket=bootstrap.BUCKET, Key=key, Body=b"synthetic-smoke-test")["VersionId"]
    check(s3.get_object(Bucket=bootstrap.BUCKET, Key=key, VersionId=version)["Body"].read() == b"synthetic-smoke-test", "Round-trip S3 falhou")
    db.put_item(TableName=bootstrap.TABLE, Item=item_key)
    check("Item" in db.get_item(TableName=bootstrap.TABLE, Key=item_key, ConsistentRead=True), "Round-trip DynamoDB falhou")
finally:
    if queue_url:
        sqs.delete_queue(QueueUrl=queue_url)
    if version:
        s3.delete_object(Bucket=bootstrap.BUCKET, Key=key, VersionId=version)
    db.delete_item(TableName=bootstrap.TABLE, Key=item_key)
print("OK: configuracao e round-trip SQS, S3 e DynamoDB.")
