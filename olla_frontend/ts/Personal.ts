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
    console.log("✅ 버튼 클릭됨! accountData 확인:", accountData);

    if (!accountData) {
      showResultModal('오류', '계정 정보가 유실되었습니다. 이전 단계로 돌아갑니다.', 'error', () => navigation.goBack());
      return;
    }

    setIsLoading(true);

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

      // 회원가입 응답에서 바로 토큰 받아서 저장 (자동 로그인 불필요)
      const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, requestBody, { timeout: 5000 });

      const accessToken = signupResponse.data?.data?.accessToken || signupResponse.data?.accessToken;
      const refreshToken = signupResponse.data?.data?.refreshToken || signupResponse.data?.refreshToken;
      const role = signupResponse.data?.data?.role || signupResponse.data?.role;

      if (accessToken) {
        await AsyncStorage.setItem('userToken', accessToken);
        // 회원가입 시 RefreshToken 저장 안 함 → 로그인 시 동시 로그인 차단 안 걸리게
        if (role) await AsyncStorage.setItem('userRole', role);
      }

      navigation.replace('Loading', { type: 'signup' });
      
    } catch (error: any) {
      console.error("❌ 통신 에러 발생:", error);
      let modalTitle = '가입 실패';
      let debugMessage = '';

      if (error.response) {
        modalTitle = `서버 응답 에러 (${error.response.status})`;
        debugMessage = error.response.data?.message || '상세 메시지 없음';
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
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
      setIsLoading(false);
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
    isLoading
  };
};