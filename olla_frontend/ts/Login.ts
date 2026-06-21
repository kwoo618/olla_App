// ============================================================
// useLogin.ts
// 로그인 화면에서 사용하는 커스텀 훅
// - 로그인 처리 (JWT 저장 + FCM 토큰 등록)
// - 아이디 찾기 (이름 + 전화번호)
// - 비밀번호 찾기 (아이디 + 이메일 → 임시 비밀번호 발송)
// - 전화번호 자동 포맷팅
// - 결과 모달 상태 관리
// ============================================================

import { useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerFcmToken } from '../src/constants/api/member'
import { findId, findPassword, login } from '../src/constants/api/auth'; // 실제 경로명에 맞게

export const useLogin = (navigation: any) => {
  // 로그인 입력 필드 상태
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // 결과 안내 모달 표시 여부
  const [resultModalVisible, setResultModalVisible] = useState(false);
  // 결과 모달에 표시할 내용
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  // 결과 모달 열기
  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss(); // 모달 열기 전 키보드 닫기
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // 결과 모달 닫기 + onConfirm 실행
  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  // 아이디 찾기 모달 표시 여부
  const [findIdModalVisible, setFindIdModalVisible] = useState(false);
  // 아이디 찾기 입력 필드
  const [findIdName, setFindIdName] = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');

  // 비밀번호 찾기 모달 표시 여부
  const [findPwModalVisible, setFindPwModalVisible] = useState(false);
  // 비밀번호 찾기 입력 필드
  const [findPwLoginId, setFindPwLoginId] = useState('');
  const [findPwEmail, setFindPwEmail] = useState('');

  // 전화번호 자동 포맷팅: 숫자만 추출 후 "010-1234-5678" 형식으로 변환
  const formatPhone = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, ''); // 숫자 외 문자 제거
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 7) {
      // "010-1234" 형태
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length > 7) {
      // "010-1234-5678" 형태
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
    setFindIdPhone(formatted);
  };

  // 아이디 찾기 API 호출
  // - 이름과 전화번호를 쿼리 파라미터로 전송
  // - 성공 시 마스킹된 아이디를 모달로 표시
  const handleFindId = async () => {
    if (!findIdName || !findIdPhone) {
      showResultModal('알림', '이름과 전화번호를 모두 입력해주세요.', 'info');
      return;
    }
    try {
      const response = await findId(findIdName, findIdPhone);
      setFindIdModalVisible(false);
      // iOS에서는 모달 닫힘 애니메이션 후 결과 표시를 위해 딜레이 추가
      setTimeout(() => {
        const maskedId = response.data.data;
        showResultModal('아이디 찾기 성공', `회원님의 아이디는\n[ ${maskedId} ] 입니다.`, 'success');
        // 입력 필드 초기화
        setFindIdName('');
        setFindIdPhone('');
      }, Platform.OS === 'ios' ? 400 : 150);
    } catch (error: any) {
      setFindIdModalVisible(false);
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '일치하는 정보가 없습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, Platform.OS === 'ios' ? 400 : 150);
    }
  };

  // 비밀번호 찾기 API 호출
  // - 아이디와 이메일을 쿼리 파라미터로 전송
  // - 성공 시 등록된 이메일로 임시 비밀번호 발송
  const handleFindPassword = async () => {
    if (!findPwLoginId || !findPwEmail) {
      showResultModal('알림', '아이디와 이메일을 모두 입력해주세요.', 'info');
      return;
    }
    try {
      await findPassword(findPwLoginId, findPwEmail);
      setFindPwModalVisible(false);
      setTimeout(() => {
        showResultModal('비밀번호 발송', '임시 비밀번호가 등록된 이메일로 발송되었습니다.', 'success');
        // 입력 필드 초기화
        setFindPwLoginId('');
        setFindPwEmail('');
      }, Platform.OS === 'ios' ? 400 : 150);
    } catch (error: any) {
      setFindPwModalVisible(false);
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '입력하신 정보가 일치하지 않습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, Platform.OS === 'ios' ? 400 : 150);
    }
  };

  // 로그인 처리
  // 1. 아이디/비밀번호 유효성 확인
  // 2. 로그인 API 호출
  // 3. JWT(accessToken, refreshToken) 및 role을 AsyncStorage에 저장
  // 4. FCM 토큰 발급 후 서버에 등록 (푸시 알림용)
  // 5. 홈 화면으로 이동
  const handleLogin = async () => {
    if (!loginId || !password) {
      showResultModal('알림', '아이디와 비밀번호를 모두 입력해주세요.', 'info');
      return;
    }

    try {
      const response = await login(loginId, password);
      const token = response.data.data.accessToken;
      const refreshToken = response.data.data.refreshToken;
      const role = response.data.data.role;

      if (token) {
        // JWT 토큰 저장
        await AsyncStorage.setItem('userToken', token);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        // 권한(role) 저장 (관리자 여부 판단 등에 사용)
        if (role) await AsyncStorage.setItem('userRole', role);

        // 기존 FCM 토큰 제거 후 새로 발급하여 서버에 등록
        await AsyncStorage.removeItem('fcmToken');
        try {
          // Firebase Messaging 동적 임포트 (앱 초기 로드 성능 최적화)
          const messaging = (await import('@react-native-firebase/messaging')).default;
          const fcmToken = await messaging().getToken();
          if (fcmToken) {
            // 서버에 FCM 토큰 등록 (이 기기로 푸시 알림 수신 가능하도록)
            await registerFcmToken(fcmToken);
            await AsyncStorage.setItem('fcmToken', fcmToken);
          }
        } catch (e) {
          // FCM 토큰 등록 실패는 로그인 자체를 막지 않음 (조용히 무시)
        }

        // 로그인 성공 → 홈 화면으로 이동 (뒤로가기로 로그인 화면 돌아오지 않도록 replace 사용)
        setTimeout(() => navigation.replace('Home'), 100);
      } else {
        showResultModal('로그인 오류', '인증 정보를 찾을 수 없습니다.', 'error');
      }
    } catch (error: any) {
      let modalTitle = '로그인 실패';
      let debugMessage = '';

      if (error.response) {
        // 서버가 응답한 에러
        const serverMessage = error.response.data?.message || '가입된 아이디가 없습니다';

        // "이미 다른 기기에서 로그인 중" 메시지는 별도 타이틀로 표시
        if (serverMessage.includes('이미 다른 기기에서 로그인 중')) {
          modalTitle = '로그인 불가';
        }

        debugMessage = serverMessage;
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없는 경우 (네트워크 오류, 서버 다운 등)
        modalTitle = '네트워크/연결 오류';
        debugMessage = `에러 원인: ${error.message}\n\n[요청한 주소]\n${error.config?.url || 'URL 알 수 없음'}`;
      } else {
        // axios 요청 설정 자체에서 발생한 오류
        modalTitle = '요청 셋팅 오류';
        debugMessage = error.message;
      }

      showResultModal(modalTitle, debugMessage, 'error');
    }
  };

  // 훅 사용 컴포넌트에 노출할 상태와 함수들 반환
  return {
    loginId, setLoginId,
    password, setPassword,
    findIdModalVisible, setFindIdModalVisible,
    findIdName, setFindIdName,
    findIdPhone, setFindIdPhone, formatPhone,
    findPwModalVisible, setFindPwModalVisible,
    findPwLoginId, setFindPwLoginId,
    findPwEmail, setFindPwEmail,
    resultModalVisible, resultModalConfig, closeResultModal,
    handleFindId, handleFindPassword, handleLogin
  };
};