// MQTT 'door/+/sensed' 토픽의 비즈니스 로직을 처리하는 컨트롤러
// [의존] Joi, prisma, weather_svc, tts_svc, logger

import Joi from 'joi';
import { prisma } from '../config/prisma.js';
import { get_rain_info } from '../services/weather_svc.js';
import { send_tts } from '../services/tts_svc.js';
import { logger } from '../utils/logger.js';

// 'door/sensed' 메시지 페이로드에 대한 유효성 검사 스키마

// 수정 전: payload에 user_id가 반드시 있어야 했음
// const doorSensedSchema = Joi.object({
//   user_id: Joi.number().integer().required(),
//   // sensor_id: Joi.number().integer().required(), // 페이로드에 sensor_id도 포함될 수 있음
// });

// 수정 후: 현재는 payload에서 특별히 요구하는 필드 없음 (기본 구조만 검증)
const doorSensedSchema = Joi.object({});

/**
 * 'door/+/sensed' 토픽 메시지 핸들러.
 * 문 열림 감지 시, 날씨/우산/알람 정보를 종합하여 사용자에게 음성 안내.
 * @param {string} topic - 수신된 MQTT 토픽 (예: 'door/A1B2C3/sensed')
 * @param {Buffer} payload - 수신된 MQTT 페이로드
 */
export async function handleDoorSensed(topic, payload) {
  const payloadString = payload.toString();
  logger.info(`[MQTT] 'door/sensed' 메시지 수신. 처리 시작.`, { topic, payload: payloadString });

  try {
    // 0. 토픽에서 기기 serial 추출
    const topic_parts = topic.split('/');
    const serial = topic_parts[1];  // 예: door/A1B2C3/sensed → 'A1B2C3'

    if (!serial) {
      logger.warn(`[MQTT] 'door/sensed' 토픽에서 serial을 찾을 수 없음: ${topic}`);
      return;
    }

    // 1. 기기 정보 조회 → user_id 가져오기
    const device = await prisma.device.findUnique({ where: { serial } });
    if (!device || !device.user_id) {
      logger.warn(`[MQTT] serial=${serial} 에 해당하는 등록된 사용자/기기를 찾을 수 없음.`);
      return;
    }

    const user_id = device.user_id;

    // 2. 페이로드 파싱(현재는 필수 필드 없음, 형식만 대충 검증)
    let parsedPayload = {};
    if (payloadString) {
      try {
        parsedPayload = JSON.parse(payloadString);
      } catch (e) {
        logger.warn(`[MQTT] payload JSON 파싱 실패 (무시하고 진행): ${e.message}`, { topic, payload: payloadString });
        parsedPayload = {};
      }
    }

    const { error } = doorSensedSchema.validate(parsedPayload);
    if (error) {
      logger.warn(`[MQTT Validation] 'door/sensed' 유효하지 않은 페이로드: ${error.message}`, { topic, payload: payloadString });
      // 현재 비즈니스에는 영향이 없으므로, 일단 계속 진행해도 됨. 필요하면 여기서 return
    }

    // 3. 사용자 정보 및 위치 좌표 확인
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user || user.lat == null || user.lon == null) {
      logger.warn(`[MQTT] 사용자(ID: ${user_id})의 위치가 설정되지 않아 날씨 안내를 생략합니다.`);
      return;
    }

    // 4. 날씨 서비스로부터 강수 정보 조회 (is_test = false)
    const rain_time = await get_rain_info(user.lat, user.lon, false);

    // 5. 사용자의 우산함 상태 조회
    const bin_devices = await prisma.device.findMany({ 
      where: { user_id: user_id, type: 'UMBRELLA_BIN' } 
    });
    if (bin_devices.length > 1) {
      logger.warn(`[MQTT] 사용자(ID: ${user_id})가 여러 개의 우산 보관함('UMBRELLA_BIN')을 가지고 있습니다. 첫 번째 장치를 사용합니다.`);
    }
    const bin_device = bin_devices[0] ?? null;
    const umbrella_bin = bin_device 
      ? await prisma.umbrellaBin.findUnique({ where: { device_id: bin_device.id } }) 
      : null;

    // 6. 사용자의 개인화 알람 목록 조회
    const user_alarms = await prisma.alarm.findMany({ where: { user_id: user_id } });
    const alarm_texts = user_alarms.map(alarm => alarm.text).join(', ');

    // 7. 상황별 음성 안내 메시지 생성
    let voice_message = '';
    if (rain_time) {
      voice_message = `오늘 ${rain_time}부터 비가 올 예정입니다. 우산을 꼭 챙기세요.`;
      if (umbrella_bin && umbrella_bin.remain === 0) {
        voice_message += ' 우산 보관함이 비어있습니다.';
      }
    } else {
      voice_message = '오늘 비 소식은 없습니다. 좋은 하루 되세요.';
    }
    if (alarm_texts) {
      voice_message += ` 외출 전 ${alarm_texts} 챙기는 것 잊지 마세요.`;
    }

    // 8. 스피커로 TTS(Text-to-Speech) 명령 전송
    const speakers = await prisma.device.findMany({ 
      where: { user_id: user_id, type: 'SPEAKER' }
    });
    if (speakers.length > 1) {
      logger.warn(`[MQTT] 사용자(ID: ${user_id})가 여러 개의 스피커('SPEAKER')를 가지고 있습니다. 첫 번째 장치를 사용합니다.`);
    }
    const speaker = speakers[0] ?? null;

    if (speaker) {
      // send_tts는 내부에서 device_id → serial → MQTT 토픽으로 변환
      await send_tts(speaker.id, voice_message);
      logger.info(`[MQTT] 사용자(ID: ${user_id})에게 TTS 메시지 전송 완료.`, { message: voice_message });
    } else {
      logger.warn(`[MQTT] 사용자(ID: ${user_id})의 스피커를 찾을 수 없어 TTS를 전송하지 못했습니다.`);
    }

  } catch (e) {
    // JSON 파싱 오류 또는 기타 예외 처리
    logger.error(`[MQTT] 'door/sensed' 메시지 처리 중 심각한 오류 발생: ${e.message}`, { topic, payload: payloadString, stack: e.stack });
  }
}
