variable "region" {
  type    = string
  default = "sa-east-1"
}
variable "environment" {
  type    = string
  default = "homolog"
  validation {
    condition     = contains(["homolog", "prod"], var.environment)
    error_message = "Use homolog ou prod."
  }
}
variable "certificate_arn" {
  type        = string
  description = "Certificado ACM validado na mesma regiao do ALB."
}
variable "public_hostname" {
  type        = string
  description = "DNS publico, sem protocolo; criar alias/CNAME para o ALB apos o apply."
}
variable "app_secret_arn" {
  type        = string
  description = "Secret existente com JWT_SECRET, DB_USER, DB_PASSWORD e bootstrap opcional. Nunca informar valores no tfvars."
}
variable "secret_kms_key_arn" {
  type        = string
  default     = null
  description = "Chave KMS se o secret da aplicacao usar chave propria."
}
variable "backend_image" {
  type        = string
  description = "Imagem ECR backend imutavel, preferencialmente com @sha256."
}
variable "frontend_image" {
  type        = string
  description = "Imagem ECR construida com infra/containers/frontend.Dockerfile."
}
variable "worker_image" {
  type        = string
  default     = ""
  description = "Imagem publicada do monolito com o worker de notificacoes; pode ser a mesma referencia de backend_image."
}
variable "api_desired_capacity" {
  type        = number
  default     = 0
  description = "Primeiro 0 para preparar usuario SQL; depois 1 para migrations; ampliar somente apos inicializacao."
  validation {
    condition     = var.api_desired_capacity >= 0 && var.api_desired_capacity <= 6
    error_message = "Capacidade API entre 0 e 6."
  }
}
variable "worker_desired_capacity" {
  type    = number
  default = 0
  validation {
    condition     = var.worker_desired_capacity >= 0 && var.worker_desired_capacity <= 6
    error_message = "Capacidade de workers entre 0 e 6."
  }
}
variable "instance_type" {
  type    = string
  default = "t3.small"
}
variable "email_domain" {
  type        = string
  default     = null
  description = "Dominio opcional do SES; exige publicacao dos registros DNS, sem enviar e-mails de verificacao."
}
