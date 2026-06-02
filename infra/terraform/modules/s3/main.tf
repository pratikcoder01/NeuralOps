resource "aws_s3_bucket" "metrics_archive" {
  bucket        = "${var.environment}-neuralops-metrics-archive"
  force_destroy = var.environment == "prod" ? false : true

  tags = {
    Name        = "${var.environment}-neuralops-metrics-archive"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "ml_artifacts" {
  bucket        = "${var.environment}-neuralops-ml-artifacts"
  force_destroy = var.environment == "prod" ? false : true

  tags = {
    Name        = "${var.environment}-neuralops-ml-artifacts"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "metrics_versioning" {
  bucket = aws_s3_bucket.metrics_archive.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "ml_versioning" {
  bucket = aws_s3_bucket.ml_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "metrics_crypto" {
  bucket = aws_s3_bucket.metrics_archive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ml_crypto" {
  bucket = aws_s3_bucket.ml_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
