#개발환경 세팅

0. 언어개발 및 버전 정보
| 구성 요소                   | 권장 버전                    |
| ----------------------- | ------------------------ |
| Node.js                 | 20.x 이상                  |
| npm                     | 10.x 이상                  |
| Docker Desktop          | 최신                       |
| MySQL                   | 8.x                      |
| Mosquitto (MQTT Broker) | 2.x                      |
| ESP32                   | (Arduino Core 2.0.11 이상) |
| VSCode + PlatformIO     | 선택                       |

1. Docker 실행(MYSQL , MQTT)

cd deploy : deplou 디렉토리로 이동
docker compose up -d  : docker compose 열기

포트번호:
mysql: localhost:3306
mosquitto: localhost:1883

2. 백앤드 실행
cd server
npm install
npx prisma migrate dev
npm run dev

실행 후 -> http://localhost:4000

3. 아두이노 wifi & MQTT 연결 예시

WiFi.begin("YourSSID", "YourPassword");
client.setServer("192.168.0.10", 1883);
client.connect("door_sensor_1", "smartdoor_mqtt", "smartdoor_mqtt_pw");
client.publish("door/1/sensed", "{\"user_id\":1,\"sensor_id\":1}");

4. 환경 변수 (.env)

.env 파일은 server/ 안에 저장
-> .env 파일 확인

5. 기본동작 실행
| 단계 | 트리거                   | 확인 항목                   
| -- | ------------------------- | --------------------------- |
| 1  | ESP32 Wi-Fi 연결           | IP 출력                       
| 2  | MQTT 브로커 연결           | Mosquitto 로그                
| 3  | `door/1/sensed` 발행       | 서버 콘솔에 수신 로그                
| 4  | 날씨 API 응답              | `rain_time`, `voice_msg` 생성 
| 5  | `speaker/{id}/cmd` 발행    | ESP32 스피커 수신                
| 6  | 앱에서 `/api/bins/status` 조회 | 최신 상태 표시                    



