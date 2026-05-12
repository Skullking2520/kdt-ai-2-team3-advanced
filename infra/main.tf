# 1. VPC 생성
resource "ncloud_vpc" "smishing_vpc" {
  name            = "smishing-vpc"
  ipv4_cidr_block = "10.0.0.0/16"
}

# 2. Subnet 생성 (Server용)
resource "ncloud_subnet" "server_subnet" {
  vpc_no         = ncloud_vpc.smishing_vpc.id
  subnet         = "10.0.1.0/24"
  zone           = "KR-1"
  network_acl_no = ncloud_vpc.smishing_vpc.default_network_acl_no
  subnet_type    = "PUBLIC" # 외부 통신 필요
  name           = "server-subnet"
}

# db private subnet
resource "ncloud_subnet" "db_subnet" {
  vpc_no         = ncloud_vpc.smishing_vpc.id
  subnet         = "10.0.2.0/24"
  zone           = "KR-1"
  network_acl_no = ncloud_vpc.smishing_vpc.default_network_acl_no
  subnet_type    = "PRIVATE"
  name           = "db-subnet"
}

# 3. Cloud DB for MySQL 생성
resource "ncloud_mysql" "smishing_db" {
  database_name      = "smishing-static-checking-db"
  subnet_no          = ncloud_subnet.db_subnet.id
  server_name_prefix = "smishing-db"
  service_name       = "smishing-db"
  user_name          = var.db_username
  user_password      = var.db_password
  host_ip            = "10.0.2.%"
  is_ha              = false # stnadby server, 멀티존 해제
  # DB 서버 사양 (기본: 가장 낮은 사양 선택)
  # vcpu 2개, 메모리 4gb, 디스크 50gb, 요금 한달 17만원, 세대 g2
}

# 4. ACG (보안 그룹) 설정
resource "ncloud_access_control_group" "server_acg" {
  name   = "server-acg"
  vpc_no = ncloud_vpc.smishing_vpc.id
}

resource "ncloud_access_control_group_rule" "server_acg_rule" {
  access_control_group_no = ncloud_access_control_group.server_acg.id

  inbound {
    protocol    = "TCP"
    ip_block    = var.admin_public_ip
    port_range  = "22345" # ssh 포트
    description = "ssh Port"
  } # 최소 권한 원칙: http 제외 다른 포트는 다 deny, ip 한정

  inbound {
    protocol    = "TCP"
    ip_block    = "10.0.1.0/24" # 서버만 허용
    port_range  = "3306"        # mysql 포트
    description = "mysql subnet Port"
  }

  inbound {
    protocol    = "TCP"
    ip_block    = "0.0.0.0/0"
    port_range  = "80" # nginx 포트
    description = "http Port"
  }

  inbound {
    protocol    = "TCP"
    ip_block    = "0.0.0.0/0"
    port_range  = "443" # nginx 포트
    description = "https Port"
  }
  # outbound는 기본 허용.
}

# 서버 os 이미지 정의
data "ncloud_server_image_numbers" "kvm-image" {
  server_image_name = "ubuntu-24.04-base"
  filter {
    name   = "hypervisor_type"
    values = ["KVM"] # 커널을 하이퍼바이저로 동작하게 하는 오픈소스 가상화 기술
  }
}

# 서버 스펙 정의
data "ncloud_server_specs" "kvm-spec" {
  filter {
    name   = "server_spec_code"
    values = ["s2-g3"] # ncp 3세대 표준 서버
    # vcpu 2개, 메모리 8gb, 월 요금 82,240원.
  }
}

# 5. 서버 인스턴스 (FastAPI 추론용)
resource "ncloud_server" "ai_server" {
  name                = "smishing-inference-server"
  server_image_number = data.ncloud_server_image_numbers.kvm-image.image_number_list.0.server_image_number
  server_spec_code    = data.ncloud_server_specs.kvm-spec.server_spec_list.0.server_spec_code
  subnet_no           = ncloud_subnet.server_subnet.id
  #login_key_name      = var.inference_server_login_keyname
}

# 6. 공인 IP 할당
resource "ncloud_public_ip" "server_pip" {
  server_instance_no = ncloud_server.ai_server.instance_no
}
