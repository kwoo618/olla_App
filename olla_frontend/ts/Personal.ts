import { useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

export const usePersonal = (navigation: any, route: any) => {
  const { accountData } = route.params || {};

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [armSpan, setArmSpan] = useState('');
  const [footSize, setFootSize] = useState('');

  const [isHeightPublic, setIsHeightPublic] = useState(true);
  const [isWeightPublic, setIsWeightPublic] = useState(true);
  const [isArmPublic, setIsArmPublic] = useState(true);
  const [isFootPublic, setIsFootPublic] = useState(true);

  // ✅ 로딩 상태 추가 (통신 중 버튼 중복 클릭 방지)
  const [isLoading, setIsLoading] = useState(false);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error', 
    onConfirm: () => {} 
  });

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

  const handleFinalSignup = async () => {
    // 🚨 1단계 확인: 버튼이 제대로 눌렸는지 콘솔창(Terminal)에서 확인하세요!
    console.log("✅ 버튼 클릭됨! accountData 확인:", accountData);

    if (!accountData) {
      showResultModal('오류', '계정 정보가 유실되었습니다. 이전 단계로 돌아갑니다.', 'error', () => navigation.goBack());
      return;
    }

    setIsLoading(true); // 로딩 시작

    try {
      const requestBody = {
        ...accountData,
        role: 'USER',
        detail: {
          age: 0,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          armSpan: armSpan ? parseFloat(armSpan) : null,
          footSize: footSize ? parseFloat(footSize) : null
        },
        privacy: {
          isPhonePublic: true, phonePublic: true,
          isEmailPublic: true, emailPublic: true,
          isHeightPublic: isHeightPublic, heightPublic: isHeightPublic,
          isWeightPublic: isWeightPublic, weightPublic: isWeightPublic,
          isArmSpanPublic: isArmPublic, armSpanPublic: isArmPublic,
          isFootSizePublic: isFootPublic, footSizePublic: isFootPublic
        }
      };

      console.log("🚀 백엔드 요청 주소:", `${API_BASE_URL}/auth/signup`);

      // 🚨 Axios 타임아웃 5초 설정 (무한 멈춤 방지)
      await axios.post(`${API_BASE_URL}/auth/signup`, requestBody, { timeout: 5000 });

      // 자동 로그인 시도
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          loginId: accountData.loginId,
          password: accountData.password
        }, { timeout: 5000 });

        const accessToken = loginResponse.data?.data?.accessToken || loginResponse.data?.accessToken;
        const refreshToken = loginResponse.data?.data?.refreshToken || loginResponse.data?.refreshToken;
        const role = loginResponse.data?.data?.role || loginResponse.data?.role;

        if (accessToken) {
          await AsyncStorage.setItem('userToken', accessToken);
          if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
          if (role) await AsyncStorage.setItem('userRole', role);
        }
      } catch (loginError: any) {
        console.error("자동 로그인 에러:", loginError.message);
      }

      navigation.replace('Loading', { type: 'signup' });
      
    } catch (error: any) {
      console.error("❌ 통신 에러 발생:", error); // 터미널에 상세 에러 출력
      let modalTitle = '가입 실패';
      let debugMessage = '';

      if (error.response) {
        modalTitle = `서버 응답 에러 (${error.response.status})`;
        debugMessage = error.response.data?.message || '상세 메시지 없음';
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        // ✅ 타임아웃 에러 잡기
        modalTitle = '서버 응답 지연';
        debugMessage = '서버와 연결할 수 없습니다.\n(API 주소 또는 서버 실행 상태를 확인하세요)';
      } else if (error.request) {
        modalTitle = '네트워크 오류';
        debugMessage = '서버에 요청을 보냈으나 응답이 없습니다.\n(인터넷 연결 또는 서버 다운)';
      } else {
        modalTitle = '요청 셋팅 오류';
        debugMessage = error.message;
      }

      showResultModal(modalTitle, debugMessage, 'error');
    } finally {
      setIsLoading(false); // 통신 종료 후 로딩 해제
    }
  };

  return {
    height, setHeight,
    weight, setWeight,
    armSpan, setArmSpan,
    footSize, setFootSize,
    isHeightPublic, setIsHeightPublic,
    isWeightPublic, setIsWeightPublic,
    isArmPublic, setIsArmPublic,
    isFootPublic, setIsFootPublic,
    resultModalVisible, resultModalConfig, closeResultModal,
    handleFinalSignup,
    isLoading // 로딩 상태 반환 추가
  };
};