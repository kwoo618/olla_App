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
    if (formatted.length >= 12) setPhoneError('');
  };

  // 🔍 아이디 중복 확인 연동 (백엔드 GetMapping("/check-id") 연결)
const checkDuplicateId = async () => {
  if (!id) {
    setIdError('아이디를 먼저 입력해주세요.');
    return;
  }
  try {
    const response = await axios.get(`http://172.29.151.129:8080/api/v1/auth/check-id`, {
      params: { loginId: id }
    });

    console.log("서버 전체 응답:", response.data);

    // 💡 백엔드 공통 규격(ApiResponse)을 사용할 경우 데이터는 response.data.data에 들어있습니다.
    const isDuplicate = response.data?.data?.isDuplicate ?? response.data?.isDuplicate;

    if (isDuplicate === undefined) {
      // 만약 여전히 undefined라면 데이터 구조 자체가 예상과 다른 것입니다.
      Alert.alert('오류', '데이터 형식이 맞지 않습니다. 콘솔을 확인하세요.');
      return;
    }

    if (isDuplicate) {
        setIdError('이미 사용 중인 아이디입니다.');
        setIsIdChecked(false);
        Alert.alert('알림', '이미 사용 중인 아이디입니다.');
      } else {
        Alert.alert('확인', '사용 가능한 아이디입니다.');
        setIdError('');
        setIsIdChecked(true);
      }
    } catch (error: any) {
      // 💡 500 에러가 나면 콘솔에 상세 내용을 찍어 원인을 파악합니다.
      console.error("중복확인 에러 상세:", error.response?.data);
      Alert.alert('오류', '서버 내부 오류가 발생했습니다. 백엔드 로그를 확인하세요.');
    }
  };

  // 🚀 회원가입 최종 제출
  const handleSignup = async () => {
    // 필수 유효성 검사
    if (!isIdChecked) {
      Alert.alert('알림', '아이디 중복 확인을 해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!name || !email || !phone) {
      Alert.alert('알림', '모든 정보를 입력해주세요.');
      return;
    }

    try {
      const response = await axios.post('http://192.168.0.8:8080/api/v1/auth/signup', {
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
      console.error("가입 에러 상세:", error.response?.data);

      // 백엔드에서 @Valid 에러가 나면 보통 error.response.data에 에러 목록이 담깁니다.
      const backendError = error.response?.data;
      
      let finalMessage = '입력 형식을 확인하세요.';

      if (typeof backendError === 'object' && backendError.message) {
        // 백엔드 공통 응답 규격이 있는 경우
        finalMessage = backendError.message;
      } else if (typeof backendError === 'string') {
        // 문자열로 에러가 오는 경우
        finalMessage = backendError;
      }

      Alert.alert('가입 실패', finalMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.background}>
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
            style={styles.input} 
            placeholder="영문+숫자 포함 6자 이상" 
            placeholderTextColor="#ffffff80"
            secureTextEntry={true}
            textContentType="oneTimeCode" // iOS 자동 암호 제안 방지
            autoComplete="off"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError('');
            }}
          />
          {passwordError !== '' && <Text style={styles.errorText}>{passwordError}</Text>}

          <Text style={styles.middleText}>비밀번호 재입력</Text>
          <TextInput 
            style={styles.input} 
            placeholder="비밀번호를 다시 입력하세요" 
            placeholderTextColor="#ffffff80"
            secureTextEntry={true}
            textContentType="oneTimeCode" // iOS 자동 암호 제안 방지
            value={passwordConfirm}
            onChangeText={(text) => {
              setPasswordConfirm(text);
              setPasswordConfirmError('');
            }}
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
            style={styles.input} 
            placeholder="example@email.com" 
            placeholderTextColor="#ffffff80"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
          />
          {emailError !== '' && <Text style={styles.errorText}>{emailError}</Text>}
          
          <Text style={styles.middleText}>전화번호</Text>
          <TextInput 
            style={styles.input} 
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
    alignSelf: 'flex-start',
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
    alignSelf: 'flex-start',
    marginLeft: 5,
    marginBottom: 10, 
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