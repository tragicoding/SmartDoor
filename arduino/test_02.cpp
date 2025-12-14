#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ==============================
// 1) WiFi / MQTT 설정
// ==============================

// ★ 네 환경에 맞게 수정 ★
const char* WIFI_SSID     = "Smart-CAU";     //개인
const char* WIFI_PASSWORD = "carpediem804!";  //,개인

// MQTT 브로커 (백엔드에서 쓰는 Docker mosquitto)
const char* MQTT_HOST     = "165.194.221.83";  // PC IP     //개인
const uint16_t MQTT_PORT  = 1883;

// API.md 에는 smartdoor_mqtt 계정이 있지만,
// 지금은 인증 안 쓰고 있다면 빈 문자열로 사용.
const char* MQTT_USER     = "";
const char* MQTT_PASS     = "";

// ==============================
// 2) 백엔드와 맞추는 ID들
// ==============================
// API.md 기준:
//  - door/{sensor_id}/sensed → { user_id, sensor_id, ts }
//  - bin/{device_id}/status  → { device_id, remain, cap, is_open }
//  - speaker/{device_id}/cmd → { type: 'tts', text: voice_msg }
//  - box/{device_id}/cmd     → { act: 'open', close_in: 10000 }

// ▽ 실제 백엔드에서 사용하는 값으로 바꿔줘야 함 ▽

// 앱에서 회원가입/로그인하면 응답으로 받은 user_id
const int USER_ID   = 1;

// 이 ESP32에 달린 "문/근접 센서"의 sensor_id
// (백엔드에서 weather/door-sensed 에서 사용하는 sensor_id)
const int SENSOR_ID = 1;

// 우산함 + 스피커 장치의 device_id
// (백엔드 /api/devices 에서 등록 후 받은 device_id)
const int DEVICE_ID = 2;

// MQTT 토픽들
String topicDoorSensed = "door/"    + String(SENSOR_ID) + "/sensed";
String topicSpeakerCmd = "speaker/" + String(DEVICE_ID) + "/cmd";
String topicBoxCmd     = "box/"     + String(DEVICE_ID) + "/cmd";
String topicBinStatus  = "bin/"     + String(DEVICE_ID) + "/status";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ==============================
// 3) 초음파 센서 (HC-SR04P)
// ==============================

// 핀 번호는 실제 연결한 GPIO 번호로 맞게 수정
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

const long PERSON_THRESHOLD_CM   = 80;      // 80cm 이내면 "사람 감지"
const unsigned long COOLDOWN_MS  = 15000;   // 15초 동안 1번만 MQTT 전송
unsigned long lastPersonTrigger  = 0;

// ==============================
// 4) 서보 (우산함 박스)
// ==============================
Servo umbrellaServo;
const int SERVO_PIN        = 15;
const int SERVO_OPEN_ANGLE = 90;   // 열렸을 때 각도 (필요시 조정)
const int SERVO_CLOSE_ANGLE= 0;    // 닫혔을 때 각도 (필요시 조정)
bool umbrellaOpen          = false;
unsigned long umbrellaCloseAt = 0; // 자동 닫힘 예약 시간(ms), 0이면 없음

// 우산함 용량 (임의 값, 필요시 앱/백엔드와 맞춰도 됨)
int BIN_CAPACITY    = 3;
int BIN_REMAIN      = 3;   // 남은 우산 개수 (센서 없으니 임시 값)

// ==============================
// 5) LCD (I2C 16x2)
// ==============================
LiquidCrystal_I2C lcd(0x27, 16, 2);  // 주소 0x27 가정

// ==============================
// 6) 스피커 (간단한 PWM Beep 스텁)
// ==============================
const int AUDIO_PIN   = 25;   // PAM8403/앰프 입력에 연결
const int AUDIO_CH    = 0;    // LEDC 채널 0
const int AUDIO_FREQ  = 2000; // 2kHz 톤

// ==============================
// 7) 함수 선언
// ==============================
void connectWiFi();
void connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);

float measureDistanceCm();
void publishDoorSensed();
void publishBinStatus(bool isOpen);

void handleSpeakerCommand(const JsonDocument& doc);
void handleBoxCommand(const JsonDocument& doc);

void openUmbrella(long closeInMs);
void closeUmbrella();

