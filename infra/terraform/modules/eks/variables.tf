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

variable "general_desired_size" {
  type    = number
  default = 3
}

variable "general_max_size" {
  type    = number
  default = 8
}

variable "general_min_size" {
  type    = number
  default = 2
}

variable "gpu_desired_size" {
  type    = number
  default = 1
}

variable "gpu_max_size" {
  type    = number
  default = 2
}

variable "gpu_min_size" {
  type    = number
  default = 0
}
