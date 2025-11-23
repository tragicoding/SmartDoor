// MQTT 'bin/+/status' 토픽의 비즈니스 로직을 처리하는 컨트롤러
// [의존] Joi, prisma, logger

import Joi from 'joi';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

// 'bin/status' 메시지 페이로드에 대한 유효성 검사 스키마
const binStatusSchema = Joi.object({
  remain: Joi.number().integer().min(0).required(),
  cap: Joi.number().integer().min(1).required(),
  is_open: Joi.boolean().required(),
});

/**
 * 'bin/+/status' 토픽 메시지 핸들러
 * @param {string} topic - 수신된 MQTT 토픽 (예: 'bin/123/status')
 * @param {Buffer} payload - 수신된 MQTT 페이로드
 */
export async function handleBinStatus(topic, payload) {
  const payloadString = payload.toString();
  logger.info(`MQTT 메시지 수신 - 토픽: ${topic}, 페이로드: ${payloadString}`);

  try {
    // -------------------------------
    // 수정 전: 토픽에서 device_id(숫자) 직접 사용
    // -------------------------------
    // const topic_parts = topic.split('/');
    // const device_id = Number(topic_parts[1]);
    // if (isNaN(device_id)) {
    //   logger.warn(`[MQTT] 토픽에서 유효한 device_id를 찾을 수 없음: ${topic}`);
    //   return;
    // }

    // -------------------------------
    // 수정 후: 토픽에서 serial 추출 → Device 조회
    // -------------------------------
    const topic_parts = topic.split('/');
    const serial = topic_parts[1]; // 예: 'bin/A1B2C3/status' → 'A1B2C3'

    if (!serial) {
      logger.warn(`[MQTT] 토픽에서 유효한 serial을 찾을 수 없음: ${topic}`);
      return;
    }

    const device = await prisma.device.findUnique({ where: { serial } });
    if (!device) {
      logger.warn(`[MQTT] 등록되지 않은 우산함 기기(serial=${serial})에서 메시지 수신`);
      return;
    }

    const db_device_id = device.id;

    // 2. 페이로드 파싱 및 유효성 검사
    const parsedPayload = JSON.parse(payloadString);
    const { error, value } = binStatusSchema.validate(parsedPayload);

    if (error) {
      logger.warn(`[MQTT Validation] 유효하지 않은 페이로드: ${error.message}`, { topic, payload: payloadString });
      return; // 유효성 검사 실패 시 처리 중단
    }

    const { remain, cap, is_open } = value;

    // 3. 비즈니스 로직 수행
    await prisma.umbrellaBin.upsert({
      where: { device_id: db_device_id },
      update: { remain, cap, is_open },
      create: { device_id: db_device_id, remain, cap, is_open },
    });

  } catch (e) {
    // JSON 파싱 오류 또는 기타 예외 처리
    logger.error(`[MQTT] 'bin/status' 메시지 처리 오류: ${e.message}`, { topic, payload: payloadString });
  }
}
