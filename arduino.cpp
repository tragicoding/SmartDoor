#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <SD.h>
#include <SPI.h>
#include <Audio.h>
#include <WiFiClientSecure.h>

// wifi 설정
const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASS";

//국가 설정
const char* AZ_REGION = "koreacentral";        
const char* AZ_KEY    = "YOUR_AZURE_SPEECH_KEY";  // 실제 키로 교체


// 센서/서보/LCD
#define PIN_PIR     13
#define PIN_SERVO   6
LiquidCrystal_I2C lcd(0x27, 16, 2); 
Servo servo;

// SD (SPI)
#define SD_CS   5   // SCK=18, MISO=19, MOSI=23

// I2S (MAX98357A)
#define I2S_BCLK 26
#define I2S_LRC  25
#define I2S_DOUT 27

WebServer server(80);
Preferences prefs;
Audio audio;     // MP3/WAV 재생 엔진

String city   = "Seoul,KR";                         // 앱에서 변경
String apiKey = "";                                 // OpenWeather API 키
String items  = "지갑\n핸드폰\n열쇠\n신분증";         // 체크리스트 
bool   isRaining = false;

unsigned long tWeather=0, tLCD=0, tCooldown=0;
const unsigned long WEATHER_MS  = 10UL * 60UL * 1000UL; // 10분
const unsigned long LCD_MS      = 2000;
const unsigned long COOLDOWN_MS = 15000;

enum State { IDLE, SENSED, DECIDE, ACTUATE, COOLDOWN };
State st = IDLE;

//음성
bool speakActive = false;
int  speakTotal  = 0;    // 항목 개수
int  speakIndex  = 0;    // 다음 재생 인덱스(1부터)
unsigned long speakGapAt = 0; // 다음 파일 시작 시간

//저장
void saveCfg(){
  prefs.begin("cfg", false);
  prefs.putString("city", city);
  prefs.putString("api",  apiKey);
  prefs.putString("items",items);
  prefs.end();
}
void loadCfg(){
  prefs.begin("cfg", true);
  city   = prefs.getString("city",  city);
  apiKey = prefs.getString("api",   apiKey);
  items  = prefs.getString("items", items);
  prefs.end();
}

//날씨
bool fetchWeather(){
  if(apiKey == "") return false;
  String url = "http://api.openweathermap.org/data/2.5/weather?q=" + city + "&units=metric&appid=" + apiKey;
  HTTPClient http; http.setTimeout(4000);
  if(!http.begin(url)) return false;

  int code = http.GET();
  if(code != 200){ http.end(); return false; }

  StaticJsonDocument<2048> doc;
  DeserializationError e = deserializeJson(doc, http.getString());
  http.end();
  if(e) return false;

  String main = doc["weather"][0]["main"] | "";
  float  r1h  = doc["rain"]["1h"]        | 0.0;
  isRaining = (main=="Rain" || main=="Drizzle" || main=="Thunderstorm" || r1h>0.0);
  return true;
}

//LCD
void lcdShow(){
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print(isRaining ? "우산 챙기기!" : "챙길 것들:");
  int nl = items.indexOf('\n');
  String first = (nl==-1) ? items : items.substring(0,nl);
  lcd.setCursor(0,1);
  lcd.print(first.substring(0,16));
}

//체크리스트
int countItems(){
  if(items.length()==0) return 0;
  int count=1;
  for(size_t i=0;i<items.length();++i) if(items[i]=='\n') count++;
  return count;
}

//파일 경로
String pathForIndex(int idx){
  char name[32];
  snprintf(name, sizeof(name), "/items/%04d.mp3", idx);
  if(SD.exists(name)) return String(name);
  snprintf(name, sizeof(name), "/items/%04d.wav", idx);
  if(SD.exists(name)) return String(name);
  return "";
}

//Azure TTS → SD 저장

bool azureTtsToSd(const String& text, const char* savePath) {
  if (AZ_KEY==nullptr || strlen(AZ_KEY)==0) return false;
  WiFiClientSecure client;
  client.setInsecure(); // 운영 시 인증서 검증/핀닝으로 대체 권장

  String host = String(AZ_REGION) + ".tts.speech.microsoft.com";
  if (!client.connect(host.c_str(), 443)) return false;

  // 간단 SSML
  String ssml = "<speak version='1.0' xml:lang='ko-KR'>"
                "<voice name='ko-KR-SunHiNeural'>" + text + "</voice></speak>";

  String req =
    "POST /cognitiveservices/v1 HTTP/1.1\r\n"
    "Host: " + host + "\r\n"
    "Ocp-Apim-Subscription-Key: " + String(AZ_KEY) + "\r\n"
    "Content-Type: application/ssml+xml\r\n"
    "X-Microsoft-OutputFormat: audio-16khz-32kbitrate-mono-mp3\r\n"
    "Content-Length: " + String(ssml.length()) + "\r\n"
    "Connection: close\r\n\r\n" + ssml;

  client.print(req);
  if (!client.find("\r\n\r\n")) return false; // 헤더 끝

  // SD에 스트리밍 저장
  File f = SD.open(savePath, FILE_WRITE);
  if (!f) return false;

  uint8_t buf[1024];
  while (client.connected()) {
    int n = client.read(buf, sizeof(buf));
    if (n > 0) f.write(buf, n);
    else if (n < 0) break;
    else delay(1);
  }
  f.close();
  return true;
}

