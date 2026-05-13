#pragma once

// MQTT 브로커 연결 및 토픽 구독 초기화
void initMqtt();

// loop()마다 호출: 연결 유지 + 수신 처리
void mqttLoop();

// door/{SENSOR_ID}/sensed 발행
void publishDoorSensed();

// bin/{DEVICE_ID}/status 발행
void publishBinStatus(bool isOpen);
