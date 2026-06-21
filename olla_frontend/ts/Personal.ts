// ============================================================
// usePersonal.ts
// 회원가입 마지막 단계(신체 정보 입력) 화면에서 사용하는 커스텀 훅
// - 키/몸무게/팔 길이/발 사이즈 입력 상태 관리
// - 각 신체 정보의 공개/비공개 설정
// - 회원가입 최종 API 호출 및 토큰 저장
// - 결과 안내 모달 표시
// ============================================================

import { useState } from 'react';
import { Keyboard, Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage'; // 토큰 저장용으로 계속 필요, 유지
import { signup } from '../src/constants/api/auth';

export const usePersonal = (navigation: any, route: any) => {
  // 이전 화면(계정 정보 입력)에서 넘겨준 계정 데이터 (이메일/비밀번호/닉네임 등)
  const { accountData } = route.params || {};

  // ── 신체 정보 입력 상태 (문자열로 관리 후 API 호출 시 float으로 변환) ──
  const [height, setHeight] = useState('');     // 키 (cm)
  const [weight, setWeight] = useState('');     // 몸무게 (kg)
  const [armSpan, setArmSpan] = useState('');   // 팔 길이/암스팬 (cm)
  const [footSize, setFootSize] = useState(''); // 발 사이즈 (mm)

  // ── 각 신체 정보의 다른 사용자에 대한 공개 여부 (기본값: 공개) ──
  const [isHeightPublic, setIsHeightPublic] = useState(true);
  const [isWeightPublic, setIsWeightPublic] = useState(true);
  const [isArmPublic, setIsArmPublic]       = useState(true);
  const [isFootPublic, setIsFootPublic]     = useState(true);

  // API 호출 중 버튼 중복 클릭 방지용 로딩 상태
  const [isLoading, setIsLoading] = useState(false);

  // 결과 안내 모달 표시 여부
  const [resultModalVisible, setResultModalVisible] = useState(false);
  // 결과 안내 모달에 표시할 제목/메시지/타입/콜백
  const [resultModalConfig, setResultModalConfig] = useState({ 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error', 
    onConfirm: () => {} 
  });

  // 결과 모달을 열고 내용을 설정하는 헬퍼 함수
  // 키보드를 먼저 내려 모달이 가려지지 않도록 함
  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // 결과 모달 닫기 후 onConfirm 콜백 실행
  // (예: 에러 모달에서 '확인' 누르면 이전 화면으로 이동하는 동작 처리)
  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  // 회원가입 최종 API 호출 함수
  // 1. 이전 단계의 accountData가 없으면 에러 처리 후 뒤로 이동
  // 2. 계정 정보 + 신체 정보 + 공개 설정을 합쳐 /auth/signup 요청
  // 3. 성공 시 응답에서 accessToken/role 저장 후 Loading 화면으로 이동
  // 4. 실패 시 에러 종류별로 구분해 결과 모달에 안내 메시지 표시
  const handleFinalSignup = async () => {

    // 이전 화면에서 넘겨받은 계정 데이터가 없으면 진행 불가
    if (!accountData) {
      showResultModal('오류', '계정 정보가 유실되었습니다. 이전 단계로 돌아갑니다.', 'error', () => navigation.goBack());
      return;
    }

    setIsLoading(true);

    try {
      // 계정 정보(이메일/비밀번호 등) + 고정 role + 신체 정보 + 공개 설정을 하나의 요청 바디로 합침
      const requestBody = {
        ...accountData,
        role: 'USER',
        detail: {
          age: 0,
          // 입력값이 있으면 float으로 변환, 없으면 null (선택 항목)
          height:   height   ? parseFloat(height)   : null,
          weight:   weight   ? parseFloat(weight)   : null,
          armSpan:  armSpan  ? parseFloat(armSpan)  : null,
          footSize: footSize ? parseFloat(footSize) : null
        },
        privacy: {
          // 전화번호/이메일은 항상 공개, 신체 정보는 사용자가 설정한 값 사용
          // isXxxPublic(카멜케이스)과 xxxPublic(플랫) 두 형태 모두 포함해 서버 호환성 확보
          isPhonePublic: true,  phonePublic: true,
          isEmailPublic: true,  emailPublic: true,
          isHeightPublic: isHeightPublic, heightPublic: isHeightPublic,
          isWeightPublic: isWeightPublic, weightPublic: isWeightPublic,
          isArmSpanPublic: isArmPublic,  armSpanPublic: isArmPublic,
          isFootSizePublic: isFootPublic, footSizePublic: isFootPublic
        }
      };

      // 회원가입 API 호출 (타임아웃 5초는 auth.ts의 signup 함수에 내장됨)
      const signupResponse = await signup(requestBody);

      // 응답 구조가 data.data 또는 data 두 가지인 경우를 모두 처리
      const accessToken = signupResponse.data?.data?.accessToken || signupResponse.data?.accessToken;
      const refreshToken = signupResponse.data?.data?.refreshToken || signupResponse.data?.refreshToken;
      const role = signupResponse.data?.data?.role || signupResponse.data?.role;

      if (accessToken) {
        // accessToken만 저장 (refreshToken은 저장 안 함)
        // → 로그인 화면에서 정식 로그인 시 refreshToken을 받아 저장하는 방식으로
        //   동시 로그인 차단 로직이 중복 실행되지 않도록 방지
        await AsyncStorage.setItem('userToken', accessToken);
        if (role) await AsyncStorage.setItem('userRole', role);
      }

      // 회원가입 완료 후 Loading 화면으로 이동 (type: 'signup'으로 환영 메시지 등 분기)
      navigation.replace('Loading', { type: 'signup' });
      
    } catch (error: any) {
      console.error("❌ 통신 에러 발생:", error);
      let modalTitle = '가입 실패';
      let debugMessage = '';

      // 에러 종류별로 원인을 구분해 안내
      if (error.response) {
        // 서버가 응답은 했지만 2xx가 아닌 경우 (400, 409, 500 등)
        modalTitle = `서버 응답 에러 (${error.response.status})`;
        debugMessage = error.response.data?.message || '상세 메시지 없음';
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        // 5초 타임아웃 초과
        modalTitle = '서버 응답 지연';
        debugMessage = '서버와 연결할 수 없습니다.\n(API 주소 또는 서버 실행 상태를 확인하세요)';
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없는 경우 (서버 다운, 인터넷 끊김 등)
        modalTitle = '네트워크 오류';
        debugMessage = '서버에 요청을 보냈으나 응답이 없습니다.\n(인터넷 연결 또는 서버 다운)';
      } else {
        // axios 요청 설정 자체가 잘못된 경우
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