//음성 읽기
void speakStart(){
  speakTotal = countItems();
  speakIndex = 1;
  speakActive = (speakTotal > 0);
  speakGapAt = 0; // 즉시 시작
}
void speakStep(){
  if(!speakActive) return;

  // 파일 재생 중이면 루프만 돌고 리턴
  if(audio.isRunning()) return;

  // 다음 파일 시작까지 대기
  if(millis() < speakGapAt) return;

  // 다음 항목 재생
  if(speakIndex <= speakTotal){
    String path = pathForIndex(speakIndex);
    speakIndex++;
    if(path.length()){
      audio.connecttoFS(SD, path.c_str()); // 재생 시작
      speakGapAt = millis() + 300;         // 다음 트리거까지 짧은 텀
    }else{
      speakGapAt = millis() + 200;         // 파일 없으면 건너뛰고 바로 다음
    }
  }else{
    speakActive = false; // 완료
  }
}

//HTML 페이지 
String html(){
  String esc = items; esc.replace("<","&lt;"); esc.replace(">","&gt;");
  String h = R"(<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>우산통 설정</title>
<style>body{font-family:system-ui;padding:16px;max-width:760px;margin:auto}
label{display:block;margin:.6rem 0 .2rem}input,textarea,button{font-size:16px;padding:.6rem}
textarea{width:100%}button{margin-top:.6rem}</style>
<h2>우산통 설정</h2>)";
  h += "<p><b>IP:</b> "+WiFi.localIP().toString()+" | <b>비 여부:</b> "+String(isRaining?"예":"아니오")+"</p>";
  h += R"(<form action="/save" method="post">
<label>도시(예: Seoul,KR)</label><input name="city" value=")"+city+R"(">
<label>날씨 API 키</label><input name="api" type="password" value=")"+apiKey+R"(">
<label>체크리스트(줄바꿈으로 구분)</label><textarea name="items" rows="6">)"+esc+R"(</textarea>
<button>저장</button></form>
<h3>읽어주기</h3>
<form action="/speak" method="post"><button>체크리스트 읽기</button></form>
<h3>테스트</h3>
<form action="/open"  method="post"><button>뚜껑 열기(5초)</button></form>
<hr><p><b>앱 연동:</b> POST /api/items {items:[...], speak:true}</p>
)";
  return h;
}

//HTTP 핸들러
void hRoot(){ server.send(200,"text/html; charset=utf-8", html()); }

void hSave(){
  if(server.hasArg("city"))  city   = server.arg("city");
  if(server.hasArg("api"))   apiKey = server.arg("api");
  if(server.hasArg("items")) items  = server.arg("items");
  saveCfg();
  // SD 폴더 준비
  if (!SD.exists("/items")) SD.mkdir("/items");
  // 항목별 캐시(없는 파일만)
  int idx=1, start=0;
  while(true){
    int nl = items.indexOf('\n', start);
    String line = (nl==-1) ? items.substring(start) : items.substring(start, nl);
    line.trim();
    if(line.length()>0){
      char path[32]; snprintf(path, sizeof(path), "/items/%04d.mp3", idx);
      if(!SD.exists(path) && WiFi.status()==WL_CONNECTED){
        azureTtsToSd(line, path); delay(120);
      }
      idx++;
    }
    if(nl==-1) break; start = nl+1;
  }
  lcdShow();
  server.sendHeader("Location","/",true); server.send(302);
}

void hSpeak(){
  speakStart();
  server.sendHeader("Location","/",true); server.send(302);
}

void hOpen(){
  // 수동 테스트: 5초 열기
  servo.write(90);
  tCooldown = millis();
  st = ACTUATE;
  server.sendHeader("Location","/",true); server.send(302);
}

//앱/PWA 연동 엔드포인트

