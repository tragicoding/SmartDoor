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
│  │  │  ├─ auth_routes.js                      # /api/auth/*
│  │  │  ├─ user_routes.js                      # /api/users/*

Chung-Ang University undergraduate students majoring in Art and Technology
Final Project for Physical Computing
- Hwang Ha-rin(황하린), Kim Jin-seo(김진서), Kim Gang-ryun(김강륜)

김강륜 
-Front-end Developer / UI Architect
김진서
-Back-end Developer / Software Architect
황하린
-Hardware Engineer / Model Architect

*** 백앤드 입장에서의 README.md 이므로, git push / commit 할시에 commit message에 작업수정 history 명시 바랍니다.
      프런트앤드, 아두이노 에서 다른 팀원들 로컬에서 필요한 라이브러리 패키지 필요시 팀원들과 공유 부탁해여.
      각 영역에 대한 디렉토리 구조는 임의로 정해놓은 것이므로, 자유롭게 해당 디렉토리 안에서 생성하시면 됩니다.

0. 전체 API 포인트는 docs/API.md 확인 바랍니다.
0. 개발 환경 세팅 및 구동 방식은 docs/SETUP.md 확인 바랍니다.
0. (터미널) 각자의 로컬에서 실행할때, 윈도우 운영체제의 경우, powershell은 보안 정책으로 인해 npm 명령어가 안먹힐 수 있습니다.
   따라서, cmd창 사용 권장 합니다.(mac은 저도 모르겠어요 ㅎ)
0. 로컬에서 실행할 경우, npm install만 입력하시면 구동 가능합니다.
0. Front end, Backend, Firmware 각 파트별로 README.md에 변수 및 엔드포인트 명시 했습니다. 확인바랍니다.
0. Front end : /web
   Backend : /server
   Firmware(Arduino) : /firmwre
0. node.module과 .env는 git ignore에 포함하엿음. 추후에 env환경변수 내용은 개인적으로 조율합시다. 
   node.module은 너무 무거워서 ignore함. npm install 명령어 입력하면, package.json 목록에 따라 알아서 작동됨




0. 팀원들 workflow
   1) git clone
      git clone https://github.com/tragicoding/Physical-Computing-Project.git
   2) npm 모듈 설치
      cd server
      npm install
   3) 서버 실행
      npm run dev

0. docker (mysql, mqtt)
-docker + port 방식으로 구현 했는데, 보안/안정성에 위험이 있어서 이는 추후에 같이 고민을 해봐야 할것같습니다.



1. 아키텍쳐 구조

