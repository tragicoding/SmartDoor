import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { loginUser, updateUserProfile, registerDevice } from '../services/api';
import { setProfile, getProfile } from '../store/userProfileStore';
import { fetchCurrentCoordinates } from '../services/location';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const prefill = route?.params?.prefillCredentials;
    if (prefill) {
      if (prefill.id) {
        setId(prefill.id);
      }
      if (prefill.password) {
        setPassword(prefill.password);
      }
      setAuthError(false);
      setErrorMessage('');
    }
  }, [route?.params?.prefillCredentials]);

  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!id || !password) {
      setAuthError(true);
      setErrorMessage('아이디와 패스워드를 확인해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      setAuthError(false);
      setErrorMessage('');

      // 프론트 변수 -> 백엔드 변수 매핑
      // - id (프론트)       -> email (백엔드)
      // - password (프론트) -> pw (백엔드)
      const result = await loginUser({
        email: id,
        pw: password,
      });

      const token = result?.token;

      // 전역 프로필 스토어에 토큰 및 이메일 저장
      const prev = getProfile();
      setProfile({
        ...prev,
        authToken: token,
        id,
      });

      // 로그인 직후: 위치 권한을 요청하고, 허용되면 현재 좌표를 백엔드에 저장
      try {
        const coords = await fetchCurrentCoordinates();

        await updateUserProfile(token, {
          lat: coords.lat,
          lon: coords.lon,
          // 로그인 시점에는 이름/주소/비밀번호/시리얼은 건드리지 않음
          name: prev?.name ?? undefined,
          road_address: prev?.addressRoad ?? undefined,
          detail_address: prev?.addressDetail ?? undefined,
          pw: undefined,
          device_serial: prev?.deviceSerial ?? undefined,
        });

        // 전역 스토어에도 최신 좌표 반영
        setProfile({
          ...prev,
          authToken: token,
          id,
          lat: coords.lat,
          lon: coords.lon,
        });
      } catch (locError) {
        // 위치 권한 거부 또는 기타 위치 에러: 로그인은 그대로 진행, 좌표 저장만 생략
        console.log('login location update error:', locError);
      }

      // 로그인 후: 프로필에 6자리 시리얼이 있으면 기기 등록 시도
      try {
        const serial = (prev?.deviceSerial || '').trim();
        if (serial.length === 6) {
          await registerDevice(token, {
            serial,
            // 기본값: 도어 센서 타입, 이름은 시리얼 기반
            type: 'DOOR_SENSOR',
            name: `device-${serial}`,
          });
        }
      } catch (regError) {
        // 기기 등록 실패는 로그인 진행을 막지 않음
        console.log('device register skipped:', regError?.message || regError);
      }

      // 로그인 성공 시 다음 화면으로 이동
      navigation.replace('Loading');
    } catch (error) {
      setAuthError(true);

      let message = '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';

      // 백엔드 상태 코드 / 메시지에 따라 프론트 전용 문구 매핑
      if (error?.status === 400) {
        // Joi 검증 실패 (이메일 형식 등)
        message = '아이디를 이메일 형식으로 적어주세요.';
      } else if (error?.status === 401) {
        if (error?.message === '비밀번호가 일치하지 않음.') {
          // 비밀번호 틀림
          message = '비밀번호를 확인해주세요.';
        } else if (error?.message === '존재하지 않는 사용자.') {
          // 이메일에 해당하는 유저 없음
          message = '존재하지 않는 아이디입니다.';
        } else {
          // 기타 인증 실패
          message = '아이디와 비밀번호를 다시 확인해주세요.';
        }
      } else if (error?.message) {
        message = error.message;
      }

      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.innerContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.logoSection}>
          <Image
            source={require('../components/image/main_logo.png')}
            style={styles.logoImage}
          />
            <Text style={styles.appText}>낑깡</Text>
          <Text style={styles.titleText}>To-get List</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>아이디</Text>
          <TextInput
          style={[styles.input, authError && styles.inputError]}
            placeholder="이메일을 입력하세요"
            placeholderTextColor="#C0C0C0"
            value={id}
            onChangeText={setId}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.inputLabel}>비밀번호</Text>
          <TextInput
          style={[styles.input, authError && styles.inputError]}
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor="#C0C0C0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        {authError && (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        )}
        </View>

        <TouchableOpacity
          style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
          onPress={submitting ? undefined : handleLogin}
          disabled={submitting}
        >
          <Text style={styles.loginButtonText}>
            {submitting ? '로그인 중...' : '로그인'}
          </Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>
            낑깡이 처음이시라면?{' '}
            <Text style={styles.registerLink} onPress={handleRegister}>
              회원가입
            </Text>
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 16 : 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: height * 0.05,
  },
  logoImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  appText: {
    fontSize: 28,
    color: '#000000',
    marginBottom: 2,
    fontFamily: 'Cafe24Ssurround',
  },
  titleText: {
    fontSize: 32,
    fontFamily: 'Cafe24Ssurround',
    color: '#000000',
  },
  formSection: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: 'PretendardMedium',
    color: '#333333',
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    height: 50,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  inputError: {
    borderColor: '#FF2222',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#FF2222',
  },
  loginButton: {
    width: '100%',
    height: 55,
    backgroundColor: '#F38D11',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'PretendardSemiBold',
  },
  registerContainer: {
    marginTop: 20,
    flexDirection: 'row',
  },
  registerText: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'Pretendard',
  },
  registerLink: {
    fontSize: 12,
    color: '#FF8C00',
    fontFamily: 'Pretendard',
    textDecorationLine: 'underline',
  },
});

