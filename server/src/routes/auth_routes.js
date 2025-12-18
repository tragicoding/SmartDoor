import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate.js';
import { signup, login } from '../controllers/auth_ctrl.js';

const r = Router();

// 2025/11/23 강륜 수정
r.post('/signup', validate('body', Joi.object({
  email: Joi.string().email().required(),
  pw: Joi.string().min(6).required(),
  name: Joi.string().min(1).max(50).optional(), // 2025/11/23 강륜 수정
  road_address: Joi.string().min(1).max(255).optional(), // 2025/11/23 강륜 수정
  detail_address: Joi.string().min(1).max(255).optional(), // 2025/11/23 강륜 수정
  // 기기 시리얼: 6자리 고유번호만 허용
  device_serial: Joi.string().length(6).optional(), // 2025/11/24 강륜 수정: 회원가입 시 기기 시리얼도 함께 수신
})), signup);

r.post('/login', validate('body', Joi.object({
  email: Joi.string().email().required(),
  pw: Joi.string().required(),
})), login);

export default r;
