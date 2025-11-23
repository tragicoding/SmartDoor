



| 서비스                         | 포트   | 역할                            |
| --------------------------- | ---- | ----------------------------- |
| **MySQL**                   | 3306 | 데이터베이스 (사용자, 장치, 알람 정보 저장)    |
| **Adminer**                 | 8080 | DB 관리용 웹 UI                   |
| **Mosquitto (MQTT Broker)** | 1883 | 아두이노 ↔ 백엔드 간 메시지 통신 (Pub/Sub) |


필수 설치

Docker Desktop
PowerShell 또는 CMD
Git / Node.js

포트 점검
로컬 PC에서 아래 포트가 이미 사용 중이 아니어야 함
3306 (MySQL)
8080 (Adminer)
1883 (MQTT)