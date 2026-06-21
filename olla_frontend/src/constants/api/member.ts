// 프로필·FCM·알림설정 API
/**
 * src/api/member.ts
 *
 * 회원 프로필 조회·수정, FCM 토큰, 알림 설정 등 /members/* API 함수 모듈입니다.
 */

import axios from 'axios';
import { authHeader } from './apiClient';
import { API_BASE_URL } from '../Config';

// ─── API 함수 ─────────────────────────────────────────────────────────────────

/** 내 프로필 조회 */
export const fetchMyProfile = async () => {
  const headers = await authHeader();
  const res = await axios.get(`${API_BASE_URL}/members/me`, { headers });
  return res.data.data;
};

/** 타 회원 프로필 조회 */
export const fetchOtherProfile = async (memberId: number) => {
  const headers = await authHeader();
  const res = await axios.get(`${API_BASE_URL}/members/${memberId}/profile`, { headers });
  return res.data.data;
};

/** 내 기본 정보 수정 (PATCH /members/me/info) */
export const updateMyInfo = async (body: Record<string, unknown>) => {
  const headers = await authHeader();
  await axios.patch(`${API_BASE_URL}/members/me/info`, body, { headers });
};

/** 프로필 이미지 업로드 */
export const uploadProfileImage = async (formData: FormData): Promise<string> => {
  const headers = await authHeader();
  const res = await axios.post(`${API_BASE_URL}/members/me/profile-image`, formData, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return res.data.data?.imageUrl ?? res.data.data?.profileImageUrl ?? '';
};

/** FCM 토큰 서버 등록 */
export const registerFcmTokenApi = async (deviceToken: string): Promise<void> => {
  const headers = await authHeader();
  await axios.post(
    `${API_BASE_URL}/members/me/fcm-token`,
    { deviceToken },
    { headers },
  );
};

/** 알림 설정 조회 */
export const fetchNotificationSettings = async () => {
  const headers = await authHeader();
  const res = await axios.get(
    `${API_BASE_URL}/members/me/notifications/settings`,
    { headers },
  );
  return res.data.data;
};

/** 알림 설정 변경 */
export const updateNotificationSettings = async (
  body: Record<string, boolean>,
) => {
  const headers = await authHeader();
  const res = await axios.patch(
    `${API_BASE_URL}/members/me/notifications/settings`,
    body,
    { headers },
  );
  return res.data.data;
};

/** 회원 탈퇴 */
export const withdrawMemberApi = async (): Promise<void> => {
  const headers = await authHeader();
  await axios.delete(`${API_BASE_URL}/members/me`, { headers });
};