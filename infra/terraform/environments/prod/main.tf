provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "../../modules/vpc"

  environment          = "prod"
  vpc_cidr             = "10.1.0.0/16"
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  private_subnet_cidrs = ["10.1.10.0/24", "10.1.11.0/24", "10.1.12.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
}

module "eks" {
  source = "../../modules/eks"

  environment        = "prod"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  general_desired_size = 3
  general_max_size     = 8
  general_min_size     = 2
  
  gpu_desired_size = 1
  gpu_max_size     = 2
  gpu_min_size     = 0
}

module "rds" {
  source = "../../modules/rds"

  environment             = "prod"
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  db_instance_class       = "db.t3.large"
  db_password             = var.db_password
  multi_az                = true
  allowed_security_groups = [module.eks.node_security_group_id]
}

module "elasticache" {
  source = "../../modules/elasticache"

  environment             = "prod"
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  node_type               = "cache.t3.medium"
  allowed_security_groups = [module.eks.node_security_group_id]
}

module "msk" {
  source = "../../modules/msk"

  environment             = "prod"
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  broker_node_type        = "kafka.m5.large"
  ebs_volume_size         = 100
  allowed_security_groups = [module.eks.node_security_group_id]
}

module "s3" {
  source = "../../modules/s3"

  environment = "prod"
}
