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
            if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
              await messaging().registerDeviceForRemoteMessages();
            }
            const fcmToken = await messaging().getToken();
            
            // 🚨 디버깅용 화면 모달 (토큰이 잘 나오는지 눈으로 확인하는 용도)
            // 발급받은 토큰 서버로 전송
            if (fcmToken) {
              try {
                const fcmSendResponse = await axios.post(
                  `${API_BASE_URL}/members/me/fcm-token`,
                  { token: fcmToken },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                showResultModal(
                  'FCM 전송 성공 ✅',
                  `status: ${fcmSendResponse.status}\n${JSON.stringify(fcmSendResponse.data)}`,
                  'success',
                  () => navigation.replace('Home')  // ← 확인 누르면 이동
                );
                return;
              } catch (sendError: any) {
                const status = sendError.response?.status;
                const msg = sendError.response?.data?.message || sendError.message;
                showResultModal(
                  'FCM 서버 전송 실패 ❌',
                  `status: ${status}\nmessage: ${msg}`,
                  'error',
                  () => navigation.replace('Home')
                );
                return;
              }
            }
            navigation.replace('Home');
          }
        } catch (fcmError) {
          console.error('FCM 토큰 발급/전송 오류:', fcmError);
        }
        
        navigation.replace('Home');
      } else {
        showResultModal('로그인 오류', '인증 정보를 찾을 수 없습니다.', 'error');
      }
    } catch (error: any) {
      // 🚨 디버깅을 위해 에러의 민낯을 모달에 그대로 띄우도록 수정한 부분
      let modalTitle = '로그인 실패';
      let debugMessage = '';

      if (error.response) {
        // 1. 서버에 도달했고, 서버가 에러 코드를 뱉은 경우 (401, 404, 500 등)
        const status = error.response.status;
        const serverMessage = error.response.data?.message || '\n가입된 아이디가 없습니다';
        debugMessage = `${serverMessage}`;
        
      } else if (error.request) {
        // 2. 서버에 아예 도달하지 못했거나 응답이 없는 경우 (Network Error, CORS 등)
        modalTitle = '네트워크/연결 오류';
        const rawMessage = error.message;
        const targetUrl = error.config?.url || 'URL 알 수 없음';
        
        debugMessage = `에러 원인: ${rawMessage}\n\n[요청한 주소]\n${targetUrl}\n\n(※ http 차단 설정이나 서버가 내려간 상태일 수 있습니다.)`;
        
      } else {
        // 3. Axios 요청 자체를 세팅하다가 발생한 오류
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