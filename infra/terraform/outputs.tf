output "vpc_id" {
  value       = aws_vpc.neuralops_vpc.id
  description = "The ID of the generated production VPC network."
}

output "db_endpoint" {
  value       = aws_db_instance.postgres_db.endpoint
  description = "The database endpoint to target connection strings."
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.ecs_cluster.name
  description = "The generated ECS service orchestration cluster name."
}
