resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.environment}-neuralops-redis-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "redis" {
  name        = "${var.environment}-neuralops-redis-sg"
  description = "Redis ElastiCache Security Group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = "${var.environment}-neuralops-redis"
  description                = "NeuralOps Redis 7 Cluster"
  node_type                  = var.node_type
  port                       = 6379
  parameter_group_name       = "default.redis7.cluster.on"
  automatic_failover_enabled = true
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.redis.id]

  num_node_groups         = 2
  replicas_per_node_group = 1

  engine         = "redis"
  engine_version = "7.0"

  tags = {
    Name        = "${var.environment}-neuralops-redis"
    Environment = var.environment
  }
}