void showTextOnLCD(const String& text);
void playTTSText(const String& text);

// ==============================
// setup()
// ==============================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=== ESP32 Door + Bin + Speaker (harin spec) ===");

  // 초음파 핀
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // 서보 초기화 (닫힌 상태)
  umbrellaServo.attach(SERVO_PIN);
  umbrellaServo.write(SERVO_CLOSE_ANGLE);
  umbrellaOpen = false;

  // LCD 초기화
  Wire.begin();        // SDA/SCL 기본 핀 사용 (21,22)
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Door Bin");
  lcd.setCursor(0, 1);
  lcd.print("Booting...");

  // 스피커용 PWM 초기화
  ledcSetup(AUDIO_CH, AUDIO_FREQ, 8);   // 8비트 해상도
  ledcAttachPin(AUDIO_PIN, AUDIO_CH);
  ledcWrite(AUDIO_CH, 0);              // 처음에는 무음

  // WiFi 연결
  connectWiFi();

  // MQTT 설정
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  // MQTT 연결 시도 (loop()에서 재시도 로직 있음)
  connectMQTT();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print("Waiting sensor");
}

// ==============================
// loop()
// ==============================
void loop() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();

  // 1) 초음파로 사람 감지 → MQTT door/{sensor_id}/sensed 전송
  float distance = measureDistanceCm();
  Serial.print("[DEBUG] distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  if (distance > 0 && distance < PERSON_THRESHOLD_CM &&
      now - lastPersonTrigger > COOLDOWN_MS) {

    Serial.print("Person detected at ");
    Serial.print(distance);
    Serial.println(" cm -> publishDoorSensed()");

    lastPersonTrigger = now;
    publishDoorSensed();
  }

  // 2) 우산함 자동 닫기 (box/{device_id}/cmd 에서 open+close_in 처리)
  if (umbrellaOpen && umbrellaCloseAt > 0 && now >= umbrellaCloseAt) {
    closeUmbrella();
    umbrellaCloseAt = 0;
    publishBinStatus(false);
  }

  delay(200);
}

// ==============================
// WiFi
// ==============================
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    retry++;

    if (retry > 40) {
      Serial.println("\nWiFi connect timeout, retry...");
      WiFi.disconnect();
      delay(1000);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      retry = 0;
    }
  }

  Serial.println();
  Serial.print("✅ WiFi connected, IP: ");
  Serial.println(WiFi.localIP());
}

// ==============================
// MQTT
// ==============================
void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT... ");
    String clientId = "esp32-doorbin-" + String(DEVICE_ID);

    bool ok;
    if (strlen(MQTT_USER) == 0) {
      ok = mqttClient.connect(clientId.c_str());
    } else {
      ok = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    }

    if (ok) {
      Serial.println("connected ✅");
      // 스피커/우산함 제어 토픽 구독
      mqttClient.subscribe(topicSpeakerCmd.c_str());
      mqttClient.subscribe(topicBoxCmd.c_str());

      Serial.print("Subscribed to: ");
      Serial.println(topicSpeakerCmd);
      Serial.print("Subscribed to: ");
      Serial.println(topicBoxCmd);
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" -> retry in 5s");
      delay(5000);
    }
  }
}

// MQTT 콜백
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr(topic);
  Serial.print("[MQTT] Message [");
  Serial.print(topicStr);
  Serial.print("] : ");

  String payloadStr;
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }
  Serial.println(payloadStr);

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payloadStr);
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  if (topicStr == topicSpeakerCmd) {
    handleSpeakerCommand(doc);
  } else if (topicStr == topicBoxCmd) {
    handleBoxCommand(doc);
  }
}

// ==============================
// 초음파 거리 측정
// ==============================
float measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // 최대 30ms

  if (duration == 0) {
    return -1;
  }

  float distanceCm = duration * 0.0343f / 2.0f;
  return distanceCm;
}

// ==============================
// MQTT Publish: door/{sensor_id}/sensed
// 페이로드: { user_id, sensor_id, ts }
// ==============================
void publishDoorSensed() {
  StaticJsonDocument<128> doc;
  doc["user_id"]   = USER_ID;
  doc["sensor_id"] = SENSOR_ID;
  doc["ts"]        = (uint32_t)(millis() / 1000);

  char buffer[128];
  size_t n = serializeJson(doc, buffer);

  bool ok = mqttClient.publish(topicDoorSensed.c_str(), buffer, n);
  Serial.print("MQTT publish ");
  Serial.print(topicDoorSensed);
  Serial.print(" => ");
  Serial.println(ok ? "OK" : "FAIL");
}

