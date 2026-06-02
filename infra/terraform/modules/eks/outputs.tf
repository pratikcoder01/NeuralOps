output "cluster_name" {
  value       = aws_eks_cluster.this.name
  description = "EKS Cluster Name"
}

output "cluster_endpoint" {
  value       = aws_eks_cluster.this.endpoint
  description = "EKS Cluster API Endpoint"
}

output "cluster_certificate_authority" {
  value       = aws_eks_cluster.this.certificate_authority[0].data
  description = "EKS Cluster Certificate Authority Data"
}

output "oidc_provider_arn" {
  value       = aws_iam_openid_connect_provider.this.arn
  description = "OIDC Provider IAM ARN"
}

output "oidc_provider_url" {
  value       = aws_iam_openid_connect_provider.this.url
  description = "OIDC Provider URL"
}

output "node_security_group_id" {
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
  description = "EKS Cluster Primary Security Group ID"
}
