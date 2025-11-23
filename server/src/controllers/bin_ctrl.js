
// 우산 보관함의 상태를 업데이트하고 조회하는 컨트롤러
// [의존] prisma

import { prisma } from '../config/prisma.js';

/**
 * 우산 보관함의 상태를 업데이트(또는 생성)함.
 * @param {object} req - Express 요청 객체 (body: { device_id, remain, cap, is_open })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function update_bin_status(req, res, next) {
  try {
    const { device_id, remain, cap, is_open } = req.body;
    
    // upsert: 데이터가 있으면 업데이트, 없으면 생성
    const umbrella_bin = await prisma.umbrellaBin.upsert({
      where: { device_id },
      update: { remain, cap, is_open },
      create: { device_id, remain, cap, is_open },
    });

    res.json({ ok: true, bin: umbrella_bin });
  } catch (error) {
    next(error);
  }
}

/**
 * 특정 우산 보관함의 현재 상태를 조회함.
 * @param {object} req - Express 요청 객체 (query: { device_id })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function get_bin_status(req, res, next) {
  try {
    const { device_id } = req.query;
    const umbrella_bin = await prisma.umbrellaBin.findUnique({ 
      where: { device_id: Number(device_id) } 
    });

    if (!umbrella_bin) {
      return res.status(404).json({ message: '해당 우산 보관함을 찾을 수 없음.' });
    }

    res.json({ bin: umbrella_bin });
  } catch (error) {
    next(error);
  }
}
