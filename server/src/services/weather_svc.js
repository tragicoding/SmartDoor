// 날씨 서비스 모듈
// - OpenWeather API 기반 현재/주간 예보 조회
// - 기존 기상청 API 버전 코드는 주석으로 보존
// [의존] logger, axios
import { logger } from '../utils/logger.js';
import axios from 'axios';

// ============================
//  날씨 기상청 API 버전 (이전 구현, 참고용으로만 보존)
// ============================
//
// const API_KEY = process.env.WEATHER_API_KEY; // .env의 WEATHER_API_KEY 사용
// const API_URL = process.env.WEATHER_API_URL; // .env의 기상청 API URL 사용
//
// /**
//  * 위경도를 기상청 단기예보 격자 좌표 (X, Y)로 변환
//  * @param {number} lat - 위도
//  * @param {number} lon - 경도
//  * @returns {{nx: number, ny: number}} 격자 좌표
//  */
// function convertToGrid(lat, lon) {
//   // 기상청 격자 변환 로직 (예시로 서울 인근의 단순 좌표 반환)
//   const nx = 69; // 안성 기준 격자 X
//   const ny = 109; // 안성 기준 격자 Y
//   return { nx, ny };
// }
//
// export async function get_rain_info_kma(lat, lon, is_test = false) {
//   // ... (기존 기상청 강수 예보 로직)
// }
//
// export async function get_weekly_weather_kma(lat, lon, is_test = false) {
//   // ... (기존 기상청 주간 예보 로직)
// }

// ============================
//  OpenWeather API 버전
// ============================

// 환경 변수에서 OpenWeather 설정 가져오기
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
// 16일 일별 예보(무료 플랜에서 사용 가능한 Daily Forecast)용 기본 URL
// - get_weekly_weather / get_rain_info 에서 공통으로 사용
const OPENWEATHER_DAILY_API_URL =
  process.env.OPENWEATHER_DAILY_API_URL ||
  'https://api.openweathermap.org/data/2.5/forecast/daily';


/**
 * OpenWeather 16일 Daily Forecast API 호출 헬퍼
 * - `/data/2.5/forecast/daily`
 * - units=metric (섭씨), lang=kr
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} cnt - 가져올 일 수 (최대 16일, 기본 7일)
 */
async function fetch_openweather_daily(lat, lon, cnt = 7) {
  if (!OPENWEATHER_API_KEY) {
    logger.error('OpenWeather API 키(OPENWEATHER_API_KEY)가 설정되지 않았음.');
    throw new Error('OPENWEATHER_API_KEY not configured');
  }

  const url = OPENWEATHER_DAILY_API_URL;

  const response = await axios.get(url, {
    params: {
      lat,
      lon,
      cnt,
      appid: OPENWEATHER_API_KEY,
      units: 'metric',
      lang: 'kr',
    },
  });

  return response.data;
}

/**
 * 특정 위경도 기준으로, "오늘 안에 비가 올 가능성이 높은지" 여부를 반환.
 * - One Call API 대신 16일 Daily Forecast API(`forecast/daily`)만 사용
 * - 시간 정보(hourly)가 없으므로, 비 예보가 있으면 고정된 시각(예: 09:00)을 반환
 *
 * @param {number} lat - 위도
 * @param {number} lon - 경도
 * @param {boolean} is_test - 테스트 모드 활성화 여부
 * @returns {Promise<string|null>} 비가 올 가능성이 높으면 고정 시각(HH:MM), 아니면 null
 */
export async function get_rain_info(lat, lon, is_test = false) {
  // 테스트 모드: 기존 시뮬레이션 로직 유지
  if (is_test) {
    logger.info('테스트 모드: 18:00 비 상황 시뮬레이션 (OpenWeather, forecast/daily).');
    const now = new Date();
    const current_hour = now.getHours();
    return current_hour < 18 ? '18:00' : null;
  }

  try {
    logger.info(`OpenWeather 강수 정보 조회 시작(16일 daily API): lat=${lat}, lon=${lon}`);

    // 오늘/내일 정도만 보면 되므로 2일분만 요청
    const data = await fetch_openweather_daily(lat, lon, 2);
    const daily = data.list || [];

    if (!daily.length) {
      logger.warn('OpenWeather 응답에 daily 데이터가 없음.(get_rain_info)');
      return null;
    }

    const today = daily[0];

    // 1) 강수량(rain)이 존재하거나
    // 2) weather 코드가 비/눈 계열이면 "비 온다"로 간주
    const has_rain_mm =
      typeof today.rain === 'number' && today.rain > 0;

    const weather_main = (today.weather && today.weather[0]) || null;
    const weather_id = weather_main?.id ?? 0;
    const is_rain_code =
      (weather_id >= 200 && weather_id < 600) || // 천둥/비 계열
      (weather_id >= 600 && weather_id < 700);   // 눈 계열도 우산 알림 대상으로 포함

    if (has_rain_mm || is_rain_code) {
      const rain_time = '09:00'; // 일별 예보만 있으므로 고정 시간 사용
      return rain_time;
    }

    return null;
  } catch (error) {
    // logger 포맷상 추가 메타가 잘리지 않도록 console.error 로도 상세 출력
    console.error(
      '[OpenWeather:get_rain_info] error',
      error?.message,
      error?.response?.status,
      error?.response?.data,
    );
    logger.error('OpenWeather 강수 정보 조회 중 오류 발생:', error.message);
    return null;
  }
}

