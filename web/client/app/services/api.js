// 공통 API 클라이언트
// 2025/11/23 강륜 작성

// const API_BASE_URL = 'http://localhost:4000'; // TODO: 실제 서버 주소/포트로 교체
const API_BASE_URL = 'http://165.194.202.144:4000'; // http://인터넷 주소:4000

// 인터넷 주소 확인 방법
// 1. window+R -> cmd 실행
// 2. ipconfig 입력
// 3. IPv4 주소 확인
// 4. http://자신이 접속한 이더넷 어뎁터 이더넷의의 IPv4 주소:4000 으로 접속
// 5. 백엔드 서버 실행 확인
/**
 * 회원가입 API 호출
 * 백엔드 README / 구현 기준:
 *   POST /api/auth/signup
 *   body: { email, pw, name, road_address, detail_address }
 * 
 * @param {{
 *   name: string;
 *   email: string;
 *   pw: string;
 *   road_address: string;
 *   detail_address: string;
 *   device_serial?: string;
 * }} payload
 */
export async function signupUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      pw: payload.pw,
      name: payload.name,
      road_address: payload.road_address,
      detail_address: payload.detail_address,
      // 현재 백엔드 Joi 스키마에는 device_serial 필드가 없어서
      // stripUnknown 로 자동 제거되지만, 추후 확장을 위해 함께 보냄.
      device_serial: payload.device_serial,
    }),
  });

  if (!response.ok) {
    let errorMessage = '회원가입에 실패했습니다.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json(); // { user_id: number }
}

/**
 * 로그인 API 호출
 * 백엔드 README / 구현 기준:
 *   POST /api/auth/login
 *   body: { email, pw }
 *   res:  { token }
 * 
 * @param {{ email: string; pw: string }} payload
 */
export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      pw: payload.pw,
    }),
  });

  if (!response.ok) {
    let errorMessage = '로그인에 실패했습니다.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json(); // { token: string }
}

/**
 * 내 프로필 조회 API 호출
 * GET /api/users/me
 * Header: Authorization: Bearer {token}
 */
export async function getMyProfile(token) {
  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMessage = '프로필 정보를 불러오지 못했습니다.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  // 예: { id, email, name, road_address, detail_address, lat, lon, created_at }
  return response.json();
}

/**
 * 사용자 주소/프로필(이름, 주소, 비밀번호, 기기 시리얼) 업데이트
 * PUT /api/users/address
 * body: { lat, lon, name, road_address, detail_address, pw, device_serial }
 */
export async function updateUserProfile(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/users/address`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      lat: payload.lat,
      lon: payload.lon,
      name: payload.name,
      road_address: payload.road_address,
      detail_address: payload.detail_address,
      pw: payload.pw,
      device_serial: payload.device_serial,
    }),
  });

  if (!response.ok) {
    let errorMessage = '프로필 저장에 실패했습니다.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  // 예: { ok: true, lat, lon, name, pw, road_address, detail_address, device_serial }
  return response.json();
}

export async function registerDevice(token, payload) {
    const response = await fetch(`${API_BASE_URL}/api/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        serial: payload.serial,
        type: payload.type,
        name: payload.name,
      }),
    });
  
    if (!response.ok) {
      let errorMessage = '기기 등록에 실패했습니다.';
      try {
        const errorBody = await response.json();
        if (errorBody?.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // ignore JSON parse error
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
  
    return response.json();
  }

/**
 * 주간 날씨 정보 조회
 * GET /api/weather/weekly?lat=&lon=
 * Response: { days: [{ date, sky, pty, tmp, tmx, tmn, pop }] }
 */
export async function getWeeklyWeather(lat, lon, isTest = false) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  if (isTest) {
    params.append('test', 'true');
  }

  const response = await fetch(`${API_BASE_URL}/api/weather/weekly?${params.toString()}`);

  if (!response.ok) {
    let errorMessage = '주간 날씨 정보를 불러오지 못했습니다.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.days || [];
}

/**
 * 날짜별 리스트 조회
 * GET /api/users/daily-lists?date_key=YYYY-MM-DD
 *
 * @param {string} token - JWT 토큰
 * @param {string} date_key - 'YYYY-MM-DD' 형식의 날짜 키
 * @returns {Promise<{ date_key: string; items: Array<{id:string;text:string;selected:boolean}> }>}
 */
export async function getDailyList(token, date_key) {
  const params = new URLSearchParams({
    date_key,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/users/daily-lists?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    let errorMessage = '날짜별 리스트를 불러오지 못했습니다.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * 현재 로그인된 사용자의 모든 날짜별 리스트 조회
 * GET /api/users/daily-lists/all
 *
 * @param {string} token - JWT 토큰
 * @returns {Promise<Array<{ date_key: string; items: Array<{id:string;text:string;selected:boolean}> }>>}
 */
export async function getAllDailyLists(token) {
  const response = await fetch(`${API_BASE_URL}/api/users/daily-lists/all`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMessage = '전체 날짜별 리스트를 불러오지 못했습니다.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return Array.isArray(data.lists) ? data.lists : [];
}

/**
 * 날짜별 리스트 저장(업서트)
 * PUT /api/users/daily-lists
 *
 * @param {string} token - JWT 토큰
 * @param {string} date_key - 'YYYY-MM-DD' 형식의 날짜 키
 * @param {Array<{id:string;text:string;selected:boolean}>} items - 저장할 리스트 항목 배열
 * @returns {Promise<{ ok: boolean; date_key: string; items: Array<{id:string;text:string;selected:boolean}> }>}
 */
export async function saveDailyList(token, date_key, items) {
  const response = await fetch(`${API_BASE_URL}/api/users/daily-lists`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      date_key,
      items,
    }),
  });

  if (!response.ok) {
    let errorMessage = '날짜별 리스트 저장에 실패했습니다.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}