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
- `test`: Pre-release version for demonstration.
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
- **Part-specific READMEs:** Check the `README.md` files in `/web`, `/server`, and `/arduino` for specific details on variables and endpoints.
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
├─ arduino/                                     # ESP32 (Arduino)
│  └─ device.cpp                                # Firmware Source
│  
├─ deploy/
│  └─ docker-compose.yml                        # MySQL, Mosquitto, Adminer containers
│
└─ docs/
   ├─ API.md                                    # REST API specifications
   └─ SETUP.md                                  # Local setup guide
```