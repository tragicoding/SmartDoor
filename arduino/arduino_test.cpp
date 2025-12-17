#include <Arduino.h>
#include <WiFi.h>
#include "esp_wpa2.h"     
#include "esp_wifi.h"     
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>   
#include "driver/i2s.h"   


// Wi-Fi SSID
const char* WIFI_SSID      = "Smart-CAU_2.4G";  

// EAP ID / USER / PASSWORD
const char* EAP_IDENTITY   = " ";        
const char* EAP_USERNAME   = " ";      
const char* EAP_PASSWORD   = " ";  



// MQTT 설정
const char* MQTT_HOST = "165.194.202.109";   // ★ 서버 IP
const uint16_t MQTT_PORT = 1883;

const char* MQTT_USER = "";
const char* MQTT_PASS = "";

// Door 디바이스 serial
const char* DOOR_SERIAL = "123123";         
// Speaker 디바이스 serial 
const char* SPEAKER_SERIAL = "speaker_01"; 

String topicDoorSensed  = String("door/")    + DOOR_SERIAL    + "/sensed";
String topicSpeakerCmd  = String("speaker/") + SPEAKER_SERIAL + "/cmd";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);


// 초음파 센서 (HC-SR04P)
const int TRIG_PIN = 5;   
const int ECHO_PIN = 18; 

// 서보모터 
const int SERVO_PIN = 16;  

// LCD 16x2 (병렬, 4비트 모드)
const int LCD_RS = 14;
const int LCD_EN = 27;
const int LCD_D4 = 25;
const int LCD_D5 = 26;
const int LCD_D6 = 32;
const int LCD_D7 = 33;


// I2S (MAX98357) 핀/설정
#define I2S_PORT        I2S_NUM_0
const int I2S_BCLK_PIN  = 13;  
const int I2S_LRCLK_PIN = 19;  
const int I2S_DOUT_PIN  = 12;  

const int AUDIO_SAMPLE_RATE = 16000;

LiquidCrystal lcd(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);
Servo doorServo;   // ★ 서보 객체


// 동작 파라미터
const long PERSON_THRESHOLD_CM  = 80;          // 80cm 이내면 사람
const unsigned long OPEN_DURATION_MS = 10000;  // 10초 동안 열어두기

// 연속회전 서보 제어값
const int SERVO_STOP_PULSE = 90;   // 90 근처 = 정지
const int SERVO_OPEN_PULSE = 120;  // >90 한쪽 방향
const int SERVO_CLOSE_PULSE = 60;  // <90 반대 방향

// 실 당기는 시간
const unsigned long SERVO_OPEN_TIME_MS  = 800;  // 10cm 당겨질 때까지 시간
const unsigned long SERVO_CLOSE_TIME_MS = 800;

// 상태 변수
bool isOpen = false;
unsigned long openStartedAt = 0;

// MQTT 쿨타임
const unsigned long MQTT_COOLDOWN_MS = 15000;
unsigned long lastMqttSendTime = 0;


// 함수 선언
float measureDistanceCm();
void openBox();
void closeBox();
void lcdPrintCentered(int row, const String &text);
void connectWiFi_WPA2();
void connectMQTT();
void publishDoorSensed();

// 스피커 관련
void initI2S();
bool playWavFromUrl(const String& url);
void mqttCallback(char* topic, byte* payload, unsigned int length);

// 체크리스트 LCD
void showChecklistOnLCD(const String &text);

// setup
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=== ESP32 + WPA2 + Sensor + Servo + LCD + MAX98357 ===");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // ★ 서보 초기화
  doorServo.attach(SERVO_PIN);
  doorServo.write(SERVO_STOP_PULSE); 
  delay(500);

  // LCD 초기화
  lcd.begin(16, 2);
  lcd.clear();
  lcdPrintCentered(0, "Smart Umbrella");
  lcdPrintCentered(1, "System Booting");
  delay(2000);

  lcd.clear();
  lcdPrintCentered(0, "WiFi Connecting");

  // WiFi 연결
  connectWiFi_WPA2();

  // I2S (스피커) 초기화
  initI2S();

  // MQTT 서버/콜백 설정
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  lcd.clear();
  lcdPrintCentered(0, "Ready...");
}


