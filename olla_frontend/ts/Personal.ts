import { useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

export const usePersonal = (navigation: any, route: any) => {
  // 이전 화면에서 넘겨받은 가입 기본 정보 (id, password, name, phone 등)
  const { accountData } = route.params || {};

  // --- 입력 상태 관리 ---
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [armSpan, setArmSpan] = useState('');
  const [footSize, setFootSize] = useState('');

  // --- 토글(공개/비공개) 상태 관리 ---
  const [isHeightPublic, setIsHeightPublic] = useState(true);
  const [isWeightPublic, setIsWeightPublic] = useState(true);
  const [isArmPublic, setIsArmPublic] = useState(true);
  const [isFootPublic, setIsFootPublic] = useState(true);

  // --- 모달 상태 관리 ---
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

  // --- 회원가입 및 자동 로그인 실행 ---
  const handleFinalSignup = async () => {
    if (!accountData) {
      showResultModal('오류', '계정 정보가 유실되었습니다. 다시 가입해주세요.', 'error', () => navigation.goBack());
      return;
    }

    try {
      // 1. 최종 회원가입 요청
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
          // 백엔드 파싱 오류 방지를 위한 듀얼 매핑
          isPhonePublic: true, phonePublic: true,
          isEmailPublic: true, emailPublic: true,
          isHeightPublic: isHeightPublic, heightPublic: isHeightPublic,
          isWeightPublic: isWeightPublic, weightPublic: isWeightPublic,
          isArmSpanPublic: isArmPublic, armSpanPublic: isArmPublic,
          isFootSizePublic: isFootPublic, footSizePublic: isFootPublic
        }
      };

      await axios.post(`${API_BASE_URL}/auth/signup`, requestBody);

      // 2. 가입 성공 시 자동 로그인 시도
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          loginId: accountData.loginId,
          password: accountData.password
        });

        // 명세서에 따른 공통 데이터 뎁스 확인
        const accessToken = loginResponse.data?.data?.accessToken || loginResponse.data?.accessToken;
        const refreshToken = loginResponse.data?.data?.refreshToken || loginResponse.data?.refreshToken;
        const role = loginResponse.data?.data?.role || loginResponse.data?.role;

        if (accessToken) {
          await AsyncStorage.setItem('userToken', accessToken);
          if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
          if (role) await AsyncStorage.setItem('userRole', role);
        }
      } catch (loginError: any) {
        console.error("자동 로그인 에러:", loginError.response?.data?.message || loginError.message);
        // 자동 로그인 실패 시 로그인 화면으로 유도할 수도 있으나 기존 플로우 유지 (Loading 화면으로 이동)
      }

      // 3. 로딩(환영) 화면으로 이동
      navigation.replace('Loading', { type: 'signup' });
      
    } catch (error: any) {
      // 🚨 디버깅을 위해 에러 상세 출력
      let modalTitle = '가입 실패';
      let debugMessage = '';

      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message || '상세 메시지 없음';
        modalTitle = `서버 응답 에러 (${status})`;
        debugMessage = `상태 코드: ${status}\n서버 메시지: ${serverMessage}`;
      } else if (error.request) {
        modalTitle = '네트워크/연결 오류';
        const rawMessage = error.message;
        const targetUrl = error.config?.url || 'URL 알 수 없음';
        debugMessage = `에러 원인: ${rawMessage}\n\n[요청 주소]\n${targetUrl}\n\n(※ http 통신 차단 또는 서버 다운 확인)`;
      } else {
        modalTitle = '요청 셋팅 오류';
        debugMessage = error.message;
      }

      showResultModal(modalTitle, debugMessage, 'error');
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
    handleFinalSignup
  };
};