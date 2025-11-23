import { Router } from 'express';
import Joi from 'joi';
import { user_auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { 
  get_my_profile, 
  set_user_address, 
  add_user_alarm, 
  list_user_alarms 
} from '../controllers/user_ctrl.js';
import { 
  get_daily_list, 
  upsert_daily_list,
  list_all_daily_lists,
} from '../controllers/daily_list_ctrl.js';

const router = Router();

// 모든 사용자 관련 라우트에는 user_auth 미들웨어를 적용하여 인증된 사용자만 접근 가능
router.use(user_auth);

// 내 정보 조회
router.get('/me', get_my_profile);

// 주소(좌표) 설정
router.put('/address', validate('body', Joi.object({
  lat: Joi.number().precision(8).required(),
  lon: Joi.number().precision(8).required(),
  name: Joi.string().min(1).max(50).optional(), // 2025/11/23 강륜 수정
  road_address: Joi.string().min(1).max(255).optional(), // 2025/11/23 강륜 수정
  detail_address: Joi.string().min(1).max(255).optional(), // 2025/11/23 강륜 수정
  pw: Joi.string().min(6).optional(), // 과제용: 마이페이지에서 비밀번호 변경 허용
  // 기기 시리얼: 빈 문자열은 허용하고, 내용이 있을 때만 1~64자 제한
  device_serial: Joi.string().min(1).max(64).allow('').optional(), // 2025/11/24 강륜 수정: 마이페이지에서 기기 시리얼 변경 허용
})), set_user_address);

// 알람 추가
router.post('/alarms', validate('body', Joi.object({
  alarm_text: Joi.string().min(1).max(100).required(),
})), add_user_alarm);

// 알람 목록 조회
router.get('/alarms', list_user_alarms);

// 날짜별 리스트 전체 조회 (현재 로그인 사용자의 모든 날짜)
router.get('/daily-lists/all', list_all_daily_lists);

// 날짜별 리스트 조회
router.get(
  '/daily-lists',
  validate(
    'query',
    Joi.object({
      date_key: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required(),
    }),
  ),
  get_daily_list,
);

// 날짜별 리스트 저장(업서트)
router.put(
  '/daily-lists',
  validate(
    'body',
    Joi.object({
      date_key: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required(),
      items: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().required(),
            text: Joi.string().min(1).max(100).required(),
            selected: Joi.boolean().required(),
          }),
        )
        .required(),
    }),
  ),
  upsert_daily_list,
);

export default router;