// loop
void loop() {
  // MQTT 연결 유지
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  float distance = measureDistanceCm();
  unsigned long now = millis();

  // 1줄: 거리 표시
  lcd.setCursor(0, 0);
  lcd.print("Dist:");
  if (distance < 0) {
    lcd.print(" ---- cm   ");
  } else {
    lcd.print(distance, 1);
    lcd.print(" cm   ");
  }

  // 사람이 감지되면 박스 열기 + MQTT 전송
  if (!isOpen && distance > 0 && distance < PERSON_THRESHOLD_CM) {
    lcd.setCursor(0, 1);
    lcd.print("Opening...       ");
    Serial.println("Person detected -> OPEN");

    // 1) 서보로 문 열기
    openBox();

    lcd.setCursor(0, 1);
    lcd.print("Opened (wait)    ");
    isOpen = true;
    openStartedAt = now;

    // 2) MQTT door/{serial}/sensed 전송 (쿨타임)
    if (now - lastMqttSendTime > MQTT_COOLDOWN_MS) {
      publishDoorSensed();
      lastMqttSendTime = now;
    } else {
      Serial.println("[MQTT] Cooldown 중이라 이번 감지는 MQTT 전송 생략");
    }
  }

  // 일정 시간 지나면 닫기
  if (isOpen && (now - openStartedAt >= OPEN_DURATION_MS)) {
    lcd.setCursor(0, 1);
    lcd.print("Closing...       ");
    Serial.println("Auto close");

    closeBox();

    lcd.setCursor(0, 1);
    lcd.print("Closed           ");
    isOpen = false;
  }

  delay(200);
}

// 초음파 거리 측정
float measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {
    Serial.println("[DEBUG] pulseIn timeout");
    return -1.0;
  }

  float distanceCm = duration * 0.0343f / 2.0f;
  Serial.print("[DEBUG] distance: ");
  Serial.print(distanceCm);
  Serial.println(" cm");
  return distanceCm;
}


// 서보로 문 열기/닫기 (연속회전 서보 기준)
void openBox() {
  Serial.println("[SERVO] OPEN");
  doorServo.write(SERVO_OPEN_PULSE);          // 한 방향 회전
  delay(SERVO_OPEN_TIME_MS);                 // ★ 실이 10cm 당겨질 때까지 시간 조절
  doorServo.write(SERVO_STOP_PULSE);         // 정지
}

void closeBox() {
  Serial.println("[SERVO] CLOSE");
  doorServo.write(SERVO_CLOSE_PULSE);        // 반대 방향
  delay(SERVO_CLOSE_TIME_MS);                // ★ 닫힐 때까지 시간 조절
  doorServo.write(SERVO_STOP_PULSE);         // 정지
}

// LCD 가운데 정렬 출력
void lcdPrintCentered(int row, const String &text) {
  lcd.setCursor(0, row);
  String t = text;
  if (t.length() > 16) t = t.substring(0, 16);
  int spaces = (16 - t.length()) / 2;
  for (int i = 0; i < spaces; i++) lcd.print(" ");
  lcd.print(t);
  while (spaces + t.length() < 16) {
    lcd.print(" ");
    spaces++;
  }
}


// 체크리스트 텍스트 LCD에 표시
void showChecklistOnLCD(const String &text) {
  lcd.clear();

  // 1줄: 제목
  lcd.setCursor(0, 0);
  lcd.print("Checklist");

  // 2줄: 실제 할 일 (최대 16글자)
  lcd.setCursor(0, 1);
  String t = text;
  if (t.length() > 16) t = t.substring(0, 16);
  lcd.print(t);
}


