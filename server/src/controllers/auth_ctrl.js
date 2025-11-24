
// 회원가입 및 로그인을 처리하는 인증 컨트롤러
// [의존] bcrypt, jsonwebtoken, prisma

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

/**
 * 신규 사용자 회원가입 처리.
 * @param {object} req - Express 요청 객체 (body: { email, pw })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function signup(req, res, next) {
  try {
    // const { email, pw } = req.body;
    const { email, pw, name, road_address, detail_address, device_serial } = req.body; // 2025/11/23, 11/24 강륜 수정
    // 이메일 중복 확인
    const existing_user = await prisma.user.findUnique({ where: { email } });
    if (existing_user) {
      return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
    }

    // 비밀번호 해싱
    const pw_hash = await bcrypt.hash(pw, 10);

    // 사용자 생성
    // const new_user = await prisma.user.create({ data: { email, pw_hash } });
    const new_user = await prisma.user.create({ // 2025/11/23 강륜 수정
      data: { 
        email, 
        pw_hash,
        pw,              // 과제용: 원문 비밀번호도 함께 저장 (실서비스에서는 사용 금지)
        name,
        road_address,
        detail_address,
        device_serial,
      } 
    });

    res.status(201).json({ user_id: new_user.id });
  } catch (error) {
    next(error);
  }
}

/**
 * 사용자 로그인을 처리하고 JWT 토큰을 발급함.
 * @param {object} req - Express 요청 객체 (body: { email, pw })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function login(req, res, next) {
  try {
    const { email, pw } = req.body;

    // 사용자 조회
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: '존재하지 않는 아이디입니다.' });
    }

    // 비밀번호 확인
    const is_password_valid = await bcrypt.compare(pw, user.pw_hash);
    if (!is_password_valid) {
      return res.status(401).json({ message: '비밀번호를 확인해주세요.' });
    }

    // JWT 토큰 생성. 이후에 설정 예정 - .env의 JWT_SECRET와 동일해야 함
    const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (error) {
    next(error);
  }
}
