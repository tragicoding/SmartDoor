import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Platform,
  BackHandler,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ListInputModal from '../components/ListInputModal';
import WeeklyWeatherModal from '../components/WeeklyWeatherModal';
import { getWeeklyWeather, getDailyList, saveDailyList } from '../services/api';
import { fetchCurrentCoordinates, reverseGeocodeToAreaLabel } from '../services/location';
import { getProfile, getLastSelectedDateKey, setLastSelectedDateKey } from '../store/userProfileStore';
import CalendarModal from '../components/CalendarModal';

const { width, height } = Dimensions.get('window');

const LOGO_PATH = require('../components/image/main_logo.png');
const PROFILE_IMAGE_PATH = require('../components/image/profiled.png');
const EMPTY_LIST_SKETCH = require('../components/image/main_home.png');
const ARROW_ICON = require('../components/image/semo_bt.png');
const WEATHER_ARROW_ICON = require('../components/image/right_button.png');
const MAP_ICON = require('../components/image/map.png');
const ICONS = {
  list_active: require('../components/image/list_y.png'),
  list_inactive: require('../components/image/list_g.png'),
  calendar_active: require('../components/image/calendar_y.png'),
  calendar_inactive: require('../components/image/calendar_g.png'),
  mypage_active: require('../components/image/mypage_y.png'),
  mypage_inactive: require('../components/image/mypage_g.png'),
};

const WEATHER_ICONS = {
  sunny: require('../components/image/sunny.png'),
  sunnycloud: require('../components/image/sunnycloud.png'),
  cloud: require('../components/image/cloud.png'),
  rainy: require('../components/image/rainy.png'),
};

const startOfDay = date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setHours(0, 0, 0, 0);
  return d;
};

// SKY/PTY 값을 앱에서 사용하는 날씨 아이콘 키로 변환
const mapWeatherCondition = (sky, pty) => {
  const s = Number(sky ?? 0);
  const p = Number(pty ?? 0);

  if (p !== 0) {
    // 비/눈이 오는 경우는 모두 비 아이콘으로 처리 (과제용 단순화)
    return 'rainy';
  }
  if (s === 1) return 'sunny';
  if (s === 3) return 'sunnycloud';
  if (s === 4) return 'cloud';
  return 'cloud';
};

