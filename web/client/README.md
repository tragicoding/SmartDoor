## **클라이언트(App) 개요**

Expo 기반 React Native 앱으로, 사용자의 **외출용 To-get 리스트**를 관리하고 주간 날씨/위치 정보를 함께 보여주는 모바일 프론트엔드입니다.  
`Physical-Computing-Project-jinseo/server` 백엔드와 REST API로 통신하며, 하드웨어(우산함/도어/스피커)는 서버를 통해 간접적으로 연동됩니다.

---

## **1. 팀 역할 (프론트 기준 요약)**

- **김강륜 (Front-end / UI Architect)**  
  - Expo/React Native 기반 모바일 앱 전체 구조 설계  
  - 화면 설계(런치, 로그인, 회원가입, 홈, 캘린더, 마이페이지) 및 UI/UX 구현  
  - 날씨/위치/리스트 API 연동, 전역 프로필 스토어 설계
- **김진서 (Back-end / Software Architect)**  
  - Node.js/Express + MySQL + Prisma 서버, REST API, MQTT 연동 설계·구현  
  - `/api/auth`, `/api/users`, `/api/weather`, `/api/users/daily-lists` 등 엔드포인트 제공
- **황하린 (Hardware / Model Architect)**  
  - ESP32 펌웨어(우산함, 도어 센서, 스피커) 설계 및 MQTT 프로토콜 정의  
  - 실제 물리 장치와 서버 간 연동 구조 설계

---

## **2. Git 브랜치 전략 (요약)**

상위 `README.md`(루트)와 동일한 전략을 따릅니다.

- **`main`**: 최종 배포용 안정 브랜치
- **`staging`**: 시연/테스트용 프리 릴리즈 브랜치
- **`dev`**: 각 개인 브랜치 작업 내용을 통합하는 개발 브랜치
- **`Gangryun`**: 프론트엔드(Expo 앱) 개발 브랜치 (**이 README 대상**)
- **`jinseo`**: 백엔드 서버 개발 브랜치
- **`harin`**: 하드웨어/펌웨어 개발 브랜치

> **권장 워크플로우**
> 1. 자신의 브랜치를 체크아웃(`git checkout Gangryun`)  
> 2. 클라이언트 관련 변경은 `client/` 폴더에서만 작업  
> 3. 주기적으로 `dev`를 pull 받아 병합  
> 4. 직접 `main`에 push 하지 않고, PR을 통해 병합 요청

---

## **3. 새 환경에서 백엔드 서버(IP) 연결 설정**

프론트 앱은 `client/app/services/api.js`의 `API_BASE_URL`을 기준으로 서버에 연결합니다.

- 기본 값 예시:
  - `API_BASE_URL = 'http://192.168.0.10:4000'`

**본인 PC에서 새로 실행할 때:**

1. **백엔드 서버 실행**
   - 루트 기준:
     ```bash
     cd Physical-Computing-Project-jinseo/server
     npm install
     npx prisma migrate dev
     npm run dev
     ```
   - 서버 기본 포트: `4000` (변경 시 `.env`와 프론트 모두 일치해야 함)
2. **로컬 IP(IPv4) 확인**
   - Windows: `Win + R` → `cmd` → 아래 입력
     ```bash
     ipconfig
     ```
   - 현재 PC가 연결된 네트워크 어댑터의 `IPv4 주소` 확인 (예: `192.168.0.23`)
3. **프론트의 API_BASE_URL 수정**
   - `client/app/services/api.js` 상단:
     ```js
     const API_BASE_URL = 'http://192.168.0.23:4000'; // ← 본인 IPv4로 수정
     ```
4. **같은 Wi-Fi에 연결된 스마트폰에서 접속**
   - 휴대폰과 PC가 같은 LAN(예: 같은 공유기) 안에 있어야 `http://{PC_IP}:4000` 으로 접근 가능
   - Expo 앱 역시 이 IP로 백엔드에 요청을 보냄

