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

const API_BASE_URL = 'http://10.0.2.2:8080/api/v1';

const SignupScreen = ({ navigation }: any) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'남' | '여' | null>(null);
  const [birth, setBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [idError, setIdError] = useState('');
  const [idSuccess, setIdSuccess] = useState(''); // ✅ 추가: 성공 메시지 상태
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [birthError, setBirthError] = useState('');

  const [isIdChecked, setIsIdChecked] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const birthRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

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

  const validatePasswordConfirm = (cf: string) => {
    setPasswordConfirm(cf);
    if (cf !== password) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    } else {
      setPasswordConfirmError('');
    }
  };

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) {
      setEmailError('이메일을 입력해주세요.');
    } else if (!emailRegex.test(text)) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
    } else {
      setEmailError('');
    }
  };

  const formatBirth = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;

    if (cleaned.length > 4 && cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    } else if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    
    setBirth(formatted);

    if (cleaned.length > 0 && cleaned.length < 8) {
      setBirthError('생년월일 8자리를 모두 입력해주세요.');
      return;
    }

    if (cleaned.length === 8) {
      const year = parseInt(cleaned.slice(0, 4), 10);
      const month = parseInt(cleaned.slice(4, 6), 10);
      const day = parseInt(cleaned.slice(6, 8), 10);

      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear) {
        setBirthError('유효한 연도를 입력해주세요.');
        return;
      }

      if (month < 1 || month > 12) {
        setBirthError('유효한 월(1~12)을 입력해주세요.');
        return;
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) {
        setBirthError(`유효한 일(1~${daysInMonth})을 입력해주세요.`);
        return;
      }

      setBirthError('');
    } else {
      if (cleaned.length === 0) {
        setBirthError('');
      }
    }
  };

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

  const checkDuplicateId = async () => {
    if (!id) {
      setIdError('아이디를 먼저 입력해주세요.');
      setIdSuccess('');
      return;
    }
    if (id.length < 4 || id.length > 15) {
      setIdError('아이디는 4~15자로 입력해주세요.');
      setIdSuccess('');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/check-id`, {
        params: { loginId: id }
      });
      const isDuplicate = response.data?.data?.isDuplicate ?? response.data?.isDuplicate;

      if (isDuplicate) {
        setIdError('이미 사용 중인 아이디입니다.');
        setIdSuccess(''); // ✅ 성공 메시지 초기화
        setIsIdChecked(false);
      } else {
        setIdError('');
        setIdSuccess('사용 가능한 아이디입니다.'); // ✅ Alert 대신 인라인 성공 메시지
        setIsIdChecked(true);
        passwordRef.current?.focus();
      }
    } catch (error: any) {
      Alert.alert('오류', '중복 확인 중 서버 오류가 발생했습니다.');
    }
  };

  const handleNextStep = () => {
    if (!isIdChecked) {
      Alert.alert('알림', '아이디 중복 확인을 해주세요.');
      return;
    }
    if (passwordError || !password || password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호 양식을 확인해주세요.');
      return;
    }
    
    if (!email || emailError) {
      Alert.alert('알림', '이메일을 올바르게 입력해주세요.');
      return;
    }

    if (birthError || birth.length !== 10) {
      Alert.alert('알림', '올바른 생년월일을 입력해주세요. (예: 1999-01-01)');
      return;
    }

    if (!name || !gender || phoneError || !phone) {
      Alert.alert('알림', '필수 정보를 모두 올바르게 입력해주세요.');
      return;
    }

    navigation.navigate('PersonalInfo', {
      accountData: {
        loginId: id,
        password: password,
        name: name,
        gender: gender,
        birthDate: birth,
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

          {/* 1. 아이디 */}
          <Text style={styles.middleText}>아이디</Text>
          <View style={[
            styles.inputRow, 
            focusedField === 'id' && styles.focusedInput,
            idError !== '' && styles.inputRowError,
            idSuccess !== '' && styles.inputRowSuccess // ✅ 성공 시 초록 테두리
          ]}>
            <TextInput 
              style={styles.inputFlex} 
              placeholder="4~15자로 입력하세요" 
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
                if (text.length > 0 && (text.length < 4 || text.length > 15)) {
                  setIdError('아이디는 4~15자로 입력해주세요.');
                } else {
                  setIdError('');
                }
                setIdSuccess(''); // ✅ 텍스트 변경 시 성공 메시지 초기화
                setIsIdChecked(false);
              }}
            />
            <TouchableOpacity style={styles.duplicateCheckButton} onPress={checkDuplicateId}>
              <Text style={styles.duplicateCheckText}>중복확인</Text>
            </TouchableOpacity>
          </View>
          {idError !== '' && <Text style={styles.errorText}>{idError}</Text>}
          {idSuccess !== '' && <Text style={styles.successText}>{idSuccess}</Text>}

          {/* 2. 비밀번호 */}
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
            textContentType="oneTimeCode"
            returnKeyType="next"
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => confirmRef.current?.focus()}
            value={password}
            onChangeText={validatePassword}
          />
          {passwordError !== '' && <Text style={styles.errorText}>{passwordError}</Text>}

          {/* 3. 비밀번호 재입력 */}
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
            textContentType="oneTimeCode"
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
            onSubmitEditing={() => birthRef.current?.focus()} 
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.middleText}>성별</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity 
              style={[styles.genderBtn, gender === '남' && styles.genderBtnActive]}
              onPress={() => setGender('남')}
            >
              <Text style={[styles.genderBtnText, gender === '남' && styles.genderBtnTextActive]}>남자</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.genderBtn, gender === '여' && styles.genderBtnActive]}
              onPress={() => setGender('여')}
            >
              <Text style={[styles.genderBtnText, gender === '여' && styles.genderBtnTextActive]}>여자</Text>
            </TouchableOpacity>
          </View>

          {/* 생년월일 */}
          <Text style={styles.middleText}>생년월일</Text>
          <TextInput 
            ref={birthRef}
            style={[
              styles.input, 
              focusedField === 'birth' && styles.focusedInput,
              birthError ? styles.inputError : null
            ]} 
            placeholder="YYYY-MM-DD (예: 1999-01-01)" 
            placeholderTextColor="#ffffff80"
            keyboardType="number-pad"
            maxLength={10}
            returnKeyType="next"
            onFocus={() => setFocusedField('birth')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => phoneRef.current?.focus()}
            value={birth}
            onChangeText={formatBirth}
          />
          {birthError !== '' && <Text style={styles.errorText}>{birthError}</Text>}
          
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
            returnKeyType="next"
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => emailRef.current?.focus()}
            value={phone}
            onChangeText={formatPhone}
          />
          {phoneError !== '' && <Text style={styles.errorText}>{phoneError}</Text>}

          {/* 이메일 */}
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
            returnKeyType="done"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={handleNextStep}
            value={email}
            onChangeText={validateEmail}
          />
          {emailError !== '' && <Text style={styles.errorText}>{emailError}</Text>}

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
  background: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A', paddingVertical: 50, paddingHorizontal: 20 },
  container: { width: '100%', backgroundColor: '#212121', padding: 20, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20, color: '#ffffff', textAlign: 'center' },
  middleText: { color: '#ffffff', fontSize: 14, alignSelf: 'flex-start', marginBottom: 8, marginLeft: 5, marginTop: 10 },
  
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#444444', color: '#ffffff', borderRadius: 10, paddingHorizontal: 15, marginBottom: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 50, borderWidth: 1, borderColor: '#444444', borderRadius: 10, marginBottom: 5, paddingRight: 5 },
  
  inputFlex: { flex: 1, height: '100%', color: '#ffffff', paddingHorizontal: 15 },
  duplicateCheckButton: { backgroundColor: '#A1BE44', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  duplicateCheckText: { color: '#000000', fontSize: 12, fontWeight: 'bold' },
  errorText: { color: '#ff4d4d', fontSize: 12, alignSelf: 'flex-start', marginLeft: 5, marginBottom: 10 },
  successText: { color: '#A1BE44', fontSize: 12, alignSelf: 'flex-start', marginLeft: 5, marginBottom: 10 }, // ✅ 추가
  divider: { height: 1, backgroundColor: '#333333', marginVertical: 15 },

  focusedInput: { borderColor: '#A1BE44' }, 
  inputError: { borderColor: '#ff4d4d' },    
  inputRowError: { borderColor: '#ff4d4d' }, 
  inputRowSuccess: { borderColor: '#A1BE44' }, // ✅ 추가
  
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  genderBtn: { flex: 1, backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#444444', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4 },
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#999999', fontSize: 16, fontWeight: 'bold' },
  genderBtnTextActive: { color: '#A1BE44' },

  button: { width: '100%', height: 55, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginTop: 30 },
  buttonDisabled: { backgroundColor: '#333333' },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default SignupScreen;