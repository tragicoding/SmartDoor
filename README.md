# Physical-Computing-Project

A collaborative code space for physical computing project developers.

**Chung-Ang University, Art and Technology**
**Final Project for Physical Computing**

- Hwang Ha-rin (황하린)
- Kim Jin-seo (김진서)
- Kim Gang-ryun (김강륜)

---

### **Team Roles**

- **Kim Gang-ryun (김강륜):** Front-end Developer / UI Architect
- **Kim Jin-seo (김진서):** Back-end Developer / Software Architect
- **Hwang Ha-rin (황하린):** Hardware Engineer / Model Architect

---

### **Git Branch Strategy**

- `main`: Final version for deployment.
- `staging`: Pre-release version for demonstration.
- `dev`: Integration branch for developed features.
- `jinseo`: Backend development branch.
- `Gangryun`: Frontend development branch.
- `harin`: Hardware development branch.

#### **How to connect to Git:**
```bash
# 1. Clone the repository
git clone https://github.com/tragicoding/Physical-Computing-Project.git

# 2. Navigate to the project directory
cd Physical-Computing-Project

# 3. Fetch all branches
git fetch

# 4. Check out your personal branch (e.g., Gangryun or harin)
git checkout Gangryun
```
> **Note:** Please work on your personal branch. I will merge changes into `dev`. Pull from `dev` to get the latest integrated updates. **Do not push directly to `main`**.

---

### **Project Guidelines**

- **Commit Messages:** When pushing or committing, please write clear and descriptive commit messages detailing your changes.
- **Dependencies:** If you add new libraries or packages for frontend, backend, or Arduino, please share the updates with the team.
- **Directory Structure:** The directory structure is flexible. Feel free to create files and folders within your designated part of the project.
- **API Documentation:** Refer to `docs/API.md` for all API endpoints.
- **Setup Guide:** See `docs/SETUP.md` for development environment setup and instructions.
- **Terminal:** On Windows, `npm` commands may be blocked by PowerShell's security policy. It is recommended to use **CMD** or **Git Bash**.
- **Installation:** To install dependencies, run `npm install` in the relevant directory (e.g., `/server`).
- **Part-specific READMEs:** Check the `README.md` files in `/web`, `/server`, and `/firmware` for specific details on variables and endpoints.
- **`.gitignore`:** `node_modules` and `.env` files are ignored. `.env` configurations should be coordinated personally. `node_modules` is excluded due to its size and can be regenerated with `npm install`.

---

### **Developer Workflow**

1.  **Clone Repository:**
    ```bash
    git clone https://github.com/tragicoding/Physical-Computing-Project.git
    cd Physical-Computing-Project
    ```
2.  **Start Infra with Docker (MySQL + Mosquitto):**
    ```bash
    cd deploy
    docker compose up -d
    cd ..
    ```
3.  **Install NPM Modules (Backend, first time only):**
    ```bash
    cd server
    npm install   #first time only
    ```
4.  **Run the Backend Server:**
    ```bash
    npm start        # or, if you prefer a dev script: npm run dev
    ```
5.  **Run the Mobile Client (Expo, first time only):**
    ```bash
    cd web/client
    npm install   #first time only
    npx expo start
    ```
6.  **Debugging & Data Inspection:**
    - Use **Postman** to call REST APIs (e.g. `/api/auth/login`, `/api/users/daily-lists`, `/api/weather/weekly`).
    - Use **DataGrip** (or any SQL client) to inspect the MySQL DB (users, devices, daily_lists, etc.).

### **Docker**
The project uses Docker for `mysql` and `mqtt`. The current implementation with port forwarding might have security/stability risks that need to be addressed later.

---

## **1. System Architecture**