---

## **4. 필요 프로그램 & 라이브러리 설치**

### **4-1. 필수 프로그램**

- **Node.js LTS (>= 18)**  
  - npm 포함
- **Git**
- **Expo Go (모바일 앱)**  
  - iOS/Android 스토어에서 `Expo Go` 설치 (실기기 테스트용)

### **4-2. 프로젝트 의존성 설치**

루트가 아닌 **`client/` 폴더**에서 설치/실행합니다.

```bash
cd client
npm install
```

`client/package.json` 주요 의존성:

- **expo** `~54.0.25`
- **react** `19.1.0`
- **react-native** `0.81.5`
- **react-navigation**
  - `@react-navigation/native`
  - `@react-navigation/native-stack`
- **expo-location**: 기기 좌표/역지오코딩
- **expo-font**: 커스텀 폰트 로딩
- **expo-splash-screen**: 스플래시 제어
- **react-native-gesture-handler**, **react-native-reanimated**, **react-native-safe-area-context**, **react-native-screens**

> **주의:** 이 라이브러리 버전 조합은 Expo SDK 54 기준으로 맞추어져 있으므로, `expo upgrade` 등으로 SDK 버전을 변경할 경우 RN/React 버전도 함께 관리해야 합니다.

### **4-3. Expo CLI / 실행 커맨드**

- 로컬 개발 서버 실행:

```bash
cd client
npm run start       # 또는 npx expo start
```

Expo DevTools의 QR 코드를 **Expo Go 앱**으로 스캔하면 실제 기기에서 앱을 바로 볼 수 있습니다.

### **4-4. 폰트/이미지 리소스**

앱 진입점 `client/App.js`에서 **모든 폰트 리소스를 로딩** 후 `SplashScreen`을 숨깁니다.

- 커스텀 폰트 위치: `client/app/components/font/*`
- 사용 폰트 예:
  - `Pretendard*`, `Inter*`, `Lexend*`, `NotoSansKR*`, `GothicA1*`, `Cafe24Ssurround`, `PixelifySans`, `Righteous`
- 앱 아이콘/로고 및 UI 이미지: `client/app/components/image/*`
  - 예: `main_logo.png`, `main_home.png`, `calendar_y.png`, `mypage_y.png`, `sunnycloud.png` 등

폰트/이미지를 새로 추가할 경우:

1. `app/components/font` 또는 `app/components/image` 폴더에 파일 추가
2. `App.js` 혹은 각 화면/컴포넌트에서 `require()` 경로를 맞게 수정

---

## **5. 클라이언트 폴더 아키텍처**

```bash
client/
├─ App.js                 # 폰트 로딩 및 네비게이션 루트(AppNavigator)
├─ app.json               # Expo 앱 설정(이름, 아이콘, 스플래시 등)
├─ index.js               # Expo 엔트리 포인트
└─ app/
   ├─ navigation/
   │  └─ AppNavigator.js  # 스택 네비게이션 (Launch, Login, Home, Calendar, MyPage 등)
   ├─ screens/
   │  ├─ LaunchScreen.js           # 런치(앱 로고) 애니메이션 후 Login으로 이동
   │  ├─ LoginScreen.js            # 로그인 + 위치 좌표 서버 저장
   │  ├─ LoadingScreen.js          # 로그인 후 간단 로딩 / 홈 진입 전 연출
   │  ├─ RegisterScreen.js         # 회원가입(기본 정보 + 주소 + 기기 시리얼)
   │  ├─ RegisterCompleteScreen.js # 가입 완료 연출 + 로그인 화면으로 자동 이동
   │  ├─ HomeScreen.js             # 메인 리스트/날짜/날씨 카드 + 모달들
   │  ├─ CalendarScreen.js         # 월력 + 날짜별 To-get 리스트 조회
   │  └─ MyPageScreen.js           # 내 정보/주소/기기 시리얼 변경 및 로그아웃
   ├─ components/
   │  ├─ CalendarModal.js   # 홈 상단 날짜 선택용 바텀시트 캘린더
   │  ├─ ListInputModal.js  # 리스트(물건) 추가/삭제 모달
   │  ├─ WeeklyWeatherModal.js # 주간 날씨 상세 모달
   │  ├─ font/              # 모든 커스텀 폰트 파일(.ttf / .otf)
   │  └─ image/             # UI 이미지 리소스
   ├─ services/
   │  ├─ api.js             # 백엔드 REST API 클라이언트 모듈
   │  └─ location.js        # expo-location 기반 위치/역지오코딩 유틸
   ├─ store/
   │  └─ userProfileStore.js # 전역 프로필/토큰/좌표 메모리 스토어
   ├─ hooks/                # (현재 비어 있음, 향후 커스텀 훅 위치)
   └─ utils/                # (현재 비어 있음, 공통 유틸 예정)
```

