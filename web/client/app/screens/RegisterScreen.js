import React, { useState } from 'react';
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
import { setProfile } from '../store/userProfileStore';
import { signupUser } from '../services/api';

const PASSWORD_ICON = require('../components/image/password.png');

const { height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [addressRoad, setAddressRoad] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordCheck, setShowPasswordCheck] = useState(false);

  const handleRegister = async () => {
    const newErrors = {};

    if (!name) newErrors.name = '이름을 입력해주세요';
    if (!id) newErrors.id = '이메일을 입력해주세요';
    if (!password) newErrors.password = '비밀번호를 입력해주세요';
    if (!passwordCheck) newErrors.passwordCheck = '비밀번호를 확인해주세요';
    if (!addressRoad) newErrors.addressRoad = '도로명 주소를 입력해주세요';
    if (!addressDetail) newErrors.addressDetail = '상세 주소를 입력해주세요';
    if (!deviceSerial) {
      newErrors.deviceSerial = '6자리 기기 번호를 입력해주세요';
    } else if (deviceSerial.length !== 6) {
      newErrors.deviceSerial = '기기 번호는 6자리여야 합니다';
    }

    if (
      password &&
      passwordCheck &&
      password !== passwordCheck
    ) {
      newErrors.passwordCheck = '비밀번호를 다시 확인해주세요';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      return;
    }

    try {
      setSubmitting(true);

      // README / 백엔드 구현 기준 변수명 매핑
      // - id (프론트)        -> email (백엔드)
      // - password (프론트)  -> pw (백엔드)
      // - addressRoad        -> road_address
      // - addressDetail      -> detail_address
      // - deviceSerial       -> device_serial (현재는 백엔드에서 사용하지 않지만 함께 전송)
      const result = await signupUser({
        name,
        email: id,
        pw: password,
        road_address: addressRoad,
        detail_address: addressDetail,
        device_serial: deviceSerial,
      });

      // 서버에서 user_id 반환 기대: { user_id: number }
      const createdUserId = result?.user_id;

      // 로컬 프로필 스토어에도 최소 정보 저장 (기존 동작 유지 + user_id 보강 가능)
      setProfile({
        name,
        id,
        password,
        addressRoad,
        addressDetail,
        deviceSerial,
        userId: createdUserId,
      });

      navigation.replace('RegisterComplete', {
        credentials: { id, password },
      });
    } catch (error) {
      let message = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';

      // 백엔드 상태 코드 / 메시지에 따라 프론트 전용 문구 매핑
      if (error?.status === 400) {
        // Joi 검증 실패 (이메일 형식 등)
        message = '아이디를 이메일 형식으로 적어주세요.';
      } else if (error?.status === 409) {
        // 이메일 중복
        message = '이미 사용 중인 아이디입니다.';
      } else if (error?.message) {
        message = error.message;
      }

      setErrors(prev => ({
        ...prev,
        submit: message,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const renderInputField = (
    label,
    placeholder,
    value,
    onChangeText,
    fieldKey,
    secure = false,
  ) => {
    const isPasswordField = fieldKey === 'password' || fieldKey === 'passwordCheck';
    const isCheck = fieldKey === 'passwordCheck';
    const isVisible = isCheck ? showPasswordCheck : showPassword;

    return (
      <View style={styles.inputGroup} key={label}>
        <Text style={styles.inputLabel}>{label}</Text>
        {secure ? (
          <View style={styles.passwordRow}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                errors[fieldKey] && styles.inputError,
              ]}
              placeholder={placeholder}
              placeholderTextColor="#C0C0C0"
              value={value}
              onChangeText={text => {
                if (errors[fieldKey]) {
                  setErrors(prev => ({ ...prev, [fieldKey]: undefined }));
                }
                onChangeText(text);
              }}
              secureTextEntry={!isVisible}
              autoCapitalize="none"
              keyboardType="default"
            />
            <TouchableOpacity
              style={styles.passwordIconWrapper}
              onPress={() => {
                if (isCheck) {
                  setShowPasswordCheck(prev => !prev);
                } else {
                  setShowPassword(prev => !prev);
                }
              }}
            >
              <Image source={PASSWORD_ICON} style={styles.passwordIcon} />
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            style={[styles.input, errors[fieldKey] && styles.inputError]}
            placeholder={placeholder}
            placeholderTextColor="#C0C0C0"
            value={value}
            onChangeText={text => {
              if (errors[fieldKey]) {
                setErrors(prev => ({ ...prev, [fieldKey]: undefined }));
              }
              onChangeText(text);
            }}
            autoCapitalize={fieldKey === 'id' ? 'none' : 'sentences'}
            keyboardType={fieldKey === 'id' ? 'email-address' : 'default'}
          />
        )}
        {errors[fieldKey] ? (
          <Text style={styles.errorMessage}>{errors[fieldKey]}</Text>
        ) : null}
      </View>
    );
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.logoSection}>
          <Image
            source={require('../components/image/main_logo.png')}
            style={styles.logoImage}
          />
          <Text style={styles.appText}>낑깡</Text>
          <Text style={styles.titleText}>To-get List</Text>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>반가워요!</Text>
          <Text style={styles.welcomeSubtitle}>이용을 위해 가입을 부탁해요</Text>
        </View>

        <View style={styles.formSection}>
          {renderInputField('이름', '이름을 입력해주세요', name, setName, 'name')}
          {renderInputField('아이디', '이메일을 입력해주세요', id, setId, 'id')}
          {renderInputField('비밀번호', '비밀번호를 만들어주세요', password, setPassword, 'password', true)}
          {renderInputField('비밀번호 확인', '비밀번호를 확인해요', passwordCheck, setPasswordCheck, 'passwordCheck', true)}

          <Text style={styles.inputLabel}>주소</Text>
          <View style={styles.addressGroup}>
            <TextInput
              style={[
                styles.input,
                styles.addressInput,
                errors.addressRoad && styles.inputError,
              ]}
              placeholder="도로명 주소를 입력해주세요"
              placeholderTextColor="#C0C0C0"
              value={addressRoad}
              onChangeText={text => {
                if (errors.addressRoad) {
                  setErrors(prev => ({ ...prev, addressRoad: undefined }));
                }
                setAddressRoad(text);
              }}
            />
            {errors.addressRoad ? (
              <Text style={styles.errorMessage}>{errors.addressRoad}</Text>
            ) : null}
          </View>
          <View style={styles.addressGroup}>
            <TextInput
              style={[
                styles.input,
                styles.addressInput,
                errors.addressDetail && styles.inputError,
              ]}
              placeholder="상세 주소를 입력해주세요"
              placeholderTextColor="#C0C0C0"
              value={addressDetail}
              onChangeText={text => {
                if (errors.addressDetail) {
                  setErrors(prev => ({ ...prev, addressDetail: undefined }));
                }
                setAddressDetail(text);
              }}
            />
            {errors.addressDetail ? (
              <Text style={styles.errorMessage}>{errors.addressDetail}</Text>
            ) : null}
          </View>

          <Text style={styles.inputLabel}>기기 등록</Text>
          <TextInput
            style={[styles.input, errors.deviceSerial && styles.inputError]}
            placeholder="기기의 6자리 번호를 입력해주세요"
            placeholderTextColor="#C0C0C0"
            value={deviceSerial}
            onChangeText={text => {
              if (errors.deviceSerial) {
                setErrors(prev => ({ ...prev, deviceSerial: undefined }));
              }
              setDeviceSerial(text.toUpperCase());
            }}
            maxLength={6}
            keyboardType="default"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {errors.deviceSerial ? (
            <Text style={styles.errorMessage}>{errors.deviceSerial}</Text>
          ) : null}

          {errors.submit ? (
            <Text style={styles.errorMessage}>{errors.submit}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
          onPress={submitting ? undefined : handleRegister}
          disabled={submitting}
        >
          <Text style={styles.nextButtonText}>
            {submitting ? '가입 중...' : '다음으로'}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 30,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: Platform.OS === 'android' ? 16 : 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: height * 0.03,
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
  welcomeSection: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: height * 0.03,
    marginBottom: height * 0.03,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'PretendardExtraBold',
    color: '#000000',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#333333',
    fontFamily: 'PretendardsemiBold',
  },
  formSection: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 10,
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
    fontFamily: 'Pretendard',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  addressInput: {
    marginBottom: 4,
    marginTop: 0,
  },
  addressGroup: {
    width: '100%',
    marginBottom: 5,
  },
  inputError: {
    borderColor: '#FF2222',
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
    alignSelf: 'flex-start',
  },
  nextButton: {
    width: '100%',
    height: 55,
    backgroundColor: '#F38D11',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'PretendardSemiBold',
  },
});

