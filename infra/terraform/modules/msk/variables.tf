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

variable "broker_node_type" {
  type        = string
  default     = "kafka.m5.large"
  description = "MSK Broker node instance type size"
}

variable "ebs_volume_size" {
  type        = number
  default     = 100
  description = "EBS storage volume size per broker (GB)"
}

variable "allowed_security_groups" {
  type        = list(string)
  description = "Allowed security groups list accessing MSK"
}
