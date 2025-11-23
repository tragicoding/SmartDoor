
// =======================================
//  Smart Door-Plate-Box Main Server
// =======================================
// 역할: Express 서버 초기화, 미들웨어 설정, 라우트 연결, 서버 실행

import 'dotenv/config'; // .env 파일 로드

// --- 필수 환경변수 확인 ---
const required_env_vars = ['DATABASE_URL', 'JWT_SECRET', 'DEVICE_SECRET', 'MQTT_HOST', 'CORS_ORIGIN'];
const missing_env_vars = required_env_vars.filter(key => !process.env[key]);

if (missing_env_vars.length > 0) {
  console.error(`[FATAL] 필수 환경변수가 설정되지 않았습니다: ${missing_env_vars.join(', ')}`);
  console.error('서버를 실행하기 전에 .env 파일을 올바르게 설정해주세요.');
  process.exit(1); // 프로세스 종료
}

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// 라우터 임포트
import auth_routes from './src/routes/auth_routes.js';
import user_routes from './src/routes/user_routes.js';
import device_routes from './src/routes/device_routes.js';
import bin_routes from './src/routes/bin_routes.js';
import weather_routes from './src/routes/weather_routes.js';

// 미들웨어 및 설정 임포트
import { error_handler } from './src/middleware/error_handler.js';
import './src/config/mqtt.js'; // 서버 시작 시 MQTT 클라이언트 초기화

const app = express();

// --- 미들웨어 설정 ---
// CORS 설정. 이후에 설정 예정 - .env의 CORS_ORIGIN와 동일해야 함
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
// JSON 파싱
app.use(express.json());
// HTTP 요청 로깅 (개발용)
app.use(morgan('dev'));

// --- 라우트 연결 ---
// 서버 헬스 체크
app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'Server is running' }));

// 기능별 API 라우트



app.get('/', (req, res) => {
  res.send('Smart Door API server is running 🚪');
});


app.use('/api/auth', auth_routes);
app.use('/api/users', user_routes);
app.use('/api/devices', device_routes);
app.use('/api/bins', bin_routes);
app.use('/api/weather', weather_routes);

// --- 전역 오류 처리 ---
app.use(error_handler);

// --- 서버 실행 ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
