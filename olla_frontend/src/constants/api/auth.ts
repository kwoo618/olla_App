// 로그인·회원가입·토큰·이메일인증 API
/**
 * src/api/auth.ts
 *
 * 인증(로그인·로그아웃·회원가입·토큰 재발급 등) API 함수 모듈입니다.
 * Login.ts / Personal.ts / Signup.ts 에 흩어져 있던 axios 호출을 여기로 모읍니다.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../Config';
import { authHeader } from './apiClient';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
  name: string;
}

export interface SignupRequest {
  loginId: string;
  password: string;
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
  email: string;
  role?: string;
  detail?: {
    height?: number | null;
    weight?: number | null;
    armSpan?: number | null;
    footSize?: number | null;
  };
  privacy?: Record<string, boolean>;
}

// ─── API 함수 ─────────────────────────────────────────────────────────────────

export const loginApi = async (body: LoginRequest): Promise<TokenResponse> => {
  const res = await axios.post(`${API_BASE_URL}/auth/login`, body);
  return res.data.data;
};

export const logoutApi = async (refreshToken: string): Promise<void> => {
  const headers = await authHeader();
  await axios.post(
    `${API_BASE_URL}/auth/logout`,
    { refreshToken },
    { headers, timeout: 3000 },
  );
};

export const signupApi = async (body: SignupRequest): Promise<TokenResponse> => {
  const res = await axios.post(`${API_BASE_URL}/auth/signup`, body, { timeout: 5000 });
  // 응답이 data.data 또는 data 두 가지 구조 모두 대응
  return res.data?.data ?? res.data;
};

export const reissueApi = async (refreshToken: string): Promise<TokenResponse> => {
  const res = await axios.post(`${API_BASE_URL}/auth/reissue`, { refreshToken });
  return res.data?.data ?? res.data;
};

export const checkIdDuplicateApi = async (
  loginId: string,
): Promise<{ isDuplicate: boolean }> => {
  const res = await axios.get(`${API_BASE_URL}/auth/check-id`, {
    params: { loginId },
  });
  return res.data.data;
};

export const checkPhoneDuplicateApi = async (
  phone: string,
): Promise<{ isDuplicate: boolean }> => {
  const res = await axios.get(`${API_BASE_URL}/auth/check-phone`, {
    params: { phone },
  });
  return res.data.data;
};

export const findMaskedIdApi = async (
  name: string,
  phone: string,
): Promise<string> => {
  const res = await axios.post(`${API_BASE_URL}/auth/find-id`, null, {
    params: { name, phone },
  });
  return res.data.data;
};

export const sendTempPasswordApi = async (
  loginId: string,
  email: string,
): Promise<void> => {
  await axios.post(`${API_BASE_URL}/auth/find-password`, null, {
    params: { loginId, email },
  });
};

export const requestEmailVerificationApi = async (email: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/auth/email/request`, null, { params: { email } });
};

export const verifyEmailCodeApi = async (
  email: string,
  code: string,
): Promise<void> => {
  await axios.post(`${API_BASE_URL}/auth/email/verify`, null, {
    params: { email, code },
  });
};

export const changePasswordApi = async (
  oldPassword: string,
  newPassword: string,
): Promise<void> => {
  const headers = await authHeader();
  await axios.patch(
    `${API_BASE_URL}/auth/password`,
    { oldPassword, newPassword },
    { headers },
  );
};

/** 로그인 성공 후 토큰·role을 AsyncStorage에 저장하는 헬퍼 */
export const saveTokens = async (tokens: TokenResponse): Promise<void> => {
  await AsyncStorage.setItem('userToken', tokens.accessToken);
  await AsyncStorage.setItem('refreshToken', tokens.refreshToken);
  if (tokens.role) await AsyncStorage.setItem('userRole', tokens.role);
};

/** 로그아웃 시 AsyncStorage 토큰 전체 삭제 헬퍼 */
export const clearTokens = async (): Promise<void> => {
  await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole', 'fcmToken']);
};