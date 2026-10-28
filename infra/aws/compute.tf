data "aws_ssm_parameter" "ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}
resource "aws_ecr_repository" "images" {
  for_each             = toset(["frontend", "backend", "worker"])
  name                 = "${local.name}/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}
resource "aws_cloudwatch_log_group" "app" {
  for_each          = toset(["web", "api", "worker"])
  name              = "/clinicahans/${var.environment}/${each.key}"
  retention_in_days = 30
}
resource "aws_iam_role" "ec2" {
  for_each = aws_cloudwatch_log_group.app
  name     = "${local.name}-${each.key}"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole"
  }] })
}
resource "aws_iam_role_policy_attachment" "ssm" {
  for_each   = aws_iam_role.ec2
  role       = each.value.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_role_policy_attachment" "ecr" {
  for_each   = aws_iam_role.ec2
  role       = each.value.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}
resource "aws_iam_role_policy" "logs" {
  for_each = aws_iam_role.ec2
  role     = each.value.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect   = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"],
    Resource = "${aws_cloudwatch_log_group.app[each.key].arn}:*"
  }] })
}
resource "aws_iam_role_policy" "application" {
  for_each = toset(["api", "worker"])
  role     = aws_iam_role.ec2[each.key].id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = var.app_secret_arn },
    { Effect = "Allow", Action = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:ChangeMessageVisibility", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"], Resource = [for q in aws_sqs_queue.main : q.arn] },
    { Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"], Resource = "${aws_s3_bucket.exams.arn}/*" },
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:UpdateItem", "dynamodb:TransactWriteItems"], Resource = aws_dynamodb_table.prescriptions.arn }
    ], var.secret_kms_key_arn == null ? [] : [
    { Effect = "Allow", Action = "kms:Decrypt", Resource = var.secret_kms_key_arn }
    ], var.email_domain == null ? [] : [
    { Effect = "Allow", Action = ["ses:SendEmail", "ses:SendRawEmail"], Resource = aws_ses_domain_identity.clinic[0].arn }
  ]) })
}
resource "aws_iam_instance_profile" "ec2" {
  for_each = aws_iam_role.ec2
  name     = each.value.name
  role     = each.value.name
}
resource "aws_lb" "public" {
  name                       = "${local.name}-public"
  load_balancer_type         = "application"
  subnets                    = aws_subnet.public[*].id
  security_groups            = [aws_security_group.tier["public-alb"].id]
  drop_invalid_header_fields = true
  enable_deletion_protection = true
}
resource "aws_lb" "internal" {
  name                       = "${local.name}-internal"
  internal                   = true
  load_balancer_type         = "application"
  subnets                    = aws_subnet.app[*].id
  security_groups            = [aws_security_group.tier["internal-alb"].id]
  drop_invalid_header_fields = true
}
resource "aws_lb_target_group" "web" {
  name     = "${local.name}-web"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.clinic.id
  health_check {
    path = "/healthz"
  }
}
resource "aws_lb_target_group" "api" {
  name                 = "${local.name}-api"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = aws_vpc.clinic.id
  deregistration_delay = 30
  health_check {
    path = "/actuator/health/readiness"
  }
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.public.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.certificate_arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}
resource "aws_lb_listener" "redirect" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
locals {
  deployments = {
    web    = { image = var.frontend_image, port = 80, desired = 2, min = 2, max = 4, sg = "web" }
    api    = { image = var.backend_image, port = 8080, desired = var.api_desired_capacity, min = min(var.api_desired_capacity, 2), max = var.api_desired_capacity > 1 ? 6 : 1, sg = "api" }
    worker = { image = var.worker_image, port = 0, desired = var.worker_desired_capacity, min = 0, max = 6, sg = "api" }
  }
  app_environment = {
    DB_URL                        = "jdbc:postgresql://${aws_db_instance.clinic.address}:5432/clinicahans?sslmode=require"
    DB_POOL_MAX                   = "10"
    CORS_ALLOWED_ORIGINS          = "https://${var.public_hostname}"
    CLINICAHANS_DEMO_DATA_ENABLED = "false"
    AWS_REGION                    = var.region
    REDIS_HOST                    = aws_elasticache_replication_group.clinic.primary_endpoint_address
    REDIS_SSL                     = "true"
    EXAMS_BUCKET                  = aws_s3_bucket.exams.id
    PRESCRIPTIONS_TABLE           = aws_dynamodb_table.prescriptions.name
    JOBS_QUEUE_URL                = aws_sqs_queue.main["jobs"].url
    NOTIFICATIONS_QUEUE_URL       = aws_sqs_queue.main["notificacoes"].url
  }
}
resource "aws_launch_template" "app" {
  for_each               = local.deployments
  name_prefix            = "${local.name}-${each.key}-"
  image_id               = data.aws_ssm_parameter.ami.value
  instance_type          = var.instance_type
  update_default_version = true
  vpc_security_group_ids = [aws_security_group.tier[each.value.sg].id]
  iam_instance_profile { name = aws_iam_instance_profile.ec2[each.key].name }
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }
  user_data = base64encode(templatefile("${path.module}/templates/ec2.sh.tftpl", {
    region     = var.region
    image      = each.value.image
    tier       = each.key
    port       = each.value.port
    secret_arn = each.key == "web" ? "" : var.app_secret_arn
    log_group  = aws_cloudwatch_log_group.app[each.key].name
    environment = base64encode(jsonencode(each.key == "web" ? {
      API_UPSTREAM = "${aws_lb.internal.dns_name}:80", DNS_RESOLVER = "169.254.169.253", TRUSTED_PROXY_CIDR = aws_vpc.clinic.cidr_block
      } : merge(local.app_environment, {
        EXAM_NOTIFICATION_WORKER_ENABLED = tostring(each.key == "worker")
        NOTIFICATION_PORTAL_URL          = "https://${var.public_hostname}/login/login.html"
    })))
  }))
  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${local.name}-${each.key}" }
  }
}
resource "aws_autoscaling_group" "app" {
  for_each                  = local.deployments
  name                      = "${local.name}-${each.key}"
  vpc_zone_identifier       = aws_subnet.app[*].id
  min_size                  = each.value.min
  max_size                  = each.value.max
  desired_capacity          = each.value.desired
  health_check_type         = each.key == "worker" ? "EC2" : "ELB"
  health_check_grace_period = 600
  target_group_arns         = each.key == "web" ? [aws_lb_target_group.web.arn] : each.key == "api" ? [aws_lb_target_group.api.arn] : []
  launch_template {
    id      = aws_launch_template.app[each.key].id
    version = aws_launch_template.app[each.key].latest_version
  }
  instance_refresh {
    strategy = "Rolling"
    preferences { min_healthy_percentage = 50 }
  }
  lifecycle {
    precondition {
      condition     = each.key != "worker" || each.value.desired == 0 || var.worker_image != ""
      error_message = "Informe worker_image com a imagem publicada do monolito antes de ativar suas instancias."
    }
  }
  depends_on = [aws_route.app_nat, aws_iam_role_policy.logs, aws_iam_role_policy.application, aws_iam_role_policy_attachment.ecr, aws_iam_role_policy_attachment.ssm, aws_lb_listener.api, aws_lb_listener.https]
}
resource "aws_autoscaling_policy" "cpu" {
  for_each               = { for k, v in local.deployments : k => v if k == "web" || (k == "api" && var.api_desired_capacity > 1) }
  name                   = "${local.name}-${each.key}-cpu"
  autoscaling_group_name = aws_autoscaling_group.app[each.key].name
  policy_type            = "TargetTrackingScaling"
  target_tracking_configuration {
    predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" }
    target_value = 60
  }
}
resource "aws_cloudwatch_metric_alarm" "dlq" {
  for_each            = aws_sqs_queue.dlq
  alarm_name          = "${local.name}-${each.key}-dlq"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions          = { QueueName = each.value.name }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "notBreaching"
}
