output "rds_endpoint" {
  value       = aws_db_instance.this.endpoint
  description = "RDS Connection Endpoint"
}

output "rds_hostname" {
  value       = aws_db_instance.this.address
  description = "RDS Hostname address"
}

output "rds_port" {
  value       = aws_db_instance.this.port
  description = "RDS Port"
}
