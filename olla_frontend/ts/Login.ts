import { useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

export const useLogin = (navigation: any) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  const [findIdModalVisible, setFindIdModalVisible] = useState(false);
  const [findIdName, setFindIdName] = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');

  const [findPwModalVisible, setFindPwModalVisible] = useState(false);
  const [findPwLoginId, setFindPwLoginId] = useState('');
  const [findPwEmail, setFindPwEmail] = useState('');

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
    setFindIdPhone(formatted);
  };

  const handleFindId = async () => {
    if (!findIdName || !findIdPhone) {
      showResultModal('알림', '이름과 전화번호를 모두 입력해주세요.', 'info');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/find-id`, null, {
        params: { name: findIdName, phone: findIdPhone }
      });
      setFindIdModalVisible(false);
      setTimeout(() => {
        const maskedId = response.data.data;
        showResultModal('아이디 찾기 성공', `회원님의 아이디는\n[ ${maskedId} ] 입니다.`, 'success');
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

  const handleFindPassword = async () => {
    if (!findPwLoginId || !findPwEmail) {
      showResultModal('알림', '아이디와 이메일을 모두 입력해주세요.', 'info');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/find-password`, null, {
        params: { loginId: findPwLoginId, email: findPwEmail }
      });
      setFindPwModalVisible(false);
      setTimeout(() => {
        showResultModal('비밀번호 발송', '임시 비밀번호가 등록된 이메일로 발송되었습니다.', 'success');
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

  const handleLogin = async () => {
    if (!loginId || !password) {
      showResultModal('알림', '아이디와 비밀번호를 모두 입력해주세요.', 'info');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        loginId,
        password,
      });

      const token = response.data.data.accessToken;
      const refreshToken = response.data.data.refreshToken;
      const role = response.data.data.role;

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        if (role) await AsyncStorage.setItem('userRole', role);

        await AsyncStorage.removeItem('fcmToken');
        try {
          const messaging = (await import('@react-native-firebase/messaging')).default;
          const fcmToken = await messaging().getToken();
          if (fcmToken) {
            await axios.post(
              `${API_BASE_URL}/members/me/fcm-token`,
              { deviceToken: fcmToken },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            await AsyncStorage.setItem('fcmToken', fcmToken);
          }
        } catch (e) {}

        setTimeout(() => navigation.replace('Home'), 100);
      } else {
        showResultModal('로그인 오류', '인증 정보를 찾을 수 없습니다.', 'error');
      }
    } catch (error: any) {
      let modalTitle = '로그인 실패';
      let debugMessage = '';

      if (error.response) {
        const serverMessage = error.response.data?.message || '가입된 아이디가 없습니다';

        // 동시 로그인 차단 메시지 감지 → 타이틀 별도 처리
        if (serverMessage.includes('이미 다른 기기에서 로그인 중')) {
          modalTitle = '로그인 불가';
        }

        debugMessage = serverMessage;
      } else if (error.request) {
        modalTitle = '네트워크/연결 오류';
        debugMessage = `에러 원인: ${error.message}\n\n[요청한 주소]\n${error.config?.url || 'URL 알 수 없음'}`;
      } else {
        modalTitle = '요청 셋팅 오류';
        debugMessage = error.message;
      }

      showResultModal(modalTitle, debugMessage, 'error');
    }
  };

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