// ==============================
// MQTT Publish: bin/{device_id}/status
// 페이로드: { device_id, remain, cap, is_open }
// ==============================
void publishBinStatus(bool isOpen) {
  StaticJsonDocument<128> doc;
  doc["device_id"] = DEVICE_ID;
  doc["remain"]    = BIN_REMAIN;
  doc["cap"]       = BIN_CAPACITY;
  doc["is_open"]   = isOpen;

  char buffer[128];
  size_t n = serializeJson(doc, buffer);

  bool ok = mqttClient.publish(topicBinStatus.c_str(), buffer, n);
  Serial.print("MQTT publish ");
  Serial.print(topicBinStatus);
  Serial.print(" => ");
  Serial.println(ok ? "OK" : "FAIL");
}

// ==============================
// 스피커 명령 처리
// 토픽: speaker/{device_id}/cmd
// JSON: { "type":"tts", "text": voice_msg }
// ==============================
void handleSpeakerCommand(const JsonDocument& doc) {
  const char* type = doc["type"] | "";
  const char* text = doc["text"] | "";

  if (strcmp(type, "tts") != 0) {
    Serial.println("[Speaker] Unknown type (not tts), ignore");
    return;
  }

  String msg = String(text);
  Serial.print("[Speaker] TTS text: ");
  Serial.println(msg);

  // 1) LCD 에 문구 표시
  showTextOnLCD(msg);

  // 2) 스피커로 간단한 "알림 톤" (실제 TTS 재생은 추후 구현)
  playTTSText(msg);
}

// ==============================
// 우산함 박스 명령 처리
// 토픽: box/{device_id}/cmd
// JSON: { "act":"open", "close_in":10000 }
// ==============================
void handleBoxCommand(const JsonDocument& doc) {
  const char* act = doc["act"] | "";
  long closeIn = doc["close_in"] | 10000; // 기본 10초

  Serial.print("[Box] act = ");
  Serial.print(act);
  Serial.print(", close_in = ");
  Serial.println(closeIn);

  if (strcmp(act, "open") == 0) {
    openUmbrella(closeIn);
  } else if (strcmp(act, "close") == 0) {
    closeUmbrella();
    umbrellaCloseAt = 0;
    publishBinStatus(false);
  } else {
    Serial.println("[Box] Unknown act");
  }
}

// ==============================
// 서보 제어 (우산함)
// ==============================
void openUmbrella(long closeInMs) {
  Serial.println("[Umbrella] OPEN");
  umbrellaServo.write(SERVO_OPEN_ANGLE);
  umbrellaOpen = true;

  // 우산함 문이 열리면 상태 is_open = true
  publishBinStatus(true);

  if (closeInMs > 0) {
    umbrellaCloseAt = millis() + closeInMs;
  }
}

void closeUmbrella() {
  Serial.println("[Umbrella] CLOSE");
  umbrellaServo.write(SERVO_CLOSE_ANGLE);
  umbrellaOpen = false;
}

// ==============================
// LCD 표시
// ==============================
void showTextOnLCD(const String& text) {
  lcd.clear();

  // 최대 16자씩 두 줄에 나눠서 출력
  String line1 = text.substring(0, 16);
  String line2 = "";
  if (text.length() > 16) {
    line2 = text.substring(16, 32);
  }

  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

// ==============================
// TTS 재생 스텁 (간단한 Beep 패턴)
// ==============================
void playTTSText(const String& text) {
  Serial.println("[Speaker] playTTSText() called (stub).");

  // 간단 알림용: 텍스트 길이에 비례해서 삐- 삐- 두세 번 울리기
  int beepCount = 2;
  if (text.length() > 20) beepCount = 3;
  if (text.length() > 40) beepCount = 4;

  for (int i = 0; i < beepCount; i++) {
    ledcWrite(AUDIO_CH, 200);  // 약간의 볼륨
    delay(200);
    ledcWrite(AUDIO_CH, 0);
    delay(150);
  }
}
