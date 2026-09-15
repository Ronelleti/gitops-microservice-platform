variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  type    = string
  default = "gitops-microservice-platform"
}

# Free-tier eligible for accounts created on/after 2025-07-15: t3.micro,
# t3.small, t4g.micro, t4g.small. Accounts created before that date should
# use t2.micro or t3.micro. Check https://aws.amazon.com/free for your
# account's current eligible list before changing this.
variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "key_name" {
  description = "Name of an EC2 key pair that already exists in this AWS account/region (create it in the console or with `aws ec2 create-key-pair` first)"
  type        = string
}

variable "my_ip_cidr" {
  description = "Your public IP in CIDR form (e.g. 203.0.113.10/32), used to restrict SSH/app access. Find yours at https://checkip.amazonaws.com"
  type        = string
}
