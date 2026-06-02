provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "../../modules/vpc"

  environment          = "dev"
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
}

module "eks" {
  source = "../../modules/eks"

  environment        = "dev"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  general_desired_size = 2
  general_max_size     = 4
  general_min_size     = 1
  
  gpu_desired_size = 0
  gpu_max_size     = 1
  gpu_min_size     = 0
}

module "rds" {
  source = "../../modules/rds"

  environment             = "dev"
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  db_instance_class       = "db.t3.medium"
  db_password             = var.db_password
  multi_az                = false
  allowed_security_groups = [module.eks.node_security_group_id]
}

module "elasticache" {
  source = "../../modules/elasticache"

  environment             = "dev"
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  node_type               = "cache.t3.micro"
  allowed_security_groups = [module.eks.node_security_group_id]
}

module "msk" {
  source = "../../modules/msk"

  environment             = "dev"
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  broker_node_type        = "kafka.t3.small"
  ebs_volume_size         = 20
  allowed_security_groups = [module.eks.node_security_group_id]
}

module "s3" {
  source = "../../modules/s3"

  environment = "dev"
}
