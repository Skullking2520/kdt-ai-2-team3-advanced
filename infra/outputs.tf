# 출력값 정의
output "server_public_ip" {
  value = ncloud_public_ip.server_pip.public_ip
}

output "db_service_name" {
  value = ncloud_mysql.smishing_db.service_name
}

output "ssh_private_key" {
  value       = ncloud_login_key.loginkey.private_key
  description = "ncp server private key 출력"
  sensitive   = true
}
output "server_initial_password" {
  value     = data.ncloud_root_password.root_pwd.root_password
  sensitive = true
}
