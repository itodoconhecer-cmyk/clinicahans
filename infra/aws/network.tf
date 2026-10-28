data "aws_availability_zones" "available" {
  state = "available"
}
locals {
  name = "clinicahans-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)
}
resource "aws_vpc" "clinic" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = local.name }
}
resource "aws_internet_gateway" "clinic" {
  vpc_id = aws_vpc.clinic.id
}
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.clinic.id
  cidr_block        = cidrsubnet(aws_vpc.clinic.cidr_block, 8, count.index)
  availability_zone = local.azs[count.index]
  tags              = { Name = "${local.name}-public-${count.index}" }
}
resource "aws_subnet" "app" {
  count             = 2
  vpc_id            = aws_vpc.clinic.id
  cidr_block        = cidrsubnet(aws_vpc.clinic.cidr_block, 8, 10 + count.index)
  availability_zone = local.azs[count.index]
  tags              = { Name = "${local.name}-app-${count.index}" }
}
resource "aws_subnet" "data" {
  count             = 2
  vpc_id            = aws_vpc.clinic.id
  cidr_block        = cidrsubnet(aws_vpc.clinic.cidr_block, 8, 20 + count.index)
  availability_zone = local.azs[count.index]
  tags              = { Name = "${local.name}-data-${count.index}" }
}
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.clinic.id
}
resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.clinic.id
}
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"
}
resource "aws_nat_gateway" "clinic" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.clinic, aws_route.internet]
}
resource "aws_route_table" "app" {
  count  = 2
  vpc_id = aws_vpc.clinic.id
}
resource "aws_route" "app_nat" {
  count                  = 2
  route_table_id         = aws_route_table.app[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.clinic[count.index].id
}
resource "aws_route_table_association" "app" {
  count          = 2
  subnet_id      = aws_subnet.app[count.index].id
  route_table_id = aws_route_table.app[count.index].id
}
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.clinic.id
}
resource "aws_route_table_association" "data" {
  count          = 2
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}
resource "aws_security_group" "tier" {
  for_each    = toset(["public-alb", "web", "internal-alb", "api", "postgres", "redis"])
  name_prefix = "${local.name}-${each.key}-"
  description = "Clinic Hans ${each.key}"
  vpc_id      = aws_vpc.clinic.id
}
resource "aws_vpc_security_group_egress_rule" "outbound" {
  for_each          = aws_security_group.tier
  security_group_id = each.value.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.tier["public-alb"].id
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}
resource "aws_vpc_security_group_ingress_rule" "http_redirect" {
  security_group_id = aws_security_group.tier["public-alb"].id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}
locals {
  connections = {
    web      = { source = "public-alb", destination = "web", port = 80 }
    api_lb   = { source = "web", destination = "internal-alb", port = 80 }
    api      = { source = "internal-alb", destination = "api", port = 8080 }
    postgres = { source = "api", destination = "postgres", port = 5432 }
    redis    = { source = "api", destination = "redis", port = 6379 }
  }
}
resource "aws_vpc_security_group_ingress_rule" "tiers" {
  for_each                     = local.connections
  security_group_id            = aws_security_group.tier[each.value.destination].id
  referenced_security_group_id = aws_security_group.tier[each.value.source].id
  ip_protocol                  = "tcp"
  from_port                    = each.value.port
  to_port                      = each.value.port
}
