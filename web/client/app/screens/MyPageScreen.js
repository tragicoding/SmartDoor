import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProfile, setProfile } from '../store/userProfileStore';
import { getMyProfile, updateUserProfile, registerDevice } from '../services/api';
import { fetchCurrentCoordinates } from '../services/location';

const PROFILE_IMAGE_PATH = require('../components/image/profiled.png');
const EDIT_ICON = require('../components/image/edit.png');
const PASSWORD_ICON = require('../components/image/password.png');

const ICONS = {
  list_active: require('../components/image/list_y.png'),
  list_inactive: require('../components/image/list_g.png'),
  calendar_active: require('../components/image/calendar_y.png'),
  calendar_inactive: require('../components/image/calendar_g.png'),
  mypage_active: require('../components/image/mypage_y.png'),
  mypage_inactive: require('../components/image/mypage_g.png'),
};

const getTabIcon = tabName => {
  if (tabName === 'List') {
    return ICONS.list_inactive;
  }
  if (tabName === 'Calendar') {
    return ICONS.calendar_inactive;
  }
  if (tabName === 'MyPage') {
    return ICONS.mypage_active;
  }
  return ICONS.mypage_inactive;
};

export default function MyPageScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const initialProfile = useMemo(() => getProfile(), []);

  const [name, setName] = useState(initialProfile.name || '');
  const [userId, setUserId] = useState(initialProfile.id || '');
  const [password, setPassword] = useState(initialProfile.password || '');
  const [addressRoad, setAddressRoad] = useState(initialProfile.addressRoad || '');
  const [addressDetail, setAddressDetail] = useState(initialProfile.addressDetail || '');
  const [deviceSerial, setDeviceSerial] = useState(initialProfile.deviceSerial || '');

  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        style: 'destructive',
        onPress: () => {
          // 전역 프로필에서 토큰만 제거하고 로그인 화면으로 이동
          const profile = getProfile();
          setProfile({
            ...profile,
            authToken: null,
          });
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEditToggle = async () => {
    // 편집 모드에서 "완료"를 누른 경우 서버 저장 시도
    if (isEditing) {
      const profile = getProfile();

      if (!profile?.authToken) {
        Alert.alert('오류', '로그인 정보가 없습니다. 다시 로그인해주세요.');
        return;
      }

      // 비밀번호 길이 프론트 검증 (Joi 6자 제한과 동일하게 맞춤)
      if (password && password.length < 6) {
        setPasswordError('비밀번호는 6자리 이상으로 입력해주세요.');
        return;
      }

      try {
        setSaving(true);
        setSaveError('');

        // --- 기기 등록 로직 ---
        // 기기 시리얼 번호가 입력되었고, 기존 번호와 다를 경우에만 등록 시도
        if (deviceSerial && deviceSerial !== initialProfile.deviceSerial) {
          try {
            await registerDevice(profile.authToken, {
              serial: deviceSerial,
              type: 'DOOR_SENSOR', // 기본값
              name: '내 현관문',    // 기본값
            });
            Alert.alert('성공', '기기가 성공적으로 등록되었습니다.');
          } catch (regError) {
            console.log('registerDevice error:', regError);
            // 409 Conflict 에러는 이미 다른 사용자가 등록했다는 의미
            if (regError.status === 409) {
                setSaveError('이미 다른 계정에 등록된 기기입니다.');
            } else {
                setSaveError('기기 등록에 실패했습니다. 시리얼 번호를 확인해주세요.');
            }
            return; // 기기 등록 실패 시 프로필 저장을 중단
          }
        }
        // --- 기기 등록 로직 끝 ---


        // 1) 기본값: 기존에 저장된 좌표가 있으면 유지, 없으면 0,0 사용
        let lat = profile.lat ?? 0;
        let lon = profile.lon ?? 0;

        // 2) 가능한 경우, 기기의 현재 위치를 한 번 조회해서 덮어쓴다.
        //    - expo-location 권한 요청 포함
        //    - 권한 거부/에러 시에는 조용히 기존 값(lat/lon)을 그대로 사용
        try {
          const coords = await fetchCurrentCoordinates();
          lat = coords.lat;
          lon = coords.lon;
        } catch (locError) {
          console.log('fetchCurrentCoordinates error:', locError);
          if (locError?.code === 'LOCATION_PERMISSION_DENIED') {
            Alert.alert(
              '위치 권한 필요',
              '위치 권한을 허용하지 않으면 날씨 기반 기능이 제한될 수 있습니다. 설정에서 권한을 변경할 수 있습니다.',
            );
          }
        }

        const updated = await updateUserProfile(profile.authToken, {
          lat,
          lon,
          name,
          road_address: addressRoad,
          detail_address: addressDetail,
          pw: password,
          device_serial: deviceSerial,
        });

        // 서버 응답 기준으로 전역 스토어 업데이트
        setProfile({
          ...profile,
          name: updated.name ?? name,
          id: userId,
          password,
          addressRoad: updated.road_address ?? addressRoad,
          addressDetail: updated.detail_address ?? addressDetail,
          deviceSerial: updated.device_serial ?? deviceSerial,
          lat: updated.lat ?? lat,
          lon: updated.lon ?? lon,
        });

        setIsEditing(false);
        return;
      } catch (error) {
        console.log('updateUserProfile error:', error);
        setSaveError('프로필 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
        return; // 에러 시 편집 모드 유지
      } finally {
        setSaving(false);
      }
    }

    // 편집 시작
    setSaveError('');
    setPasswordError('');
    setIsEditing(prev => !prev);
  };

  const handleTabPress = tabName => {
    if (tabName === 'List') {
      navigation.navigate('Home');
      return;
    }
    if (tabName === 'Calendar') {
      navigation.navigate('Calendar');
      return;
    }
    if (tabName === 'MyPage') {
      return;
    }
  };

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

  // 서버에서 최신 프로필 정보 불러오기
  useEffect(() => {
    const profile = getProfile();
    if (!profile?.authToken) {
      return;
    }

    (async () => {
      try {
        const data = await getMyProfile(profile.authToken);
        // 서버 데이터 → 화면 state로 반영
        setName(data.name || '');
        setUserId(data.email || '');
        setPassword(data.pw || '');
        setAddressRoad(data.road_address || '');
        setAddressDetail(data.detail_address || '');
        setDeviceSerial(data.device_serial || '');

        // 전역 스토어도 서버 기준으로 동기화
        setProfile({
          ...profile,
          name: data.name || '',
          id: data.email || '',
          password: data.pw || '',
          addressRoad: data.road_address || '',
          addressDetail: data.detail_address || '',
          deviceSerial: data.device_serial || '',
          lat: data.lat ?? null,
          lon: data.lon ?? null,
        });
      } catch (error) {
        console.log('getMyProfile error:', error);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView
      style={styles.inner}
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 40 : 60}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name || '프로필'}</Text>
        <TouchableOpacity style={styles.headerRight} onPress={handleEditToggle}>
          {isEditing ? (
            <Text style={styles.doneText}>{saving ? '저장 중..' : '완료'}</Text>
          ) : (
            <Image source={EDIT_ICON} style={styles.editIcon} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image source={PROFILE_IMAGE_PATH} style={styles.avatarImage} />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            value={name}
            onChangeText={setName}
            editable={isEditing}
            placeholder="이름"
            placeholderTextColor="#C0C0C0"
          />

          <Text style={styles.label}>아이디</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            value={userId}
            onChangeText={setUserId}
            editable={isEditing}
            placeholder="ID"
            placeholderTextColor="#C0C0C0"
            autoCapitalize="none"
          />

          <Text style={styles.label}>비밀번호</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                !isEditing && styles.inputReadonly,
                !!passwordError && styles.inputError,
              ]}
              value={password}
              onChangeText={text => {
                if (passwordError) {
                  setPasswordError('');
                }
                setPassword(text);
              }}
              editable={isEditing}
              placeholder="Password"
              placeholderTextColor="#C0C0C0"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.passwordIconWrapper}
              onPress={() => setShowPassword(prev => !prev)}
            >
              <Image source={PASSWORD_ICON} style={styles.passwordIcon} />
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <Text style={styles.errorMessage}>{passwordError}</Text>
          ) : null}

          <Text style={styles.label}>주소</Text>
          <TextInput
            style={[
              styles.input,
              styles.addressInput,
              !isEditing && styles.inputReadonly,
            ]}
            value={addressRoad}
            onChangeText={setAddressRoad}
            editable={isEditing}
            placeholder="도로명 주소"
            placeholderTextColor="#C0C0C0"
          />
          <TextInput
            style={[
              styles.input,
              styles.addressInput,
              !isEditing && styles.inputReadonly,
            ]}
            value={addressDetail}
            onChangeText={setAddressDetail}
            editable={isEditing}
            placeholder="상세 주소"
            placeholderTextColor="#C0C0C0"
          />

          <Text style={styles.label}>기기 등록</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            value={deviceSerial}
            onChangeText={text => setDeviceSerial(text.toUpperCase())}
            editable={isEditing}
            placeholder="기기 번호"
            placeholderTextColor="#C0C0C0"
            autoCapitalize="characters"
          />

          {saveError ? (
            <Text style={styles.errorMessage}>{saveError}</Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

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
        <Text style={styles.navText}>캘린더</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('MyPage')}
      >
        <Image source={getTabIcon('MyPage')} style={styles.navIconImage} />
        <Text style={[styles.navText, styles.activeNavText]}>마이페이지</Text>
      </TouchableOpacity>
    </View>
  </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  headerSpacer: {
    width: 50,
  },
  logoutText: {
    fontSize: 13,
    color: '#666666',
    fontFamily: 'PretendardBold',
  },
  headerLeft: {
    width: 70,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 6, // 로그아웃 텍스트를 화면 안쪽으로 약간 이동
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PretendardExtraBold',
    color: '#333333',
  },
  headerRight: {
    width: 70, // 버튼 텍스트(저장중...)가 한 줄에 들어가도록 여유 폭 확보
    alignItems: 'flex-end',
    padding: 8,
  },
  editIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  doneText: {
    fontSize: 14,
    color: '#F38D11',
    fontFamily: 'PretendardBold',
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingBottom: 140,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#F38D11',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  formSection: {
    marginTop: 5,
  },
  label: {
    fontSize: 14,
    fontFamily: 'PretendardMedium',
    color: '#333333',
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF2222',
  },
  inputReadonly: {
    backgroundColor: '#F7F7F7',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 40,
  },
  passwordIconWrapper: {
    position: 'absolute',
    right: 10,
    padding: 6,
  },
  passwordIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  errorMessage: {
    marginTop: 5,
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#FF2222',
  },
  addressInput: {
    marginTop: 4,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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