---

## **6. 사용한 API 엔드포인트 (프론트 기준)**

`client/app/services/api.js`에 정의된 엔드포인트:

- **Auth**
  - `POST /api/auth/signup`
    - Req: `{ email, pw, name, road_address, detail_address, device_serial? }`
    - Res: `{ user_id }`
  - `POST /api/auth/login`
    - Req: `{ email, pw }`
    - Res: `{ token }` (JWT)

- **User**
  - `GET /api/users/me`
    - Header: `Authorization: Bearer {token}`
    - Res: `{ id, email, name, road_address, detail_address, lat, lon, device_serial, ... }`
  - `PUT /api/users/address`
    - Header: `Authorization: Bearer {token}`
    - Req: `{ lat, lon, name, road_address, detail_address, pw, device_serial }`
    - Res: `{ ok, lat, lon, name, road_address, detail_address, device_serial }`

- **Weather**
  - `GET /api/weather/weekly?lat={lat}&lon={lon}[&test=true]`
    - Res: `{ days: [{ date, sky, pty, tmp, tmx, tmn, pop }, ...] }`

- **Daily List (To-get 리스트)**
  - `GET /api/users/daily-lists?date_key=YYYY-MM-DD`
    - Header: `Authorization: Bearer {token}`
    - Res: `{ date_key, items: [{ id, text, selected }, ...] }`
  - `GET /api/users/daily-lists/all`
    - Header: `Authorization: Bearer {token}`
    - Res: `{ lists: [{ date_key, items: [{ id, text, selected }, ...] }, ...] }`
    - 설명: **현재 로그인된 사용자의 모든 날짜별 리스트를 한 번에 조회**할 때 사용 (캘린더 화면)
  - `PUT /api/users/daily-lists`
    - Header: `Authorization: Bearer {token}`
    - Req: `{ date_key, items: [{ id, text, selected }, ...] }`
    - Res: `{ ok, date_key, items: [...] }`

---

## **7. 프론트엔드 내부 작동 구조**

### **7-1. 앱 진입 & 폰트 로딩**

1. `App.js`
   - `useFonts`로 모든 커스텀 폰트 로드
   - `SplashScreen.preventAutoHideAsync()`로 스플래시 유지 후, 폰트 로딩 완료 시 `SplashScreen.hideAsync()`
   - 폰트 로드 완료 후 `AppNavigator` 렌더링

2. `AppNavigator.js`
   - `NavigationContainer` + Native Stack
   - 초기 화면: `Launch` (런치 애니메이션 후 `Login`으로 이동)
   - 스택 구성:
     - `Launch` → `Login` → `Loading` → `Home`
     - 회원가입 플로우: `Login` → `Register` → `RegisterComplete` → `Login`
     - 하단 탭처럼 보이지만 실제로는 `Home` 안에서 버튼 + 화면 네비게이션으로 구현(`Home`, `Calendar`, `MyPage`)

### **7-2. 전역 프로필 스토어 흐름 (`userProfileStore.js`)**

