import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// 아이콘 경로
const DELETE_ICON = require('./image/delete_g.png');
const MAP_ICON = require('./image/map.png');

const WEATHER_ICONS = {
  sunny: require('./image/sunny.png'),
  sunnycloud: require('./image/sunnycloud.png'),
  cloud: require('./image/cloud.png'),
  rainy: require('./image/rainy.png'),
};

/**
 * 물건 추가/리스트 작성 모달 컴포넌트
 * @param {boolean} isVisible - 모달 표시 여부
 * @param {function} onClose - 모달 닫기 핸들러
 * @param {object} info - 현재 날짜 및 날씨 정보 ({date, location, temp})
 */
export default function ListInputModal({
  isVisible,
  onClose,
  info,
  initialItems = [],
  onApply = () => {},
}) {
  // 사용자가 직접 입력하는 항목
  const [directInput, setDirectInput] = useState('');

  // 모든 리스트 항목
  const [allItems, setAllItems] = useState([]);

  // 선택된 항목 ID 목록 (메인 컨테이너에 반영될 항목)
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [isClearConfirmVisible, setIsClearConfirmVisible] = useState(false);

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const sanitizeItems = items =>
    (items || []).map(item => ({
      ...item,
      id: item.id ?? generateId(),
    }));

  useEffect(() => {
    if (isVisible) {
      const syncedItems = sanitizeItems(initialItems);
      setAllItems(syncedItems);
      setSelectedItemIds(
        syncedItems.filter(item => item.selected).map(item => item.id),
      );
      setDirectInput('');
    }
  }, [isVisible, initialItems]);

  const commitPendingInput = () => {
    const trimmed = directInput.trim();
    if (!trimmed) {
      return null;
    }

    const newItem = {
      id: generateId(),
      text: trimmed,
    };

    const updatedItems = [...allItems, newItem];
    const updatedSelectedIds = [...selectedItemIds, newItem.id];
    setAllItems(updatedItems);
    setSelectedItemIds(updatedSelectedIds);
    setDirectInput('');

    return { updatedItems, updatedSelectedIds };
  };

  const getLatestSnapshot = () => {
    const pending = commitPendingInput();
    const latestItems = pending?.updatedItems ?? allItems;
    const latestSelectedIds = pending?.updatedSelectedIds ?? selectedItemIds;
    return { latestItems, latestSelectedIds };
  };

  // 리스트 항목 토글 (선택/해제)
  const handleItemToggle = (itemId) => {
    setSelectedItemIds(prev => {
      if (prev.includes(itemId)) {
        // 선택 해제
        return prev.filter(id => id !== itemId);
      } else {
        // 선택 추가
        return [...prev, itemId];
      }
    });
  };

  // 리스트 항목 삭제
  const handleClearAll = () => {
    setAllItems([]);
    setSelectedItemIds([]);
  };

  // 직접 입력 항목을 리스트에 추가
  const handleDirectInputSubmit = () => {
    commitPendingInput();
  };

  // 최종 저장 핸들러
  const applyToParent = () => {
    // 토글 기능을 제거했으므로, 모든 항목을 기본적으로 사용하도록 selected=true 로 전달
    const payload = allItems.map(item => ({
      ...item,
      selected: true,
    }));
    onApply(payload);
  };

  const handleSave = () => {
    handleDirectInputSubmit();
  };

  const handleExit = () => {
    applyToParent();
    onClose();
  };

  // 리스트 버튼 렌더링 (토글 없이, 삭제만 가능)
  const ListButton = ({ item }) => {
    return (
      <View
        style={[
          styles.listButton,
          styles.listButtonUnselected,
        ]}
      >
        <Text style={styles.listButtonText}>
          {item.text}
        </Text>
        <TouchableOpacity
          style={styles.listButtonDelete}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={() => {
            setAllItems(prev => prev.filter(current => current.id !== item.id));
            setSelectedItemIds(prev => prev.filter(id => id !== item.id));
          }}
        >
          <Text style={styles.listButtonDeleteText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 리스트가 있는지 확인
  const hasListItems = allItems.length > 0;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleExit}
    >
      {/* 백드롭 (어둡게 처리된 배경) */}
      <View style={styles.centeredView}>
        <View style={styles.modalWrapper}>
          {/* 모달 내용 컨테이너 (흰색 박스) */}
          <View style={styles.modalView}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              style={styles.modalScroll}
            >
              {/* 날짜 정보 (박스 밖) */}
              <Text style={styles.infoDate}>{info?.date || '2025-11-05 (화)'}</Text>

              {/* 날씨 정보 박스 */}
              <View style={styles.infoBox}>
                <View style={styles.infoWeather}>
                  <View style={styles.weatherLocationGroup}>
                    <Image source={MAP_ICON} style={styles.mapIcon} />
                    <Text style={styles.infoText}>{info?.location || '대덕면'}</Text>
                  </View>
                <View style={styles.infoTempGroup}>
                  {info?.isWeatherLoading ? (
                    <Text style={styles.infoTempText}>데이터를 불러오고 있습니다</Text>
                  ) : (
                    <>
                      <Image
                        source={
                          WEATHER_ICONS[info?.condition] || WEATHER_ICONS.sunnycloud
                        }
                        style={styles.infoWeatherIcon}
                      />
                      <Text style={styles.infoTempText}>
                        {info?.maxTemp || '18°C'} / {info?.minTemp || '4°C'}
                      </Text>
                    </>
                  )}
                </View>
                </View>
              </View>

              {/* 리스트 제목 및 선택된 리스트 칩 영역 */}
              {hasListItems && (
                <>
                  <View style={styles.listHeaderRow}>
                    <Text style={styles.listTitle}>리스트</Text>
                    <TouchableOpacity
                      style={[styles.deleteButton, !allItems.length && styles.deleteButtonDisabled]}
                      onPress={() => setIsClearConfirmVisible(true)}
                      disabled={!allItems.length}
                    >
                      <Image source={DELETE_ICON} style={styles.deleteButtonIcon} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.chipsContainer}>
                    <View style={styles.listButtonsWrapper}>
                      {/* 리스트 버튼들 */}
                      {allItems.map(item => (
                        <ListButton key={item.id} item={item} />
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* 직접 입력 섹션 */}
              <Text style={styles.directInputLabel}>직접 입력</Text>
              <View style={styles.directInputContainer}>
                <TextInput
                  style={styles.directInput}
                  placeholder="여기에 새 리스트를 입력하세요"
                  placeholderTextColor="#AAAAAA"
                  value={directInput}
                  onChangeText={setDirectInput}
                  returnKeyType="done"
                  onSubmitEditing={handleDirectInputSubmit}
                  blurOnSubmit
                  scrollEnabled={false}
                />
              </View>
            </ScrollView>

            {/* 하단 버튼 섹션 */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.exitButton]}
                onPress={handleExit}
              >
                <Text style={styles.exitButtonText}>나가기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <Modal transparent visible={isClearConfirmVisible} animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>리스트를 비우시겠습니까?</Text>
            <Text style={styles.confirmDescription}>모든 항목이 삭제됩니다.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancel]}
                onPress={() => setIsClearConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmDelete]}
                onPress={() => {
                  handleClearAll();
                  setIsClearConfirmVisible(false);
                }}
              >
                <Text style={styles.confirmDeleteText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalWrapper: {
    width: '90%',
    maxHeight: height * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalScroll: {
    maxHeight: height * 0.7,
    marginBottom: 10,
  },
  scrollContent: {
    paddingBottom: 10,
  },

  // --- 정보 섹션 ---
  infoDate: {
    fontSize: 14,
    fontFamily: 'PretendardBold',
    marginBottom: 15,
    color: '#333333',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 8,
    marginBottom: 20,
  },
  infoWeather: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherLocationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    marginRight: 4,
    marginLeft: 4,
  },
  infoText: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#333333',
  },
  infoTempGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoWeatherIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  infoTempText: {
    fontSize: 11,
    color: '#333333',
    fontFamily: 'Pretendard',
    marginLeft: 6,
    marginRight: 4,
  },

  // --- 리스트 칩 섹션 ---
  listTitle: {
    fontSize: 14,
    fontFamily: 'PretendardBold',
    color: '#333333',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 5,
    marginBottom: 10,
  },
  listButtonsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  // 리스트 버튼 (선택/해제 가능)
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 5,
    marginBottom: 5,
    borderWidth: 0.25,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  listButtonSelected: {
    backgroundColor: '#F38D11',
    borderColor: '#101010',
  },
  listButtonUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#101010',
  },
  listButtonText: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#333333',
    flexShrink: 1,
    paddingRight: 0,
  },
  listButtonTextSelected: {
    color: 'white',
  },
  listButtonDelete: {
    paddingLeft: 8,
    paddingRight: 0,
  },
  listButtonDeleteText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'PretendardBold',
  },
  // Delete 버튼 (항상 오른쪽에 고정)
  deleteButton: {
    width: 36,
    height: 32,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },

  // --- 직접 입력 섹션 ---
  directInputLabel: {
    fontSize: 14,
    fontFamily: 'PretendardBold',
    marginTop: 10,
    marginBottom: 15,
    color: '#333333',
  },
  directInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.25,
    borderColor: '#101010',
    borderRadius: 50,
    backgroundColor: '#F8F8F8',
    marginBottom: 0,
    paddingHorizontal: 10,
  },
  directInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#333333',
    textAlignVertical: 'center',
  },

  // --- 버튼 섹션 ---
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  exitButton: {
    backgroundColor: '#EEEEEE',
  },
  exitButtonText: {
    color: '#333333',
    fontSize: 14,
    fontFamily: 'PretendardBold',
  },
  saveButton: {
    backgroundColor: '#F38D11',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PretendardBold',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBox: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6,
  },
  confirmTitle: {
    fontSize: 14,
    fontFamily: 'PretendardBold',
    color: '#333333',
    marginBottom: 8,
  },
  confirmDescription: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#666666',
    marginBottom: 14,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    minWidth: 70,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 14,
  },
  confirmCancel: {
    backgroundColor: '#EEEEEE',
  },
  confirmDelete: {
    backgroundColor: '#F38D11',
  },
  confirmCancelText: {
    color: '#333333',
    fontFamily: 'PretendardBold',
    fontSize: 13,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontFamily: 'PretendardBold',
    fontSize: 13,
  },
});
