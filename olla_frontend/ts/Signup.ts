// ============================================================
// useSignup.ts
// 회원가입 첫 번째 단계(계정 정보 입력) 화면에서 사용하는 커스텀 훅
// - 아이디 / 비밀번호 / 이름 / 성별 / 생년월일 / 이메일 / 전화번호 입력 상태 관리
// - 각 필드별 실시간 유효성 검사 및 에러/성공 메시지 처리
// - 아이디 중복 확인 API 호출
// - 이메일 인증코드 발송 및 검증 API 호출
// - 다음 단계(신체 정보 입력 화면)로 데이터 전달 전 전화번호 중복 확인
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { Keyboard, TextInput } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

export const useSignup = (navigation: any) => {
  // ── 입력 데이터 상태 ──
  const [id, setId]                       = useState(''); // 로그인 아이디
  const [password, setPassword]           = useState(''); // 비밀번호
  const [passwordConfirm, setPasswordConfirm] = useState(''); // 비밀번호 확인
  const [name, setName]                   = useState(''); // 이름
  const [gender, setGender]               = useState<'남' | '여' | null>(null); // 성별 (null = 미선택)
  const [birth, setBirth]                 = useState(''); // 생년월일 (포맷: YYYY-MM-DD)
  const [email, setEmail]                 = useState(''); // 이메일
  const [phone, setPhone]                 = useState(''); // 전화번호 (포맷: 010-XXXX-XXXX)

  // ── 아이디 유효성 / 중복 확인 상태 ──
  const [idError, setIdError]         = useState(''); // 아이디 에러 메시지 (형식 오류 또는 중복)
  const [idSuccess, setIdSuccess]     = useState(''); // 아이디 성공 메시지 (사용 가능)
  const [isIdChecked, setIsIdChecked] = useState(false); // 중복 확인 완료 여부 (다음 단계 진행 조건)

  // ── 비밀번호 유효성 상태 ──
  const [passwordError, setPasswordError]           = useState(''); // 비밀번호 형식 에러
  const [passwordConfirmError, setPasswordConfirmError] = useState(''); // 비밀번호 불일치 에러

  // ── 이메일 인증 관련 상태 ──
  const [emailError, setEmailError]         = useState(''); // 이메일 형식 에러
  const [emailSuccess, setEmailSuccess]     = useState(''); // 인증코드 발송 성공 메시지
  const [isEmailSent, setIsEmailSent]       = useState(false); // 인증코드 발송 완료 여부 (코드 입력 필드 표시 조건)
  const [isEmailVerified, setIsEmailVerified] = useState(false); // 이메일 인증 완료 여부 (다음 단계 진행 조건)
  const [emailCode, setEmailCode]           = useState(''); // 사용자가 입력한 인증코드
  const [emailCodeError, setEmailCodeError]   = useState(''); // 인증코드 불일치/오류 메시지
  const [emailCodeSuccess, setEmailCodeSuccess] = useState(''); // 인증코드 일치 성공 메시지
  const [isSendingEmail, setIsSendingEmail]   = useState(false); // 인증코드 발송 중 로딩 (버튼 중복 클릭 방지)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false); // 인증코드 검증 중 로딩

  // ── 기타 필드 유효성 상태 ──
  const [phoneError, setPhoneError] = useState(''); // 전화번호 형식 에러
  const [birthError, setBirthError] = useState(''); // 생년월일 유효성 에러

  // ── UI 제어 상태 ──
  const [focusedField, setFocusedField]     = useState<string | null>(null); // 현재 포커스된 입력 필드명 (스타일 하이라이트용)
  const [isCheckingNext, setIsCheckingNext] = useState(false); // 다음 단계 버튼 처리 중 로딩 (중복 클릭 방지)

  // ── 입력창 간 자동 포커스 이동을 위한 Refs ──
  // 키보드의 "다음" 버튼 누를 때 다음 입력창으로 이동
  const passwordRef   = useRef<TextInput>(null);
  const confirmRef    = useRef<TextInput>(null);
  const nameRef       = useRef<TextInput>(null);
  const birthRef      = useRef<TextInput>(null);
  const emailRef      = useRef<TextInput>(null);
  const emailCodeRef  = useRef<TextInput>(null);
  const phoneRef      = useRef<TextInput>(null);

  // ── 결과 안내 모달 상태 ──
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
    onConfirm: () => {},
  });

  // 결과 모달 열기 (키보드 먼저 내려 모달이 가려지지 않도록)
  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  // 결과 모달 닫기 후 onConfirm 콜백 실행
  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  // ── 아이디 입력 핸들러 및 실시간 유효성 검사 ──
  // 조건: 영문+숫자 조합 4~15자
  // - 중복 확인 상태는 입력이 바뀔 때마다 초기화 (재확인 유도)
  const handleIdChange = (text: string) => {
    setId(text);
    setIdSuccess('');
    setIsIdChecked(false); // 아이디 변경 시 중복 확인 무효화

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

  // ── 비밀번호 입력 핸들러 및 실시간 유효성 검사 ──
  // 조건: 영문+숫자+특수문자(@$!%*?&) 포함 6자 이상
  // - 허용 외 특수문자가 들어오면 별도 안내
  // - 비밀번호 확인란과 실시간으로 일치 여부도 함께 검사
  const validatePassword = (pw: string) => {
    setPassword(pw);
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    const disallowedSpecialRegex = /[^A-Za-z\d@$!%*?&]/; // 허용 범위 외 문자 감지

    if (!pw) {
      setPasswordError('비밀번호를 입력해주세요.');
    } else if (disallowedSpecialRegex.test(pw)) {
      setPasswordError('사용 불가한 문자가 포함되어 있습니다. 특수문자는 @$!%*?& 만 사용 가능합니다.');
    } else if (!passwordRegex.test(pw)) {
      setPasswordError('영문, 숫자, 특수문자(@$!%*?&) 포함 6자 이상이어야 합니다.');
    } else {
      setPasswordError('');
    }

    // 비밀번호 확인란에 이미 값이 있으면 일치 여부도 즉시 재검사
    if (passwordConfirm && pw !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    } else if (passwordConfirm && pw === passwordConfirm) {
      setPasswordConfirmError('');
    }
  };

  // ── 비밀번호 확인 입력 핸들러 ──
  // 현재 비밀번호와 실시간 비교하여 불일치 시 에러 표시
  const validatePasswordConfirm = (cf: string) => {
    setPasswordConfirm(cf);
    if (cf !== password) setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    else setPasswordConfirmError('');
  };

  // ── 이메일 입력 핸들러 및 실시간 유효성 검사 ──
  // - 이메일이 변경되면 기존 인증 상태 전부 초기화 (재인증 유도)
  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) setEmailError('이메일을 입력해주세요.');
    else if (!emailRegex.test(text)) setEmailError('올바른 이메일 형식이 아닙니다.');
    else setEmailError('');

    // 이메일 변경 시 인증 관련 상태 모두 초기화
    setIsEmailSent(false);
    setIsEmailVerified(false);
    setEmailCode('');
    setEmailCodeError('');
    setEmailCodeSuccess('');
    setEmailSuccess('');
  };

  // ── 생년월일 입력 핸들러 ──
  // - 숫자만 추출 후 YYYY-MM-DD 형식으로 자동 하이픈 삽입
  // - 8자리 완성 시 연/월/일 유효성 검사 (월별 최대 일수 포함)
  const formatBirth = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, ''); // 숫자만 추출
    let formatted = cleaned;
    if (cleaned.length > 4 && cleaned.length <= 6)
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    else if (cleaned.length > 6)
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;

    setBirth(formatted);

    // 8자리 미만이면 미완성 안내
    if (cleaned.length > 0 && cleaned.length < 8) {
      setBirthError('생년월일 8자리를 모두 입력해주세요.');
      return;
    }

    if (cleaned.length === 8) {
      const year  = parseInt(cleaned.slice(0, 4), 10);
      const month = parseInt(cleaned.slice(4, 6), 10);
      const day   = parseInt(cleaned.slice(6, 8), 10);
      const currentYear = new Date().getFullYear();

      // 연도 범위 검사
      if (year < 1900 || year > currentYear) { setBirthError('유효한 연도를 입력해주세요.'); return; }
      // 월 범위 검사
      if (month < 1 || month > 12) { setBirthError('유효한 월(1~12)을 입력해주세요.'); return; }
      // 해당 월의 실제 최대 일수 계산 (윤년 자동 처리)
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) { setBirthError(`유효한 일(1~${daysInMonth})을 입력해주세요.`); return; }
      setBirthError('');
    } else {
      if (cleaned.length === 0) setBirthError('');
    }
  };

  // ── 전화번호 입력 핸들러 ──
  // - 숫자만 추출 후 010-XXXX-XXXX 형식으로 자동 하이픈 삽입
  // - 10자리 미만이면 에러 표시
  const formatPhone = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, ''); // 숫자만 추출
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 7)
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    else if (cleaned.length > 7)
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;

    setPhone(formatted);
    if (cleaned.length > 0 && cleaned.length < 10) setPhoneError('전화번호를 정확히 입력해주세요.');
    else setPhoneError('');
  };

  // ── 아이디 중복 확인 API 호출 ──
  // - 형식 에러가 있으면 모달 안내 후 중단
  // - 중복이면 에러 메시지, 사용 가능이면 성공 메시지 + isIdChecked true
  // - 네트워크 오류 / 서버 오류는 상태별로 구분해 처리
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
      // 서버 응답 자체가 없는 경우 (인터넷 끊김 등)
      if (!error.response) {
        showResultModal('네트워크 오류', '서버와 통신할 수 없습니다.', 'error');
        return;
      }

      const status = error.response.status;
      const errorMessage = error.response.data?.message || '서버 오류가 발생했습니다.';

      if (status === 409 || status === 400) {
        // 409 Conflict(중복) 또는 400 Bad Request(유효하지 않은 아이디)
        setIdError(errorMessage); setIdSuccess(''); setIsIdChecked(false);
      } else {
        showResultModal('오류', `에러코드: ${status}\n${errorMessage}`, 'error');
      }
    }
  };

  // ── 이메일 인증코드 발송 API 호출 ──
  // - 이메일 형식 에러가 있으면 모달 안내 후 중단
  // - 발송 성공 시 isEmailSent true → 인증코드 입력 필드 표시
  // - 발송 후 자동으로 인증코드 입력 필드로 포커스 이동 (300ms 딜레이: 필드 렌더링 대기)
  const sendEmailVerification = async () => {
    setFocusedField('email');
    if (!email || emailError) { showResultModal('알림', '이메일을 올바르게 입력해주세요.', 'info'); return; }

    setIsSendingEmail(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/email/request`, null, { params: { email } });
      setIsEmailSent(true);
      setEmailSuccess('인증코드가 발송되었습니다.');
      // 재발송 시 이전 인증코드 입력값 및 결과 초기화
      setEmailCodeError(''); setEmailCodeSuccess(''); setEmailCode('');
      // 인증코드 입력 필드가 렌더링된 후 포커스 이동
      setTimeout(() => setFocusedField('emailCode'), 300);
    } catch (error: any) {
      const errorMessage = error.response.data.message;
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ── 이메일 인증코드 검증 API 호출 ──
  // - 인증코드 미입력 시 에러 메시지만 표시
  // - 서버 응답 status 200이면 인증 완료, 아니면 에러 메시지 표시
  const verifyEmailCode = async () => {
    setFocusedField('emailCode');
    if (!emailCode) { setEmailCodeError('인증코드를 입력해주세요.'); return; }

    setIsVerifyingEmail(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/email/verify`, null, { params: { email, code: emailCode } });

      if (response.data.status === 200) {
        setEmailCodeError(''); setEmailCodeSuccess('이메일 인증이 완료되었습니다.'); setIsEmailVerified(true);
      } else {
        // 서버가 200 OK를 반환했지만 내부 status가 실패인 경우
        setEmailCodeError(response.data.message); setIsEmailVerified(false);
      }
    } catch (error: any) {
      // HTTP 에러 (400, 401 등) - 잘못된 코드 또는 만료된 코드
      setEmailCodeError(error.response.data.message); setIsEmailVerified(false);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // ── 다음 단계 진행 핸들러 ──
  // 1. 전체 필드 유효성 검사 (순서대로, 첫 번째 실패 항목에서 안내 후 중단)
  // 2. 전화번호 중복 확인 API 호출 (마지막 단계에서만 서버 요청)
  // 3. 모두 통과 시 PersonalInfo 화면으로 accountData 전달
  const handleNextStep = async () => {
    // 이미 처리 중이면 중복 실행 방지
    if (isCheckingNext) return;

    // 순서대로 각 필드 유효성 검사
    if (!isIdChecked)
      { showResultModal('알림', '아이디 중복 확인을 해주세요.', 'info'); return; }
    if (!password || passwordError)
      { showResultModal('알림', '비밀번호를 올바르게 입력해주세요.', 'info'); return; }
    if (password !== passwordConfirm || passwordConfirmError)
      { showResultModal('알림', '비밀번호가 일치하지 않습니다.', 'info'); return; }
    if (!name.trim())
      { showResultModal('알림', '이름을 입력해주세요.', 'info'); return; }
    if (!gender)
      { showResultModal('알림', '성별을 선택해주세요.', 'info'); return; }
    if (birthError || birth.length !== 10)
      { showResultModal('알림', '올바른 생년월일을 입력해주세요. (예: 1999-01-01)', 'info'); return; }
    if (!phone || phoneError)
      { showResultModal('알림', '전화번호를 올바르게 입력해주세요.', 'info'); return; }
    if (!email || emailError)
      { showResultModal('알림', '이메일을 올바르게 입력해주세요.', 'info'); return; }
    if (!isEmailVerified)
      { showResultModal('알림', '이메일 인증을 완료해주세요.', 'info'); return; }

    setIsCheckingNext(true);

    // 전화번호 중복 확인 (다음 단계 직전에 서버 요청)
    try {
      const phoneRes = await axios.get(`${API_BASE_URL}/auth/check-phone`, { params: { phone } });
      const isPhoneDup = phoneRes.data.data.isDuplicate;

      if (isPhoneDup) {
        // 중복된 전화번호: 에러 표시 후 진행 중단
        setPhoneError('이미 가입된 전화번호입니다.');
        showResultModal('가입 불가', '이미 가입된 전화번호입니다.\n번호를 다시 확인해주세요.', 'error');
        setIsCheckingNext(false);
        return;
      }
    } catch (error: any) {
      const errorMessage = error.response.data.message;

      if (error.response.status === 409 || error.response.status === 400) {
        // 409 Conflict(중복) 또는 400 Bad Request
        setPhoneError(errorMessage);
        showResultModal('가입 불가', errorMessage, 'error');
      } else {
        showResultModal('오류', errorMessage, 'error');
      }
      setIsCheckingNext(false);
      return;
    }

    setIsCheckingNext(false);

    // 모든 검사 통과 → 다음 화면(신체 정보 입력)으로 계정 데이터 전달
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
    // 아이디
    id, handleIdChange, idError, idSuccess, isIdChecked, checkDuplicateId,
    // 비밀번호
    password, validatePassword, passwordError,
    passwordConfirm, validatePasswordConfirm, passwordConfirmError,
    // 기본 정보
    name, setName,
    gender, setGender,
    birth, formatBirth, birthError,
    phone, formatPhone, phoneError,
    // 이메일 인증
    email, validateEmail, emailError, emailSuccess,
    isEmailSent, isEmailVerified, sendEmailVerification, isSendingEmail,
    emailCode, setEmailCode,
    emailCodeError, setEmailCodeError,
    emailCodeSuccess, setEmailCodeSuccess,
    verifyEmailCode, isVerifyingEmail,
    // UI 제어
    focusedField, setFocusedField, isCheckingNext, handleNextStep,
    // 입력창 Refs
    passwordRef, confirmRef, nameRef, birthRef, emailRef, emailCodeRef, phoneRef,
    // 결과 모달
    resultModalVisible, resultModalConfig, closeResultModal, showResultModal,
  };
};