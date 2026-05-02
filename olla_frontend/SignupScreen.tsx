import React, { useState } from 'react';
import axios from 'axios';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';

const SignupScreen = ({ navigation }: any) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'남자' | '여자' | null>(null);
  const [birth, setBirth] = useState('');
  const [email, setEmail] = useState(''); // 선택 사항
  const [phone, setPhone] = useState('');

  const [idError, setIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [isIdChecked, setIsIdChecked] = useState(false);

  // 생년월일 자동 포맷터 (YYYY/MM/DD)
  const handleBirthChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    let formatted = numeric;
    if (numeric.length > 4 && numeric.length <= 6) {
      formatted = `${numeric.slice(0, 4)}/${numeric.slice(4)}`;
    } else if (numeric.length > 6) {
      formatted = `${numeric.slice(0, 4)}/${numeric.slice(4, 6)}/${numeric.slice(6, 8)}`;
    }
    setBirth(formatted);
  };

  // 전화번호 자동 하이픈 포맷터
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

  const checkDuplicateId = async () => {
    if (!id) { setIdError('아이디를 먼저 입력해주세요.'); return; }
    try {
      const response = await axios.get(`http://10.0.2.2:8080/api/v1/auth/check-id`, { params: { loginId: id } });
      const isDuplicate = response.data?.data?.isDuplicate ?? response.data?.isDuplicate;
      
      if (isDuplicate === undefined) { Alert.alert('오류', '데이터 형식이 맞지 않습니다.'); return; }
      if (isDuplicate) {
        setIdError('이미 사용 중인 아이디입니다.'); setIsIdChecked(false); Alert.alert('알림', '이미 사용 중인 아이디입니다.');
      } else {
        Alert.alert('확인', '사용 가능한 아이디입니다.'); setIdError(''); setIsIdChecked(true);
      }
    } catch (error: any) {
      console.error("중복확인 에러 상세:", error.response?.data);
      Alert.alert('오류', '서버 내부 오류가 발생했습니다.');
    }
  };

  // 💡 이메일을 제외한 필수 요소 확인
  const isFormValid = isIdChecked && password && password === passwordConfirm && name && gender && birth.length === 10 && phone.length >= 12;

  const handleSignup = async () => {
    if (!isFormValid) return;

    try {
      const response = await axios.post('http://10.0.2.2:8080/api/v1/auth/signup', {
        loginId: id,
        password: password,
        name: name,
        gender: gender,
        birth: birth,
        phone: phone, 
        email: email, // 빈 문자열이어도 전송
        role: 'USER'
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert('성공', '회원가입이 완료되었습니다!', [{ text: '확인', onPress: () => navigation.replace('Loading') }]);
      }
    } catch (error: any) {
      console.error("가입 에러 상세:", error.response?.data);
      const backendError = error.response?.data;
      let finalMessage = '입력 형식을 확인하세요.';
      if (typeof backendError === 'object' && backendError.message) finalMessage = backendError.message;
      else if (typeof backendError === 'string') finalMessage = backendError;
      Alert.alert('가입 실패', finalMessage);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.background}>
        <View style={styles.container}>
          <Text style={styles.title}>회원가입</Text>

          {/* 1. 아이디 */}
          <Text style={styles.middleText}>아이디</Text>
          <View style={styles.inputRow}>
            <TextInput style={styles.inputFlex} placeholder="아이디를 입력하세요" placeholderTextColor="#ffffff80" value={id} onChangeText={(text) => { setId(text); setIdError(''); setIsIdChecked(false); }} />
            <TouchableOpacity style={styles.duplicateCheckButton} onPress={checkDuplicateId}><Text style={styles.duplicateCheckText}>중복확인</Text></TouchableOpacity>
          </View>
          {idError !== '' && <Text style={styles.errorText}>{idError}</Text>}

          {/* 2. 비밀번호 */}
          <Text style={styles.middleText}>비밀번호</Text>
          <TextInput style={styles.input} placeholder="영문+숫자 포함 6자 이상" placeholderTextColor="#ffffff80" secureTextEntry={true} textContentType="oneTimeCode" autoComplete="off" value={password} onChangeText={(text) => { setPassword(text); setPasswordError(''); }} />
          {passwordError !== '' && <Text style={styles.errorText}>{passwordError}</Text>}

          {/* 3. 비밀번호 재입력 */}
          <Text style={styles.middleText}>비밀번호 재입력</Text>
          <TextInput style={styles.input} placeholder="비밀번호를 다시 입력하세요" placeholderTextColor="#ffffff80" secureTextEntry={true} textContentType="oneTimeCode" value={passwordConfirm} onChangeText={(text) => { setPasswordConfirm(text); setPasswordConfirmError(''); }} />
          {passwordConfirmError !== '' && <Text style={styles.errorText}>{passwordConfirmError}</Text>}
          
          <View style={styles.divider} />

          {/* 4. 이름 */}
          <Text style={styles.middleText}>이름</Text>
          <TextInput style={styles.input} placeholder="이름을 입력하세요" placeholderTextColor="#ffffff80" value={name} onChangeText={setName} />
          
          {/* 5. 성별 */}
          <Text style={styles.middleText}>성별</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity style={[styles.genderBtn, gender === '남자' && styles.genderBtnActive]} onPress={() => setGender('남자')} activeOpacity={0.8}>
              <Text style={[styles.genderBtnText, gender === '남자' && styles.genderBtnTextActive]}>남자</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderBtn, gender === '여자' && styles.genderBtnActive]} onPress={() => setGender('여자')} activeOpacity={0.8}>
              <Text style={[styles.genderBtnText, gender === '여자' && styles.genderBtnTextActive]}>여자</Text>
            </TouchableOpacity>
          </View>

          {/* 6. 생년월일 */}
          <Text style={styles.middleText}>생년월일</Text>
          <TextInput style={styles.input} placeholder="YYYY/MM/DD" placeholderTextColor="#ffffff80" value={birth} onChangeText={handleBirthChange} keyboardType="numeric" maxLength={10} />

          {/* 7. 이메일 (선택) */}
          <Text style={styles.middleText}>이메일 <Text style={styles.optionalText}>(선택)</Text></Text>
          <TextInput style={styles.input} placeholder="example@email.com" placeholderTextColor="#ffffff80" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(text) => { setEmail(text); setEmailError(''); }} />
          {emailError !== '' && <Text style={styles.errorText}>{emailError}</Text>}
          
          {/* 8. 전화번호 */}
          <Text style={styles.middleText}>전화번호</Text>
          <TextInput style={styles.input} placeholder="010-0000-0000" placeholderTextColor="#ffffff80" keyboardType="phone-pad" maxLength={13} value={phone} onChangeText={formatPhone} />
          {phoneError !== '' && <Text style={styles.errorText}>{phoneError}</Text>}

          <TouchableOpacity onPress={handleSignup} style={[styles.button, !isFormValid && styles.buttonDisabled]} disabled={!isFormValid}>
            <Text style={[styles.buttonText, !isFormValid && styles.buttonTextDisabled]}>다음으로</Text>
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
  optionalText: { color: '#999999', fontSize: 12, fontWeight: 'normal' },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#A1BE44', color: '#ffffff', borderRadius: 10, paddingHorizontal: 15, marginBottom: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 50, borderWidth: 1, borderColor: '#A1BE44', borderRadius: 10, marginBottom: 5, paddingRight: 5 },
  inputFlex: { flex: 1, height: '100%', color: '#ffffff', paddingHorizontal: 15 },
  duplicateCheckButton: { backgroundColor: '#A1BE44', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  duplicateCheckText: { color: '#000000', fontSize: 12, fontWeight: 'bold' },
  errorText: { color: '#ff4d4d', fontSize: 12, alignSelf: 'flex-start', marginLeft: 5, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#333333', marginVertical: 15 },
  
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  genderBtn: { flex: 1, backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#444444', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4 },
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#999999', fontSize: 16, fontWeight: 'bold' },
  genderBtnTextActive: { color: '#A1BE44' },

  button: { width: '100%', height: 55, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginTop: 30 },
  buttonDisabled: { backgroundColor: '#333333' },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  buttonTextDisabled: { color: '#666666' },
});

export default SignupScreen;