- `defaultProfile`
  - 앱 기본 표시용 초기값 (이름, 주소, 기기 시리얼 등)
- `currentProfile`
  - 메모리에만 존재하는 전역 상태 (앱 완전 종료 시 초기화)
- 제공 함수:
  - `getDefaultProfile()`
  - `hasProfile()`
  - `getProfile()`: `currentProfile` 없으면 `defaultProfile` 반환
  - `setProfile(profilePartial)`: 기존 값 + 전달 값 머지
  - `getLastSelectedDateKey()` / `setLastSelectedDateKey(key)`:
    - 리스트 화면에서 사용자가 마지막으로 선택한 날짜 키(`YYYY-MM-DD`)를 **앱이 실행 중인 동안만** 메모리에 보관

> 이 스토어는 **JWT 토큰, 이메일, 이름, 주소, 좌표(lat/lon), 기기 시리얼, 마지막 선택 날짜** 등을 한 곳에 보관하여, 여러 화면에서 공통으로 사용합니다.

### **7-3. 위치 & 날씨 연동 흐름**

- `services/location.js`
  - `fetchCurrentCoordinates()`
    - `expo-location`으로 **포그라운드 위치 권한 요청**
    - 허용 시: `{ lat, lon }` 반환
    - 거부 시: `LOCATION_PERMISSION_DENIED` 코드의 에러 발생
  - `reverseGeocodeToAreaLabel(lat, lon)`
    - `Location.reverseGeocodeAsync`로 주소 정보 받아와 **읍/면/동 레벨의 텍스트 라벨** 추출
    - 실패 시 `null` 반환 (UI는 기본값 유지)

- `HomeScreen`
  - 마운트 시:
    1. `fetchCurrentCoordinates()`로 현재 좌표 가져옴
    2. `reverseGeocodeToAreaLabel()`로 위치 라벨(`대덕면`, `서초동` 등)을 상태에 저장
    3. `getWeeklyWeather(lat, lon)`으로 **7일 예보** 조회 → `weeklyWeather` 상태에 전체 저장
    4. `weeklyWeather` + `selectedDate` 를 조합해, 상단 날씨 버튼에 **선택된 날짜의 최고/최저 기온·강수확률·날씨 아이콘**을 표시
       - 온도는 `Math.round` 로 반올림해 소수점이 보이지 않도록 처리
       - `sky`/`pty` 값을 `sunny/sunnycloud/cloud/rainy` 아이콘으로 매핑
       - 위치/날씨를 불러오는 동안에는 `"데이터를 불러오고 있습니다"` 문구와 함께 버튼을 비활성화
  - 주간 상세 모달(`WeeklyWeatherModal`):
    - `weeklyWeather` 배열 전체를 넘겨, 요일별 강수확률/최고/최저 기온을 리스트 형태로 표시
    - 오늘 행은 항상 **주황색 박스**로 강조되고, 선택한 날짜 행에는 **연한 회색 박스**가 이동하며 강조됨

### **7-4. 날짜별 리스트(Daily List) 흐름**

- 날짜 키 형식: `YYYY-MM-DD`
- `HomeScreen`의 상태:
  - `selectedDate`: 현재 선택된 날짜(기본: 오늘)
  - `listData`: `{ [date_key]: { items: [...] } }` 구조

**로드 흐름 (Home 화면):**

1. `selectedDate` 변경 → `currentDateKey` 계산
2. `useEffect`에서 `getDailyList(token, currentDateKey)` 호출
3. 응답의 `items`를 `listData[currentDateKey].items`로 저장
4. `currentDateKey` 가 바뀔 때마다 `userProfileStore.setLastSelectedDateKey(currentDateKey)` 로 **마지막 선택 날짜를 전역에 저장**
   - 앱이 살아 있는 동안에는, 다른 페이지로 갔다가 돌아와도 Home 화면의 날짜가 **오늘로 초기화되지 않고 마지막 선택 날짜로 유지**됩니다.

