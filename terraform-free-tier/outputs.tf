output "instance_public_ip" {
  description = "Public IP - put this in ansible/inventory.ini as ansible_host"
  value       = aws_instance.app.public_ip
}

output "ssh_command" {
  value = "ssh -i <your-key.pem> ubuntu@${aws_instance.app.public_ip}"
}
