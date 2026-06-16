# terraform으로 naver cloud platform 관리하기

테라폼은 코드로 인프라를 관리하는 오픈소스 도구로, 선언적 구문으로 클라우드 리소스를 생성, 수정, 삭제합니다. provider(서비스 연결), resource(자원 정의), state(상태 관리), variable(변수)입니다.

테라폼은 \*.tf로 인프라를 정의하며, hcl이라는 dsl을 사용합니다.

테라폼 공식 홈페이지를 참고해 사전 설치합니다.

terraform.tfvars가 깃허브에서 빠지는데 민감정보라 개인별로 추가해주셔야 합니다.

## 주요 명령어

```terraform
terraform init
# 프로젝트 디렉토리에서 프로바이더 플러그인을 다운로드하고 초기화

terraform plan
# 현재 상태와 코드를 비교하여 실제 인프라에 어떤 변경이 발생할지 미리 확인

terraform apply
# 계획된 변경사항을 적용해 리소스를 생성, 수정, 삭제

terraform destory
# 관리 중인 모든 리소스 삭제

terraform output
# outputs.tf 정의된 값 확인

terraform fmt
# 코드 스타일 표준 포맷화

terraform validate
# 코드 구문 오류 확인
```

## 인프라 사양 결정 이유 (Reasoning)

Server (Standard g2): AI 모델(인코더/디코더)을 메모리에 올려야 하므로, 4GB 미만의 Micro 사양은 OOM(Out of Memory) 발생 가능성이 큽니다. 8GB 메모리 사양을 선택하여 안정적인 추론 환경을 확보했습니다. (16gb도 고려 가능)

Cloud DB for MySQL: 직접 서버에 DB를 설치하는 것보다 NCP 매니지드 서비스(Cloud DB)를 사용하는 것이 백업 및 관리에 유리합니다. 패턴 매칭용 정적 데이터 위주이므로 Single 노드로 비용을 최적화했습니다. 물론 1주일동안만 돌릴 사양, 크레딧 10만원이라 가격상 가능한(?) 서비스였습니다.

Network (VPC): 최신 NCP 인프라 표준인 VPC 환경을 채택하여 보안 그룹(ACG) 제어를 용이하게 했습니다.

## 예시 폴더 구조

```txt
terraform-project/
├── provider.tf          # Provider 및 기본 설정
├── variables.tf         # 변수 정의
├── terraform.tfvars     # 실제 변수 값 (민감정보는 여기서 관리)
├── outputs.tf           # 출력값 정의 (예: 서버 IP, DB 접속 정보)
├── main.tf              # 주요 리소스 정의 (VPC, Subnet, DB, 서버 등)
├── modules/             # 모듈화된 코드 (선택사항)
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── server/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── db/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── README.md            # 프로젝트 설명
```
