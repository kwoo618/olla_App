import React, { useState } from 'react';
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
  Platform
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

  // 🔐 비밀번호 유효성 검증 함수 (영문, 숫자 포함 6자 이상)
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

    // 비밀번호가 바뀔 때 재입력 칸과 다시 비교
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
      const response = await axios.get(`http://172.29.151.129:8080/api/v1/auth/check-id`, {
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
      }
    } catch (error: any) {
      console.error("중복확인 에러:", error.response?.data);
      Alert.alert('오류', '중복 확인 중 서버 오류가 발생했습니다.');
    }
  };

  // 🚀 회원가입 최종 제출
  const handleSignup = async () => {
    // 최종 방어 로직
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

    try {
      const response = await axios.post('http://172.29.151.129:8080/api/v1/auth/signup', {
        loginId: id,
        password: password,
        name: name,
        phone: phone, 
        email: email,
        role: 'USER'
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert('성공', '회원가입이 완료되었습니다!', [
          { text: '확인', onPress: () => navigation.replace('Loading') }
        ]);
      }
    } catch (error: any) {
      const backendError = error.response?.data;
      const finalMessage = backendError?.message || '가입 처리 중 오류가 발생했습니다.';
      Alert.alert('가입 실패', finalMessage);
    }
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
          <View style={styles.inputRow}>
            <TextInput 
              style={styles.inputFlex} 
              placeholder="아이디를 입력하세요" 
              placeholderTextColor="#ffffff80"
              value={id}
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
            style={[styles.input, passwordError ? styles.inputError : null]} 
            placeholder="영문+숫자 포함 6자 이상" 
            placeholderTextColor="#ffffff80"
            secureTextEntry={true}
            textContentType="oneTimeCode"
            autoComplete="off"
            value={password}
            onChangeText={validatePassword}
          />
          {passwordError !== '' && <Text style={styles.errorText}>{passwordError}</Text>}

          <Text style={styles.middleText}>비밀번호 재입력</Text>
          <TextInput 
            style={[styles.input, passwordConfirmError ? styles.inputError : null]} 
            placeholder="비밀번호를 다시 입력하세요" 
            placeholderTextColor="#ffffff80"
            secureTextEntry={true}
            textContentType="oneTimeCode"
            value={passwordConfirm}
            onChangeText={validatePasswordConfirm}
          />
          {passwordConfirmError !== '' && <Text style={styles.errorText}>{passwordConfirmError}</Text>}
          
          {/* 사용자 정보 영역 */}
          <Text style={styles.middleText}>이름</Text>
          <TextInput 
            style={styles.input} 
            placeholder="이름을 입력하세요" 
            placeholderTextColor="#ffffff80"
            value={name}
            onChangeText={setName}
          />
          
          <Text style={styles.middleText}>이메일</Text>
          <TextInput 
            style={[styles.input, emailError ? styles.inputError : null]} 
            placeholder="example@email.com" 
            placeholderTextColor="#ffffff80"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={validateEmail}
          />
          {emailError !== '' && <Text style={styles.errorText}>{emailError}</Text>}
          
          <Text style={styles.middleText}>전화번호</Text>
          <TextInput 
            style={[styles.input, phoneError ? styles.inputError : null]} 
            placeholder="010-0000-0000" 
            placeholderTextColor="#ffffff80"
            keyboardType="phone-pad"
            maxLength={13}
            value={phone}
            onChangeText={formatPhone}
          />
          {phoneError !== '' && <Text style={styles.errorText}>{phoneError}</Text>}

          <TouchableOpacity onPress={handleSignup} style={styles.button}>
            <Text style={styles.buttonText}>가입 완료</Text>
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
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#A1BE44',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  inputError: {
    borderColor: '#ff4d4d', // 에러 발생 시 테두리 색상 변경
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#A1BE44',
    borderRadius: 10,
    marginBottom: 5,
    paddingRight: 5,
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
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SignupScreen;