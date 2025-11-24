변수명 / 함수명 규칙

네이밍은 전부 스네이크케이스(user_id, sensor_id, rain_time, voice_msg)


메서드 엔드 포인트 (프런트앤드-백앤드)
| 메서드/경로                       | 요청 바디 / 쿼리                            | 응답                  | 설명                      |
| ---------------------------- | ------------------------------------- | ------------------- | ----------------------- |
| `POST /api/auth/signup`      | `{ email, pw }`                       | `{ user_id }`       | 회원가입                    |
| `POST /api/auth/login`       | `{ email, pw }`                       | `{ token }`         | 로그인(JWT)                |
| `GET /api/users/me`          | (JWT)                                 | 사용자 프로필             | 내 정보 조회                 |
| `PUT /api/users/address`     | `{ lat, lon }`                        | `{ ok, lat, lon }`  | 사용자 좌표(집 주소) 저장         |
| `POST /api/users/alarms`     | `{ alarm_text }`                      | `{ alarm_id }`      | 알람 추가                   |
| `GET /api/users/alarms`      | (JWT)                                 | `{ alarms: [...] }` | 알람 목록 조회                |
| `POST /api/devices/register` | `{ serial, type, name }`              | `{ device_id }`     | **기기 등록(사용자 ↔ 기기 매핑)**  |
| `GET /api/bins/status`       | `?device_id=`                         | `{ bin }`           | 우산함 상태 조회               |
| `POST /api/bins/update`*옵션*  | `{ device_id, remain, cap, is_open }` | `{ ok, bin }`       | 개발용/테스트용 우산함 상태 수동 업데이트 |



인증·보안 관련
| 변수명             | 타입           | 어디서 → 어디로       | 용도/설명                                   |
| --------------- | ------------ | --------------- | --------------------------------------- |
| `token`         | string       | 프런트 → 백엔드(헤더)   | JWT 액세스 토큰                              |
| `Authorization` | string(헤더)   | 프런트 → 백엔드       | `Bearer ${token}` 형식                    |
| `email`         | string       | 프런트 → 백엔드       | 회원가입/로그인 이메일                            |
| `pw`            | string       | 프런트 → 백엔드       | 회원가입/로그인 비밀번호                           |
| `serial`        | string(6자리)  | 프런트/ESP32 ↔ 백엔드 | 기기 고유 식별자(스티커에 적히는 값, MQTT 토픽 중간에 사용)   |
| `secret`*옵션*    | string       | 프런트 → 백엔드(REST) | 개발용 디바이스 공유키(`/api/bins/update` 등 테스트용) |
| `MQTT_USERNAME` | string(.env) | 서버 → Mosquitto  | MQTT 브로커 계정 아이디                         |
| `MQTT_PASSWORD` | string(.env) | 서버 → Mosquitto  | MQTT 브로커 계정 비밀번호                        |



 REST(프런트 ↔ 백엔드) 요청/응답 변수

요청 바디/쿼리 (프런트 → 백엔드)
(1) 사용자 관련
| 엔드포인트                    | 필드            |
| ------------------------ | ------------- |
| `POST /api/auth/signup`  | `email`, `pw` |
| `POST /api/auth/login`   | `email`, `pw` |
| `PUT /api/users/address` | `lat`, `lon`  |
| `POST /api/users/alarms` | `alarm_text`  |
(2) 기기 관련
| 엔드포인트                        | 필드                                      |
| ---------------------------- | --------------------------------------- |
| `POST /api/devices/register` | `serial`, `type`, `name`                |
| `GET /api/bins/status`       | `device_id` *(query)*                   |
| `POST /api/bins/update`*옵션*  | `device_id`, `remain`, `cap`, `is_open` |









응답(백엔드 → 프런트)
| 상황        | 응답 필드(예시)                                                  |
| --------- | ---------------------------------------------------------- |
| 회원가입      | `{ user_id }`                                              |
| 로그인       | `{ token }`                                                |
| 내 정보 조회   | `{ id, email, lat, lon, created_at }`                      |
| 알람 추가     | `{ alarm_id }`                                             |
| 알람 목록     | `{ alarms: [{ id, user_id, text }, ...] }`                 |
| 우산함 상태 조회 | `{ bin: { device_id, remain, cap, is_open, updated_at } }` |
| 디바이스 등록   | `{ device_id }`                                            |
| 공통 에러     | `{ message }` 또는 `{ message, details }`                    |
| OK 응답(일부) | `{ ok: true, ... }`                                        |


백엔드 내부 생성 변수 (프런트/TTS용)
| 변수명         | 타입       | 생성 위치            | 사용하는 곳                      |                 |
| ----------- | -------- | ---------------- | --------------------------- | --------------- |
| `rain_time` | string   | null             | `weather_svc`               | 프런트 응답 / TTS 생성 |
| `voice_msg` | string   | `mqtt_door_ctrl` | `speaker/{serial}/cmd` 로 발행 |                 |
| `alarms`    | string[] | `user_ctrl`      | TTS 꼬리말 문구 생성               |                 |



공통 키(도메인/DB 스키마 기반)
| 변수명          | 타입           | 어디서 ↔ 어디로             | 용도/설명                                         |
| ------------ | ------------ | --------------------- | --------------------------------------------- |
| `user_id`    | int          | 백엔드 ↔ DB / 백엔드 ↔ 프런트  | 사용자 식별자(자동 증가 PK). 프런트는 응답으로만 보고, 직접 만들지는 않음. |
| `device_id`  | int          | 백엔드 ↔ DB / 백엔드 ↔ 프런트  | 디바이스 식별자(자동 증가 PK). REST에서 특정 기기를 지정할 때 사용.   |
| `serial`     | string(6자리)  | ESP32/프런트 ↔ 백엔드 ↔ DB  | 기기 고유 문자열 ID. MQTT 토픽 중간 값이자 기기 등록 시 입력하는 값.  |
| `type`       | string(enum) | 프런트 → 백엔드 / DB        | `DOOR_SENSOR`, `UMBRELLA_BIN`, `SPEAKER`      |
| `name`       | string       | 프런트 → 백엔드 / DB        | 사용자가 알아보기 쉬운 기기 표시 이름                         |
| `lat`        | number       | 프런트 → 백엔드 / DB        | 사용자 주소 위도(기상 API 입력)                          |
| `lon`        | number       | 프런트 → 백엔드 / DB        | 사용자 주소 경도(기상 API 입력)                          |
| `alarm_text` | string       | 프런트 → 백엔드 / DB        | 개인화 알람 텍스트(예: `"차 키"`, `"시험 서류"`)             |
| `remain`     | int          | ESP32(bin) → 백엔드 → DB | 우산함 남은 우산 개수                                  |
| `cap`        | int          | ESP32(bin) → 백엔드 → DB | 우산함 최대 수용량                                    |
| `is_open`    | boolean      | ESP32(bin) → 백엔드 → DB | 우산함 문 열림 상태                                   |


환경변수
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
