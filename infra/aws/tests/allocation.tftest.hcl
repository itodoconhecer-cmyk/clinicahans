mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = { names = ["sa-east-1a", "sa-east-1c"] }
  }
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_ssm_parameter" {
    defaults = { value = "ami-0123456789abcdef0" }
  }
  mock_resource "aws_db_instance" {
    defaults = {
      address = "postgres.internal"
      master_user_secret = [{
        secret_arn    = "arn:aws:secretsmanager:sa-east-1:123456789012:secret:rds-master-test"
        kms_key_id    = "test"
        secret_status = "active"
      }]
    }
  }
}

variables {
  certificate_arn = "arn:aws:acm:sa-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000001"
  public_hostname = "clinica.example.com"
  app_secret_arn  = "arn:aws:secretsmanager:sa-east-1:123456789012:secret:clinicahans-test"
  backend_image   = "123456789012.dkr.ecr.sa-east-1.amazonaws.com/clinicahans-homolog/backend:release-001"
  frontend_image  = "123456789012.dkr.ecr.sa-east-1.amazonaws.com/clinicahans-homolog/frontend:release-001"
}

run "safe_initial_allocation" {
  command = plan
  assert {
    condition     = length(aws_subnet.public) == 2 && length(aws_subnet.app) == 2 && length(aws_subnet.data) == 2
    error_message = "As tres camadas devem ocupar duas zonas."
  }
  assert {
    condition     = aws_db_instance.clinic.multi_az && !aws_db_instance.clinic.publicly_accessible && aws_db_instance.clinic.storage_encrypted && aws_db_instance.clinic.deletion_protection
    error_message = "RDS deve ser privado, criptografado, Multi-AZ e protegido."
  }
  assert {
    condition     = aws_autoscaling_group.app["api"].desired_capacity == 0 && aws_autoscaling_group.app["worker"].desired_capacity == 0 && aws_autoscaling_group.app["web"].desired_capacity == 2
    error_message = "Alocacao inicial nao pode iniciar API sem usuario SQL ou worker inexistente."
  }
  assert {
    condition     = aws_scheduler_schedule.exams.schedule_expression == "cron(0 0,12 * * ? *)" && aws_scheduler_schedule.exams.schedule_expression_timezone == "America/Sao_Paulo"
    error_message = "Verificacao de exames deve ocorrer as 00h e 12h de Sao Paulo."
  }
  assert {
    condition     = aws_elasticache_replication_group.clinic.transit_encryption_enabled && aws_elasticache_replication_group.clinic.automatic_failover_enabled
    error_message = "Redis deve usar TLS e failover."
  }
  assert {
    condition     = alltrue([for t in aws_launch_template.app : t.metadata_options[0].http_tokens == "required"])
    error_message = "Todas as EC2 devem exigir IMDSv2."
  }
}

run "scaled_api" {
  command = plan
  variables { api_desired_capacity = 2 }
  assert {
    condition     = aws_autoscaling_group.app["api"].min_size == 2 && aws_autoscaling_group.app["api"].max_size == 6 && contains(keys(aws_autoscaling_policy.cpu), "api")
    error_message = "API iniciada deve permitir escala de 2 a 6 com politica de CPU."
  }
}

run "reject_unimplemented_worker" {
  command = plan
  variables { worker_desired_capacity = 1 }
  expect_failures = [aws_autoscaling_group.app["worker"]]
}
