"""Provisionamento local idempotente. Executado pelo hook READY do LocalStack."""
import json

import boto3
from botocore.exceptions import ClientError


REGION = "us-east-1"
ENDPOINT = "http://localhost:4566"
BUCKET = "clinicahans-exames-local"
TABLE = "clinicahans-receitas-local"
SCHEDULE = "clinicahans-exames-prontos-12h"


def client(service):
    # Endpoint fixo: este bootstrap nunca provisiona uma conta AWS real.
    return boto3.client(service, endpoint_url=ENDPOINT, region_name=REGION,
                        aws_access_key_id="test", aws_secret_access_key="test")


def missing(exc, *codes):
    return exc.response["Error"]["Code"] in codes


def ensure_queue(sqs, name, attributes):
    try:
        url = sqs.get_queue_url(QueueName=name)["QueueUrl"]
    except ClientError as exc:
        if not missing(exc, "AWS.SimpleQueueService.NonExistentQueue", "QueueDoesNotExist"):
            raise
        url = sqs.create_queue(QueueName=name, Attributes=attributes)["QueueUrl"]
    sqs.set_queue_attributes(QueueUrl=url, Attributes=attributes)
    arn = sqs.get_queue_attributes(QueueUrl=url, AttributeNames=["QueueArn"])["Attributes"]["QueueArn"]
    return arn


def provision():
    sqs = client("sqs")
    queues = {}
    for name in ("clinicahans-jobs", "clinicahans-notificacoes"):
        dlq_arn = ensure_queue(sqs, name + "-dlq", {"MessageRetentionPeriod": "1209600"})
        queues[name] = ensure_queue(sqs, name, {
            "VisibilityTimeout": "300",
            "ReceiveMessageWaitTimeSeconds": "20",
            "MessageRetentionPeriod": "345600",
            "SqsManagedSseEnabled": "true",
            "RedrivePolicy": json.dumps({"deadLetterTargetArn": dlq_arn, "maxReceiveCount": "5"}),
        })

    s3 = client("s3")
    try:
        s3.head_bucket(Bucket=BUCKET)
    except ClientError as exc:
        if not missing(exc, "404", "NoSuchBucket", "NotFound"):
            raise
        s3.create_bucket(Bucket=BUCKET)
    s3.put_public_access_block(Bucket=BUCKET, PublicAccessBlockConfiguration={
        "BlockPublicAcls": True, "IgnorePublicAcls": True,
        "BlockPublicPolicy": True, "RestrictPublicBuckets": True,
    })
    s3.put_bucket_versioning(Bucket=BUCKET, VersioningConfiguration={"Status": "Enabled"})
    s3.put_bucket_encryption(Bucket=BUCKET, ServerSideEncryptionConfiguration={
        "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}],
    })

    dynamodb = client("dynamodb")
    try:
        dynamodb.describe_table(TableName=TABLE)
    except ClientError as exc:
        if not missing(exc, "ResourceNotFoundException"):
            raise
        dynamodb.create_table(
            TableName=TABLE, BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"},
                                  {"AttributeName": "sk", "AttributeType": "S"}],
            KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"},
                       {"AttributeName": "sk", "KeyType": "RANGE"}],
        )
    dynamodb.get_waiter("table_exists").wait(TableName=TABLE)

    iam = client("iam")
    role_name = "clinicahans-scheduler-local"
    trust = json.dumps({"Version": "2012-10-17", "Statement": [{
        "Effect": "Allow", "Principal": {"Service": "scheduler.amazonaws.com"},
        "Action": "sts:AssumeRole",
    }]})
    try:
        role = iam.get_role(RoleName=role_name)["Role"]
    except ClientError as exc:
        if not missing(exc, "NoSuchEntity"):
            raise
        role = iam.create_role(RoleName=role_name, AssumeRolePolicyDocument=trust)["Role"]
    iam.update_assume_role_policy(RoleName=role_name, PolicyDocument=trust)
    iam.put_role_policy(RoleName=role_name, PolicyName="send-exam-check-job", PolicyDocument=json.dumps({
        "Version": "2012-10-17", "Statement": [{
            "Effect": "Allow", "Action": "sqs:SendMessage",
            "Resource": queues["clinicahans-jobs"],
        }],
    }))

    scheduler = client("scheduler")
    config = {
        "Name": SCHEDULE, "GroupName": "default",
        "ScheduleExpression": "cron(0 0,12 * * ? *)",
        "ScheduleExpressionTimezone": "America/Sao_Paulo",
        "FlexibleTimeWindow": {"Mode": "OFF"}, "State": "ENABLED",
        "Target": {
            "Arn": queues["clinicahans-jobs"], "RoleArn": role["Arn"],
            "Input": json.dumps({"type": "CHECK_READY_EXAMS", "schemaVersion": 1}),
            "RetryPolicy": {"MaximumEventAgeInSeconds": 3600, "MaximumRetryAttempts": 3},
            "DeadLetterConfig": {"Arn": queues["clinicahans-jobs"] + "-dlq"},
        },
    }
    # A role precisa enviar tanto ao destino quanto a DLQ do agendador.
    iam.put_role_policy(RoleName=role_name, PolicyName="send-scheduler-dlq", PolicyDocument=json.dumps({
        "Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "sqs:SendMessage",
                                                  "Resource": queues["clinicahans-jobs"] + "-dlq"}],
    }))
    try:
        scheduler.get_schedule(Name=SCHEDULE, GroupName="default")
    except ClientError as exc:
        if not missing(exc, "ResourceNotFoundException"):
            raise
        scheduler.create_schedule(**config)
    else:
        scheduler.update_schedule(**config)
    print("Clinica Hans: bucket, tabela, filas, DLQs e agendamento provisionados.")


# O runner de hooks usa exec com globals vazios; importacao pela verificacao nao executa.
if globals().get("__name__", "__main__") == "__main__":
    provision()