/**
 * 주간(최대 7일) 날씨 정보를 반환.
 * - SKY: 하늘 상태(기상청 코드에 맞춘 대략적 매핑: 1=맑음, 3=구름많음, 4=흐림)
 * - PTY: 강수 형태(0=없음, 1=비, 2=눈, 3=비/눈)
 * - TMP: 대표 온도(주간 평균 느낌으로 day 온도 사용)
 * - TMX: 일 최고 기온
 * - TMN: 일 최저 기온
 * - POP: 하루 중 최대 강수확률(0~100%)
 *
 * @returns {Promise<Array<{
 *   date: string;      // YYYY-MM-DD
 *   sky: number|null;
 *   pty: number|null;
 *   tmp: number|null;
 *   tmx: number|null;
 *   tmn: number|null;
 *   pop: number|null;
 * }>>}
 */
export async function get_weekly_weather(lat, lon, is_test = false) {
  // 테스트 모드: 기존 더미 데이터 유지
  if (is_test) {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push({
        date: `${y}-${m}-${day}`,
        sky: i % 3 === 0 ? 1 : i % 3 === 1 ? 3 : 4, // 맑음/구름많음/흐림
        pty: 0,
        tmp: 10 + i,
        tmx: 15 + i,
        tmn: 5 + i,
        pop: i % 2 === 0 ? 20 : 60,
      });
    }
    return days;
  }

  try {
    // 16일 일별 예보 중에서 최대 7일만 사용
    const data = await fetch_openweather_daily(lat, lon, 7);
    const daily = data.list || [];

    if (!daily.length) {
      logger.warn('OpenWeather 응답에 daily 데이터가 없음.(forecast/daily)');
      return [];
    }

    const days = [];

    for (const d of daily) {
      if (!d || typeof d.dt !== 'number') continue;

      const local_ms = d.dt * 1000;
      const local_date = new Date(local_ms);
      const year = local_date.getUTCFullYear();
      const month = String(local_date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(local_date.getUTCDate()).padStart(2, '0');

      // OpenWeather weather 코드 → SKY/PTY 매핑
      let sky = null;
      let pty = 0;
      const weather_main = (d.weather && d.weather[0]) || null;
      const weather_id = weather_main?.id ?? 0; // OpenWeather weather.id

      if (weather_id >= 200 && weather_id < 600) {
        // 천둥, 이슬비, 비 → 비
        sky = 4;
        pty = 1;
      } else if (weather_id >= 600 && weather_id < 700) {
        // 눈
        sky = 4;
        pty = 2;
      } else {
        // 강수 없음
        pty = 0;
        if (weather_id === 800) {
          // 맑음
          sky = 1;
        } else if (weather_id >= 801 && weather_id <= 802) {
          // 조금/적당히 구름
          sky = 3;
        } else if (weather_id >= 803) {
          // 구름 많음/흐림
          sky = 4;
        }
      }

      const tmp = typeof d.temp?.day === 'number' ? d.temp.day : null;
      const tmx = typeof d.temp?.max === 'number' ? d.temp.max : null;
      const tmn = typeof d.temp?.min === 'number' ? d.temp.min : null;
      const pop =
        typeof d.pop === 'number'
          ? Math.max(0, Math.min(100, Math.round(d.pop * 100)))
          : null;

      days.push({
        date: `${year}-${month}-${day}`,
        sky,
        pty,
        tmp,
        tmx,
        tmn,
        pop,
      });
    }

    // 최대 7일만 반환
    return days.slice(0, 7);
  } catch (error) {
    console.error(
      '[OpenWeather:get_weekly_weather] error',
      error?.message,
      error?.response?.status,
      error?.response?.data,
    );
    logger.error('OpenWeather 주간 날씨 조회 중 오류 발생:', error.message);
    return [];
  }
}