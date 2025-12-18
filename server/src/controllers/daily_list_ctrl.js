// 날짜별 사용자 리스트(DailyList)를 저장/조회하는 컨트롤러
// [의존] prisma

import { prisma } from '../config/prisma.js';

/**
 * 현재 로그인된 사용자의 특정 날짜 리스트를 조회한다.
 * @param {object} req - Express 요청 객체 (query: { date_key })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function get_daily_list(req, res, next) {
  try {
    const { date_key } = req.query;

    const daily_list = await prisma.dailyList.findUnique({
      where: {
        user_id_date_key: {
          user_id: req.user_id,
          date_key,
        },
      },
    });

    if (!daily_list) {
      // 리스트가 없으면 빈 리스트로 응답 (404 대신 프론트 사용성이 좋도록)
      return res.json({ date_key, items: [] });
    }

    res.json({
      date_key: daily_list.date_key,
      items: daily_list.items ?? [],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 현재 로그인된 사용자의 특정 날짜 리스트를 통째로 저장(업서트)한다.
 * @param {object} req - Express 요청 객체 (body: { date_key, items })
 * @param {object} res - Express 응답 객체
 * @param {function} next - Express next 미들웨어
 */
export async function upsert_daily_list(req, res, next) {
  try {
    const { date_key, items } = req.body;

    const daily_list = await prisma.dailyList.upsert({
      where: {
        user_id_date_key: {
          user_id: req.user_id,
          date_key,
        },
      },
      update: {
        items,
      },
      create: {
        user_id: req.user_id,
        date_key,
        items,
      },
    });

    res.json({
      ok: true,
      date_key: daily_list.date_key,
      items: daily_list.items ?? [],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 현재 로그인된 사용자의 모든 날짜별 리스트를 조회한다.
 * - 캘린더 화면에서 날짜별로 점(리스트 존재 여부)을 표시하기 위해 사용.
 * - 응답 형식: { lists: [{ date_key, items: [...] }] }
 */
export async function list_all_daily_lists(req, res, next) {
  try {
    const daily_lists = await prisma.dailyList.findMany({
      where: {
        user_id: req.user_id,
      },
      orderBy: {
        date_key: 'asc',
      },
    });

    const lists = daily_lists.map(daily_list => ({
      date_key: daily_list.date_key,
      items: daily_list.items ?? [],
    }));

    res.json({ lists });
  } catch (error) {
    next(error);
  }
}


