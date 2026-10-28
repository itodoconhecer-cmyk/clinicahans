data "aws_caller_identity" "current" {}
resource "aws_db_subnet_group" "clinic" {
  name       = local.name
  subnet_ids = aws_subnet.data[*].id
}
resource "aws_db_instance" "clinic" {
  identifier                      = local.name
  engine                          = "postgres"
  engine_version                  = "16"
  instance_class                  = "db.t3.medium"
  db_name                         = "clinicahans"
  username                        = "clinicahans_owner"
  manage_master_user_password     = true
  allocated_storage               = 50
  max_allocated_storage           = 500
  storage_type                    = "gp3"
  storage_encrypted               = true
  multi_az                        = true
  publicly_accessible             = false
  db_subnet_group_name            = aws_db_subnet_group.clinic.name
  vpc_security_group_ids          = [aws_security_group.tier["postgres"].id]
  backup_retention_period         = 14
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "${local.name}-final"
  auto_minor_version_upgrade      = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
}
resource "aws_elasticache_subnet_group" "clinic" {
  name       = local.name
  subnet_ids = aws_subnet.data[*].id
}
resource "aws_elasticache_replication_group" "clinic" {
  replication_group_id       = local.name
  description                = "Clinic Hans cache"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = "cache.t3.small"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  subnet_group_name          = aws_elasticache_subnet_group.clinic.name
  security_group_ids         = [aws_security_group.tier["redis"].id]
  snapshot_retention_limit   = 0
}
resource "aws_s3_bucket" "exams" {
  bucket        = "${local.name}-exames-${data.aws_caller_identity.current.account_id}-${var.region}"
  force_destroy = false
}
resource "aws_s3_bucket_public_access_block" "exams" {
  bucket                  = aws_s3_bucket.exams.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_versioning" "exams" {
  bucket = aws_s3_bucket.exams.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "exams" {
  bucket = aws_s3_bucket.exams.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_policy" "exams_tls" {
  bucket = aws_s3_bucket.exams.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Deny", Principal = "*", Action = "s3:*",
    Resource  = [aws_s3_bucket.exams.arn, "${aws_s3_bucket.exams.arn}/*"],
    Condition = { Bool = { "aws:SecureTransport" = "false" } }
  }] })
}
resource "aws_dynamodb_table" "prescriptions" {
  name         = "${local.name}-receitas"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"
  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }
  point_in_time_recovery { enabled = true }
  server_side_encryption { enabled = true }
  deletion_protection_enabled = true
}
resource "aws_sqs_queue" "dlq" {
  for_each                  = toset(["jobs", "notificacoes"])
  name                      = "${local.name}-${each.key}-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}
resource "aws_sqs_queue" "main" {
  for_each                   = aws_sqs_queue.dlq
  name                       = "${local.name}-${each.key}"
  visibility_timeout_seconds = 300
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 345600
  sqs_managed_sse_enabled    = true
  redrive_policy             = jsonencode({ deadLetterTargetArn = each.value.arn, maxReceiveCount = 5 })
}
resource "aws_sqs_queue_redrive_allow_policy" "main" {
  for_each             = aws_sqs_queue.dlq
  queue_url            = each.value.url
  redrive_allow_policy = jsonencode({ redrivePermission = "byQueue", sourceQueueArns = [aws_sqs_queue.main[each.key].arn] })
}
resource "aws_iam_role" "scheduler" {
  name = "${local.name}-scheduler"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Principal = { Service = "scheduler.amazonaws.com" }, Action = "sts:AssumeRole",
    Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
  }] })
}
resource "aws_iam_role_policy" "scheduler" {
  role = aws_iam_role.scheduler.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect   = "Allow", Action = "sqs:SendMessage",
    Resource = [aws_sqs_queue.main["jobs"].arn, aws_sqs_queue.dlq["jobs"].arn]
  }] })
}
resource "aws_scheduler_schedule" "exams" {
  name                         = "${local.name}-exames-12h"
  schedule_expression          = "cron(0 0,12 * * ? *)"
  schedule_expression_timezone = "America/Sao_Paulo"
  flexible_time_window { mode = "OFF" }
  target {
    arn      = aws_sqs_queue.main["jobs"].arn
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ type = "CHECK_READY_EXAMS", schemaVersion = 1 })
    dead_letter_config { arn = aws_sqs_queue.dlq["jobs"].arn }
    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 3
    }
  }
  depends_on = [aws_iam_role_policy.scheduler]
}
resource "aws_ses_domain_identity" "clinic" {
  count  = var.email_domain == null ? 0 : 1
  domain = var.email_domain
}
resource "aws_ses_domain_dkim" "clinic" {
  count  = var.email_domain == null ? 0 : 1
  domain = aws_ses_domain_identity.clinic[0].domain
}