```
Physical-Computing-Project/
│
├─ server/                                # ⭐ Express + Prisma + MQTT Backend (Node.js)
│  ├─ prisma/
│  │  └─ schema.prisma                    # DB Schema(User, Device, Bin, Alarm, DailyList) <!-- 2025/11/23 강륜 추가 -->
│  │
│  ├─ src/
│  │  ├─ config/
│  │  │  ├─ prisma.js                     # PrismaClient Singleton
│  │  │  └─ mqtt.js                       # MQTT Client + Topic Dispatcher
│  │  │
│  │  ├─ controllers/
│  │  │  ├─ auth_ctrl.js                  # 회원가입/로그인
│  │  │  ├─ user_ctrl.js                  # 사용자 프로필/주소/알람
│  │  │  ├─ device_ctrl.js                # 디바이스 등록/하트비트
│  │  │  ├─ bin_ctrl.js                   # REST 기반 Bin 상태 업데이트/조회
│  │  │  ├─ mqtt_door_ctrl.js             # MQTT 문센서 처리
│  │  │  ├─ mqtt_bin_ctrl.js              # MQTT 우산함 상태 처리
│  │  │  ├─ weather_ctrl.js               # 도어 이벤트/주간 날씨 조회 및 TTS 등 날씨 관련 HTTP 처리 <!-- 2025/11/23 강륜 추가 -->
│  │  │  └─ daily_list_ctrl.js            # 날짜별 To-get 리스트(DailyList) 조회/저장 REST 처리 <!-- 2025/11/23 강륜 추가 -->
│  │  │
│  │  ├─ services/
│  │  │  ├─ weather_svc.js                # 날씨 API(OpenWeather 등) 호출 및 강수 정보 분석 <!-- 2025/11/23 강륜 추가 -->
│  │  │  └─ tts_svc.js                    # MQTT → 스피커 CMD 전송
│  │  │
│  │  ├─ middleware/
│  │  │  ├─ auth.js                       # JWT 인증 + Device Secret 인증
│  │  │  ├─ validate.js                   # Joi Validation
│  │  │  └─ error_handler.js              # 글로벌 에러 핸들러
│  │  │
│  │  ├─ routes/
│  │  │  ├─ auth_routes.js                # /api/auth
│  │  │  ├─ user_routes.js                # /api/users
│  │  │  ├─ device_routes.js              # /api/devices
│  │  │  ├─ bin_routes.js                 # /api/bins
│  │  │  └─ weather_routes.js             # /api/weather (주간 날씨 등) <!-- 2025/11/23 강륜 추가 -->
│  │  │
│  │  └─ utils/
│  │     └─ logger.js                     # winston logger
│  │
│  ├─ .env                                # 서버 모든 환경변수
│  ├─ package.json
│  └─ server.js                           # ⭐ 서버 엔트리포인트
│
│
├─ firmware/                              # ⭐ 각 ESP32 소스코드
│  ├─ door_sensor/
│  │  └─ door_sensor.ino                  # door/{device_id}/sensed publish
│  │
│  ├─ umbrella_bin/
│  │  └─ umbrella_bin.ino                 # bin/{device_id}/status publish
│  │
│  └─ speaker_tts/
│     └─ speaker_tts.ino                  # speaker/{device_id}/cmd subscribe
│
│
├─ web/                                   # ⭐ Expo React Native Frontend (모바일 앱)
│  ├─ client/                             # Expo 프로젝트 루트
│  │  ├─ App.js / app.json / index.js
│  │  └─ app/                             # screens, components, services(api/location), store 등
│  └─ README.md
│
│
├─ deploy/                                # ⭐ Docker Infra
│  ├─ docker-compose.yml                  # mysql + mosquitto + adminer
│  ├─ mosquitto.conf                      # MQTT 설정파일
│  ├─ mosquitto_passfile                  # mosquitto username/password
│  └─ .env                                # docker 전용 환경변수(옵션)
│
│
└─ docs/
   ├─ API.md                               # REST API 명세
   └─ SETUP.md                             # 개발 환경 구축 가이드


## **2. Architecture Overview**

This is a hybrid, event-driven system combining a traditional web architecture (React, Node.js, MySQL) with IoT devices (ESP32/Arduino) and an MQTT broker.

-   **Frontend ↔ Backend:** REST (HTTP/JSON)
-   **Device ↔ Backend:** MQTT (pub/sub)
-   **Backend ↔ DB:** Prisma ORM (MySQL)

## **3. Data Flow**

```
[React App]  <-- REST -->  [Node.js / Express]  <-- ORM -->  [MySQL]
                                  |
                            (MQTT Client)
                                  |
                                  v
                       [MQTT Broker (Mosquitto)]
                         /         |         \\
                        /          |          \\
