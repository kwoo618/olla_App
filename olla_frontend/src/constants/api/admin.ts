// /admin/** 엔드포인트 모음
import apiClient from './apiClient';

// ── 대시보드 ──
export const getDashboardStats = () => apiClient.get('/admin/dashboard');
export const getDashboardSummary = () => apiClient.get('/admin/dashboard/summary');

// ⚠️ 백엔드(AdminDashboardController)에 해당 매핑이 안 보임 — 위 "확인 필요" 2번 참고
export const getHourlyCongestion = (dayOfWeek: number) =>
  apiClient.get('/admin/dashboard/hourly', { params: { dayOfWeek } });

// ── 회원 관리 ──
export const getAdminMembers = (params: any) =>
  apiClient.get('/admin/memberships/members', { params });

export const registerOfflineMember = (requestBody: any) =>
  apiClient.post('/admin/members/offline', requestBody);

export const deleteMember = (memberId: number) =>
  apiClient.delete(`/admin/members/${memberId}`);

// ── 알림(관리자) ──
export const getAdminAlerts = (page = 0, size = 30) =>
  apiClient.get('/admin/alerts', { params: { page, size } });

export const markAdminAlertAsRead = (alertId: number) =>
  apiClient.patch(`/admin/alerts/${alertId}/read`, {});

export const sendAlertToMember = (memberId: number, title: string, content: string) =>
  apiClient.post('/admin/alerts/send', { memberId, title, content });

// ── 공지사항(관리자) ──
export const getAdminNotices = (params: any) =>
  apiClient.get('/admin/notices', { params });

export const getAdminNoticeDetail = (noticeId: number) =>
  apiClient.get(`/admin/notices/${noticeId}`);

export const createNotice = (formData: FormData) =>
  apiClient.post('/admin/notices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateNotice = (noticeId: number, requestBody: any) =>
  apiClient.put(`/admin/notices/${noticeId}`, requestBody);

export const deleteNotice = (noticeId: number) =>
  apiClient.delete(`/admin/notices/${noticeId}`);

// ── 이용권(관리자) ──
export const grantMembership = (requestBody: any) =>
  apiClient.post('/admin/memberships/grant', requestBody);

export const pauseMembership = (membershipId: number) =>
  apiClient.patch(`/admin/memberships/${membershipId}/pause`, {});

export const unpauseMembership = (membershipId: number) =>
  apiClient.patch(`/admin/memberships/${membershipId}/unpause`, {});

export const deleteMembership = (membershipId: number) =>
  apiClient.delete(`/admin/memberships/${membershipId}`);

// ── 방문/출입 ──
export const getTodayVisitDashboard = () => apiClient.get('/admin/visits/today');

export const scanVisitQr = (qrToken: string, deductionCount = 1) =>
  apiClient.post('/admin/visits/scan', { qrToken, deductionCount });

// ── 공용 이미지 업로드 ──
// ⚠️ ImageController는 도메인 전용이 아닌 범용 엔드포인트지만, 현재 ManagerNotice.ts(관리자
//    공지 이미지)에서만 쓰여서 일단 여기 배치. 다른 도메인에서도 쓰게 되면 분리 권장.
export const uploadImage = (formData: FormData) =>
  apiClient.post('/images', formData, { timeout: 30000 });