Physical-Computing-Project/
├─ server/                                      # 백엔드 루트(Express 앱)
│  ├─ prisma/
│  │  └─ schema.prisma                          # DB 스키마(User/Device/UmbrellaBin/Alarm 등)
│  ├─ src/
│  │  ├─ config/
│  │  │  ├─ prisma.js                           # PrismaClient 생성/공유
│  │  │  └─ mqtt.js                             # MQTT 클라이언트(브로커 연결·구독/발행)
│  │  ├─ middleware/
│  │  │  ├─ auth.js                             # JWT 인증(사용자), 디바이스 공유키 인증
│  │  │  ├─ validate.js                         # Joi 검증 미들웨어
│  │  │  └─ error_handler.js                    # 전역 에러 핸들러(JSON 응답 표준화)
│  │  ├─ controllers/
│  │  │  ├─ auth_ctrl.js                        # 회원가입/로그인(JWT 발급)
│  │  │  ├─ user_ctrl.js                        # 사용자 정보/좌표/알람 CRUD
│  │  │  ├─ device_ctrl.js                      # 디바이스 등록/하트비트
│  │  │  ├─ bin_ctrl.js                         # 우산함 상태 upsert/조회
│  │  │  └─ weather_ctrl.js                     # 도어 감지 → 비 예보/우산함 → TTS/문개폐 명령
│  │  ├─ services/
│  │  │  ├─ weather_svc.js                      # 기상청 API 연동·강수 시작 시각 계산
│  │  │  └─ tts_svc.js                          # 스피커 명령 전송(MQTT publish)
│  │  ├─ routes/
│  │  │  ├─ auth_routes.js                      # /api/auth/*
│  │  │  ├─ user_routes.js                      # /api/users/* (주소/알람)
│  │  │  ├─ device_routes.js                    # /api/devices/*
│  │  │  ├─ bin_routes.js                       # /api/bins/*
│  │  │  └─ weather_routes.js                   # /api/weather/*
│  │  └─ utils/
│  │     └─ logger.js                           # Winston logger
│  ├─ .env                                      # PORT, DB_URL, JWT_SECRET, etc.
│  ├─ package.json                              # Dependencies and scripts
│  └─ server.js                                 # App entry point
│
├─ web/                                         # Frontend (React/Vite)
│  └─ src/
│     └─ app.tsx                                # Example of backend REST calls
│
├─ firmware/                                    # ESP32 (Arduino)
│  ├─ door_sensor/door_sensor.ino               # MQTT publish
│  ├─ umbrella_bin/umbrella_bin.ino             # MQTT publish
│  └─ speaker_tts/speaker_tts.ino               # MQTT subscribe
│  
├─ deploy/
│  └─ docker-compose.yml                        # MySQL, Mosquitto, Adminer containers
│
└─ docs/
   ├─ API.md                                    # REST API specifications
   └─ SETUP.md                                  # Local setup guide
