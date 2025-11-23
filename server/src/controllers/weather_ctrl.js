
// 센서 이벤트 수신 시 날씨, 우산, 알람 정보를 종합하여 음성 안내를 제공하는 컨트롤러
// + 주간 날씨 정보 제공
// [의존] prisma, weather_svc, tts_svc

import { prisma } from '../config/prisma.js';
import { get_rain_info, get_weekly_weather } from '../services/weather_svc.js';
import { send_tts } from '../services/tts_svc.js';

/**
 * 주간(최대 7일) 날씨 정보를 반환하는 컨트롤러.
 * Query: { lat, lon, test? }
 * Response: { days: [{ date, sky, pty, tmp, tmx, tmn, pop }] }
 */
export async function get_weekly_weather_ctrl(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const is_test = req.query.test === 'true';

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ message: 'lat, lon 쿼리 파라미터가 올바르지 않음.' });
    }

    const days = await get_weekly_weather(lat, lon, is_test);
    return res.json({ days });
  } catch (error) {
    next(error);
  }
}
