// 간단한 전역 프로필/인증 스토어 (메모리 기반)
// 앱을 완전히 종료하면 초기화되지만, 실행 중에는 모든 화면에서 공유됩니다.
//
const defaultProfile = {
  // 표시용 기본값 (실제 로그인/회원가입 후에는 서버 값으로 덮어씀)
  name: '김피컴',
  id: 'Phycom25', // 이메일 역할
  password: 'password123',
  addressRoad: '안성시 대덕면 서동대로 4726',
  addressDetail: '중앙대 다빈치캠퍼스 810관',
  deviceSerial: 'ARDUINOPC',
  // 서버 연동용 필드
  authToken: null,
  lat: null,
  lon: null,
};

let currentProfile = null;
let lastSelectedDateKey = null; // 예: '2025-11-23'

export const getDefaultProfile = () => defaultProfile;

export const hasProfile = () => currentProfile != null;

export const getProfile = () => {
  if (currentProfile) {
    return currentProfile;
  }
  return defaultProfile;
};

export const setProfile = profile => {
  // 기존 값(or 기본값)을 유지하면서 필요한 필드만 덮어쓰기
  currentProfile = {
    ...(currentProfile || defaultProfile),
    ...profile,
  };
};

// --- 리스트 화면에서 사용자가 마지막으로 선택한 날짜 보관용 ---
// 앱이 실행되어 있는 동안에만 유지되는 간단한 메모리 상태입니다.
export const getLastSelectedDateKey = () => lastSelectedDateKey;

export const setLastSelectedDateKey = key => {
  lastSelectedDateKey = key;
};


