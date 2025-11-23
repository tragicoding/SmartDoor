
// 사용자의 디바이스(장치) 등록 및 상태 관리를 위한 컨트롤러
// [의존] prisma

import { prisma } from '../config/prisma.js';

/**
 * 새로운 디바이스를 시스템에 등록함.
 * @param {object} req - Express 요청 객체 (body: { user_id, type, name, secret })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function add_device(req, res, next) {
  try {
    const { user_id, type, name, secret } = req.body;
    const new_device = await prisma.device.create({ 
      data: { user_id, type, name, secret } 
    });
    res.status(201).json({ device_id: new_device.id });
  } catch (error) {
    next(error);
  }
}

/**
 * 디바이스의 마지막 접속 시간을 갱신함 (하트비트).
 * @param {object} req - Express 요청 객체 (params: { device_id })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function record_heartbeat(req, res, next) {
  try {
    const { device_id } = req.params;
    await prisma.device.update({ 
      where: { id: Number(device_id) }, 
      data: { last_seen: new Date() } 
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

// 새로 추가: 기기 serial 기반 등록
// --------------------------------------

/**
 * 기기 고유 serial을 사용해 현재 로그인한 유저에게 기기를 등록하는 핸들러.
 * @param {object} req - Express 요청 객체 (req.user_id, body: { serial, type, name })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function register_device(req, res, next) {
  try {
    const user_id = req.user_id;
    const { serial, type, name } = req.body;

    // 이미 존재하는 기기인지 확인
    const existing = await prisma.device.findUnique({ where: { serial } });

    // 이미 다른 유저에게 귀속된 기기라면 에러
    if (existing && existing.user_id && existing.user_id !== user_id) {
      return res.status(409).json({ message: '이미 다른 계정에 등록된 기기입니다.' });
    }

    // 기기가 없으면 생성, 있으면 현재 유저에게 귀속
    const device = await prisma.device.upsert({
      where: { serial },
      update: {
        user_id,
        type,
        name,
      },
      create: {
        serial,
        user_id,
        type,
        name,
        secret: process.env.DEVICE_SECRET, // 공용 디바이스 시크릿
      },
    });

    res.status(201).json({ device_id: device.id });
  } catch (error) {
    next(error);
  }
}
