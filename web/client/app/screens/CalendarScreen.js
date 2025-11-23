import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
  ScrollView,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllDailyLists } from '../services/api';
import { getProfile } from '../store/userProfileStore';

const { width, height } = Dimensions.get('window');

const LOGO_PATH = require('../components/image/main_logo.png');
const PROFILE_IMAGE_PATH = require('../components/image/profiled.png');
const ICONS = {
  list_active: require('../components/image/list_y.png'),
  list_inactive: require('../components/image/list_g.png'),
  calendar_active: require('../components/image/calendar_y.png'),
  calendar_inactive: require('../components/image/calendar_g.png'),
  mypage_active: require('../components/image/mypage_y.png'),
  mypage_inactive: require('../components/image/mypage_g.png'),
};

const WEEK_LABELS_KR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfDay = date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateKey = date =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const createMatrix = (year, month) => {
  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const matrix = [];
  let dayCounter = 1;
  for (let row = 0; row < 6; row++) {
    const rowData = [];
    for (let col = 0; col < 7; col++) {
      const cellIndex = row * 7 + col;
      if (cellIndex < startWeekDay) {
        const date = daysInPrevMonth - (startWeekDay - cellIndex - 1);
        rowData.push({
          date,
          inMonth: false,
          dateObj: new Date(year, month - 1, date),
        });
      } else if (cellIndex >= startWeekDay + daysInMonth) {
        const date = cellIndex - (startWeekDay + daysInMonth) + 1;
        rowData.push({
          date,
          inMonth: false,
          dateObj: new Date(year, month + 1, date),
        });
      } else {
        const date = dayCounter++;
        rowData.push({
          date,
          inMonth: true,
          dateObj: new Date(year, month, date),
        });
      }
    }
    matrix.push(rowData);
  }
  return matrix;
};

