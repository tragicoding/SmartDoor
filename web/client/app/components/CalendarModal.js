import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';

const { height } = Dimensions.get('window');
const SNAP_POINT = height * 0.35;
const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_LABELS_KR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WEEK_DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

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

const formatButtonLabel = date => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = WEEK_DAYS_KR[date.getDay()];
  return `${month}월 ${day}일(${week}) 선택`;
};

export default function CalendarModal({ isVisible, onClose, initialDate, onConfirm }) {
  const [displayedYear, setDisplayedYear] = useState(initialDate.getFullYear());
  const [displayedMonth, setDisplayedMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    if (isVisible) {
      setDisplayedYear(initialDate.getFullYear());
      setDisplayedMonth(initialDate.getMonth());
      setSelectedDate(initialDate);
    }
  }, [isVisible, initialDate]);

  const matrix = useMemo(
    () => createMatrix(displayedYear, displayedMonth),
    [displayedYear, displayedMonth],
  );

  const today = useMemo(() => new Date(), []);

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

  const translateY = useMemo(() => new Animated.Value(height), []);

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

  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > SNAP_POINT) {
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
    [translateY],
  );

  const handleDayPress = day => {
    setSelectedDate(day.dateObj);
    if (!day.inMonth) {
      setDisplayedYear(day.dateObj.getFullYear());
      setDisplayedMonth(day.dateObj.getMonth());
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={closeSheet}>
      <TouchableOpacity
        style={[styles.modalOverlay, isVisible ? styles.overlayVisible : null]}
        activeOpacity={1}
        onPress={closeSheet}
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.modalContent, { transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handleBar} />
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.monthButton} onPress={() => adjustMonth(-1)}>
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {displayedYear}년 {displayedMonth + 1}월
            </Text>
            <TouchableOpacity style={styles.monthButton} onPress={() => adjustMonth(1)}>
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

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
            {matrix.map((week, index) => (
              <View key={index} style={styles.weekRow}>
                {week.map((day, idx) => {
                  const isToday =
                    day.dateObj.toDateString() === today.toDateString() && day.inMonth;
                  const isSelected =
                    day.dateObj.toDateString() === selectedDate.toDateString() && day.inMonth;
                  return (
                    <TouchableOpacity
                      key={idx}
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
                          day.dateObj.getDay() === 0 && day.inMonth && !isToday && styles.dayTextSunday,
                        ]}
                      >
                        {day.date}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>{formatButtonLabel(selectedDate)}</Text>
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 20,
    fontFamily: 'PretendardBold',
    color: '#F38D11',
  },
  monthButton: {
    padding: 12,
  },
  monthButtonText: {
    fontSize: 22,
    color: '#999999',
    fontFamily: 'Pretendard',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
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
    borderRadius: 12,
  },
  dayCellToday: {
    backgroundColor: '#F38D11',
  },
  dayCellSelected: {
    backgroundColor: '#F0F0F0',
  },
  dayCellOutside: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 12,
    color: '#333333',
    fontFamily: 'Pretendard',
  },
  dayTextSunday: {
    color: '#F38D11',
  },
  dayTextToday: {
    color: '#FFFFFF',
    fontFamily: 'PretendardBold',
  },
  dayTextSelected: {
    color: '#333333',
    fontFamily: 'PretendardBold',
  },
  dayTextOutside: {
    color: '#B0B0B0',
    fontFamily: 'Pretendard',
  },
  confirmButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#F38D11',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PretendardBold',
  },
});


