 변수명 / 함수명 규칙

네이밍은 전부 스네이크케이스(user_id, sensor_id, rain_time, voice_msg)
 
 
 메서드 앤드 포인트 (아두이노-백앤드)

| 방향       | 토픽                      | 페이로드(JSON)                        | 설명           
| ---------- | ------------------------- | ------------------------------------- | ------------ 
| ESP → Node | `door/{sensor_id}/sensed` | `{ user_id, sensor_id, ts }`          | 근접/도어 감지 이벤트 
| ESP → Node | `bin/{device_id}/status`  | `{ device_id, remain, cap, is_open }` | 우산함 상태       
| Node → ESP | `speaker/{device_id}/cmd` | `{ type: 'tts', text: voice_msg }`    | 음성 안내        
| Node → ESP | `box/{device_id}/cmd`     | `{ act: 'open', close_in: 10000 }`    | 문 개폐 명령(선택)  
 
 
 
 MQTT(ESP32 ↔ 브로커 ↔ 백엔드) 페이로드/토픽 변수

ESP32 → 백엔드 (Publish)
| 토픽                     | 페이로드(JSON)                                |
| ---------------------- | ----------------------------------------- |
| `door/{serial}/sensed` | `{ "ts": 123456, "value": 1 }`            |
| `bin/{serial}/status`  | `{ "remain": x, "cap": x, "is_open": x }` |



백엔드 → ESP32 (Publish)
| 토픽                     | 페이로드(JSON)                             |
| ---------------------- | -------------------------------------- |
| `speaker/{serial}/cmd` | `{ "type": "tts", "text": voice_msg }` |
| `box/{serial}/cmd`     | `{ "act": "open", "close_in": 10000 }` |




백엔드 내부에서 계산/생성되어 외부로 전달되는 변수
| 변수명         | 타입       | 생성 위치            | 사용하는 곳                      |                 |
| ----------- | -------- | ---------------- | --------------------------- | --------------- |
| `rain_time` | string   | null             | `weather_svc`               | 프런트 응답 / TTS 생성 |
| `voice_msg` | string   | `mqtt_door_ctrl` | `speaker/{serial}/cmd` 로 발행 |                 |
| `alarms`    | string[] | `user_ctrl`      | TTS 꼬리말 문구 생성               |                 |
        


환경변수(.env)
| 변수명             | 역할 및 설명                    |
| --------------- | -------------------------- |
| `PORT`          | 백엔드 실행 포트                  |
| `CORS_ORIGIN`   | 프런트에서 접근 허용할 도메인           |
| `DATABASE_URL`  | MySQL 접속 URL               |
| `JWT_SECRET`    | JWT 서명용 시크릿                |
| `DEVICE_SECRET` | 일부 REST(테스트용) 디바이스 인증 키    |
| `MQTT_HOST`     | `mqtt://localhost:1883` 형식 |
| `MQTT_PORT`     | 기본 1883                    |
| `MQTT_USERNAME` | Mosquitto 로그인 ID           |
| `MQTT_PASSWORD` | Mosquitto 로그인 PW           |


아두이노/ESP32 (MQTT 연결—예시)
// firmware/.../main.ino
// #include <WiFi.h>
// #include <PubSubClient.h>
// 사용 변수: user_id, sensor_id, device_id, remain, cap, is_open, ts
// 브로커/토픽: MQTT_HOST, door/{sensor_id}/sensed, bin/{device_id}/status, speaker/{device_id}/cmd, box/{device_id}/cmd



공통 키(도메인/DB 스키마 기반)
| 변수명          | 타입           | 어디서→어디로                 | 용도/설명                                           
| ------------ | ------------ | ----------------------- | ----------------------------------------------- |
| `user_id`    | int          | 프런트/ESP32 → 백엔드         | 사용자 식별자(권한/좌표/알람 조회)                            
| `device_id`  | int          | 프런트/ESP32 ↔ 백엔드         | 디바이스 식별자(우산함/스피커 등 공통)                          
| `sensor_id`  | int          | ESP32(door) → 백엔드       | 도어/근접 센서 식별자                                    
| `lat`        | number       | 프런트 → 백엔드               | 사용자 주소 위도(기상조회 입력)                              
| `lon`        | number       | 프런트 → 백엔드               | 사용자 주소 경도(기상조회 입력)                              
| `remain`     | int          | ESP32(bin) → 백엔드        | 우산함 남은 우산 개수                                    
| `cap`        | int          | ESP32(bin) → 백엔드        | 우산함 최대 수용량                                      
| `is_open`    | boolean      | ESP32(bin) → 백엔드        | 우산함 문 열림 상태(센서 보고값)                             
| `alarm_text` | string       | 프런트 → 백엔드               | 개인화 알람 항목 텍스트(예: “차키”)                          
| `name`       | string       | 프런트 → 백엔드               | 디바이스 표시 이름                                      
| `type`       | string(enum) | 프런트 → 백엔드 / 백엔드 → ESP32 | 디바이스 타입: `DOOR_SENSOR` `UMBRELLA_BIN` `SPEAKER` 