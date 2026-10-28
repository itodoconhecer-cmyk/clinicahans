output "allocation" {
  value = {
    public_alb       = aws_lb.public.dns_name
    internal_alb     = aws_lb.internal.dns_name
    frontend_url     = "https://${var.public_hostname}"
    ec2_groups       = { for k, v in aws_autoscaling_group.app : k => v.name }
    postgres         = aws_db_instance.clinic.address
    master_secret    = aws_db_instance.clinic.master_user_secret[0].secret_arn
    redis_tls        = aws_elasticache_replication_group.clinic.primary_endpoint_address
    exams_bucket     = aws_s3_bucket.exams.id
    prescriptions    = aws_dynamodb_table.prescriptions.name
    queues           = { for k, v in aws_sqs_queue.main : k => v.url }
    image_registries = { for k, v in aws_ecr_repository.images : k => v.repository_url }
  }
}
output "ses_dns" {
  value = var.email_domain == null ? null : {
    verification_name  = "_amazonses.${var.email_domain}"
    verification_value = aws_ses_domain_identity.clinic[0].verification_token
    dkim_tokens        = aws_ses_domain_dkim.clinic[0].dkim_tokens
  }
}
