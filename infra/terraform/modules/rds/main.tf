resource "aws_db_subnet_group" "this" {
  name        = "${var.environment}-neuralops-rds-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "RDS private subnet group"

  tags = {
    Name        = "${var.environment}-neuralops-rds-subnet-group"
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.environment}-neuralops-rds-sg"
  description = "Access to RDS from EKS worker nodes only"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-neuralops-rds-sg"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.environment}-neuralops-rds-pg"
  family = "postgres15"

  parameter {
    name  = "rds.logical_replication"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Name        = "${var.environment}-neuralops-rds-pg"
    Environment = var.environment
  }
}

resource "aws_db_instance" "this" {
  identifier             = "${var.environment}-neuralops-postgres"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.db_instance_class
  allocated_storage      = 100
  max_allocated_storage  = 500
  storage_type           = "gp3"
  db_name                = "neuralops"
  username               = "neuralops"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.this.name
  
  multi_az               = var.multi_az
  skip_final_snapshot    = var.environment == "prod" ? false : true
  final_snapshot_identifier = "${var.environment}-neuralops-postgres-final-snapshot"

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:30-Sun:05:30"

  tags = {
    Name        = "${var.environment}-neuralops-postgres"
    Environment = var.environment
  }
}
