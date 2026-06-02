import { useState, useRef, useCallback } from 'react';
import { Keyboard, TextInput } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

export const useSignup = (navigation: any) => {
  // --- 입력 데이터 상태 관리 ---
  const [id, setId] = useState(''); // 아이디
  const [password, setPassword] = useState(''); // 비밀번호
  const [passwordConfirm, setPasswordConfirm] = useState(''); // 비밀번호 확인
  const [name, setName] = useState(''); // 이름
  const [gender, setGender] = useState<'남' | '여' | null>(null); // 성별
  const [birth, setBirth] = useState(''); // 생년월일
  const [email, setEmail] = useState(''); // 이메일
  const [phone, setPhone] = useState(''); // 전화번호

  // --- 유효성 및 에러/성공 메시지 상태 관리 ---
  const [idError, setIdError] = useState(''); // 아이디 에러 메시지
  const [idSuccess, setIdSuccess] = useState(''); // 아이디 성공 메시지
  const [isIdChecked, setIsIdChecked] = useState(false); // 아이디 중복 확인 여부

  const [passwordError, setPasswordError] = useState(''); // 비밀번호 에러 메시지
  const [passwordConfirmError, setPasswordConfirmError] = useState(''); // 비밀번호 일치 에러 메시지

  const [emailError, setEmailError] = useState(''); // 이메일 에러 메시지
  const [emailSuccess, setEmailSuccess] = useState(''); // 이메일 성공 메시지
  const [isEmailSent, setIsEmailSent] = useState(false); // 이메일 발송 여부
  const [isEmailVerified, setIsEmailVerified] = useState(false); // 이메일 인증 완료 여부
  const [emailCode, setEmailCode] = useState(''); // 이메일 인증코드 입력값
  const [emailCodeError, setEmailCodeError] = useState(''); // 인증코드 에러 메시지
  const [emailCodeSuccess, setEmailCodeSuccess] = useState(''); // 인증코드 성공 메시지
  const [isSendingEmail, setIsSendingEmail] = useState(false); // 이메일 발송 로딩 상태
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false); // 이메일 인증 로딩 상태

  const [phoneError, setPhoneError] = useState(''); // 전화번호 에러 메시지
  const [birthError, setBirthError] = useState(''); // 생년월일 에러 메시지

  // --- UI 제어 상태 ---
  const [focusedField, setFocusedField] = useState<string | null>(null); // 현재 포커스된 입력창
  const [isCheckingNext, setIsCheckingNext] = useState(false); // 다음 단계 진행 중 로딩 상태

  // --- Refs (입력창 간 자동 포커스 이동 용도) ---
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const birthRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const emailCodeRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // --- 알림 모달 상태 및 제어 함수 ---
  const [resultModalVisible, setResultModalVisible] = useState(false); // 모달 표시 여부
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'error', onConfirm: () => {} }); // 모달 설정값

  // 모달 띄우기
  const showResultModal = useCallback((title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss(); // 키보드 숨김
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  // 모달 닫기
  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  // --- 유효성 검사 및 데이터 포맷팅 함수 ---

  // 아이디 입력 및 정규식 검사
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

  // 비밀번호 입력 및 정규식 검사
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

    // 비밀번호 확인란과 실시간 비교
    if (passwordConfirm && pw !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    } else if (passwordConfirm && pw === passwordConfirm) {
      setPasswordConfirmError('');
    }
  };

  // 비밀번호 재입력(확인) 일치 검사
  const validatePasswordConfirm = (cf: string) => {
    setPasswordConfirm(cf);
    if (cf !== password) setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    else setPasswordConfirmError('');
  };

  // 이메일 입력 및 정규식 검사
  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) setEmailError('이메일을 입력해주세요.');
    else if (!emailRegex.test(text)) setEmailError('올바른 이메일 형식이 아닙니다.');
    else setEmailError('');

    // 이메일이 변경되면 기존 인증 상태 초기화
    setIsEmailSent(false);
    setIsEmailVerified(false);
    setEmailCode('');
    setEmailCodeError('');
    setEmailCodeSuccess('');
    setEmailSuccess('');
  };

  // 생년월일 자동 하이픈(-) 포맷팅 및 유효성 검사
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

  // 전화번호 자동 하이픈(-) 포맷팅
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

  // 아이디 중복 확인
  const checkDuplicateId = async () => {
    setFocusedField('id'); 
    if (!id) { setIdError('아이디를 먼저 입력해주세요.'); setIdSuccess(''); return; }
    if (idError) { showResultModal('알림', '아이디 형식을 확인해주세요.', 'info'); return; }

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/check-id`, { params: { loginId: id } });
      const isDuplicate = response.data.data.isDuplicate;

      if (isDuplicate) {
        setIdError('이미 사용 중인 아이디입니다.'); setIdSuccess(''); setIsIdChecked(false);
      } else {
        setIdError(''); setIdSuccess('사용 가능한 아이디입니다.'); setIsIdChecked(true);
      }
    } catch (error: any) {
      // 서버가 꺼져있거나 네트워크 연결 실패
      if (!error.response) {
        showResultModal('네트워크 오류', '서버와 통신할 수 없습니다.', 'error');
        return;
      }

      const status = error.response.status;
      // 백엔드에서 약속된 message를 안 보냈을 경우를 대비한 대체 텍스트
      const errorMessage = error.response.data?.message || '서버 오류가 발생했습니다.';

      if (status === 409 || status === 400) {
        setIdError(errorMessage); setIdSuccess(''); setIsIdChecked(false);
      } else {
        // 모달에 상태 코드까지 함께 출력
        showResultModal('오류', `에러코드: ${status}\n${errorMessage}`, 'error');
      }
    }
  };

  // 이메일 인증코드 발송
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
      const errorMessage = error.response.data.message;
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 이메일 인증코드 검증
  const verifyEmailCode = async () => {
    setFocusedField('emailCode');
    if (!emailCode) { setEmailCodeError('인증코드를 입력해주세요.'); return; }
    
    setIsVerifyingEmail(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/email/verify`, null, { params: { email, code: emailCode } });
      
      if (response.data.status === 200) {
        setEmailCodeError(''); setEmailCodeSuccess('이메일 인증이 완료되었습니다.'); setIsEmailVerified(true);
      } else {
        setEmailCodeError(response.data.message); setIsEmailVerified(false);
      }
    } catch (error: any) {
      setEmailCodeError(error.response.data.message); setIsEmailVerified(false);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // 폼 전체 유효성 검사 및 다음 단계(개인정보 입력 화면)로 데이터 전달
  const handleNextStep = async () => {
    if (isCheckingNext) return; // 중복 클릭 방지

    // 필수 항목 및 인증 상태 검증
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

    // 전화번호 중복 가입 여부 최종 확인
    try {
      const phoneRes = await axios.get(`${API_BASE_URL}/auth/check-phone`, { params: { phone } });
      const isPhoneDup = phoneRes.data.data.isDuplicate;

      if (isPhoneDup) {
        setPhoneError('이미 가입된 전화번호입니다.');
        showResultModal('가입 불가', '이미 가입된 전화번호입니다.\n번호를 다시 확인해주세요.', 'error');
        setIsCheckingNext(false);
        return;
      }
    } catch (error: any) {
      const errorMessage = error.response.data.message; 
      
      if (error.response.status === 409 || error.response.status === 400) {
        setPhoneError(errorMessage);
        showResultModal('가입 불가', errorMessage, 'error');
      } else {
        showResultModal('오류', errorMessage, 'error');
      }
      setIsCheckingNext(false);
      return; 
    }

    setIsCheckingNext(false);

    // 개인정보 화면으로 데이터 넘기며 화면 이동
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

  // View 컴포넌트에서 사용할 수 있도록 상태와 함수 내보내기
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