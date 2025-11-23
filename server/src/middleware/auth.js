
// JWT 및 디바이스 시크릿을 이용한 인증 미들웨어

import jwt from 'jsonwebtoken';

/**
 * 사용자 인증을 위한 JWT 검증 미들웨어.
 * Authorization 헤더의 Bearer 토큰을 검증하여 req.user_id에 사용자 ID를 주입함.
 */
export function user_auth(req, res, next) {
  try {
    const auth_header = req.headers.authorization || '';
    const token = auth_header.startsWith('Bearer ') ? auth_header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: '인증 토큰이 없음.' });
    }

    // JWT 토큰 검증. 이후에 설정 예정 - .env의 JWT_SECRET와 동일해야 함
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user_id = payload.user_id; // 요청 객체에 사용자 ID 주입
    next();
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 토큰.' });
  }
}

/**
 * 디바이스 인증을 위한 시크릿 키 검증 미들웨어.
 * 요청 본문의 secret 값이 환경변수에 설정된 디바이스 시크릿과 일치하는지 확인함.
 */
export function device_auth(req, res, next) {
  const { secret } = req.body || {};
  // 디바이스 시크릿 키. 이후에 설정 예정 - .env의 DEVICE_SECRET와 동일해야 함
  if (secret !== process.env.DEVICE_SECRET) {
    return res.status(401).json({ message: '디바이스 인증 실패.' });
  }
  next();
}
