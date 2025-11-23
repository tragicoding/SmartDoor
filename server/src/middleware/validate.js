
// Joi를 사용해 요청(request)의 각 부분(body, query, params)을 검증하는 미들웨어

import Joi from 'joi';

/**
 * Joi 스키마를 기반으로 요청 데이터를 검증하는 미들웨어를 생성하는 함수.
 * 
 * @param {'body' | 'query' | 'params'} part - 검증할 요청의 부분
 * @param {Joi.Schema} schema - 검증에 사용할 Joi 스키마
 * @returns {function} Express 미들웨어 함수
 */
export function validate(part, schema) {
  return (req, res, next) => {
    const source_data = req[part] || {};

    // Joi 스키마로 데이터 검증
    // abortEarly: false - 모든 오류를 한 번에 리포트
    // stripUnknown: true - 스키마에 없는 필드는 제거
    const { error, value } = schema.validate(source_data, { 
      abortEarly: false, 
      stripUnknown: true 
    });
    
    // 에러 일때 클라이언트에게 보낼 메시지
    if (error) {
      const error_details = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ 
        message: '요청 데이터 형식이 올바르지 않음.',
        details: error_details
      });
    }

    // 검증 및 변환된 데이터를 다시 요청 객체에 할당
    // Express 5에서는 req.query / req.params 프로퍼티 자체는 읽기 전용이라,
    // 객체를 재할당하지 않고 기존 객체에 병합해야 함.
    if (part === 'query' || part === 'params') {
      const target = req[part] || {};
      // 기존 키 제거 후 value 병합 (stripUnknown 결과만 남기기 위함)
      Object.keys(target).forEach(key => { delete target[key]; });
      Object.assign(target, value);
    } else {
      req[part] = value;
    }
    next();
  };
}
