# 출력값 정의
output "server_public_ip" {
  value = ncloud_public_ip.server_pip.public_ip
}

output "db_service_name" {
  value = ncloud_mysql.smishing_db.service_name
}
