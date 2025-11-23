import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate.js';
import { device_auth, user_auth } from '../middleware/auth.js';
import { update_bin_status, get_bin_status } from '../controllers/bin_ctrl.js';

const router = Router();

// 우산함 상태 업데이트 (디바이스 인증 필요)
router.post('/update', device_auth, validate('body', Joi.object({
  device_id: Joi.number().integer().required(),
  remain: Joi.number().integer().min(0).required(),
  cap: Joi.number().integer().min(1).required(),
  is_open: Joi.boolean().required(),
  secret: Joi.string().required(),
})), update_bin_status);

// 우산함 상태 조회 (사용자 인증 필요)
router.get('/status', user_auth, validate('query', Joi.object({
  device_id: Joi.number().integer().required(),
})), get_bin_status);

export default router;