// WiFi (WPA2-Enterprise) 연결
void connectWiFi_WPA2() {
  Serial.println("[WiFi] WPA2-Enterprise 연결 시작");

  WiFi.disconnect(true);
  delay(1000);

  WiFi.mode(WIFI_STA);

  // EAP 설정
  esp_wifi_sta_wpa2_ent_set_identity((uint8_t*)EAP_IDENTITY, strlen(EAP_IDENTITY));
  esp_wifi_sta_wpa2_ent_set_username((uint8_t*)EAP_USERNAME, strlen(EAP_USERNAME));
  esp_wifi_sta_wpa2_ent_set_password((uint8_t*)EAP_PASSWORD, strlen(EAP_PASSWORD));

  // config 없이 enable
  esp_wifi_sta_wpa2_ent_enable();

  WiFi.begin(WIFI_SSID);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    retry++;
    if (retry > 40) {
      Serial.println("\n[WiFi] 연결 실패, 재시도");
      WiFi.disconnect(true);
      delay(1000);

      esp_wifi_sta_wpa2_ent_set_identity((uint8_t*)EAP_IDENTITY, strlen(EAP_IDENTITY));
      esp_wifi_sta_wpa2_ent_set_username((uint8_t*)EAP_USERNAME, strlen(EAP_USERNAME));
      esp_wifi_sta_wpa2_ent_set_password((uint8_t*)EAP_PASSWORD, strlen(EAP_PASSWORD));
      esp_wifi_sta_wpa2_ent_enable();

      WiFi.begin(WIFI_SSID);
      retry = 0;
    }
  }

  Serial.println();
  Serial.print("✅ WiFi connected, IP: ");
  Serial.println(WiFi.localIP());
}


// MQTT 연결
void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT... ");
    String clientId = String("esp32-door-") + DOOR_SERIAL;

    bool ok;
    if (strlen(MQTT_USER) > 0) {
      ok = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    } else {
      ok = mqttClient.connect(clientId.c_str());
    }

    if (ok) {
      Serial.println("connected ✅");
      // 스피커 명령 토픽 구독
      mqttClient.subscribe(topicSpeakerCmd.c_str());
      Serial.print("[MQTT] Subscribed: ");
      Serial.println(topicSpeakerCmd);
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" -> retry in 5s");
      delay(5000);
    }
  }
}

// MQTT 전송: door/{serial}/sensed
void publishDoorSensed() {
  StaticJsonDocument<128> doc;
  doc["from"] = "esp32_wpa2_servo_lcd";
  doc["ts"]   = (uint32_t)(millis() / 1000);

  char buffer[128];
  size_t n = serializeJson(doc, buffer);

  bool ok = mqttClient.publish(topicDoorSensed.c_str(), buffer, n);
  Serial.print("MQTT publish ");
  Serial.print(topicDoorSensed);
  Serial.print(" => ");
  Serial.println(ok ? "OK" : "FAIL");
}


// MQTT 콜백: 스피커 명령 수신
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr(topic);
  Serial.print("[MQTT] Message arrived [");
  Serial.print(topicStr);
  Serial.println("]");

  // payload → String
  String payloadStr;
  payloadStr.reserve(length + 1);
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }
  Serial.print("[MQTT] Payload: ");
  Serial.println(payloadStr);

  // 우리가 재생할 토픽인지 확인
  if (topicStr != topicSpeakerCmd) {
    Serial.println("[MQTT] Unknown topic, ignore");
    return;
  }

  // JSON 파싱
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payloadStr);
  if (err) {
    Serial.print("[MQTT] JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  const char* type = doc["type"] | "";
  const char* url  = doc["url"]  | "";
  const char* text = doc["text"] | "";

  // LCD에 체크리스트 표시 (지갑 챙기기 등)
  if (text != nullptr && strlen(text) > 0) {
    showChecklistOnLCD(String(text));
  }

  // "tts" 또는 "tts_audio" 둘 다 허용
  bool isTts = (strcmp(type, "tts") == 0) ||
               (strcmp(type, "tts_audio") == 0);

  if (!isTts) {
    Serial.print("[MQTT] type is not tts/tts_audio: ");
    Serial.println(type);
    return;
  }

  if (url == nullptr || strlen(url) == 0) {
    Serial.println("[MQTT] url empty, cannot play");
    return;
  }

  Serial.print("[TTS] Play URL: ");
  Serial.println(url);
  if (text != nullptr && strlen(text) > 0) {
    Serial.print("[TTS] Text: ");
    Serial.println(text);
  }

  bool ok = playWavFromUrl(String(url));
  if (ok) {
    Serial.println("[TTS] Playback done");
  } else {
    Serial.println("[TTS] Playback failed");
  }
}

// I2S 초기화 (MAX98357)
void initI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = AUDIO_SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 256,
    .use_apll = false,
    .tx_desc_auto_clear = true,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_BCLK_PIN,
    .ws_io_num = I2S_LRCLK_PIN,
    .data_out_num = I2S_DOUT_PIN,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);

  Serial.println("[I2S] Initialized");
}


