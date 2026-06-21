// /members/**, /memberships/**, /visit/**, /notices, /notifications 엔드포인트 모음
// 회원 개인 출석 데이터
// 공개 공지/사용자 알림
// (관리자용 /admin/notices, /admin/alerts와는 다른 엔드포인트이니 혼동 주의)
import apiClient from './apiClient';

// ── 프로필 ──
export const getMyProfile = () => apiClient.get('/members/me');

export const updateMyInfo = (requestBody: any) =>
  apiClient.patch('/members/me/info', requestBody);

export const getOtherMemberProfile = (memberId: number) =>
  apiClient.get(`/members/${memberId}/profile`);

export const uploadProfileImage = (formData: FormData) =>
  apiClient.post('/members/me/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });

// ── 이용권 ──
export const getMyMemberships = () => apiClient.get('/memberships/me');

// ── 회원권 보유 여부 확인 (기간권만 인정, 일일권/횟수권 제외) ──
// 기록 작성/삭제(Recode.ts), 추후 다른 화면에서도 공용으로 사용
export const fetchHasMembership = async (): Promise<boolean> => {
  try {
    const res: { data: { data: any } } = await getMyMemberships();
    const rawData = res.data.data;
    const dataList: any[] = Array.isArray(rawData) ? rawData : (rawData?.content || []);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const active = dataList.filter((m: any) => {
      const status = String(m.membershipStatus || m.status || '').toUpperCase();
      if (status === 'DELETED' || status === 'INACTIVE') return false;
      if (m.startDate) {
        const s = new Date(m.startDate); s.setHours(0, 0, 0, 0);
        if (s > today) return false; // 시작일이 미래인 이용권 제외
      }
      return true;
    });

    return active.some((m: any) => {
      const t = String(m.membershipType ?? '').toUpperCase();
      const isCountType = t.includes('COUNT') || t.includes('횟수') || t.includes('일일');
      if (isCountType) return false; // 일일권/횟수권 제외
      if (!m.endDate) return false;
      const end = new Date(m.endDate); end.setHours(23, 59, 59, 999);
      return end.getTime() >= Date.now();
    });
  } catch {
    return false;
  }
};

export const withdrawMember = () => apiClient.delete('/members/me');

// ── 알림 설정 ──
export const getNotificationSettings = () =>
  apiClient.get('/members/me/notifications/settings');

export const updateNotificationSettings = (requestBody: any) =>
  apiClient.patch('/members/me/notifications/settings', requestBody);

// ── FCM 토큰 ──
export const registerFcmToken = (deviceToken: string) =>
  apiClient.post('/members/me/fcm-token', { deviceToken });

// ── 출석/방문 ──
export const getQrToken = () => apiClient.get('/visit/qr');

export const getMyVisitHistory = (yearMonth: string) =>
  apiClient.get('/visit/my-history', { params: { yearMonth } });

// ── 공지사항 (공개) ──
// 관리자용 /admin/notices(admin.ts)와 다른, 비로그인도 조회 가능한 일반 공지 목록
export const getNotices = (params?: any) => apiClient.get('/notices', { params });

// ── 알림 (사용자) ──
// 관리자용 /admin/alerts(admin.ts)와 다른, 사용자 본인 알림함
export const getMyNotifications = (params?: any) =>
  apiClient.get('/notifications', { params });

export const markNotificationAsRead = (id: number) =>
  apiClient.patch(`/notifications/${id}/read`, {});