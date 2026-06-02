variable "aws_region" {
  type        = string
  description = "The target AWS Region for deployment."
  default     = "us-east-1"
}

variable "subnet_ids" {
  type        = list(string)
  description = "VPC Subnet IDs where RDS database should deploy."
  default     = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
}

variable "db_username" {
  type        = string
  description = "Master username for PostgreSQL RDS Database."
  default     = "neuralops"
}

variable "db_password" {
  type        = string
  description = "Master password for PostgreSQL RDS Database."
  sensitive   = true
  default     = "neuralops-prod-secure-pw-change-me"
}