// WAV 스트리밍 재생 (HTTP → I2S)
bool playWavFromUrl(const String& url) {
  if (!url.startsWith("http://")) {
    Serial.println("[TTS] Only http:// URL supported");
    return false;
  }

  int idxSchemeEnd = url.indexOf("://");
  int idxPathStart = url.indexOf('/', idxSchemeEnd + 3);
  if (idxPathStart < 0) {
    Serial.println("[TTS] Invalid URL (no path)");
    return false;
  }

  String hostPort = url.substring(idxSchemeEnd + 3, idxPathStart);
  String path     = url.substring(idxPathStart);

  String host = hostPort;
  int port = 80;
  int colonIndex = hostPort.indexOf(':');
  if (colonIndex >= 0) {
    host = hostPort.substring(0, colonIndex);
    port = hostPort.substring(colonIndex + 1).toInt();
    if (port == 0) port = 80;
  }

  Serial.print("[TTS] HTTP connect to ");
  Serial.print(host);
  Serial.print(":");
  Serial.print(port);
  Serial.print(" path=");
  Serial.println(path);

  WiFiClient client;
  if (!client.connect(host.c_str(), port)) {
    Serial.println("[TTS] HTTP connect failed");
    return false;
  }

  client.print(String("GET ") + path + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" +
               "Connection: close\r\n\r\n");

  // HTTP 헤더 스킵
  Serial.println("[TTS] Waiting for headers...");
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r" || line.length() <= 1) {
      break;
    }
  }

  // WAV 헤더(44바이트) 읽기
  uint8_t header[44];
  int headerRead = 0;
  unsigned long startWait = millis();
  while (headerRead < 44) {
    if (!client.available()) {
      if (millis() - startWait > 2000) {
        Serial.println("[TTS] Timeout while reading WAV header");
        client.stop();
        return false;
      }
      delay(1);
      continue;
    }
    int n = client.read(header + headerRead, 44 - headerRead);
    if (n > 0) headerRead += n;
  }

  if (headerRead < 44) {
    Serial.println("[TTS] WAV header too short");
    client.stop();
    return false;
  }

  // WAV 포맷 정보 파싱
  uint16_t audioFormat   = header[20] | (header[21] << 8);   // 1 = PCM
  uint16_t numChannels   = header[22] | (header[23] << 8);
  uint32_t sampleRate    = header[24] | (header[25] << 8) |
                           (header[26] << 16) | (header[27] << 24);
  uint16_t bitsPerSample = header[34] | (header[35] << 8);

  Serial.print("[WAV] audioFormat=");   Serial.println(audioFormat);
  Serial.print("[WAV] numChannels=");   Serial.println(numChannels);
  Serial.print("[WAV] sampleRate=");    Serial.println(sampleRate);
  Serial.print("[WAV] bitsPerSample="); Serial.println(bitsPerSample);

  // I2S 샘플레이트를 WAV에 맞추기
  i2s_set_sample_rates(I2S_PORT, sampleRate);

  Serial.println("[TTS] Streaming audio via I2S...");

  uint8_t buf[512];
  while (client.connected() || client.available()) {
    int n = client.read(buf, sizeof(buf));
    if (n <= 0) {
      delay(1);
      continue;
    }

    size_t bytes_written = 0;
    i2s_write(I2S_PORT, buf, n, &bytes_written, portMAX_DELAY);
  }

  client.stop();
  Serial.println("[TTS] Stream finished");
  return true;
}