**저장 흐름 (Home 화면):**

1. 플로팅 버튼 **+** → `ListInputModal` 표시
2. 사용자가 입력/삭제 후 `나가기`를 누르면:
   - 모달 내부에서 모든 항목을 `selected: true`로 만든 payload를 `onApply`로 전달
   - `HomeScreen`:
     - 로컬 `listData[currentDateKey]`를 먼저 업데이트
     - 로그인 상태(`authToken` 존재)라면 `saveDailyList(token, currentDateKey, items)` 호출

**캘린더 화면과의 연동:**

- `CalendarScreen` 은 화면이 포커스될 때마다 `getAllDailyLists(token)` 을 호출해
  - **현재 로그인된 사용자의 모든 날짜별 리스트를 한 번에 불러오고**
  - 이를 `listData = { [date_key]: { items } }` 형태로 다시 구성합니다.
- 이렇게 구성된 `listData`를 기준으로
  - 리스트가 있는 날짜에는 **점(dot)** 을 표시하고
  - 아래 패널에 선택한 날짜의 리스트를 보여줍니다.
- 화면이 다른 페이지로 전환되었다가 다시 캘린더로 돌아와도,
  - 포커스될 때마다 `/api/users/daily-lists/all` 을 다시 호출하여
  - **DB에 저장된 최신 리스트 상태가 항상 반영**되도록 설계되어 있습니다.

---

## **8. 프론트엔드 ↔ 서버 데이터 흐름 구조**

### **8-1. 인증 / 프로필**

1. **회원가입 (`RegisterScreen`)**
   - 입력: 이름, 이메일(ID), 비밀번호, 주소(도로명/상세), 기기 시리얼
   - `signupUser()` → `POST /api/auth/signup`
   - 성공 시:
     - 응답의 `user_id`와 함께 `userProfileStore`에 기본 정보 저장
     - `RegisterCompleteScreen`으로 이동 → 잠시 연출 후 `Login`으로 자동 네비게이션 (ID/비밀번호 자동 채움)

2. **로그인 (`LoginScreen`)**
   - `loginUser()` → `POST /api/auth/login`
   - 응답의 `token`을 `userProfileStore.authToken`에 저장
   - 로그인 직후:
     1. `fetchCurrentCoordinates()`로 기기 좌표 조회
     2. `updateUserProfile(token, {..., lat, lon})` 호출 → 서버에 좌표 저장
     3. 전역 스토어에도 `lat`, `lon` 업데이트
   - 이후 `LoadingScreen`을 간단히 거쳐 `HomeScreen`으로 이동

3. **내 정보 조회 (`MyPageScreen`)**
   - 마운트 시 `getMyProfile(token)` 호출 → 서버 기준 최신 프로필 가져와 화면/스토어 모두 갱신
   - 편집 모드에서 **완료** 클릭:
     - 필요 시 비밀번호 길이 프론트 검증(6자 이상)
     - 다시 한 번 `fetchCurrentCoordinates()` 시도 후, 좌표/주소/비밀번호/기기 시리얼을 `updateUserProfile()`로 전송
     - 성공 시 전역 스토어 동기화

4. **로그아웃 (`MyPageScreen`)**
   - `authToken`만 `null`로 초기화 (기타 정보는 남겨두어 화면에 기본값 표시)
   - 네비게이션 스택 리셋 후 `Login` 화면으로 이동

### **8-2. 날씨 / 리스트 데이터**

- **날씨**
  - 프론트: 현재 좌표 조회 → `/api/weather/weekly?lat&lon` 호출
  - 백엔드: 외부 기상 API(OpenWeather 등)에서 받아온 값을 내부 포맷으로 변환해 `days[]`로 전달
  - 프론트:  
    - `HomeScreen` 상단 카드 + `WeeklyWeatherModal`에 렌더