[ESP32 door_sensor]  [ESP32 bin]  [ESP32 speaker]
     (publish)        (publish)      (subscribe)
```

-   **React:** Handles UI for login, dashboard, and alarm management.
-   **Express:** Manages authentication, business logic, weather data integration, and device command publishing.
-   **MySQL:** Persists user, device, umbrella bin, and alarm data.
-   **Mosquitto:** Collects device events and delivers commands with low latency.
-   **ESP32:** Publishes sensor events, reports umbrella bin status, and subscribes to speaker commands.

| Path           | Protocol        | Payload      | Purpose                            |
| :------------- | :-------------- | :----------- | :--------------------------------- |
| React ↔ Node   | REST(HTTP/JSON) | JWT, JSON    | Login, settings, status queries    |
| Node ↔ MySQL   | Prisma (ORM)    | SQL abstract | Data persistence                   |
| ESP32 ↔ Broker | MQTT (TCP/IP)   | JSON message | Publish events, subscribe to commands |
| Node ↔ Broker  | MQTT Client     | JSON message | Receive events, publish commands   |

## **4. Service Execution Example**

```
1. ESP32(door_sensor) --(publish: door/{sensor_id}/sensed {user_id, ...})--> MQTT Broker
2. MQTT Client(Node)  --(subscribe: door/+/sensed)----------------------> Receives event
3. Node(Decision)     -- Fetches user coordinates & bin status -> get_rain_time(lat, lon)
                      -- Creates voice_msg ("Rain expected at HH:MM...")
