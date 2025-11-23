// MQTT를 통해 스피커 디바이스로 TTS(Text-to-Speech) 명령을 전송하는 서비스
// [의존] mqtt_client, logger

import { mqtt_client } from '../config/mqtt.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/prisma.js';   // ★ 추가: device 조회용

/**
 * 특정 스피커 디바이스에 텍스트를 음성으로 변환하여 재생하도록 명령함.
 * 
 * @param {number} device_id - 명령을 보낼 스피커 디바이스의 ID
 * @param {string} text - 음성으로 변환할 텍스트
 */

// 수정 전
// export async function send_tts(device_id, text) {
//   // 토픽 형식: speaker/{device_id}/cmd
//   const topic = `speaker/${device_id}/cmd`;
  
//   // 펌웨어에서 해석할 JSON 페이로드
//   const payload = JSON.stringify({ 
//     type: 'tts', 
//     text: text 
//   });

//   // MQTT 브로커로 메시지 발행 (QoS 1: 최소 한 번 전달 보장)
//   mqtt_client.publish(topic, payload, { qos: 1 }, (err) => {
//     if (err) {
//       logger.error(`TTS 명령 전송 실패 (device: ${device_id}):`, err);
//     } else {
//       logger.info(`TTS 명령 전송 성공 (device: ${device_id})`);
//     }
//   });
// }

// 수정 후: device_id로 DB 조회 → serial 기반 토픽 사용
export async function send_tts(device_id, text) {
  try {
    const device = await prisma.device.findUnique({ where: { id: device_id } });
    if (!device) {
      logger.error(`TTS 명령 전송 실패: device_id=${device_id} 에 해당하는 기기를 찾을 수 없습니다.`);
      return;
    }

    if (!device.serial) {
      logger.error(`TTS 명령 전송 실패: device_id=${device_id} 에 serial이 설정되어 있지 않습니다.`);
      return;
    }

    // 토픽 형식: speaker/{serial}/cmd
    const topic = `speaker/${device.serial}/cmd`;

    const payload = JSON.stringify({
      type: 'tts',
      text: text,
    });

    mqtt_client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`TTS 명령 전송 실패 (device_id: ${device_id}, serial: ${device.serial}):`, err);
      } else {
        logger.info(`TTS 명령 전송 성공 (device_id: ${device_id}, serial: ${device.serial})`);
      }
    });
  } catch (e) {
    logger.error(`TTS 명령 전송 중 예외 발생 (device_id: ${device_id}): ${e.message}`);
  }
}