- **Daily List**
  - 프론트: 날짜 키 기준으로 `/api/users/daily-lists` **GET/PUT**
  - 백엔드: `users`, `daily_list` 등 Prisma 모델 기반으로 DB에 저장/업데이트
  - 하드웨어:  
    - 우산함/도어/스피커와의 실제 연동은 서버에서 MQTT를 통해 처리 (프론트는 REST만 사용)

---

## **9. 주요 기능 정리**

- **회원가입 & 기기 등록**
  - 이름/이메일/비밀번호/주소/기기 시리얼을 입력해 계정 및 디바이스를 등록
  - 가입 완료 후 로그인 화면으로 자동 이동 + 입력 정보 일부 자동 채움

- **로그인 & 자동 위치 저장**
  - 이메일/비밀번호로 로그인
  - 로그인 성공 시 위치 권한을 요청 → 허용 시 좌표를 서버에 저장해 날씨 및 물리 장치 연동에 사용

- **홈 화면**
  - 오늘 기준 날짜/요일 표시
  - 현재 위치 라벨(읍/면/동) + 오늘 최대/최소 기온/강수확률 카드
  - 선택된 날짜의 To-get 리스트 표시 (없으면 안내 일러스트)
  - 플로팅 **+ 버튼**으로 리스트 항목 추가/삭제 모달 호출

- **캘린더 화면**
  - 월별 달력에서 날짜별 저장된 리스트 여부를 점(dot)으로 표시
  - 날짜를 클릭하면 해당 날짜의 리스트 내용을 하단 패널에서 확인
  - 하단 네비게이션을 통해 `Home`/`MyPage`로 이동 가능

- **마이페이지**
  - 내 프로필(이름/아이디/주소/기기 시리얼) 조회 및 수정
  - 비밀번호 변경, 로그아웃 기능 포함
  - 서버의 `/api/users/me`, `/api/users/address`와 연동

- **날씨 상세 모달**
  - 홈 상단 카드에서 **날씨 영역**을 탭하면 주간 날씨 바텀시트가 열림
  - 요일/강수확률/아이콘/최고/최저 기온을 리스트로 확인 가능

---

## **10. 페이지별 상세 설명 & 기능**

### **10-1. LaunchScreen**

- 파일: `app/screens/LaunchScreen.js`
- 기능:
  - 앱 시작 시 로고/텍스트를 페이드인·스케일 애니메이션으로 표시
  - 약 2초 후 `Login` 화면으로 `navigation.replace('Login')`

### **10-2. LoginScreen**

- 파일: `app/screens/LoginScreen.js`
- 기능:
  - 이메일(ID) + 비밀번호 입력 후 로그인
  - `loginUser()` 호출 → JWT 토큰 수신
  - 전역 스토어에 `authToken`, `id` 저장
  - 로그인 직후:
    - 위치 권한 요청 → 현재 좌표 조회 성공 시 `/api/users/address`로 좌표만 서버에 저장
  - 에러 상황별 자세한 메시지(이메일 형식 오류, 비밀번호 불일치, 사용자 없음 등) 표시
  - 회원가입 버튼 → `RegisterScreen` 이동

### **10-3. LoadingScreen**

- 파일: `app/screens/LoadingScreen.js`
- 기능:
  - 로그인 직후 짧은 로딩 애니메이션/브랜딩 연출
  - 약 1.5초 후 `Home`으로 이동 (`navigation.replace('Home')`)

### **10-4. RegisterScreen**

- 파일: `app/screens/RegisterScreen.js`
- 기능:
  - 이름, 이메일(ID), 비밀번호/비밀번호 확인, 주소(도로명/상세), 기기 시리얼 입력
  - 필수 값 검증 및 비밀번호 일치 여부 체크
  - `signupUser()` 호출 → 성공 시:
    - `userProfileStore`에 기초 정보 + `userId` 저장
    - `RegisterCompleteScreen`으로 이동 (ID/비밀번호 전달)

### **10-5. RegisterCompleteScreen**

