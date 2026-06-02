terraform {
  backend "s3" {
    bucket         = "neuralops-terraform-state"
    key            = "environments/state.tfstate"
    region         = "us-east-1"
    dynamodb_table = "neuralops-terraform-locks"
    encrypt        = true
  }
}
