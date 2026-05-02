import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const SignupScreen = ({ navigation }: any) => {
  // 1️⃣ 데이터 저장 상태
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // 2️⃣ 에러 메시지 상태
  const [idError, setIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // 3️⃣ 중복 확인 상태
  const [isIdChecked, setIsIdChecked] = useState(false);

  // 4️⃣ 현재 포커스된 필드 추적용 상태 (테두리 색상 변경용)
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // 5️⃣ 포커스 이동을 위한 Ref
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // 🔐 비밀번호 유효성 검증 함수
  const validatePassword = (pw: string) => {
    setPassword(pw);
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!pw) {
      setPasswordError('비밀번호를 입력해주세요.');
    } else if (!passwordRegex.test(pw)) {
      setPasswordError('영문+숫자 포함 6자 이상이어야 합니다.');
    } else {
      setPasswordError('');
    }
    if (passwordConfirm && pw !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    } else if (passwordConfirm && pw === passwordConfirm) {
      setPasswordConfirmError('');
    }
  };

  // 🔐 비밀번호 재입력 검증 함수
  const validatePasswordConfirm = (cf: string) => {
    setPasswordConfirm(cf);
    if (cf !== password) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    } else {
      setPasswordConfirmError('');
    }
  };

  // 📧 이메일 유효성 검증 함수
  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text && !emailRegex.test(text)) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
    } else {
      setEmailError('');
    }
  };

  // 📞 전화번호 자동 하이픈 포맷터
  const formatPhone = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
    setPhone(formatted);
    if (cleaned.length < 10) {
      setPhoneError('전화번호를 정확히 입력해주세요.');
    } else {
      setPhoneError('');
    }
  };

  // 🔍 아이디 중복 확인 연동
  const checkDuplicateId = async () => {
    if (!id) {
      setIdError('아이디를 먼저 입력해주세요.');
      return;
    }
    try {
      const response = await axios.get(`http://172.30.1.54:8080/api/v1/auth/check-id`, {
        params: { loginId: id }
      });
      const isDuplicate = response.data?.data?.isDuplicate ?? response.data?.isDuplicate;

      if (isDuplicate) {
        setIdError('이미 사용 중인 아이디입니다.');
        setIsIdChecked(false);
      } else {
        Alert.alert('확인', '사용 가능한 아이디입니다.');
        setIdError('');
        setIsIdChecked(true);
        passwordRef.current?.focus();
      }
    } catch (error: any) {
      Alert.alert('오류', '중복 확인 중 서버 오류가 발생했습니다.');
    }
  };

  // 🚀 다음 단계로 이동
  const handleNextStep = () => {
    if (!isIdChecked) {
      Alert.alert('알림', '아이디 중복 확인을 해주세요.');
      return;
    }
    if (passwordError || !password) {
      Alert.alert('알림', '비밀번호 양식을 확인해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!name || emailError || !email || phoneError || !phone) {
      Alert.alert('알림', '모든 정보를 올바르게 입력해주세요.');
      return;
    }

    // PersonalScreen으로 데이터 전달하며 이동
    navigation.navigate('PersonalInfo', {
      accountData: {
        loginId: id,
        password: password,
        name: name,
        phone: phone,
        email: email,
        role: 'USER'
      }
    });
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.background} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>회원가입</Text>

          {/* 아이디 영역 */}
          <Text style={styles.middleText}>아이디</Text>
          <View style={[
            styles.inputRow, 
            focusedField === 'id' && styles.focusedInput,
            idError !== '' && styles.inputRowError
          ]}>
            <TextInput 
              style={styles.inputFlex} 
              placeholder="아이디를 입력하세요" 
              placeholderTextColor="#ffffff80"
              value={id}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="next"
              onFocus={() => setFocusedField('id')}
              onBlur={() => setFocusedField(null)}
              onSubmitEditing={checkDuplicateId}
              onChangeText={(text) => {
                setId(text);
                setIdError('');
                setIsIdChecked(false);
              }}
            />
            <TouchableOpacity style={styles.duplicateCheckButton} onPress={checkDuplicateId}>
              <Text style={styles.duplicateCheckText}>중복확인</Text>
            </TouchableOpacity>
          </View>
          {idError !== '' && <Text style={styles.errorText}>{idError}</Text>}

          {/* 비밀번호 영역 */}
          <Text style={styles.middleText}>비밀번호</Text>
          <TextInput 
            ref={passwordRef}
            style={[
              styles.input, 
              focusedField === 'password' && styles.focusedInput,
              passwordError ? styles.inputError : null
            ]} 
            placeholder="영문+숫자 포함 6자 이상" 
            placeholderTextColor="#ffffff80"
            secureTextEntry={true}
            autoCapitalize="none"
            textContentType="oneTimeCode" // iOS 강력한 암호 팝업 방지
            returnKeyType="next"
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => confirmRef.current?.focus()}
            value={password}
            onChangeText={validatePassword}
          />
          {passwordError !== '' && <Text style={styles.errorText}>{passwordError}</Text>}

          <Text style={styles.middleText}>비밀번호 재입력</Text>
          <TextInput 
            ref={confirmRef}
            style={[
              styles.input, 
              focusedField === 'confirm' && styles.focusedInput,
              passwordConfirmError ? styles.inputError : null
            ]} 
            placeholder="비밀번호를 다시 입력하세요" 
            placeholderTextColor="#ffffff80"
            secureTextEntry={true}
            autoCapitalize="none"
            textContentType="oneTimeCode" // iOS 강력한 암호 팝업 방지
            returnKeyType="next"
            onFocus={() => setFocusedField('confirm')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => nameRef.current?.focus()}
            value={passwordConfirm}
            onChangeText={validatePasswordConfirm}
          />
          {passwordConfirmError !== '' && <Text style={styles.errorText}>{passwordConfirmError}</Text>}
          
          <View style={styles.divider} />

          {/* 사용자 정보 영역 */}
          <Text style={styles.middleText}>이름</Text>
          <TextInput 
            ref={nameRef}
            style={[styles.input, focusedField === 'name' && styles.focusedInput]} 
            placeholder="이름을 입력하세요" 
            placeholderTextColor="#ffffff80"
            returnKeyType="next"
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => emailRef.current?.focus()}
            value={name}
            onChangeText={setName}
          />
          
          <Text style={styles.middleText}>이메일</Text>
          <TextInput 
            ref={emailRef}
            style={[
              styles.input, 
              focusedField === 'email' && styles.focusedInput,
              emailError ? styles.inputError : null
            ]} 
            placeholder="example@email.com" 
            placeholderTextColor="#ffffff80"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => phoneRef.current?.focus()}
            value={email}
            onChangeText={validateEmail}
          />
          {emailError !== '' && <Text style={styles.errorText}>{emailError}</Text>}
          
          <Text style={styles.middleText}>전화번호</Text>
          <TextInput 
            ref={phoneRef}
            style={[
              styles.input, 
              focusedField === 'phone' && styles.focusedInput,
              phoneError ? styles.inputError : null
            ]} 
            placeholder="010-0000-0000" 
            placeholderTextColor="#ffffff80"
            keyboardType="phone-pad"
            maxLength={13}
            returnKeyType="done"
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={handleNextStep}
            value={phone}
            onChangeText={formatPhone}
          />
          {phoneError !== '' && <Text style={styles.errorText}>{phoneError}</Text>}

          <TouchableOpacity 
            onPress={handleNextStep} 
            style={[styles.button, !isIdChecked && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>다음으로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  background: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    backgroundColor: '#212121',
    padding: 20,
    borderRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ffffff',
    textAlign: 'center',
  },
  middleText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 5,
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 15,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  focusedInput: {
    borderColor: '#A1BE44', // 현재 선택한 탭의 테두리색 (원래 포인트 컬러)
  },
  inputError: {
    borderColor: '#ff4d4d',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 10,
    marginBottom: 5,
    paddingRight: 5,
  },
  inputRowError: {
    borderColor: '#ff4d4d',
  },
  inputFlex: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    paddingHorizontal: 15,
  },
  duplicateCheckButton: {
    backgroundColor: '#A1BE44',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  duplicateCheckText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff4d4d', 
    fontSize: 12,
    marginLeft: 5,
    marginBottom: 5, 
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#A1BE44',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 30,
  },
  buttonDisabled: {
    backgroundColor: '#555555',
    opacity: 0.7,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SignupScreen;