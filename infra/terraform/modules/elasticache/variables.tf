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

variable "node_type" {
  type        = string
  default     = "cache.t3.medium"
  description = "Redis Cache node type size"
}

variable "allowed_security_groups" {
  type        = list(string)
  description = "Allowed security groups list"
}
