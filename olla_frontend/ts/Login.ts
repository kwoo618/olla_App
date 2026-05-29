import { useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';
import { API_BASE_URL } from '../src/constants/Config';

export const useLogin = (navigation: any) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // ─── 결과 모달 상태 ───
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

  // ─── 아이디 찾기 상태 ───
  const [findIdModalVisible, setFindIdModalVisible] = useState(false);
  const [findIdName, setFindIdName] = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');

  // ─── 비밀번호 찾기 상태 ───
  const [findPwModalVisible, setFindPwModalVisible] = useState(false);
  const [findPwLoginId, setFindPwLoginId] = useState('');
  const [findPwEmail, setFindPwEmail] = useState('');

  // 전화번호 자동 하이픈 변환 함수
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

  // 아이디 찾기 API 호출
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

  // 비밀번호 찾기 API 호출
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

  // 로그인 API 호출 및 FCM 토큰 갱신
  const handleLogin = async () => {
    if (!loginId || !password) {
      showResultModal('알림', '아이디와 비밀번호를 모두 입력해주세요.', 'info');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        loginId: loginId,
        password: password,
      });

      const token = response.data.data.accessToken; // 토큰
      const refreshToken = response.data.data.refreshToken; // 리프레쉬 토큰
      const role = response.data.data.role; // 관리자인지 회원인지 구분

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        if (role) await AsyncStorage.setItem('userRole', role);

        try {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (enabled) {
            const fcmToken = await messaging().getToken();
            await axios.post(`${API_BASE_URL}/members/fcm-token`, 
              { deviceToken: fcmToken }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        } catch (fcmError) {
          console.error('FCM 토큰 발급/전송 오류:', fcmError);
        }
        
        navigation.replace('Home');
      } else {
        showResultModal('로그인 오류', '인증 정보를 찾을 수 없습니다.', 'error');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '아이디 또는 비밀번호를 확인해주세요.';
      showResultModal('로그인 실패', errorMessage, 'error');
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