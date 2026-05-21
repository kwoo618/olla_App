import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { API_BASE_URL } from '../src/constants/Config';

const SignupScreen = ({ navigation }: any) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'남' | '여' | null>(null);
  const [birth, setBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // 아이디
  const [idError, setIdError] = useState('');
  const [idSuccess, setIdSuccess] = useState('');
  const [isIdChecked, setIsIdChecked] = useState(false);

  // 비밀번호
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');

  // 이메일
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeError, setEmailCodeError] = useState('');
  const [emailCodeSuccess, setEmailCodeSuccess] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  // 전화번호
  const [phoneError, setPhoneError] = useState('');

  // 생년월일
  const [birthError, setBirthError] = useState('');

  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // 다음 단계 진행 로딩 상태
  const [isCheckingNext, setIsCheckingNext] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const birthRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const emailCodeRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // ─── 커스텀 알림 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // ─── 유효성 검사 ───────────────────────────────────────

  const validatePassword = (pw: string) => {
    setPassword(pw);
    // 영문, 숫자, 특수문자 무조건 1개 이상 포함 및 공백 없는 6자리 이상
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{6,}$/;
    if (!pw) {
      setPasswordError('비밀번호를 입력해주세요.');
    } else if (!passwordRegex.test(pw)) {
      setPasswordError('영문, 숫자, 특수문자 포함 6자 이상이어야 합니다.');
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
    setIsEmailSent(false);
    setIsEmailVerified(false);
    setEmailCode('');
    setEmailCodeError('');
    setEmailCodeSuccess('');
    setEmailSuccess('');
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
      if (year < 1900 || year > currentYear) { setBirthError('유효한 연도를 입력해주세요.'); return; }
      if (month < 1 || month > 12) { setBirthError('유효한 월(1~12)을 입력해주세요.'); return; }
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) { setBirthError(`유효한 일(1~${daysInMonth})을 입력해주세요.`); return; }
      setBirthError('');
    } else {
      if (cleaned.length === 0) setBirthError('');
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
    if (cleaned.length > 0 && cleaned.length < 10) {
      setPhoneError('전화번호를 정확히 입력해주세요.');
    } else {
      setPhoneError('');
    }
  };

  // ─── API 호출 ───────────────────────────────────────────

  const checkDuplicateId = async () => {
    setFocusedField('id'); 

    if (!id) { 
      setIdError('아이디를 먼저 입력해주세요.'); 
      setIdSuccess(''); 
      return; 
    }
    if (idError) {
      showResultModal('알림', '아이디 형식을 확인해주세요.', 'info');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/check-id`, { params: { loginId: id } });
      
      const isDuplicate = response.data?.data?.data?.isDuplicate;

      if (isDuplicate) {
        setIdError('이미 사용 중인 아이디입니다.');
        setIdSuccess('');
        setIsIdChecked(false);
      } else {
        setIdError('');
        setIdSuccess('사용 가능한 아이디입니다.');
        setIsIdChecked(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '중복 확인 중 서버 오류가 발생했습니다.';
      
      if (error.response?.status === 409 || error.response?.status === 400) {
        setIdError(errorMessage);
        setIdSuccess('');
        setIsIdChecked(false);
      } else {
        showResultModal('오류', errorMessage, 'error');
      }
    }
  };

  const sendEmailVerification = async () => {
    setFocusedField('email');

    if (!email || emailError) {
      showResultModal('알림', '이메일을 올바르게 입력해주세요.', 'info');
      return;
    }

    setIsSendingEmail(true);

    try {
      // 발송 요청
      await axios.post(`${API_BASE_URL}/auth/email/request`, null, { params: { email } });
      setIsEmailSent(true);
      setEmailSuccess('인증코드가 발송되었습니다.');
      setEmailCodeError('');
      setEmailCodeSuccess('');
      setEmailCode('');
      setTimeout(() => setFocusedField('emailCode'), 300);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '이메일 발송 중 서버 오류가 발생했습니다.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const verifyEmailCode = async () => {
    setFocusedField('emailCode');

    if (!emailCode) {
      setEmailCodeError('인증코드를 입력해주세요.');
      return;
    }
    setIsVerifyingEmail(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/email/verify`, null, { params: { email, code: emailCode } });
      
      // ApiResponse 구조 적용 (status: 200 이면 성공)
      if (response.data?.status === 200) {
        setEmailCodeError('');
        setEmailCodeSuccess('이메일 인증이 완료되었습니다.');
        setIsEmailVerified(true);
      } else {
        setEmailCodeError(response.data?.message || '인증코드가 올바르지 않습니다.');
        setIsEmailVerified(false);
      }
    } catch (error: any) {
      // ✅ 3. 예외 처리 반영: 백엔드 메시지 노출
      setEmailCodeError(error.response?.data?.message || '인증코드가 올바르지 않습니다.');
      setIsEmailVerified(false);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // ─── 다음으로 (중복 최종 검증 로직) ─────────────────────────

  const handleEmailDuplicate = (message: string = '이미 가입된 이메일입니다.') => {
    setEmailError(message);
    setIsEmailVerified(false);
    setIsEmailSent(false);
    setEmailCode('');
    setEmailCodeSuccess('');
    setEmailSuccess('');
    showResultModal('가입 불가', `${message}\n다른 이메일로 다시 입력 후 인증해주세요.`, 'error');
  };

  const handleNextStep = async () => {
    if (isCheckingNext) return;

    if (!isIdChecked) { showResultModal('알림', '아이디 중복 확인을 해주세요.', 'info'); return; }
    if (!password || passwordError) { showResultModal('알림', '비밀번호를 올바르게 입력해주세요.', 'info'); return; }
    if (password !== passwordConfirm || passwordConfirmError) { showResultModal('알림', '비밀번호가 일치하지 않습니다.', 'info'); return; }
    if (!name.trim()) { showResultModal('알림', '이름을 입력해주세요.', 'info'); return; }
    if (!gender) { showResultModal('알림', '성별을 선택해주세요.', 'info'); return; }
    if (birthError || birth.length !== 10) { showResultModal('알림', '올바른 생년월일을 입력해주세요. (예: 1999-01-01)', 'info'); return; }
    if (!phone || phoneError) { showResultModal('알림', '전화번호를 올바르게 입력해주세요.', 'info'); return; }
    if (!email || emailError) { showResultModal('알림', '이메일을 올바르게 입력해주세요.', 'info'); return; }
    if (!isEmailVerified) { showResultModal('알림', '이메일 인증을 완료해주세요.', 'info'); return; }

    setIsCheckingNext(true);

    try {
      const phoneRes = await axios.get(`${API_BASE_URL}/auth/check-phone`, { params: { phone } });
      
      // ✅ 1. Depth 1단계 추가 반영
      const isPhoneDup = phoneRes.data?.data?.data?.isDuplicate;

      if (isPhoneDup) {
        setPhoneError('이미 가입된 전화번호입니다.');
        showResultModal('가입 불가', '이미 가입된 전화번호입니다.\n번호를 다시 확인해주세요.', 'error');
        setIsCheckingNext(false);
        return;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.data?.message || '전화번호 검증 중 통신 오류가 발생했습니다.';
      if (error.response?.status === 409 || error.response?.status === 400) {
        setPhoneError(errorMessage);
        showResultModal('가입 불가', errorMessage, 'error');
      } else {
        showResultModal('오류', errorMessage, 'error');
      }
      setIsCheckingNext(false);
      return; 
    }

    setIsCheckingNext(false);

    navigation.navigate('PersonalInfo', {
      accountData: {
        loginId: id,
        password,
        name,
        gender,
        birthDate: birth,
        phone,
        email,
        role: 'USER',
      }
    });
  };

  // ─── 렌더링 ─────────────────────────────────────────────

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#1A1A1A' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.background} 
        keyboardShouldPersistTaps="handled" // 빈 공간 터치시 키보드 자동 해제
        bounces={false}
      >
        <View style={styles.container}>
          <Text style={styles.title}>회원가입</Text>

          {/* 아이디 */}
          <Text style={styles.middleText}>아이디</Text>
          <View style={[
            styles.inputRow,
            focusedField === 'id' && styles.focusedInput, 
            idError !== '' && styles.inputRowError,
          ]}>
            <TextInput
              style={styles.inputFlex}
              placeholder="영문+숫자 4~15자"
              placeholderTextColor="#ffffff80"
              value={id}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="next"
              onFocus={() => setFocusedField('id')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => {
                setId(text);
                setIdSuccess('');
                setIsIdChecked(false);

                const idRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]+$/;

                if (text.length === 0) {
                  setIdError('');
                } else if (text.length < 4 || text.length > 15) {
                  setIdError('아이디는 4~15자로 입력해주세요.');
                } else if (!idRegex.test(text)) {
                  setIdError('영문+숫자 조합으로 입력해주세요.');
                } else {
                  setIdError('');
                }
              }}
            />
            <TouchableOpacity style={styles.checkButton} onPress={checkDuplicateId}>
              <Text style={styles.checkButtonText}>중복확인</Text>
            </TouchableOpacity>
          </View>
          {idError !== '' && <Text style={styles.errorText}>{idError}</Text>}
          {idSuccess !== '' && focusedField === 'id' && <Text style={styles.successText}>{idSuccess}</Text>}

          {/* 비밀번호 */}
          <Text style={styles.middleText}>비밀번호</Text>
          <TextInput
            ref={passwordRef}
            style={[styles.input, focusedField === 'password' && styles.focusedInput, passwordError ? styles.inputError : null]}
            placeholder="영문, 숫자, 특수문자 포함 6자 이상"
            placeholderTextColor="#ffffff80"
            secureTextEntry
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

          {/* 비밀번호 재입력 */}
          <Text style={styles.middleText}>비밀번호 재입력</Text>
          <TextInput
            ref={confirmRef}
            style={[styles.input, focusedField === 'confirm' && styles.focusedInput, passwordConfirmError ? styles.inputError : null]}
            placeholder="비밀번호를 다시 입력하세요"
            placeholderTextColor="#ffffff80"
            secureTextEntry
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

          {/* 이름 */}
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

          {/* 성별 */}
          <Text style={styles.middleText}>성별</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity style={[styles.genderBtn, gender === '남' && styles.genderBtnActive]} onPress={() => setGender('남')}>
              <Text style={[styles.genderBtnText, gender === '남' && styles.genderBtnTextActive]}>남자</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderBtn, gender === '여' && styles.genderBtnActive]} onPress={() => setGender('여')}>
              <Text style={[styles.genderBtnText, gender === '여' && styles.genderBtnTextActive]}>여자</Text>
            </TouchableOpacity>
          </View>

          {/* 생년월일 */}
          <Text style={styles.middleText}>생년월일</Text>
          <TextInput
            ref={birthRef}
            style={[styles.input, focusedField === 'birth' && styles.focusedInput, birthError ? styles.inputError : null]}
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

          {/* 전화번호 */}
          <Text style={styles.middleText}>전화번호</Text>
          <TextInput
            ref={phoneRef}
            style={[
              styles.input,
              focusedField === 'phone' && styles.focusedInput,
              phoneError !== '' ? styles.inputError : null,
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
          <View style={[
            styles.inputRow,
            focusedField === 'email' && styles.focusedInput,
            emailError !== '' && styles.inputRowError,
          ]}>
            <TextInput
              ref={emailRef}
              style={[styles.inputFlex, (isSendingEmail || isEmailSent || isEmailVerified) && { color: '#999999' }]}
              placeholder="example@email.com"
              placeholderTextColor="#ffffff80"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onSubmitEditing={sendEmailVerification}
              value={email}
              onChangeText={validateEmail}
              editable={!(isSendingEmail || isEmailSent || isEmailVerified)}
            />
            <TouchableOpacity
              style={[styles.checkButton, (isSendingEmail || isEmailVerified) && styles.checkButtonDisabled]}
              onPress={sendEmailVerification}
              disabled={isSendingEmail || isEmailVerified}
            >
              <Text style={styles.checkButtonText}>
                {isEmailVerified ? '인증완료' : isSendingEmail ? '발송중' : isEmailSent ? '재발송' : '인증발송'}
              </Text>
            </TouchableOpacity>
          </View>
          {emailError !== '' && <Text style={styles.errorText}>{emailError}</Text>}
          {emailSuccess !== '' && !isEmailVerified && focusedField === 'email' && <Text style={styles.successText}>{emailSuccess}</Text>}
          
          {isEmailVerified && focusedField === 'email' && <Text style={styles.successText}>✓ 이메일 인증 완료</Text>}

          {/* 이메일 인증코드 입력 */}
          {isEmailSent && !isEmailVerified && (
            <>
              <Text style={styles.middleText}>인증코드</Text>
              <View style={[
                styles.inputRow,
                focusedField === 'emailCode' && styles.focusedInput,
                emailCodeError !== '' && styles.inputRowError,
              ]}>
                <TextInput
                  ref={emailCodeRef}
                  style={styles.inputFlex}
                  placeholder="인증코드 6자리 입력"
                  placeholderTextColor="#ffffff80"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onFocus={() => setFocusedField('emailCode')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={verifyEmailCode}
                  value={emailCode}
                  onChangeText={(text) => {
                    setEmailCode(text);
                    setEmailCodeError('');
                    setEmailCodeSuccess('');
                  }}
                />
                <TouchableOpacity
                  style={[styles.checkButton, isVerifyingEmail && styles.checkButtonDisabled]}
                  onPress={verifyEmailCode}
                  disabled={isVerifyingEmail}
                >
                  <Text style={styles.checkButtonText}>{isVerifyingEmail ? '확인중' : '인증확인'}</Text>
                </TouchableOpacity>
              </View>
              {emailCodeError !== '' && <Text style={styles.errorText}>{emailCodeError}</Text>}
              {emailCodeSuccess !== '' && focusedField === 'emailCode' && <Text style={styles.successText}>{emailCodeSuccess}</Text>}
            </>
          )}

          <TouchableOpacity
            onPress={handleNextStep}
            disabled={isCheckingNext}
            style={[styles.button, (!isIdChecked || !isEmailVerified || isCheckingNext) && styles.buttonDisabled]}
          >
            {isCheckingNext ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text style={styles.buttonText}>다음으로</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 커스텀 알림 결과 모달 */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => {
              setResultModalVisible(false);
              if (typeof resultModalConfig.onConfirm === 'function') {
                resultModalConfig.onConfirm();
              }
            }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  background: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A', paddingVertical: 50, paddingHorizontal: 20 },
  container: { width: '100%', backgroundColor: '#212121', padding: 24, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }, 
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 25, color: '#ffffff', textAlign: 'center' }, 
  middleText: { color: '#ffffff', fontSize: 16, alignSelf: 'flex-start', marginBottom: 8, marginLeft: 5, marginTop: 10 }, 

  input: { width: '100%', height: 60, borderWidth: 1, borderColor: '#444444', color: '#ffffff', fontSize: 18, borderRadius: 12, paddingHorizontal: 15, marginBottom: 5 }, 
  inputRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 60, borderWidth: 1, borderColor: '#444444', borderRadius: 12, marginBottom: 5, paddingRight: 5 }, 
  inputFlex: { flex: 1, height: '100%', color: '#ffffff', fontSize: 18, paddingHorizontal: 15 }, 

  checkButton: { backgroundColor: '#A1BE44', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 }, 
  checkButtonDisabled: { backgroundColor: '#555555' },
  checkButtonText: { color: '#000000', fontSize: 15, fontWeight: 'bold' }, 

  errorText: { color: '#ff4d4d', fontSize: 14, alignSelf: 'flex-start', marginLeft: 5, marginBottom: 10 }, 
  successText: { color: '#A1BE44', fontSize: 14, alignSelf: 'flex-start', marginLeft: 5, marginBottom: 10 }, 
  divider: { height: 1, backgroundColor: '#333333', marginVertical: 15 },

  focusedInput: { borderColor: '#A1BE44' },
  inputError: { borderColor: '#ff4d4d' },
  inputRowError: { borderColor: '#ff4d4d' },

  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  genderBtn: { flex: 1, backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#444444', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginHorizontal: 4 }, 
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#999999', fontSize: 18, fontWeight: 'bold' }, 
  genderBtnTextActive: { color: '#A1BE44' },

  button: { width: '100%', height: 60, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginTop: 30 }, 
  buttonDisabled: { backgroundColor: '#333333' },
  buttonText: { color: '#000000', fontSize: 20, fontWeight: 'bold' }, 

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, 
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, 
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, 
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 
});

export default SignupScreen;