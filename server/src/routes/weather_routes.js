import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate.js';
import { get_weekly_weather_ctrl } from '../controllers/weather_ctrl.js';

const router = Router();

// 주간 날씨 조회: GET /api/weather/weekly?lat=..&lon=..
router.get(
  '/weekly',
  validate('query', Joi.object({
    lat: Joi.number().required(),
    lon: Joi.number().required(),
    test: Joi.string().valid('true', 'false').optional(),
  })),
  get_weekly_weather_ctrl,
);

export default router;