4. Node → ESP32(speaker) --(publish: speaker/{device_id}/cmd {type:'tts', ...})
5. Node → (Optional) ESP32(bin) --(publish: box/{device_id}/cmd {act:'open', ...})
6. React(App)         --(REST: GET /api/bins/status)-------------------> Reflects current status
```

## **5. API Endpoints (Frontend-Backend)**

| Method/Path                  | Request Body                                               | Response                  | Description                                           |
| :--------------------------- | :--------------------------------------------------------- | :------------------------ | :---------------------------------------------------- |
| `POST /api/auth/signup`      | `{ email, pw, name?, road_address?, detail_address?, device_serial? }` | `{ user_id }` | 회원가입 (기본 정보 + 선택 주소/기기 시리얼)               | <!-- 2025/11/23 강륜 추가 -->
| `POST /api/auth/login`       | `{ email, pw }`                                            | `{ token }`               | 로그인(JWT)                                            |
| `GET /api/users/me`          | (JWT)                                                      | User Profile              | 내 정보 조회                                            |
| `PUT /api/users/address`     | `{ lat, lon, name?, road_address?, detail_address?, pw?, device_serial? }` | `{ ok, lat, lon, name, pw, road_address, detail_address, device_serial }` | 사용자 집 주소/프로필/비밀번호/기기 시리얼 설정/수정 | <!-- 2025/11/23 강륜 추가 -->
| `POST /api/users/alarms`     | `{ alarm_text }`                                           | `{ alarm_id }`            | 사용자 알람 추가                                        |
| `GET /api/users/alarms`      | (JWT)                                                      | `{ alarms:[...] }`        | 알람 목록 조회                                          |
| `POST /api/devices/register` | `{ serial, type, name }`                                   | `{ device_id }`           | 기기 등록(사용자 ↔ 기기 연결)                             |
| `GET /api/bins/status`       | `?device_id=` (but 내부적으로 serial 기반)                   | `{ bin }`                 | 우산함 상태 조회                                         |
| `GET /api/weather/weekly`    | Query: `lat`, `lon`, `test?`                               | `{ days: [{ date, sky, pty, tmp, tmx, tmn, pop }] }` | 주간 날씨 조회(프론트 홈/모달) | <!-- 2025/11/23 강륜 추가 -->
| `GET /api/users/daily-lists`      | Query: `date_key` (`YYYY-MM-DD`)                      | `{ date_key, items:[{id,text,selected},...] }` | 특정 날짜의 To-get 리스트 조회       | <!-- 2025/11/23 강륜 추가 -->
| `GET /api/users/daily-lists/all`  | (JWT)                                                 | `{ lists:[{date_key,items:[{id,text,selected},...]}, ...] }` | **현재 로그인 사용자의 모든 날짜별 To-get 리스트 일괄 조회** | <!-- 2025/11/23 강륜 추가 -->
| `PUT /api/users/daily-lists`      | `{ date_key, items:[{id,text,selected},...] }`        | `{ ok, date_key, items:[...] }` | 날짜별 To-get 리스트 저장(업서트)                   | <!-- 2025/11/23 강륜 추가 -->


## **6. MQTT Topics (Arduino-Backend)**

| Topic Format           | Payload(JSON)                    | Description         |
| ---------------------- | -------------------------------- | ------------------- |
| `door/{serial}/sensed` | `{ ts: <timestamp> }` (optional) | 문 센서 이벤트(근접/여닫힘)    |
| `bin/{serial}/status`  | `{ remain, cap, is_open }`       | 우산함 잔여 우산 개수 / 문 열림 |


## **7. File Dependencies (Summary)**

```
routes/*  ->  controllers/*  ->  services/*  ->  config/prisma.js (DB)
                                           ->  config/mqtt.js   (MQTT)
middleware/* - (Validation, Auth, Error Handling)
server.js  - (Bootstrap all modules)
```

## **8. Naming Conventions**

All naming follows **snake_case** (e.g., `user_id`, `rain_time`).

#### **A) Common Keys**
| Variable       | Type         | From → To                     | Description                                            |
| :------------- | :----------- | :---------------------------- | :----------------------------------------------------- |
| `user_id`      | int          | Frontend/ESP32 → Backend      | User identifier                                        |
| `device_id`    | int          | Frontend/ESP32 ↔ Backend      | Device identifier (bin, speaker, etc.)                 |
| `device_serial`| string       | Frontend/Backend ↔ DB         | 사용자 입력 기기 시리얼(스티커 ID, `User.device_serial`)   | <!-- 2025/11/23 강륜 추가 -->
| `sensor_id`    | int          | ESP32(door) → Backend         | Door/proximity sensor identifier                       |
| `lat`, `lon`   | number       | Frontend → Backend            | User address coordinates for weather                   |
| `remain`, `cap`| int          | ESP32(bin) → Backend          | Bin's remaining/capacity of umbrellas                  |
| `is_open`      | boolean      | ESP32(bin) → Backend          | Bin's door status                                      |
| `alarm_text`   | string       | Frontend → Backend            | Personalized alarm text (e.g., "Car keys")             |
| `name`         | string       | Frontend → Backend            | Device display name                                    |
| `type`         | string(enum) | Frontend → Backend/Node → ESP | `DOOR_SENSOR`, `UMBRELLA_BIN`, `SPEAKER`               |
| `date_key`     | string(YYYY-MM-DD) | Frontend → Backend      | 일자별 To-get 리스트 식별용 날짜 키 (`DailyList.date_key`) | <!-- 2025/11/23 강륜 추가 -->

#### **B) Auth & Security**
| Variable        | Type         | From → To              | Description                               |
| :-------------- | :----------- | :--------------------- | :---------------------------------------- |
| `token`         | string       | Frontend → Backend(Header) | JWT access token                          |
| `Authorization` | string(Header) | Frontend → Backend     | `Bearer ${token}` format                  |
| `secret`        | string       | Frontend/ESP32 → Backend | Shared secret for devices (dev stage)     |
| `email`, `pw`   | string       | Frontend → Backend     | Credentials for signup/login              |

#### **C) REST Request/Response Variables**
**Request Body/Query (Frontend → Backend)**
| Endpoint                     | Fields                                                                             |
| :--------------------------- | :--------------------------------------------------------------------------------- |
| `POST /api/auth/signup`      | `email`, `pw`, `name?`, `road_address?`, `detail_address?`, `device_serial?`       | <!-- 2025/11/23 강륜 추가 -->
| `POST /api/auth/login`       | `email`, `pw`                                                                      |
| `PUT /api/users/address`     | `lat`, `lon`, `name?`, `road_address?`, `detail_address?`, `pw?`, `device_serial?` | <!-- 2025/11/23 강륜 추가 -->
| `POST /api/users/alarms`     | `alarm_text`                                                                       |
| `POST /api/devices`          | `user_id`, `type`, `name`, `secret`                                                |
| `POST /api/bins/update`      | `device_id`, `remain`, `cap`, `is_open`, `secret`                                  |
| `GET /api/bins/status`       | `device_id` (query)                                                                |
| `GET /api/users/daily-lists` | `date_key` (query, `YYYY-MM-DD`)                                                   | <!-- 2025/11/23 강륜 추가 -->
| `PUT /api/users/daily-lists` | `date_key`, `items:[{id,text,selected}]`                                           | <!-- 2025/11/23 강륜 추가 -->
| `GET /api/weather/weekly`    | `lat`, `lon`, `test?` (query)                                                      | <!-- 2025/11/23 강륜 추가 -->

**Response (Backend → Frontend)**
| Context       | Example Fields                                        |
| :------------ | :---------------------------------------------------- |
| Login         | `token`                                               |
| My Info       | `id`, `email`, `lat`, `lon`                           |
| Alarm List    | `alarms: [{id, user_id, text}, ...]`                  |
| Bin Status    | `bin: { device_id, remain, cap, is_open, updatedAt }` |
| Device Create | `device_id`                                           |
| Common        | `message`, `ok`                                       |
| Daily List    | `date_key`, `items:[{id,text,selected},...]`          | <!-- 2025/11/23 강륜 추가 -->
| Weekly Weather| `days:[{date, sky, pty, tmp, tmx, tmn, pop}]`         | <!-- 2025/11/23 강륜 추가 -->

#### **D) MQTT Payload/Topic Variables**
**ESP32 → Backend (Publish)**
| Topic                     | Payload (JSON)                                | Description         |
| :------------------------ | :-------------------------------------------- | :------------------ |
| `door/{sensor_id}/sensed` | `{ "user_id", "sensor_id", "ts" }`            | Sensor trigger event|
| `bin/{device_id}/status`  | `{ "device_id", "remain", "cap", "is_open" }` | Bin status report   |

**Backend → ESP32 (Publish)**
| Topic                        | Payload (JSON)                             | Description             |
| :--------------------------- | :----------------------------------------- | :---------------------- |
| `speaker/{device_id}/cmd`    | `{ "type": "tts", "text": voice_msg }`     | Speaker TTS command     |
| `box/{device_id}/cmd` (optional) | `{ "act": "open", "close_in": 10000 }` | Bin door open/close cmd |

#### **E) Internally Generated Variables**
| Variable    | Type         | Generated In          | Used For                                  |
| :---------- | :----------- | :-------------------- | :---------------------------------------- |
| `rain_time` | string\|null | `services/weather_svc`| Frontend response, TTS message generation |
| `voice_msg` | string       | `controllers/weather_ctrl`| ESP32 Speaker (`speaker/{...}/cmd`)       |
| `alarms`    | string[]     | `controllers/user_ctrl` | Frontend response, TTS message suffix     |

#### **F) Environment Variables (.env)**
| Variable        | Purpose                                            |
| :-------------- | :------------------------------------------------- |
| `PORT`          | Backend port                                       |
| `CORS_ORIGIN`   | Allowed frontend domain                            |
| `DATABASE_URL`  | MySQL connection URL                               |
| `JWT_SECRET`    | JWT signing secret                                 |
| `DEVICE_SECRET` | Shared device secret (for development)             |
| `MQTT_HOST`     | MQTT broker address (`mqtt://...` or `mqtts://...`)|

## **9. Arduino/ESP32 (MQTT Connection Example)**

```c++
// In firmware/.../main.ino

// #include <WiFi.h>
// #include <PubSubClient.h>

// Variables used: user_id, sensor_id, device_id, remain, cap, is_open, ts
// Broker/Topics: MQTT_HOST, door/{sensor_id}/sensed, bin/{device_id}/status, etc.
```

## **10. Local Execution Order**

```bash
# 1. Start services (MySQL, Mosquitto, Adminer)
docker compose up -d

# 2. Start the backend server
cd server && npm i && npx prisma migrate dev && npm run dev

# 3. Create user, save coordinates, and register devices via API

# 4. Connect ESP32 to Wi-Fi, connect to MQTT broker (PC's IP), and publish sensor events

# 5. Backend subscribes, processes, and publishes commands to the speaker/bin
```

---

## **11. 2025/11/23 이후 스키마 & API 확장 요약**

- **User 스키마 확장 (`prisma/schema.prisma`)**
  - `name: String?` – 사용자 이름
  - `road_address: String?` – 도로명 주소
  - `detail_address: String?` – 상세 주소
  - `pw: String?` – 과제용 원문 비밀번호 저장 필드 (실서비스에서는 절대 사용 금지)
  - `device_serial: String?` – 회원가입/마이페이지에서 입력하는 기기 시리얼 문자열
  - `daily_lists: DailyList[]` – 날짜별 To-get 리스트와의 1:N 관계

- **DailyList 모델 추가 (`prisma/schema.prisma`)**
  - `DailyList`는 **사용자별 · 날짜별 To-get 리스트 전체를 JSON으로 저장**하는 테이블
  - 필드
    - `user_id: Int` – `User` FK
    - `date_key: String` – `YYYY-MM-DD` 형식 날짜 키
    - `items: Json` – 프론트에서 사용하는 리스트 항목 배열 전체를 그대로 직렬화해 저장
    - `created_at`, `updated_at` – 생성/수정 시점 자동 기록
  - 복합 Unique 인덱스 `@@unique([user_id, date_key], name: "user_id_date_key")` 로 **한 사용자당 하루에 한 건만 존재**하도록 보장

---

## **12. 신규/확장 REST API 정리 (프론트 연동 관점)**

### 12-1. 회원가입 확장 (`POST /api/auth/signup`)

- **요청 Body (최신)**
  - `{ email, pw, name, road_address, detail_address, device_serial }`
  - `name`, `road_address`, `detail_address`, `device_serial` 은 선택 입력이지만, 프론트(회원가입 화면)에서는 필수로 받고 있음
- **처리 로직 (`src/controllers/auth_ctrl.js`)**
  - `pw` 를 `bcrypt` 로 해싱하여 `pw_hash` 저장
  - 과제 편의를 위해 `pw` 원문도 함께 저장 (나중에 마이페이지에서 비밀번호 표시/수정 가능)
  - 주소/이름/기기 시리얼까지 함께 `User` 레코드에 반영
- **응답**
  - `{ user_id }` (기존과 동일)

### 12-2. 마이페이지/로그인용 프로필 조회 (`GET /api/users/me`)

- **컨트롤러 (`src/controllers/user_ctrl.js#get_my_profile`)**
  - `id`, `email`, `lat`, `lon` 뿐만 아니라 **User 모델의 전체 컬럼을 그대로 반환**
    - `name`, `road_address`, `detail_address`, `device_serial`, `pw` 등 포함 (과제용)
  - 프론트 `MyPageScreen`에서 이 값을 받아 **내 정보 화면 초기값**으로 사용

### 12-3. 사용자 주소/프로필/비밀번호/기기 시리얼 업데이트 (`PUT /api/users/address`)

- **요청 Body (최신)**
  - `lat: number` – 필수, 소수점 8자리까지 허용
  - `lon: number` – 필수
  - `name?: string` – 선택, 1~50자
  - `road_address?: string` – 선택, 도로명 주소
  - `detail_address?: string` – 선택, 상세 주소
  - `pw?: string` – 선택, 6자 이상일 때만 비밀번호 변경 처리
  - `device_serial?: string` – 선택, 1~64자 / 빈 문자열 허용 (마이페이지에서 초기화 용도)
- **Joi 검증 (`src/routes/user_routes.js`)**
  - `lat`, `lon` 필수 + 나머지는 optional 로 선언
  - `device_serial` 은 `.allow('')` 로 빈 문자열 허용
- **컨트롤러 처리 (`set_user_address`)**
  - 요청 Body를 기반으로 `data` 객체 생성: `{ lat, lon, name, road_address, detail_address }`
  - `pw` 가 함께 들어오면
    - `data.pw = pw` (원문 저장, 과제용)
    - `data.pw_hash = bcrypt.hash(pw, 10)` 로 해시도 갱신
  - `device_serial` 이 truthy 면 `data.device_serial = device_serial` 로 함께 업데이트
  - `prisma.user.update` 실행 후, 응답에는
    - `{ ok: true, lat, lon, name, pw, road_address, detail_address, device_serial }` 만 select 하여 반환
- **프론트 사용처**
  - 로그인 직후: `LoginScreen` 이 기기 위치를 얻은 뒤 `lat/lon` 만 채워 호출 (이름/주소/비밀번호/시리얼은 건드리지 않음)
  - 마이페이지: 사용자가 편집한 이름/주소/비밀번호/기기 시리얼 + 최신 좌표를 함께 저장하는 용도로 호출

### 12-4. 날짜별 To-get 리스트 API (`GET/PUT /api/users/daily-lists`)

- **목적**
  - 모바일 앱(Home/Calendar 화면)의 **날짜별 외출 리스트(To-get 리스트)** 를 서버 DB에 저장/조회하기 위한 전용 API

- **라우트 정의 (`src/routes/user_routes.js`)**
  - 공통: `router.use(user_auth)` 로 JWT 인증된 사용자만 접근 가능

  - `GET /api/users/daily-lists`
    - Query: `date_key` (필수, 정규식 `^\d{4}-\d{2}-\d{2}$`)
    - Handler: `get_daily_list`

  - `PUT /api/users/daily-lists`
    - Body:
      - `date_key: string` – `YYYY-MM-DD` 형식
      - `items: Array<{ id: string; text: string; selected: boolean }>`
    - Handler: `upsert_daily_list`

- **컨트롤러 구현 (`src/controllers/daily_list_ctrl.js`)**

  - `get_daily_list`
    - `prisma.dailyList.findUnique({ where: { user_id_date_key: { user_id: req.user_id, date_key } } })`
    - 레코드가 없으면: `{ date_key, items: [] }` 로 응답 (404 대신 빈 리스트)
    - 레코드가 있으면: `{ date_key: daily_list.date_key, items: daily_list.items ?? [] }` 반환

  - `upsert_daily_list`
    - `prisma.dailyList.upsert` 로 (user_id, date_key) 기준 업서트
    - `update: { items }`, `create: { user_id: req.user_id, date_key, items }`
    - 응답: `{ ok: true, date_key, items }`

- **프론트 연동 요약**
  - 홈 화면 `HomeScreen` 에서 날짜 선택 시마다 `GET /api/users/daily-lists?date_key=...` 로 리스트 조회
  - 리스트 편집 모달 `ListInputModal` 에서 저장할 때 `PUT /api/users/daily-lists` 로 해당 날짜 리스트를 통째로 저장
  - 캘린더 화면 `CalendarScreen` 은 프론트 로컬 상태의 `listData` 를 활용해 **리스트가 있는 날짜를 점(dot)으로 표시**

### 12-5. 주간 날씨 조회 API (`GET /api/weather/weekly`)

- **엔드포인트 (`src/routes/weather_routes.js`)**
  - `GET /api/weather/weekly?lat={lat}&lon={lon}[&test=true]`
  - Query 검증: `lat`, `lon` 필수 / `test`는 `'true' | 'false'` 선택
  - Handler: `get_weekly_weather_ctrl`

- **컨트롤러 (`src/controllers/weather_ctrl.js#get_weekly_weather_ctrl`)**
  - `lat`, `lon` 을 `parseFloat` 후 유효성 체크
  - `is_test` 여부를 쿼리로 받아 `services/weather_svc.get_weekly_weather(lat, lon, is_test)` 호출
  - 응답: `{ days: [{ date, sky, pty, tmp, tmx, tmn, pop }, ...] }`

- **서비스 (`src/services/weather_svc.js#get_weekly_weather`)**
  - `is_test === true` 인 경우: 기존 더미 데이터 반환 (테스트용)
  - 실제 모드: OpenWeather **16일 Daily Forecast API** (`/data/2.5/forecast/daily`) 를 호출해 `list[]` 배열을 파싱
    - 각 일자에 대해
      - `date` (YYYY-MM-DD 문자열)
      - `sky` (하늘 상태 코드 매핑 → 1=맑음, 3=구름많음, 4=흐림)
      - `pty` (강수 형태 코드 → 0=없음, 1=비, 2=눈)
      - `tmp` / `tmx` / `tmn` (일평균/최고/최저 기온)
      - `pop` (강수 확률, %)
  - 에러 시: 로그를 남기고 빈 배열 또는 기본 템플릿으로 대체

- **프론트 사용처**
  - `HomeScreen` 상단 카드 + `WeeklyWeatherModal` 이 이 API를 직접 사용
  - 위치 권한 허용 시 현재 좌표를 기반으로 호출, 실패 시에는 기본 더미 값으로 UI만 유지

---

## **13. 프론트엔드(Expo 앱)와의 최신 연동 포인트 요약**

- **회원가입 플로우**
  - Expo 앱 `RegisterScreen` → `POST /api/auth/signup`
  - 이름/주소/기기 시리얼까지 한 번에 서버로 전송, 응답 `user_id`는 로컬 스토어에 저장

- **로그인 + 좌표 저장**
  - `LoginScreen` → `POST /api/auth/login` 으로 JWT 획득
  - 로그인 직후 `expo-location` 으로 현재 좌표를 얻고, `PUT /api/users/address` 로 `lat/lon` 을 저장

- **마이페이지 동기화**
  - 앱 최초 진입 시 `GET /api/users/me` 로 서버 기준 최신 프로필 수신
  - 편집 후 완료 시, 이름/주소/비밀번호/기기 시리얼 + 좌표를 `PUT /api/users/address` 로 저장

- **날짜별 리스트**
  - `HomeScreen` / `CalendarScreen` 이 공통으로 `GET/PUT /api/users/daily-lists` 사용
  - 서버에는 `DailyList` 모델로 저장되어, 나중에 하드웨어/웹 대시보드에서도 재사용 가능

- **주간 날씨**
  - 앱에서 좌표를 기반으로 `GET /api/weather/weekly` 호출 후, 홈 상단/모달 UI를 채움