void hApiItemsPost() {
  if (!server.hasArg("plain")) { server.send(400, "text/plain", "No body"); return; }
  String body = server.arg("plain");

  StaticJsonDocument<2048> doc;
  DeserializationError e = deserializeJson(doc, body);
  if (e) { server.send(400, "text/plain", "Bad JSON"); return; }

  if (!doc["items"].is<JsonArray>()) { server.send(400, "text/plain", "items[] required"); return; }
  JsonArray arr = doc["items"].as<JsonArray>();

  String newItems = "";
  int idx=0;
  for (JsonVariant v : arr) {
    String s = String(v.as<const char*>());
    s.trim(); if (s.length()==0) continue;
    if (idx>0) newItems += "\n";
    newItems += s; idx++;
  }
  if (idx==0) { server.send(400, "text/plain", "empty items"); return; }

  // 저장 & LCD 갱신
  items = newItems; saveCfg(); lcdShow();

  // SD 폴더 준비
  if (!SD.exists("/items")) SD.mkdir("/items");

  // Azure TTS 캐시(없는 파일만)
  int i=1, start=0;
  while (true) {
    int nl = items.indexOf('\n', start);
    String line = (nl==-1) ? items.substring(start) : items.substring(start, nl);
    line.trim();
    if (line.length()>0) {
      char path[32]; snprintf(path, sizeof(path), "/items/%04d.mp3", i);
      if (!SD.exists(path) && WiFi.status()==WL_CONNECTED) {
        azureTtsToSd(line, path);
        delay(120);
      }
      i++;
    }
    if (nl==-1) break; start = nl+1;
  }

  bool wantSpeak = doc["speak"] | false;
  if (wantSpeak) speakStart();

  String ok = String("{\"ok\":true,\"count\":") + idx + "}";
  server.send(200, "application/json; charset=utf-8", ok);
}

//현재 리스트 반환 
void hApiItemsGet() {
  StaticJsonDocument<2048> doc;
  JsonArray arr = doc.createNestedArray("items");
  int start=0;
  while(true){
    int nl = items.indexOf('\n', start);
    String line = (nl==-1) ? items.substring(start) : items.substring(start, nl);
    line.trim(); if (line.length()>0) arr.add(line);
    if (nl==-1) break; start = nl+1;
  }
  String out; serializeJson(doc, out);
  server.send(200, "application/json; charset=utf-8", out);
}

/* ===== SETUP ===== */
void setup(){
  Serial.begin(115200);

  pinMode(PIN_PIR, INPUT);
  servo.attach(PIN_SERVO); servo.write(0);

  lcd.init(); lcd.backlight(); lcd.print("Booting...");

  loadCfg();

  // Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while(WiFi.status()!=WL_CONNECTED && millis()-t0<15000){ delay(200); Serial.print("."); }
  Serial.println(); Serial.println("IP: "+WiFi.localIP().toString());
  lcd.clear(); lcd.print(WiFi.status()==WL_CONNECTED ? ("IP:"+WiFi.localIP().toString()) : "WiFi Fail");

  // SD
  if(!SD.begin(SD_CS)){ Serial.println("SD init fail"); }

  // I2S 오디오
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(15); // 0~21(라이브러리 버전에 따라 다를 수 있음)

  // 라우팅
  server.on("/",      hRoot);
  server.on("/save",  HTTP_POST, hSave);
  server.on("/speak", HTTP_POST, hSpeak);
  server.on("/open",  HTTP_POST, hOpen);
  server.on("/api/items", HTTP_POST, hApiItemsPost);
  server.on("/api/items", HTTP_GET,  hApiItemsGet);
  server.begin();

  // 초기 날씨 & LCD
  if(WiFi.status()==WL_CONNECTED) fetchWeather();
  lcdShow();
}


void loop(){
  server.handleClient();
  audio.loop(); // 오디오 엔진 유지

  unsigned long now = millis();

  // 주기: 날씨
  if(WiFi.status()==WL_CONNECTED && now - tWeather >= WEATHER_MS){
    if(fetchWeather()) tWeather = now;
  }

  // 주기: LCD
  if(now - tLCD >= LCD_MS){
    tLCD = now;
    lcdShow();
  }

  // 음성 재생 큐
  speakStep();

  // 상태머신
  static unsigned long tAct=0;
  int motion = digitalRead(PIN_PIR);

  switch(st){
    case IDLE:
      if(motion) st = SENSED;
      break;

    case SENSED:
      st = DECIDE;
      break;

    case DECIDE:
      if(isRaining){
        lcd.clear(); lcd.print("덮개 열림중...");
        servo.write(90);
        tAct = now;
        st = ACTUATE;
        // 비 오는 날 자동 읽기 원하면 아래 주석 해제
        // if(!speakActive) speakStart();
      }else{
        st = COOLDOWN;
        tCooldown = now;
      }
      break;

    case ACTUATE:
      if(now - tAct > 5000){
        servo.write(0);
        st = COOLDOWN;
        tCooldown = now;
      }
      break;

    case COOLDOWN:
      if(now - tCooldown > COOLDOWN_MS) st = IDLE;
      break;
  }
}
