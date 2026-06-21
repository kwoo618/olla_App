// /auth/** 엔드포인트 모음
import apiClient from './apiClient';

export const login = (loginId: string, password: string) =>
  apiClient.post('/auth/login', { loginId, password });

export const logout = (refreshToken: string) =>
  apiClient.post('/auth/logout', { refreshToken });

export const signup = (requestBody: any) =>
  apiClient.post('/auth/signup', requestBody, { timeout: 5000 });

export const checkDuplicateId = (loginId: string) =>
  apiClient.get('/auth/check-id', { params: { loginId } });

export const checkDuplicatePhone = (phone: string) =>
  apiClient.get('/auth/check-phone', { params: { phone } });

export const requestEmailVerification = (email: string) =>
  apiClient.post('/auth/email/request', null, { params: { email } });

export const verifyEmailCode = (email: string, code: string) =>
  apiClient.post('/auth/email/verify', null, { params: { email, code } });

export const findId = (name: string, phone: string) =>
  apiClient.post('/auth/find-id', null, { params: { name, phone } });

export const findPassword = (loginId: string, email: string) =>
  apiClient.post('/auth/find-password', null, { params: { loginId, email } });

export const changePassword = (oldPassword: string, newPassword: string) =>
  apiClient.patch('/auth/password', { oldPassword, newPassword });

// /auth/reissue 는 apiClient 인터셉터 내부(401 처리)에서 직접 호출되므로 여기서 다루지 않음