# 스마트 도어 플레이트 & 우산 보관함 (백엔드 서버)

이 프로젝트는 현관에 부착된 센서, 스피커, 우산 보관함과 연동하여 사용자에게 외출 시 날씨 정보, 개인 알람, 우산 소지 여부를 음성으로 안내하는 시스템의 백엔드 서버입니다.

## 주요 기능

- **사용자 인증**: JWT를 이용한 회원가입 및 로그인 기능
- **디바이스 관리**: 사용자의 IoT 디바이스(센서, 스피커 등) 등록 및 관리
- **날씨 연동 음성 안내**: 현관 센서 감지 시, 사용자의 위치를 기반으로 날씨 정보를 조회하고 비가 올 경우 음성으로 안내
- **우산 보관함 연동**: 비 예보 시 우산 보관함의 상태(우산 유무)를 확인하여 함께 안내
- **개인화 알람**: 사용자가 설정한 알람(예: "지갑 챙기기")을 외출 시 함께 음성으로 안내
- **MQTT 통신**: ESP32와 같은 IoT 디바이스와 실시간으로 데이터를 주고받기 위한 MQTT 프로토콜 지원

## 디렉토리 구조

```
server/
├───.env                # 환경변수 설정 파일 (DB 정보, API 키 등)
├───package.json        # 프로젝트 정보 및 의존성 목록
├───server.js           # Express 서버 메인 엔트리 파일
├───README.md           # 프로젝트 설명서 (현재 파일)
├───prisma/
│   └───schema.prisma   # Prisma DB 스키마 정의
└───src/
    ├───config/         # 설정 관련 모듈
    │   ├───mqtt.js     # MQTT 브로커 연결 및 메시지 핸들러 설정
    │   └───prisma.js   # Prisma 클라이언트 초기화
    ├───controllers/    # HTTP 요청을 직접 처리하는 로직 (Request/Response 담당)
    │   ├───auth_ctrl.js    # 회원가입, 로그인
    │   ├───user_ctrl.js    # 사용자 정보, 주소, 알람 관리
    │   ├───device_ctrl.js  # 디바이스 등록, 하트비트
    │   ├───bin_ctrl.js     # 우산 보관함 상태 관리
    │   └───weather_ctrl.js # 날씨 기반 음성 안내 생성 및 전송
    ├───middleware/     # Express 미들웨어
    │   ├───auth.js         # JWT 토큰 및 디바이스 시크릿 검증
    │   ├───error_handler.js # 전역 오류 처리
    │   └───validate.js     # Joi를 이용한 요청 데이터 유효성 검사
    ├───routes/         # API 엔드포인트 정의 및 컨트롤러 연결
    │   ├───auth_routes.js
    │   ├───user_routes.js
    │   ├───device_routes.js
    │   ├───bin_routes.js
    │   └───weather_routes.js
    ├───services/       # 비즈니스 로직 (외부 API 연동, 복잡한 계산 등)
    │   ├───tts_svc.js      # MQTT를 통해 스피커로 TTS 명령 전송
    │   └───weather_svc.js  # 날씨 API 조회 및 강수 정보 분석
    └───utils/          # 유틸리티 모듈
        └───logger.js       # 로그 기록용 winston 로거
```

## API 명세 및 변수

(기존 내용은 최대한 유지하되, 최신 코드 기준으로 일부 수정될 수 있습니다.)

### 공통 키 (도메인/DB 스키마 기반)
| 변수명 | 타입 | 어디서→어디로 | 용도/설명 |
|---|---|---|---|
| `user_id` | int | 프런트/ESP32 → 백엔드 | 사용자 식별자(권한/좌표/알람 조회) |
| `device_id` | int | 프런트/ESP32 ↔ 백엔드 | 디바이스 식별자(우산함/스피커 등 공통) |
| `sensor_id` | int | ESP32(door) → 백엔드 | 도어/근접 센서 식별자 |
| `lat`, `lon` | number | 프런트 → 백엔드 | 사용자 주소 위경도(기상조회 입력) |
| `remain`, `cap` | int | ESP32(bin) → 백엔드 | 우산함 남은 우산 개수 / 최대 수용량 |
| `is_open` | boolean | ESP32(bin) → 백엔드 | 우산함 문 열림 상태 |
| `alarm_text` | string | 프런트 → 백엔드 | 개인화 알람 항목 텍스트(예: “차키”) |

### 인증·보안 관련
| 변수명 | 타입 | 어디서→어디로 | 용도/설명 |
|---|---|---|---|
| `token` | string | 프런트 → 백엔드(헤더) | JWT 액세스 토큰 (`Bearer ${token}`) |
| `secret` | string | ESP32 → 백엔드 | 디바이스 인증용 공유키 |
| `email`, `pw` | string | 프런트 → 백엔드 | 회원가입/로그인 |

### 주요 REST API 엔드포인트

- `POST /api/auth/signup`: 회원가입
- `POST /api/auth/login`: 로그인
- `GET /api/users/me`: 내 정보 조회
- `PUT /api/users/address`: 주소(좌표) 설정
- `POST /api/users/alarms`: 개인 알람 추가
- `GET /api/users/alarms`: 내 알람 목록 조회
- `POST /api/devices`: 디바이스 등록
- `POST /api/devices/{device_id}/heartbeat`: 디바이스 하트비트
- `POST /api/bins/update`: 우산 보관함 상태 업데이트 (주로 디바이스용)
- `GET /api/bins/status`: 우산 보관함 상태 조회 (주로 프론트엔드용)
- `POST /api/weather/door-sensed`: 현관 센서 감지 이벤트 처리
  - `?test=true` 쿼리 파라미터 추가 시 테스트 모드로 동작

### MQTT 토픽

- `door/{device_id}/sensed` (Publish by ESP32): 현관 센서 감지 시
- `bin/{device_id}/status` (Publish by ESP32): 우산 보관함 상태 변경 시
- `speaker/{device_id}/cmd` (Subscribe by ESP32): 서버가 스피커에 TTS 명령을 내릴 때

## 실행 방법

1.  **의존성 설치**
    ```bash
    npm install
    ```

2.  **Prisma 설정**
    ```bash
    # schema.prisma 파일을 기반으로 Prisma 클라이언트 생성
    npx prisma generate
    ```

3.  **.env 파일 생성**
    `.env.example` 파일을 복사하여 `.env` 파일을 만들고, 아래 환경변수를 설정합니다.
    ```env
    DATABASE_URL="mysql://user:password@localhost:3306/database_name"
    JWT_SECRET="your_jwt_secret"
    DEVICE_SECRET="your_device_secret"
    CORS_ORIGIN="http://localhost:3000" # 프론트엔드 주소
    MQTT_HOST="mqtt://localhost:1883"
    OPENWEATHER_API_KEY="your_openweathermap_api_key" # 날씨 조회를 위한 API 키
    ```

4.  **서버 실행**
    ```bash
    npm start
    ```