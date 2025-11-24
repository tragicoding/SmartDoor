import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';

const { height } = Dimensions.get('window');

const WEATHER_ICONS = {
  sunny: require('./image/sunny.png'),
  sunnycloud: require('./image/sunnycloud.png'),
  cloud: require('./image/cloud.png'),
  rainy: require('./image/rainy.png'),
};
const DRIP_ICON = require('./image/drip.png');

// 서버 데이터가 없을 때 사용할 더미 템플릿
const WEATHER_TEMPLATE = [
  { condition: 'sunny', max: 6, min: -1 },
  { condition: 'cloud', max: 8, min: -3 },
  { condition: 'rainy', max: 14, min: 0 },
  { condition: 'cloud', max: 11, min: 0 },
  { condition: 'sunny', max: 13, min: 0 },
  { condition: 'sunny', max: 14, min: 1 },
  { condition: 'cloud', max: 14, min: 7 },
  { condition: 'sunny', max: 8, min: -1 },
];
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const SNAP_POINT = height * 0.35;

/**
 * @param {Array<{date:string, sky:number|null, pty:number|null, tmp:number|null, tmx:number|null, tmn:number|null, pop:number|null}>} weekly_days
 */
export default function WeeklyWeatherModal({
  isVisible,
  onClose,
  dateString,
  baseDate = new Date(), // 오늘 기준 날짜
  weekly_days = [],
  selectedDate,
}) {
  const translateY = useMemo(() => new Animated.Value(height), []);

  const weeklyData = useMemo(() => {
    const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    today.setHours(0, 0, 0, 0);

    const selected =
      selectedDate != null
        ? new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
          )
        : new Date(today);
    selected.setHours(0, 0, 0, 0);

    // 서버에서 받은 주간 데이터가 있다면 그걸 우선 사용
    if (weekly_days && weekly_days.length > 0) {
    return weekly_days.map((dayData, index) => {
        // 아직 API가 완전히 연결되지 않은 경우를 위해
        // 강수확률(pop)이 없으면 인덱스를 기반으로 한 더미 값 생성
        const dummyPop = 10 + ((index * 7) % 80);

        const date = new Date(dayData.date || today);
        date.setHours(0, 0, 0, 0);

        const offset_ms = date.getTime() - today.getTime();
        const offsetFromToday = Math.round(offset_ms / (1000 * 60 * 60 * 24));

        let label = DAY_LABELS[date.getDay()];
        const isToday = offsetFromToday === 0;
        if (offsetFromToday === -1) label = '어제';
        if (offsetFromToday === 0) label = '오늘';

        const isSelected = date.getTime() === selected.getTime();

        // PTY(강수 형태)와 SKY(하늘 상태)를 기반으로 아이콘 조건 결정
        let condition = 'cloud';
        const sky = Number(dayData.sky ?? 0);
        const pty = Number(dayData.pty ?? 0);

        if (pty !== 0) {
          // 비/눈이 오는 경우는 모두 비 아이콘으로 처리 (과제용 단순화)
          condition = 'rainy';
        } else {
          if (sky === 1) condition = 'sunny';
          else if (sky === 3) condition = 'sunnycloud';
          else if (sky === 4) condition = 'cloud';
        }

        const rawMax = dayData.tmx ?? dayData.tmp ?? 0;
        const rawMin = dayData.tmn ?? dayData.tmp ?? 0;

        return {
          condition,
          // 온도는 소수점이 보이지 않도록 반올림해서 사용
          max: Math.round(rawMax),
          min: Math.round(rawMin),
          day: label,
          isToday,
          isSelected,
          pop: dayData.pop ?? dummyPop,
        };
      });
    }

    // 서버 데이터가 없을 때: 기존 더미 템플릿 사용
    return WEATHER_TEMPLATE.map((template, index) => {
      const offset = index - 1;
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + offset);
      let label = DAY_LABELS[date.getDay()];
      let isToday = false;
      if (offset === -1) label = '어제';
      if (offset === 0) {
        label = '오늘';
        isToday = true;
      }
      return {
        ...template,
        day: label,
        isToday,
        // 서버 데이터가 없을 때도 디자인 확인을 위해 더미 강수확률 제공
        pop: 10 + ((index * 7) % 80),
      };
    });
  }, [baseDate, weekly_days, selectedDate]);

  useEffect(() => {
    if (isVisible) {
      translateY.setValue(height);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
      }).start();
    }
  }, [isVisible, translateY]);

  const closeSheet = useCallback(() => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }, [onClose, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > SNAP_POINT) {
            closeSheet();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
          }).start();
        },
      }),
    [closeSheet, translateY],
  );

  const WeatherRow = ({ day, condition, max, min, isToday, isSelected, pop }) => {
    const iconSource = WEATHER_ICONS[condition] || WEATHER_ICONS.cloud;

    return (
      <View
        style={[
          styles.row,
          isToday && styles.rowToday,              // 오늘은 항상 주황색 배경
          !isToday && isSelected && styles.rowSelected,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            isToday && styles.dayTextToday,        // 오늘은 항상 주황 텍스트
            !isToday && isSelected && styles.dayTextSelected,
          ]}
        >
          {day}
        </Text>
        <View style={styles.rowRight}>
          {pop != null && (
            <View style={styles.popContainer}>
              <Image source={DRIP_ICON} style={styles.popIcon} />
              <Text style={styles.popText}>{pop}%</Text>
            </View>
          )}
          <Image source={iconSource} style={styles.weatherIcon} />
          <Text style={styles.tempText}>{max}°</Text>
          <Text style={styles.tempTextMin}>{min}°</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.modalOverlay, isVisible ? styles.overlayVisible : null]}
        activeOpacity={1}
        onPress={closeSheet}
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.modalContent, { transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
          accessible={true}
        >
          <View style={styles.handleBar} />
          <Text style={styles.currentDateText}>{dateString || '2025년 11월 5일'}</Text>
          <View style={styles.weeklyListContainer}>
            {weeklyData.map((data, index) => (
              <WeatherRow key={index} {...data} />
            ))}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={closeSheet}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    justifyContent: 'flex-end',
  },
  overlayVisible: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.78,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  currentDateText: {
    fontSize: 18,
    fontFamily: 'PretendardBold',
    color: '#F38D11',
    marginBottom: 15,
  },
  weeklyListContainer: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowToday: {
    backgroundColor: '#FFF6EE',
  },
  rowSelected: {
    backgroundColor: '#F3F3F3',
  },
  dayText: {
    flexShrink: 0,
    width: 44,
    fontSize: 14,
    fontFamily: 'Pretendard',
    color: '#333333',
  },
  dayTextToday: {
    color: '#F38D11',
    fontFamily: 'PretendardBold',
  },
  dayTextSelected: {
    color: '#777777',
    fontFamily: 'PretendardBold',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  weatherIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginHorizontal: 6,
  },
  tempText: {
    width: 34,
    fontSize: 14,
    fontFamily: 'PretendardBold',
    textAlign: 'right',
    color: '#333333',
    marginLeft: 4,
  },
  tempTextMin: {
    width: 34,
    fontSize: 14,
    fontFamily: 'Pretendard',
    textAlign: 'right',
    color: '#AAAAAA',
    marginLeft: 4,
  },
  popContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 64,
    marginRight: 12,
  },
  popIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    marginRight: 3,
  },
  popText: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: '#333333',
  },
  closeButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#F38D11',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PretendardBold',
  },
});


