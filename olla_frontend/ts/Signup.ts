import { useState, useRef, useCallback } from 'react';
import { Keyboard, TextInput } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

export const useSignup = (navigation: any) => {
  // --- 입력 데이터 상태 ---
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'남' | '여' | null>(null);
  const [birth, setBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // --- 유효성 및 에러/성공 메시지 상태 ---
  const [idError, setIdError] = useState('');
  const [idSuccess, setIdSuccess] = useState('');
  const [isIdChecked, setIsIdChecked] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');

  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeError, setEmailCodeError] = useState('');
  const [emailCodeSuccess, setEmailCodeSuccess] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const [phoneError, setPhoneError] = useState('');
  const [birthError, setBirthError] = useState('');

  // --- UI 제어 상태 ---
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isCheckingNext, setIsCheckingNext] = useState(false);

  // --- Refs (Next 포커스 용도) ---
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const birthRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const emailCodeRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // --- 알림 모달 상태 ---
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'error', onConfirm: () => {} });

  const showResultModal = useCallback((title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  // --- 유효성 검사 및 포맷팅 ---
  const handleIdChange = (text: string) => {
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
  };

  const validatePassword = (pw: string) => {
    setPassword(pw);
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
    if (cf !== password) setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    else setPasswordConfirmError('');
  };

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) setEmailError('이메일을 입력해주세요.');
    else if (!emailRegex.test(text)) setEmailError('올바른 이메일 형식이 아닙니다.');
    else setEmailError('');

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
    if (cleaned.length > 4 && cleaned.length <= 6) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    else if (cleaned.length > 6) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    
    setBirth(formatted);
    if (cleaned.length > 0 && cleaned.length < 8) { setBirthError('생년월일 8자리를 모두 입력해주세요.'); return; }
    
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
    if (cleaned.length > 3 && cleaned.length <= 7) formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    else if (cleaned.length > 7) formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    
    setPhone(formatted);
    if (cleaned.length > 0 && cleaned.length < 10) setPhoneError('전화번호를 정확히 입력해주세요.');
    else setPhoneError('');
  };

  // --- API 호출 함수 ---
  const checkDuplicateId = async () => {
    setFocusedField('id'); 
    if (!id) { setIdError('아이디를 먼저 입력해주세요.'); setIdSuccess(''); return; }
    if (idError) { showResultModal('알림', '아이디 형식을 확인해주세요.', 'info'); return; }

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/check-id`, { params: { loginId: id } });
      const isDuplicate = response.data?.data?.data?.isDuplicate ?? response.data?.data?.isDuplicate;

      if (isDuplicate) {
        setIdError('이미 사용 중인 아이디입니다.'); setIdSuccess(''); setIsIdChecked(false);
      } else {
        setIdError(''); setIdSuccess('사용 가능한 아이디입니다.'); setIsIdChecked(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '중복 확인 중 서버 오류가 발생했습니다.';
      if (error.response?.status === 409 || error.response?.status === 400) {
        setIdError(errorMessage); setIdSuccess(''); setIsIdChecked(false);
      } else {
        showResultModal('오류', errorMessage, 'error');
      }
    }
  };

  const sendEmailVerification = async () => {
    setFocusedField('email');
    if (!email || emailError) { showResultModal('알림', '이메일을 올바르게 입력해주세요.', 'info'); return; }
    
    setIsSendingEmail(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/email/request`, null, { params: { email } });
      setIsEmailSent(true);
      setEmailSuccess('인증코드가 발송되었습니다.');
      setEmailCodeError(''); setEmailCodeSuccess(''); setEmailCode('');
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
    if (!emailCode) { setEmailCodeError('인증코드를 입력해주세요.'); return; }
    
    setIsVerifyingEmail(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/email/verify`, null, { params: { email, code: emailCode } });
      if (response.data?.status === 200) {
        setEmailCodeError(''); setEmailCodeSuccess('이메일 인증이 완료되었습니다.'); setIsEmailVerified(true);
      } else {
        setEmailCodeError(response.data?.message || '인증코드가 올바르지 않습니다.'); setIsEmailVerified(false);
      }
    } catch (error: any) {
      setEmailCodeError(error.response?.data?.message || '인증코드가 올바르지 않습니다.'); setIsEmailVerified(false);
    } finally {
      setIsVerifyingEmail(false);
    }
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
      const isPhoneDup = phoneRes.data?.data?.data?.isDuplicate ?? phoneRes.data?.data?.isDuplicate;

      if (isPhoneDup) {
        setPhoneError('이미 가입된 전화번호입니다.');
        showResultModal('가입 불가', '이미 가입된 전화번호입니다.\n번호를 다시 확인해주세요.', 'error');
        setIsCheckingNext(false);
        return;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.data?.message || error.response?.data?.message || '전화번호 검증 중 오류가 발생했습니다.';
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

    // 개인정보 입력 화면으로 필수 정보 넘기기
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

  return {
    id, handleIdChange, idError, idSuccess, isIdChecked, checkDuplicateId,
    password, validatePassword, passwordError,
    passwordConfirm, validatePasswordConfirm, passwordConfirmError,
    name, setName,
    gender, setGender,
    birth, formatBirth, birthError,
    phone, formatPhone, phoneError,
    email, validateEmail, emailError, emailSuccess, isEmailSent, isEmailVerified, sendEmailVerification, isSendingEmail,
    emailCode, setEmailCode, emailCodeError, setEmailCodeError, setEmailCodeSuccess, emailCodeSuccess, verifyEmailCode, isVerifyingEmail,
    
    focusedField, setFocusedField, isCheckingNext, handleNextStep,
    passwordRef, confirmRef, nameRef, birthRef, emailRef, emailCodeRef, phoneRef,
    
    resultModalVisible, resultModalConfig, closeResultModal, showResultModal
  };
};