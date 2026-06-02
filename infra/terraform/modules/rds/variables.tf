variable "environment" {
  type        = string
  description = "Environment name (dev/prod)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs"
}

variable "db_instance_class" {
  type        = string
  default     = "db.t3.large"
  description = "RDS DB Instance Class Size"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "RDS Database Password"
}

variable "multi_az" {
  type        = bool
  default     = true
  description = "Enable Multi-AZ"
}

variable "allowed_security_groups" {
  type        = list(string)
  description = "List of security groups allowed to access RDS (usually EKS Node SG)"
}