// 'YYYY-MM-DD' 형식의 날짜 키를 Date 객체로 변환
const parseDateKeyToDate = key => {
  if (!key || typeof key !== 'string') return null;
  const parts = key.split('-');
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
};

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(() => {
    // 앱이 실행 중일 때 마지막으로 사용자가 선택한 날짜가 있으면 그 날짜를 우선 사용
    const lastKey = getLastSelectedDateKey?.();
    const parsed = parseDateKeyToDate(lastKey);
    return parsed || startOfDay(new Date());
  });
  const [listData, setListData] = useState({});
  const [weatherData, setWeatherData] = useState({
    location: '대덕면',
    maxTemp: '18°C',
    minTemp: '4°C',
    condition: 'sunny',
    pop: null,
  });
  const [activeTab, setActiveTab] = useState('List');
  const [isListModalVisible, setIsListModalVisible] = useState(false);
  const [isWeatherModalVisible, setIsWeatherModalVisible] = useState(false);
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [weeklyWeather, setWeeklyWeather] = useState([]);
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);

  const handleAddList = () => {
    setIsListModalVisible(true);
  };

  const handleCloseListModal = () => {
    setIsListModalVisible(false);
  };

  const handleDatePress = () => {
    setIsCalendarModalVisible(true);
  };
  const handleCalendarConfirm = date => {
    setSelectedDate(startOfDay(date));
    setIsCalendarModalVisible(false);
  };

  const handleCalendarClose = () => {
    setIsCalendarModalVisible(false);
  };

  const formatDateDisplay = useMemo(
    () => date => {
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const week = days[date.getDay()];
      return `${year}-${month}-${day} (${week})`;
    },
    [],
  );

  const currentDateDisplay = formatDateDisplay(selectedDate);
  const currentDateKey = useMemo(
    () => `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
    [selectedDate],
  );
  const currentItems = listData[currentDateKey]?.items || [];
  // 토글을 제거했으므로, 현재 날짜에 저장된 모든 항목을 그대로 사용
  const hasList = currentItems.length > 0;

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayDisplay = formatDateDisplay(today);
  const backPressTimestampRef = useRef(0);

  // 선택된 날짜가 바뀔 때마다 마지막 선택 날짜를 전역 스토어에 저장
  useEffect(() => {
    if (!currentDateKey) return;
    setLastSelectedDateKey(currentDateKey);
  }, [currentDateKey]);

  // 선택된 날짜의 리스트를 서버에서 불러와 로컬 상태에 반영
  useEffect(() => {
    let isMounted = true;

    const fetchDailyList = async () => {
      try {
        const profile = getProfile();
        const token = profile?.authToken;
        if (!token) {
          // 로그인 전에는 로컬 상태만 사용
          return;
        }

        const data = await getDailyList(token, currentDateKey);
        if (!isMounted) return;

        setListData(prev => ({
          ...prev,
          [currentDateKey]: {
            items: Array.isArray(data.items) ? data.items : [],
          },
        }));
      } catch (error) {
        console.log('getDailyList error:', error.message);
      }
    };

    fetchDailyList();

    return () => {
      isMounted = false;
    };
  }, [currentDateKey]);

  // 주간 날씨 정보 로드
  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      try {
        setIsWeatherLoading(true);
        // Expo Location 을 통해 현재 기기 좌표(lat, lon)를 조회
        const { lat, lon } = await fetchCurrentCoordinates();

        if (!isMounted) {
          return;
        }

        // 현재 좌표를 기반으로 읍/면/동 수준의 위치 라벨 역지오코딩
        const areaLabel = await reverseGeocodeToAreaLabel(lat, lon);

        // 날씨 API 성공 여부와 상관없이, 위치 라벨은 먼저 반영해 둔다.
        if (isMounted && areaLabel) {
          setWeatherData(prev => ({
            ...prev,
            location: areaLabel,
          }));
        }

        // OpenWeather 기반 주간(최대 7일) 예보 조회
        const days = await getWeeklyWeather(lat, lon, false);
        if (!days || !days.length) {
          // 주간 날씨를 못 가져와도 이미 위치 라벨은 반영된 상태로 둔다.
          return;
        }

        // 전체 7일치 예보를 state에 저장
        setWeeklyWeather(days);
      } catch (error) {
        // 위치 권한 거부 또는 네트워크 오류 등은 콘솔에만 로깅 (UI는 기존 더미 값 유지)
        console.log('getWeeklyWeather error:', error.message);
      } finally {
        if (isMounted) {
          setIsWeatherLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (!navigation.isFocused?.() || Platform.OS !== 'android') {
        return false;
      }

      const now = Date.now();
      if (now - backPressTimestampRef.current < 2000) {
        Alert.alert('앱 종료', '앱을 종료하시겠습니까?', [
          { text: '취소', style: 'cancel' },
          { text: '확인', onPress: () => BackHandler.exitApp() },
        ]);
      } else {
        backPressTimestampRef.current = now;
      }

      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => subscription.remove();
  }, [navigation]);
  const diffDays = Math.floor(
    (selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isForecastAvailable = diffDays <= 7;

  // 선택된 날짜가 바뀌거나 주간 데이터가 갱신되면, 해당 날짜의 날씨를 상단 버튼에 반영
  useEffect(() => {
    if (!weeklyWeather || !weeklyWeather.length) {
      return;
    }

    const target = weeklyWeather.find(day => day.date === currentDateKey);
    const fallback = weeklyWeather[0];
    const info = target || fallback;
    if (!info) return;

    const maxRaw = info.tmx ?? info.tmp;
    const minRaw = info.tmn ?? info.tmp;
    const max = maxRaw != null ? Math.round(maxRaw) : null;
    const min = minRaw != null ? Math.round(minRaw) : null;
    const condition = mapWeatherCondition(info.sky, info.pty);

    setWeatherData(prev => ({
      ...prev,
      maxTemp: max != null ? `${max}°C` : prev.maxTemp,
      minTemp: min != null ? `${min}°C` : prev.minTemp,
      pop: info.pop ?? prev.pop,
      condition,
    }));
  }, [weeklyWeather, currentDateKey]);

  const handleWeatherPress = () => {
    if (!isForecastAvailable || isWeatherLoading) {
      return;
    }
    setIsWeatherModalVisible(true);
  };

  const handleCloseWeatherModal = () => {
    setIsWeatherModalVisible(false);
  };

  const handleTabPress = tabName => {
    setActiveTab(tabName);
    if (tabName === 'Calendar') {
      navigation.navigate('Calendar', { listData });
      return;
    }
    if (tabName === 'MyPage') {
      navigation.navigate('MyPage');
      return;
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContent}>
      <Image source={EMPTY_LIST_SKETCH} style={styles.emptySketch} resizeMode="contain" />
      <Text style={styles.emptyText}>외출 시 꼭 필요한 물건을 입력해주세요</Text>
    </View>
  );

  const renderList = () => (
    <View style={styles.listContent}>
      {currentItems.map(item => (
        <View key={item.id} style={styles.listItemRow}>
          <View style={styles.listItemIndicatorOuter}>
            <View style={styles.listItemIndicatorInner} />
          </View>
          <Text style={styles.listItemText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );

  const getTabIcon = tabName => {
    if (tabName === 'List') {
      return activeTab === 'List' ? ICONS.list_active : ICONS.list_inactive;
    }
    if (tabName === 'Calendar') {
      return activeTab === 'Calendar' ? ICONS.calendar_active : ICONS.calendar_inactive;
    }
    if (tabName === 'MyPage') {
      return activeTab === 'MyPage' ? ICONS.mypage_active : ICONS.mypage_inactive;
    }
    return ICONS.mypage_inactive;
  };

  const weatherIconSource =
    WEATHER_ICONS[weatherData.condition] || WEATHER_ICONS.sunnycloud;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.logoInfo}>
          <Image source={LOGO_PATH} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>낑깡</Text>
        </View>
        <Image source={PROFILE_IMAGE_PATH} style={styles.profileImage} />
      </View>

      <View style={styles.infoBar}>
        <TouchableOpacity style={styles.dateButton} onPress={handleDatePress}>
          <Image source={ARROW_ICON} style={styles.arrowIcon} />
          <Text style={styles.dateText}>{currentDateDisplay}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.weatherButton,
            (!isForecastAvailable || isWeatherLoading) && styles.weatherButtonDisabled,
          ]}
          activeOpacity={isForecastAvailable && !isWeatherLoading ? 0.8 : 1}
          onPress={handleWeatherPress}
        >
          {isWeatherLoading ? (
            <Text style={styles.weatherUnavailableText}>
              데이터를 불러오고 있습니다
            </Text>
          ) : isForecastAvailable ? (
            <>
              <View style={styles.weatherLocationGroup}>
                <Image source={MAP_ICON} style={styles.mapIcon} />
                <Text style={styles.weatherText}>{weatherData.location}</Text>
              </View>
              <View style={styles.weatherRightGroup}>
                <View style={styles.weatherDetails}>
                  <Image source={weatherIconSource} style={styles.weatherIcon} />
                  <Text style={styles.weatherTextTemp}>
                    {weatherData.maxTemp} / {weatherData.minTemp}
                  </Text>
                </View>
                <Image source={WEATHER_ARROW_ICON} style={styles.weatherArrowIcon} />
              </View>
            </>
          ) : (
            <Text style={styles.weatherUnavailableText}>
              날씨 정보는 일주일 이내인 경우에만 제공됩니다
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.mainContentArea}
        contentContainerStyle={styles.mainContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>{hasList ? renderList() : renderEmptyList()}</View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 100 + Math.max(insets.bottom, 0) }]}
        onPress={handleAddList}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('List')}
        >
          <Image source={getTabIcon('List')} style={styles.navIconImage} />
          <Text style={[styles.navText, activeTab === 'List' && styles.activeNavText]}>
            리스트
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('Calendar')}
        >
          <Image source={getTabIcon('Calendar')} style={styles.navIconImage} />
          <Text style={[styles.navText, activeTab === 'Calendar' && styles.activeNavText]}>
            캘린더
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('MyPage')}
        >
          <Image source={getTabIcon('MyPage')} style={styles.navIconImage} />
          <Text style={[styles.navText, activeTab === 'MyPage' && styles.activeNavText]}>
            마이페이지
          </Text>
        </TouchableOpacity>
      </View>

      {/* 리스트 입력 모달 */}
      <ListInputModal
        isVisible={isListModalVisible}
        onClose={handleCloseListModal}
        info={{
          date: currentDateDisplay,
          location: weatherData.location,
          maxTemp: weatherData.maxTemp,
          minTemp: weatherData.minTemp,
          condition: weatherData.condition,
          isWeatherLoading,
        }}
        initialItems={currentItems}
        onApply={async items => {
          // 1) 로컬 상태 먼저 반영
          setListData(prev => {
            if (!items.length) {
              const next = { ...prev };
              delete next[currentDateKey];
              return next;
            }
            return {
              ...prev,
              [currentDateKey]: { items },
            };
          });

          // 2) 서버에 날짜별 리스트 업서트 (로그인 되어 있을 때만)
          try {
            const profile = getProfile();
            const token = profile?.authToken;
            if (!token) {
              return;
            }
            await saveDailyList(token, currentDateKey, items);
          } catch (error) {
            console.log('saveDailyList error:', error.message);
          }
        }}
      />
      <CalendarModal
        isVisible={isCalendarModalVisible}
        onClose={handleCalendarClose}
        onConfirm={handleCalendarConfirm}
        initialDate={selectedDate}
      />
      <WeeklyWeatherModal
        isVisible={isWeatherModalVisible}
        onClose={handleCloseWeatherModal}
        dateString={currentDateDisplay}
        baseDate={today}
        weekly_days={weeklyWeather}
        selectedDate={selectedDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  logoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    color: '#333333',
    fontFamily: 'Cafe24Ssurround',
  },
  profileImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderColor: '#FF8C00',
    borderWidth: 1,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
  },
  dateButton: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    flexShrink: 1,
  },
  arrowIcon: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
    marginRight: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'PretendardSemiBold',
    color: '#333333',
  },
  weatherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 10,
    padding: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flex: 1,
    minWidth: 0,
  },
  weatherButtonDisabled: {
    backgroundColor: '#FFFFFF',
  },
  weatherLocationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  mapIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    marginRight: 4,
  },
  weatherText: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#333333',
    flexShrink: 1,
  },
  weatherRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  weatherDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    marginRight: 5,
  },
  weatherTextTemp: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#333333',
    flexShrink: 1,
  },
  weatherArrowIcon: {
    width: 10,
    height: 10,
    resizeMode: 'contain',
    marginLeft: 8,
  },
  weatherUnavailableText: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#666666',
    textAlign: 'center',
    flex: 1,
  },
  mainContentArea: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 0
  },
  mainContentContainer: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    flex: 1,
    minHeight: height * 0.2,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    padding: 20,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  emptySketch: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 0,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontFamily: 'PretendardLight',
  },
  listContent: {
    width: '100%',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  listItemIndicatorOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F38D11',
    marginRight: 12,
  },
  listItemIndicatorInner: {
    width: 0,
    height: 0,
  },
  listItemText: {
    fontSize: 15,
    color: '#333333',
    fontFamily: 'Pretendard',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    backgroundColor: '#F38D11',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    lineHeight: 30,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    minHeight: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingHorizontal: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    paddingTop: 4,
    flex: 1,
  },
  navIconImage: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  navText: {
    fontSize: 10,
    color: '#AAAAAA',
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
    fontFamily: 'Pretendard',
  },
  activeNavText: {
    color: '#F38D11',
    fontFamily: 'Pretendard',
  },
});

