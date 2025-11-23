// 위치 정보 관련 유틸리티
// Expo Location API를 사용해 현재 기기의 위도/경도를 한 번만 조회한다.
// 2025/11/24 강륜 작성

import * as Location from 'expo-location';

/**
 * 현재 기기의 위도/경도를 한 번 조회한다.
 * - 위치 권한을 요청하고, 허용된 경우에만 좌표를 반환한다.
 * - 네이밍은 백엔드 README 기준으로 lat / lon 을 사용한다.
 *
 * @returns {Promise<{ lat: number; lon: number }>}
 */
export async function fetchCurrentCoordinates() {
  // 1. 위치 권한 요청
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    const error = new Error('위치 권한이 거부되었습니다.');
    error.code = 'LOCATION_PERMISSION_DENIED';
    throw error;
  }

  // 2. 현재 위치(한 번) 가져오기
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    lat: coords.latitude,
    lon: coords.longitude,
  };
}

/**
 * 위도/경도를 역지오코딩해서 읍/면/동 수준의 위치 라벨을 추출한다.
 * - Expo Location 의 reverseGeocodeAsync 를 사용한다.
 * - 한국 주소 기준으로 subregion / district / city 중에서 적절한 값을 고른다.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string | null>} 예: "대현면", "서초동" 등, 실패 시 null
 */
export async function reverseGeocodeToAreaLabel(lat, lon) {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lon,
    });

    if (!results || !results.length) {
      return null;
    }

    const addr = results[0] || {};

    // 한국 주소에서 읍/면/동에 가까운 후보들을 우선순위로 나열
    const fields = [
      addr.district,   // 종종 동/읍/면이 들어오는 필드
      addr.subregion,
      addr.city,
      addr.region,
      addr.street,
      addr.name,
    ].filter(Boolean);

    if (!fields.length) {
      return null;
    }

    // 1) 한글: '~읍/~면/~동/~리' 로 끝나는 문자열을 최우선
    const emdKorean = fields.find(name => /(읍|면|동|리)$/.test(name));
    if (emdKorean) {
      return emdKorean;
    }

    // 2) 영문: '-eup/-myeon/-dong/-ri' 로 끝나는 문자열 (예: 'Gongdo-eup')
    const emdEnglish = fields.find(name => /(eup|myeon|dong|ri)$/i.test(name));
    if (emdEnglish) {
      return emdEnglish;
    }

    // 3) 그래도 없으면, 시( city ) 대신 더 작은 단위(district, subregion)를 우선 사용
    if (addr.district) return addr.district;
    if (addr.subregion) return addr.subregion;
    if (addr.city) return addr.city;
    if (addr.region) return addr.region;

    return null;
  } catch (error) {
    // 역지오코딩 실패는 UI에 큰 영향을 주지 않으므로 조용히 null 반환
    return null;
  }
}