- 파일: `app/screens/RegisterCompleteScreen.js`
- 기능:
  - 가입 완료 축하 메시지 + 로고/타이틀 표시
  - 3초 후 `Login`으로 이동, 전달받은 `credentials`를 기반으로 ID/비밀번호 자동 채움

### **10-6. HomeScreen**

- 파일: `app/screens/HomeScreen.js`
- 기능:
  - 상단 헤더: 앱 로고 + 프로필 아이콘
  - 상단 정보 바:
    - **날짜 버튼**: 현재 선택 날짜 표시, 탭 시 `CalendarModal` 열림
    - **날씨 카드**: 위치 라벨 + 오늘 최저/최고 기온, 탭 시 `WeeklyWeatherModal` 열림
  - 본문:
    - 선택된 날짜의 리스트를 카드 형태로 표시
    - 리스트가 없으면 안내 이미지/문구 표시
  - 플로팅 **+ 버튼**:
    - `ListInputModal`을 띄워 To-get 리스트 항목 추가/삭제 가능
    - 저장 시 로컬 상태 + 서버(`saveDailyList`)에 동기화
  - 하단 네비게이션:
    - 리스트 / 캘린더 / 마이페이지 탭 버튼
    - 내부적으로 `navigation.navigate('Home' | 'Calendar' | 'MyPage')` 호출

### **10-7. CalendarScreen**

- 파일: `app/screens/CalendarScreen.js`
- 기능:
  - 월 네비게이션(이전/다음 달) + 월/연도 라벨
  - 요일 헤더 + 6주 그리드 구조 달력
  - 이전/다음 달 날짜는 흐리게 표시
  - 오늘(현재 날짜)과 선택된 날짜 스타일 구분
  - `listData`를 기반으로 **리스트가 있는 날짜에 점(dot)** 표시
  - 하단 영역에 선택 날짜의 리스트를 `HomeScreen`과 동일 스타일로 노출

### **10-8. MyPageScreen**

- 파일: `app/screens/MyPageScreen.js`
- 기능:
  - 상단 헤더: 왼쪽 로그아웃, 가운데 이름, 오른쪽 편집/완료 버튼
  - 프로필 이미지(원형) 표시
  - 폼 필드:
    - 이름, 아이디(이메일), 비밀번호(보기 토글), 도로명 주소, 상세 주소, 기기 시리얼
  - 편집 모드:
    - 비밀번호 길이 체크(6자 이상)
    - 가능한 경우, 현재 위치 재조회 후 함께 서버에 저장
  - 로그아웃:
    - `authToken`만 제거
    - 네비게이션 스택 리셋 후 `Login` 화면으로 이동

### **10-9. 공통 모달 컴포넌트**

- **CalendarModal**
  - 홈 상단 날짜 버튼에서 사용되는 바텀시트 캘린더
  - 월 전환/요일 헤더/오늘/선택일 강조
  - 확인 버튼에 `"{month}월 {day}일({요일}) 선택"` 문구로 현재 선택일을 표시

- **ListInputModal**
  - 날짜/위치/온도 요약과 함께 To-get 리스트를 칩 형태로 보여줌
  - 항목 추가(텍스트 입력), 개별 삭제, 전체 삭제(확인 모달) 지원
  - **현재 버전에서는 선택 토글 없이 모든 항목을 `selected: true`로 저장**하여 서버/홈 화면에 반영

- **WeeklyWeatherModal**
  - 오늘 날짜 기준 주간 날씨 리스트
  - 요일, 강수확률, 날씨 아이콘, 최고/최저 기온을 표시
  - 스와이프로 아래로 내리거나 "닫기" 버튼으로 닫을 수 있는 바텀시트 형태

---

이 README는 `client/` 폴더(모바일 프론트엔드)의 구조와 동작 방식을 이해하기 위한 문서입니다.  
백엔드/펌웨어에 대한 상세 내용은 상위 `README.md`, `docs/API.md`, `docs/SETUP.md`를 참고하세요.


