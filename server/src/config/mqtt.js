// MQTT 브로커 연결 및 디바이스 메시지 수신/처리를 담당하는 모듈
// [의존] mqtt, logger, mqtt_door_ctrl, mqtt_bin_ctrl

import mqtt from 'mqtt';
import { logger } from '../utils/logger.js';
import { handleDoorSensed } from '../controllers/mqtt_door_ctrl.js';
import { handleBinStatus } from '../controllers/mqtt_bin_ctrl.js';

// 환경 변수에서 설정 가져오기
const MQTT_HOST_ENV = process.env.MQTT_HOST ? process.env.MQTT_HOST.replace('mqtt://', '') : 'localhost';
const MQTT_PORT_ENV = process.env.MQTT_PORT || '1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

// Construct the full MQTT URL
const MQTT_URL = `mqtt://${MQTT_HOST_ENV}:${MQTT_PORT_ENV}`;

// MQTT 클라이언트 옵션: 인증 정보 포함
const options = {
    // 환경 변수에서 사용자 이름과 비밀번호를 읽어와 설정
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    // 디버깅을 위해 클라이언트 ID 설정 (선택 사항)
    clientId: 'smartdoor_backend_server',
};

// MQTT 브로커 연결: 인증 옵션(options) 객체를 함께 전달
export const mqtt_client = mqtt.connect(MQTT_URL, options);

// 구독할 토픽 정의
const TOPIC_DOOR_SENSED = 'door/+/sensed';   // 현관 센서 감지 이벤트
const TOPIC_BIN_STATUS  = 'bin/+/status';    // 우산 보관함 상태 보고

// MQTT 브로커 연결 성공 시
mqtt_client.on('connect', () => {
  logger.info(`MQTT 브로커 연결 성공: ${MQTT_URL}`);
  // 토픽 구독 시작
  mqtt_client.subscribe([TOPIC_DOOR_SENSED, TOPIC_BIN_STATUS], (err) => {
    if (err) {
      logger.error('MQTT 토픽 구독 실패:', err);
    } else {
      logger.info('MQTT 토픽 구독 완료');
    }
  });
});

// 메시지 핸들러: 구독 중인 토픽에 메시지 도착 시 호출됨
// 이 핸들러는 토픽을 분석하여 적절한 컨트롤러로 작업을 위임하는 '디스패처' 역할을 함.
mqtt_client.on('message', async (topic, payload) => {
  try {
    // 토픽 파싱 (예: "door/123/sensed" -> ['door', '123', 'sensed'])
    const topic_parts = topic.split('/');
    const domain = topic_parts[0];
    // action은 토픽 구조에 따라 존재할 수도, 아닐 수도 있습니다.
    const action = topic_parts.length > 2 ? topic_parts[2] : null;

    // 1. 현관 센서 감지 이벤트 처리
    if (domain === 'door' && action === 'sensed') {
      await handleDoorSensed(topic, payload);
    }
    // 2. 우산 보관함 상태 보고 처리
    else if (domain === 'bin' && action === 'status') {
      await handleBinStatus(topic, payload);
    }
    // 3. 기타 토픽 (필요 시 추가)
    else {
      logger.warn(`[MQTT] 처리 핸들러가 없는 토픽입니다: ${topic}`);
    }

  } catch (e) {
    logger.error(`[MQTT] 메시지 디스패처 오류: ${e.message}`, { topic });
  }
});

// 연결 오류 발생 시
mqtt_client.on('error', (err) => {
  logger.error('MQTT 연결 오류:', err);
});