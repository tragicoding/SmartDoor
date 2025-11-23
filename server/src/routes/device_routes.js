import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate.js';
import { add_device, record_heartbeat, register_device } from '../controllers/device_ctrl.js';
import { user_auth } from '../middleware/auth.js';

const router = Router();

// --------------------------------------
// 새로 추가: 기기 등록 API
// --------------------------------------
// 사용자가 로그인한 상태에서, 기기 스티커에 적힌 serial로 기기를 등록
router.post(
  '/register',
  user_auth,
  validate('body', Joi.object({
    serial: Joi.string().length(6).required(),                                 // 6자리 고유 ID
    type: Joi.string().valid('DOOR_SENSOR', 'UMBRELLA_BIN', 'SPEAKER').required(),
    name: Joi.string().max(50).required(),
  })),
  register_device
);

// 기존 디바이스 등록 (사용자 인증 필요) - 필요시 계속 사용 가능
router.post('/', user_auth, validate('body', Joi.object({
  user_id: Joi.number().integer().required(),
  type: Joi.string().valid('DOOR_SENSOR', 'UMBRELLA_BIN', 'SPEAKER').required(),
  name: Joi.string().max(50).required(),
  secret: Joi.string().max(100).required(), // 디바이스별 고유 시크릿
})), add_device);

// 디바이스 하트비트
router.post('/:device_id/heartbeat', validate('params', Joi.object({
  device_id: Joi.number().integer().required(),
})), record_heartbeat);

export default router;