export default function CalendarScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initialListData = route?.params?.listData || {};

  // 캘린더 전용 리스트 상태: 홈에서 넘어온 스냅샷 + 서버에서 전체 조회 결과를 병합
  const [listData, setListData] = useState(initialListData);
  const isFocused = useIsFocused();

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [displayedYear, setDisplayedYear] = useState(selectedDate.getFullYear());
  const [displayedMonth, setDisplayedMonth] = useState(selectedDate.getMonth());

  const matrix = useMemo(
    () => createMatrix(displayedYear, displayedMonth),
    [displayedYear, displayedMonth],
  );

  const currentDateKey = useMemo(
    () => formatDateKey(selectedDate),
    [selectedDate],
  );

  const currentItems = listData[currentDateKey]?.items || [];

  const today = useMemo(() => startOfDay(new Date()), []);

  const daysWithList = useMemo(() => {
    const set = new Set();
    Object.entries(listData).forEach(([key, value]) => {
      if (value?.items && value.items.length > 0) {
        set.add(key);
      }
    });
    return set;
  }, [listData]);

  // 로그인된 사용자의 모든 날짜별 리스트를 한 번에 불러와 캘린더에 반영
  // - 화면이 다시 포커스될 때마다 DB 기준으로 최신 상태를 재적용
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let isMounted = true;

    const fetchAllLists = async () => {
      try {
        const profile = getProfile();
        const token = profile?.authToken;
        if (!token) {
          // 비로그인 상태에서는 홈에서 넘어온 스냅샷만 사용
          return;
        }

        const lists = await getAllDailyLists(token);
        if (!isMounted) return;

        const mapped = {};
        lists.forEach(entry => {
          if (!entry?.date_key) return;
          mapped[entry.date_key] = {
            items: Array.isArray(entry.items) ? entry.items : [],
          };
        });

        // DB에 저장된 내용을 그대로 반영 (DB를 단일 진실 소스로 사용)
        setListData(mapped);
      } catch (error) {
        console.log('getAllDailyLists error:', error.message);
      }
    };

    fetchAllLists();

    return () => {
      isMounted = false;
    };
  }, [isFocused]);

  useEffect(() => {
    const onBackPress = () => {
      if (!navigation.isFocused?.()) {
        return false;
      }
      navigation.navigate('Home');
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => subscription.remove();
  }, [navigation]);

  const adjustMonth = delta => {
    setDisplayedMonth(prev => {
      const newMonth = prev + delta;
      if (newMonth < 0) {
        setDisplayedYear(year => year - 1);
        return 11;
      }
      if (newMonth > 11) {
        setDisplayedYear(year => year + 1);
        return 0;
      }
      return newMonth;
    });
  };

  const handleDayPress = day => {
    setSelectedDate(startOfDay(day.dateObj));
    setDisplayedYear(day.dateObj.getFullYear());
    setDisplayedMonth(day.dateObj.getMonth());
  };

  const getTabIcon = tabName => {
    if (tabName === 'List') {
      return ICONS.list_inactive;
    }
    if (tabName === 'Calendar') {
      return ICONS.calendar_active;
    }
    if (tabName === 'MyPage') {
      return ICONS.mypage_inactive;
    }
    return ICONS.mypage_inactive;
  };

  const handleTabPress = tabName => {
    if (tabName === 'List') {
      navigation.navigate('Home');
      return;
    }
    if (tabName === 'Calendar') {
      return;
    }
    if (tabName === 'MyPage') {
      navigation.navigate('MyPage');
      return;
    }
  };

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

    <View style={styles.monthHeader}>
      <TouchableOpacity
        style={styles.monthArrow}
        onPress={() => adjustMonth(-1)}
      >
        <Text style={styles.monthArrowText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.monthLabel}>
        {new Date(displayedYear, displayedMonth, 1).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        })}
      </Text>
      <TouchableOpacity
        style={styles.monthArrow}
        onPress={() => adjustMonth(1)}
      >
        <Text style={styles.monthArrowText}>›</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.calendarContainer}>
      <View style={styles.weekHeader}>
        {WEEK_LABELS_KR.map((label, index) => (
          <Text
            key={label}
            style={[styles.weekLabel, index === 0 && styles.weekLabelSunday]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.calendarBody}>
        {matrix.map((week, rowIndex) => (
          <View key={rowIndex} style={styles.weekRow}>
            {week.map((day, colIndex) => {
              const cellDate = startOfDay(day.dateObj);
              const isToday = cellDate.getTime() === today.getTime() && day.inMonth;
              const isSelected =
                cellDate.getTime() === selectedDate.getTime() && day.inMonth;
              const key = formatDateKey(day.dateObj);
              const hasList = daysWithList.has(key);

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    !isToday && isSelected && styles.dayCellSelected,
                    !day.inMonth && styles.dayCellOutside,
                  ]}
                  onPress={() => handleDayPress(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.dayTextToday,
                      !isToday && isSelected && styles.dayTextSelected,
                      !day.inMonth && styles.dayTextOutside,
                    ]}
                  >
                    {day.date}
                  </Text>
                  {hasList && (
                    <View
                      style={[
                        styles.dayDot,
                        isToday && styles.dayDotOnToday,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>

    <View style={styles.listSection}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listScrollContent}
      >
        {currentItems.length === 0 ? (
          <Text style={styles.emptyText}>이 날짜에는 저장된 리스트가 없습니다.</Text>
        ) : (
          currentItems.map(item => (
            <View key={item.id} style={styles.listItemRow}>
              <View style={styles.listItemIndicatorOuter}>
                <View style={styles.listItemIndicatorInner} />
              </View>
              <Text style={styles.listItemText}>{item.text}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>

    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('List')}
      >
        <Image source={getTabIcon('List')} style={styles.navIconImage} />
        <Text style={styles.navText}>리스트</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('Calendar')}
      >
        <Image source={getTabIcon('Calendar')} style={styles.navIconImage} />
        <Text style={[styles.navText, styles.activeNavText]}>캘린더</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('MyPage')}
      >
        <Image source={getTabIcon('MyPage')} style={styles.navIconImage} />
        <Text style={styles.navText}>마이페이지</Text>
      </TouchableOpacity>
    </View>
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
    borderColor: '#F38D11',
    borderWidth: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: '#F5F5F5',
  },
  monthArrow: {
    padding: 8,
  },
  monthArrowText: {
    fontSize: 20,
    color: '#999999',
    fontFamily: 'Pretendard',
  },
  monthLabel: {
    fontSize: 18,
    fontFamily: 'PretendardBold',
    color: '#333333',
  },
  calendarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'InterMedium',
    color: '#909090',
  },
  weekLabelSunday: {
    color: '#F38D11',
  },
  calendarBody: {},
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayCellToday: {
    backgroundColor: '#F38D11',
  },
  dayCellSelected: {
    backgroundColor: '#F0F0F0',
  },
  dayCellOutside: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 12,
    color: '#333333',
    fontFamily: 'Pretendard',
  },
  dayTextSelected: {
    color: '#333333',
    fontFamily: 'PretendardBold',
  },
  dayTextToday: {
    color: '#FFFFFF',
    fontFamily: 'PretendardBold',
  },
  dayTextOutside: {
    color: '#B0B0B0',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F38D11',
    marginTop: 3,
  },
  dayDotOnToday: {
    backgroundColor: '#FFFFFF',
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#F5F5F5',
  },
  listScrollContent: {
    paddingBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: '#999999',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 13,
    color: '#333333',
    fontFamily: 'Pretendard',
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