```

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

| Method/Path              | Request Body   | Response         | Description        |
| :----------------------- | :------------- | :--------------- | :----------------- |
| `POST /api/auth/signup`  | `{email, pw}`  | `{user_id}`      | User Signup        |
| `POST /api/auth/login`   | `{email, pw}`  | `{token}`        | User Login (JWT)   |
| `GET /api/users/me`      | (JWT)          | User Profile     | Get My Info        |
| `PUT /api/users/address` | `{lat, lon}`   | `{ok, lat, lon}` | Save Coordinates   |
| `POST /api/users/alarms` | `{alarm_text}` | `{alarm_id}`     | Add Alarm          |
| `GET /api/users/alarms`  | -              | `{alarms:[...]}` | List Alarms        |
| `GET /api/bins/status`   | `?device_id=`  | `{bin}`          | Get Bin Status     |

## **6. MQTT Topics (Arduino-Backend)**

| Direction  | Topic                     | Payload (JSON)                        | Description                |
| :--------- | :------------------------ | :------------------------------------ | :------------------------- |
| ESP → Node | `door/{sensor_id}/sensed` | `{ user_id, sensor_id, ts }`          | Proximity/door sensor event|
| ESP → Node | `bin/{device_id}/status`  | `{ device_id, remain, cap, is_open }` | Umbrella bin status        |
| Node → ESP | `speaker/{device_id}/cmd` | `{ type: 'tts', text: voice_msg }`    | Voice notification command |
| Node → ESP | `box/{device_id}/cmd`     | `{ act: 'open', close_in: 10000 }`    | Open/close door command    |

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
| Variable       | Type         | From → To                     | Description                               |
| :------------- | :----------- | :---------------------------- | :---------------------------------------- |
| `user_id`      | int          | Frontend/ESP32 → Backend      | User identifier                           |
| `device_id`    | int          | Frontend/ESP32 ↔ Backend      | Device identifier (bin, speaker, etc.)    |
| `sensor_id`    | int          | ESP32(door) → Backend         | Door/proximity sensor identifier          |
| `lat`, `lon`   | number       | Frontend → Backend            | User address coordinates for weather      |
| `remain`, `cap`| int          | ESP32(bin) → Backend          | Bin's remaining/capacity of umbrellas     |
| `is_open`      | boolean      | ESP32(bin) → Backend          | Bin's door status                         |
| `alarm_text`   | string       | Frontend → Backend            | Personalized alarm text (e.g., "Car keys")|
| `name`         | string       | Frontend → Backend            | Device display name                       |
| `type`         | string(enum) | Frontend → Backend/Node → ESP | `DOOR_SENSOR`, `UMBRELLA_BIN`, `SPEAKER`  |

#### **B) Auth & Security**
| Variable        | Type         | From → To              | Description                               |
| :-------------- | :----------- | :--------------------- | :---------------------------------------- |
| `token`         | string       | Frontend → Backend(Header) | JWT access token                          |
| `Authorization` | string(Header) | Frontend → Backend     | `Bearer ${token}` format                  |
| `secret`        | string       | Frontend/ESP32 → Backend | Shared secret for devices (dev stage)     |
| `email`, `pw`   | string       | Frontend → Backend     | Credentials for signup/login              |

#### **C) REST Request/Response Variables**
**Request Body/Query (Frontend → Backend)**
| Endpoint                   | Fields                                            |
| :------------------------- | :------------------------------------------------ |
| `POST /api/auth/signup`    | `email`, `pw`                                     |
| `POST /api/auth/login`     | `email`, `pw`                                     |
| `PUT /api/users/address`   | `lat`, `lon`                                      |
| `POST /api/users/alarms`   | `alarm_text`                                      |
| `POST /api/devices`        | `user_id`, `type`, `name`, `secret`               |
| `POST /api/bins/update`    | `device_id`, `remain`, `cap`, `is_open`, `secret` |
| `GET /api/bins/status`     | `device_id` (query)                               |

**Response (Backend → Frontend)**
| Context       | Example Fields                                        |
| :------------ | :---------------------------------------------------- |
| Login         | `token`                                               |
| My Info       | `id`, `email`, `lat`, `lon`                           |
| Alarm List    | `alarms: [{id, user_id, text}, ...]`                  |
| Bin Status    | `bin: { device_id, remain, cap, is_open, updatedAt }` |
| Device Create | `device_id`                                           |
| Common        | `message`, `ok`                                       |

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
│  │     └─ logger.js                           # winston 로거
│  ├─ .env                                      # PORT, DB URL, JWT_SECRET, DEVICE_SECRET, MQTT_HOST 등
│  ├─ package.json                              # 의존성/스크립트
│  └─ server.js                                 # 앱 진입점(Express 부트스트랩)
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


2. Architecure에 대한 설명

프런트(React)–백엔드(Node.js/Express)–DB(MySQL)의 전통적 웹 아키텍처 위에,
IoT 디바이스(ESP32/아두이노)와 MQTT 브로커를 결합한 하이브리드 이벤트 구동형 시스템이다.

프런트 ↔ 백엔드: REST(HTTP/JSON)

디바이스 ↔ 백엔드: MQTT(pub/sub)

백엔드 ↔ DB: Prisma ORM(MySQL)



3. 데이터 흐름

[React App]  ←──REST──→  [Node.js / Express]  ←──ORM──→  [MySQL]
                                  │
                                  │(MQTT Client)
                                  ↓
                           [MQTT Broker (Mosquitto)]
                             ↙           │            ↘
                [ESP32 door_sensor]  [ESP32 bin]  [ESP32 speaker]
                      (publish)        (publish)       (subscribe)


프런트 ↔ 백엔드: REST (HTTP/JSON)

백엔드 ↔ 아두이노(ESP32): MQTT (Pub/Sub, 실시간 푸시)    





React: 로그인/대시보드/알람 관리(UI)

Express: 인증, 비즈니스 로직, 기상 정보 통합, 디바이스 명령 발행

MySQL: 사용자/디바이스/우산함/알람 영구 저장

Mosquitto: 디바이스 이벤트 수집과 명령 전달(낮은 지연·양방향)

ESP32: 센서 이벤트 발행, 우산함 상태 보고, 스피커 명령 구독


| 경로           | 프로토콜        | 페이로드     | 목적                
| -------------- | --------------- | -------------| ----------------- 
| React ↔ Node   | REST(HTTP/JSON) | JWT, JSON    | 로그인/설정/상태 조회      
| Node ↔ MySQL   | Prisma(ORM)     | SQL 추상화   | 데이터 영속성           
| ESP32 ↔ Broker | MQTT(TCP/IP)    | JSON 메시지  | 이벤트 발행/명령 구독      
| Node ↔ Broker  | MQTT Client     | JSON 메시지  | 디바이스 이벤트 수신/명령 발행 


4. 서비스 구동 예시
ESP32(door_sensor) --(publish: door/{sensor_id}/sensed {user_id, sensor_id, ts})--> MQTT Broker
MQTT Client(Node)  --(subscribe: door/+/sensed)------------------------------------> 수신
Node(Decision)     -- 사용자 좌표/우산함 상태 조회 → get_rain_time(lat, lon)
                   -- voice_msg 생성("오늘 HH:MM부터 비…", +알람 단어)
Node → ESP32(speaker) --(publish: speaker/{device_id}/cmd {type:'tts', text: voice_msg})
Node → (선택) ESP32(bin) --(publish: box/{device_id}/cmd {act:'open', close_in:10000})
React(App)          --(REST: GET /api/bins/status)--> 현재 상태 반영


5. 메서드 엔드 포인트 (프런트앤드-백앤드)

| 메서드/경로              | 요청           | 응답             | 설명       
| ------------------------ | -------------- | ---------------- | -------- 
| `POST /api/auth/signup`  | `{email, pw}`  | `{user_id}`      | 회원가입     
| `POST /api/auth/login`   | `{email, pw}`  | `{token}`        | 로그인(JWT) 
| `GET /api/users/me`      | (JWT)          | 사용자 프로필    | 내 정보     
| `PUT /api/users/address` | `{lat, lon}`   | `{ok, lat, lon}` | 좌표 저장    
| `POST /api/users/alarms` | `{alarm_text}` | `{alarm_id}`     | 알람 추가    
| `GET /api/users/alarms`  | -              | `{alarms:[...]}` | 알람 목록    
| `GET /api/bins/status`   | `?device_id=`  | `{bin}`          | 우산함 상태   


6. 메서드 앤드 포인트 (아두이노-백앤드)

| 방향       | 토픽                      | 페이로드(JSON)                        | 설명           
| ---------- | ------------------------- | ------------------------------------- | ------------ 
| ESP → Node | `door/{sensor_id}/sensed` | `{ user_id, sensor_id, ts }`          | 근접/도어 감지 이벤트 
| ESP → Node | `bin/{device_id}/status`  | `{ device_id, remain, cap, is_open }` | 우산함 상태       
| Node → ESP | `speaker/{device_id}/cmd` | `{ type: 'tts', text: voice_msg }`    | 음성 안내        
| Node → ESP | `box/{device_id}/cmd`     | `{ act: 'open', close_in: 10000 }`    | 문 개폐 명령(선택)  


7. 파일간 의존 관계 (요약)

routes/*  →  controllers/*  →  services/*  →  config/prisma.js (DB)
                                           →  config/mqtt.js   (MQTT)
middleware/* ─┘ (검증/인증/에러 공통)
server.js  ─ 전체 부트스트랩(미들웨어+라우트+MQTT 초기화)


8. 변수명 / 함수명 규칙

네이밍은 전부 스네이크케이스(user_id, sensor_id, rain_time, voice_msg)

A) 공통 키(도메인/DB 스키마 기반)
| 변수명          | 타입           | 어디서→어디로                 | 용도/설명                                           |
| ------------ | ------------ | ----------------------- | ----------------------------------------------- |
| `user_id`    | int          | 프런트/ESP32 → 백엔드         | 사용자 식별자(권한/좌표/알람 조회)                            |
| `device_id`  | int          | 프런트/ESP32 ↔ 백엔드         | 디바이스 식별자(우산함/스피커 등 공통)                          |
| `sensor_id`  | int          | ESP32(door) → 백엔드       | 도어/근접 센서 식별자                                    |
| `lat`        | number       | 프런트 → 백엔드               | 사용자 주소 위도(기상조회 입력)                              |
| `lon`        | number       | 프런트 → 백엔드               | 사용자 주소 경도(기상조회 입력)                              |
| `remain`     | int          | ESP32(bin) → 백엔드        | 우산함 남은 우산 개수                                    |
| `cap`        | int          | ESP32(bin) → 백엔드        | 우산함 최대 수용량                                      |
| `is_open`    | boolean      | ESP32(bin) → 백엔드        | 우산함 문 열림 상태(센서 보고값)                             |
| `alarm_text` | string       | 프런트 → 백엔드               | 개인화 알람 항목 텍스트(예: “차키”)                          |
| `name`       | string       | 프런트 → 백엔드               | 디바이스 표시 이름                                      |
| `type`       | string(enum) | 프런트 → 백엔드 / 백엔드 → ESP32 | 디바이스 타입: `DOOR_SENSOR` `UMBRELLA_BIN` `SPEAKER` |


B) 인증·보안 관련
| 변수명             | 타입         | 어디서→어디로         | 용도/설명                      |
| --------------- | ---------- | --------------- | -------------------------- |
| `token`         | string     | 프런트 → 백엔드(헤더)   | JWT 액세스 토큰                 |
| `Authorization` | string(헤더) | 프런트 → 백엔드       | `Bearer ${token}` 형태       |
| `secret`        | string     | 프런트/ESP32 → 백엔드 | 디바이스/개발 단계 공유키(운영 시 대체 권장) |
| `email`         | string     | 프런트 → 백엔드       | 회원가입/로그인                   |
| `pw`            | string     | 프런트 → 백엔드       | 회원가입/로그인                   |



C) REST(프런트 ↔ 백엔드) 요청/응답 변수

요청 바디/쿼리 (프런트 → 백엔드)
| 엔드포인트                              | 필드                                                |
| ---------------------------------- | ------------------------------------------------- |
| `POST /api/auth/signup`            | `email`, `pw`                                     |
| `POST /api/auth/login`             | `email`, `pw`                                     |
| `PUT /api/users/address`           | `lat`, `lon`                                      |
| `POST /api/users/alarms`           | `alarm_text`                                      |
| `POST /api/devices`                | `user_id`, `type`, `name`, `secret`               |
| `POST /api/bins/update` *(테스트/시뮬)* | `device_id`, `remain`, `cap`, `is_open`, `secret` |
| `GET /api/bins/status`             | `device_id` *(query)*                             |


응답(백엔드 → 프런트)
| 상황      | 필드(예시)                                                |
| ------- | ----------------------------------------------------- |
| 로그인     | `token`                                               |
| 내 정보    | `id`, `email`, `lat`, `lon`                           |
| 알람 목록   | `alarms: [{id, user_id, text}, ...]`                  |
| 우산함 상태  | `bin: { device_id, remain, cap, is_open, updatedAt }` |
| 디바이스 생성 | `device_id`                                           |
| 공통      | `message`, `ok`                                       |


D) MQTT(ESP32 ↔ 브로커 ↔ 백엔드) 페이로드/토픽 변수

ESP32 → 백엔드 (Publish)
| 토픽                        | 페이로드(JSON)                                    | 설명         |
| ------------------------- | --------------------------------------------- | ---------- |
| `door/{sensor_id}/sensed` | `{ "user_id", "sensor_id", "ts" }`            | 센서 트리거 이벤트 |
| `bin/{device_id}/status`  | `{ "device_id", "remain", "cap", "is_open" }` | 우산함 상태 보고  |


백엔드 → ESP32 (Publish)
| 토픽                           | 페이로드(JSON)                             | 설명                |
| ---------------------------- | -------------------------------------- | ----------------- |
| `speaker/{device_id}/cmd`    | `{ "type": "tts", "text": voice_msg }` | 스피커 TTS 명령        |
| `box/{device_id}/cmd` *(옵션)* | `{ "act": "open", "close_in": 10000 }` | 우산함 문 개폐/자동 닫힘 예약 |


E) 백엔드 내부에서 계산/생성되어 외부로 전달되는 변수
| 변수명         | 타입          | 어디서 생성            | 어디에 전달                               |
| ----------- | ----------- | ----------------- | ------------------------------------ |
| `rain_time` | string|null | 백엔드(weather_svc)  | 프런트 응답, TTS 문구 생성에 사용                |
| `voice_msg` | string      | 백엔드(weather_ctrl) | ESP32 스피커(`speaker/{device_id}/cmd`) |
| `alarms`    | string[]    | 백엔드(user_ctrl)    | 프런트 응답 / TTS 문구 꼬리말용                 |


F>환경변수(.env)
| 변수명             | 용도                                                 |
| --------------- | -------------------------------------------------- |
| `PORT`          | 백엔드 포트                                             |
| `CORS_ORIGIN`   | 프런트 도메인 허용                                         |
| `DATABASE_URL`  | MySQL 접속 URL                                       |
| `JWT_SECRET`    | JWT 서명 시크릿                                         |
| `DEVICE_SECRET` | 디바이스 공유키(개발 단계)                                    |
| `MQTT_HOST`     | MQTT 브로커 주소(`mqtt://host:1883` 또는 `mqtts://:8883`) |






