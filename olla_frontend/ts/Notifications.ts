// ============================================================
// useNotification.ts
// 알림 화면에서 사용하는 커스텀 훅
// - 알림 목록 조회 및 읽음 처리
// - 만료 임박 회원권(D-7 이내) 조회
// - 알림 펼치기/접기 토글 (펼칠 때 자동 읽음 처리)
// - pull-to-refresh
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

// 알림 단건 데이터 타입
export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isRead?: boolean;   // 읽음 여부 (서버 필드명 A)
  read?: boolean;     // 읽음 여부 (서버 필드명 B, 두 필드 모두 처리)
  important?: boolean;
}

// 만료 임박 회원권 단건 데이터 타입
export interface MyMembership {
  id: number;
  name: string;       // 회원권 이름 (예: "1개월 이용권")
  endDate: string;    // 만료일 (YYYY-MM-DD)
  dDay: number;       // 오늘 기준 남은 일수 (0 = 오늘 만료)
  status: string;     // 회원권 상태 (ACTIVE 등)
}

export const useNotification = (navigation: any) => {
  // 최초 데이터 로딩 여부
  const [loading, setLoading] = useState(true);
  // pull-to-refresh 진행 여부
  const [refreshing, setRefreshing] = useState(false);
  // 현재 펼쳐진 알림의 id (null이면 모두 접힌 상태)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 서버에서 받아온 알림 목록
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 만료 임박(D-7 이내) 활성 회원권 목록
  const [myMemberships, setMyMemberships] = useState<MyMembership[]>([]);
  // 회원권 로딩 여부 (알림 로딩과 별도 관리)
  const [membershipLoading, setMembershipLoading] = useState(true);

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
  const showResultModal = useCallback((
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'error' = 'info', 
    onConfirm: () => void = () => {}
  ) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  // AsyncStorage에서 JWT 토큰을 읽어 Authorization 헤더 객체로 반환
  // 토큰이 없으면 NO_TOKEN 에러를 throw해 호출부에서 분기 처리
  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('NO_TOKEN');
    return { Authorization: `Bearer ${token}` };
  };

  // 내 회원권 목록 조회 후 만료 임박(D-7 이내) 활성 회원권만 필터링
  // - 만료일이 없는 항목은 제외
  // - dDay < 0 (이미 만료) 또는 dDay > 7 (여유 있음)은 제외
  // - status가 ACTIVE인 것만 포함
  const fetchMyMemberships = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });

      // 서버 응답 구조 유연하게 처리 (배열 / data.content / data.memberships)
      const data = response.data?.data ?? response.data ?? {};
      const list: any[] = Array.isArray(data) ? data : data.content ?? data.memberships ?? [];

      // 오늘 자정(00:00:00) 기준으로 D-Day 계산
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiring: MyMembership[] = list
        .map((m: any) => {
          const endDate = m.endDate ?? m.end_date ?? null;
          if (!endDate) return null;
          
          const end = new Date(endDate);
          end.setHours(0, 0, 0, 0);
          const diffMs = end.getTime() - today.getTime();
          // 소수점 올림: 오늘 만료면 0, 내일 만료면 1
          const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          
          return {
            id: m.id ?? 0,
            name: m.name ?? m.membershipName ?? m.type ?? '이용권',
            endDate,
            dDay,
            status: m.status ?? 'ACTIVE',
          };
        })
        // null 제거 + D-Day 0~7 범위 + ACTIVE 상태만 남김
        .filter((m): m is MyMembership => m !== null && m.dDay >= 0 && m.dDay <= 7 && m.status === 'ACTIVE');

      setMyMemberships(expiring);
    } catch (error: any) {
      // 비로그인 상태면 조용히 종료
      if (error.message === 'NO_TOKEN') return;
      console.log('회원권 조회 실패:', error);
    } finally {
      setMembershipLoading(false);
    }
  }, []);

  // 알림 목록 조회 (최신 50건)
  // - NO_TOKEN이면 로그인 화면으로 이동
  // - 그 외 에러는 결과 모달로 안내
  const fetchNotifications = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/notifications?page=0&size=50`, { headers });

      // 서버 응답 구조가 다양하므로 여러 경로를 순서대로 시도
      let list: NotificationItem[] = [];
      if (response.data) {
        const dataObj = response.data.data || response.data;
        list = dataObj.content || dataObj.data?.content || dataObj.data || dataObj;
        if (!Array.isArray(list)) list = [];
      }

      setNotifications(list);
    } catch (error: any) {
      if (error.message === 'NO_TOKEN') {
        showResultModal('인증 오류', '로그인 정보가 없습니다.', 'error', () => navigation.navigate('Login'));
        return;
      }
      const errorMessage = error.response?.data?.message || '네트워크 연결을 확인해주세요.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [navigation, showResultModal]);

  // 컴포넌트 마운트 시 알림 목록 + 만료 임박 회원권 동시 로드
  useEffect(() => {
    fetchNotifications();
    fetchMyMemberships();
  }, [fetchNotifications, fetchMyMemberships]);

  // pull-to-refresh 핸들러: 알림 + 회원권 동시 재조회
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchNotifications(), fetchMyMemberships()]);
    setRefreshing(false);
  }, [fetchNotifications, fetchMyMemberships]);

  // 알림 행 탭 시 펼치기/접기 토글 + 미읽음 알림 자동 읽음 처리
  // - 이미 펼쳐진 알림을 탭하면 접기만 수행 (읽음 API 재호출 없음)
  // - 처음 펼치는 미읽음 알림은 PATCH API로 읽음 표시 후 로컬 상태 업데이트
  // - 읽음 처리 성공 시 DeviceEventEmitter로 'notificationRead' 이벤트 발행
  //   (탭바 뱃지 등 다른 컴포넌트가 읽음 변경을 감지할 수 있도록)
  const toggleExpandAndRead = useCallback(async (item: NotificationItem) => {
    if (!item || !item.id) return;
    
    const isCurrentlyExpanded = expandedId === item.id;
    setExpandedId(isCurrentlyExpanded ? null : item.id);

    // isRead / read 두 필드 중 하나라도 true면 이미 읽은 것으로 판단
    const isItemRead = item.isRead === true || item.read === true;
    
    // 새로 펼치는 동작이고 아직 읽지 않은 경우에만 읽음 처리
    if (!isCurrentlyExpanded && !isItemRead) {
      try {
        const headers = await getAuthHeader();
        await axios.patch(`${API_BASE_URL}/notifications/${item.id}/read`, {}, { headers });
        
        // 로컬 상태에서 해당 알림의 읽음 플래그 업데이트 (재조회 없이 즉시 반영)
        setNotifications(prev =>
          prev.map(noti => noti.id === item.id ? { ...noti, isRead: true, read: true } : noti)
        );
        // 탭바 등 외부 컴포넌트에 읽음 이벤트 전파
        DeviceEventEmitter.emit('notificationRead');
        
      } catch (error) {
        console.log('읽음 처리 실패:', error);
      }
    }
  }, [expandedId]);

  return {
    loading,
    refreshing,
    notifications,
    myMemberships,
    membershipLoading,
    expandedId,
    toggleExpandAndRead,
    onRefresh,
    resultModalVisible,
    setResultModalVisible,
    resultModalConfig,
  };
};