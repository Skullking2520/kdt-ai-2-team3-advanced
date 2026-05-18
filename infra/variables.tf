variable "ncp_access_key" {
  description = "NCP Access Key"
  type        = string
  sensitive   = true
}

variable "ncp_secret_key" {
  description = "NCP Secret Key"
  type        = string
  sensitive   = true
}

variable "db_username" {
  description = "DB username"
  type        = string
  sensitive   = false
}

variable "db_password" {
  description = "DB Admin Password"
  type        = string
  sensitive   = true
}

variable "admin_public_ip" {
  description = "admin_public_ip"
  type        = string
}

variable "inference_server_login_keyname" {
  description = "inference_server_login_keyname"
  type        = string
}
