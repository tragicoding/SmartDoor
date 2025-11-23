
// Express 애플리케이션의 전역 오류를 처리하는 미들웨어

/**
 * 모든 라우트 핸들러에서 발생한 오류를 최종적으로 처리함.
 * 클라이언트에게 일관된 형식의 JSON 오류 메시지를 반환.
 * 
 * @param {Error} err - 발생한 오류 객체
 * @param {object} _req - Express 요청 객체 (사용 안 함)
 * @param {object} res - Express 응답 객체
 * @param {function} _next - Express next 미들웨어 (사용 안 함)
 */
export function error_handler(err, _req, res, _next) {
  const status_code = err.status || 500;
  const message = err.message || '서버 내부에서 오류가 발생함.';

  // 개발 환경일 경우 콘솔에 오류 스택 출력
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[오류 발생] ${status_code} - ${message}\n`, err.stack);
  }

  res.status(status_code).json({ message });
}

