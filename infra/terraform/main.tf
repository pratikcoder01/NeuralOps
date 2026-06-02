terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Base VPC network
resource "aws_vpc" "neuralops_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "neuralops-production-vpc"
    Environment = "production"
  }
}

# 2. Database Subnet Group
resource "aws_db_subnet_group" "db_subnets" {
  name       = "neuralops-db-subnets"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "neuralops-db-subnet-group"
  }
}

# 3. RDS PostgreSQL Instance
resource "aws_db_instance" "postgres_db" {
  allocated_storage      = 20
  max_allocated_storage  = 100
  db_name                = "neuralops"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t4g.micro"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
  skip_final_snapshot    = true

  tags = {
    Name        = "neuralops-rds-postgres"
    Environment = "production"
  }
}

# 4. ECS Anomaly Detection Platform Cluster
resource "aws_ecs_cluster" "ecs_cluster" {
  name = "neuralops-services-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