| 함수                           | 위치                            | 역할(입력 → 출력)                    |
| ---------------------------- | ----------------------------- | ------------------------------ |
| `get_rain_time(lat, lon)`    | `services/weather_svc.js`     | 위경도 → 강수 시작 “HH:MM” | null     |
| `send_tts(device_id, text)`  | `services/tts_svc.js`         | 스피커 디바이스로 TTS 명령(MQTT publish) |
| `door_sensed()`              | `controllers/weather_ctrl.js` | 센서 이벤트 처리 → 결정/명령/로그           |
| `bin_update()`               | `controllers/bin_ctrl.js`     | 우산함 상태 upsert                  |
| `add_alarm()`/`list_alarm()` | `controllers/user_ctrl.js`    | 개인화 알람 CRUD                    |



9. 아두이노/ESP32 (MQTT 연결—예시)
// firmware/.../main.ino
// #include <WiFi.h>
// #include <PubSubClient.h>
// 사용 변수: user_id, sensor_id, device_id, remain, cap, is_open, ts
// 브로커/토픽: MQTT_HOST, door/{sensor_id}/sensed, bin/{device_id}/status, speaker/{device_id}/cmd, box/{device_id}/cmd

// web/src/api/index.ts (프런트) — REST 호출 유틸만 import
import type { AxiosInstance } from 'axios'; // (백엔드 종속 없음)

// firmware/door_sensor/door_sensor.ino (아두이노) — 백엔드 없음, MQTT 브로커로 발행
// #include <WiFi.h>
// #include <PubSubClient.h>  // ESP32에서 MQTT publish/subscribe


10.실행순서(로컬)

docker compose up -d (MySQL, Mosquitto, Adminer)

cd server && npm i && npx prisma migrate dev && npm run dev

사용자 생성 → 좌표 저장 → 디바이스 등록

ESP32를 Wi-Fi 연결 → MQTT 브로커(PC IP) 접속 → 센서 이벤트 publish

백엔드가 구독/처리 → 스피커 명령 publish → 우산함 개폐/음성
