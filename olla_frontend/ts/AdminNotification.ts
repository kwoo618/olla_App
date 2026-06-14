// ============================================================
// useAdminNotification.ts
// 관리자 알림 화면에서 사용하는 커스텀 훅
// - 관리자 알림 목록 조회 / 읽음 처리
// - 만료 임박 회원 목록 조회
// - 결과 모달 상태 관리
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

// 관리자 알림 항목 하나의 타입 정의
export interface AdminAlertItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  read?: boolean;    // 백엔드 필드명 A
  isRead?: boolean;  // 백엔드 필드명 B (둘 다 대응)
}

// 만료 임박 회원 한 명의 타입 정의
export interface ExpiringMember {
  id: string;
  name: string;
  phone: string;
  endDate: string;
  dDay: number; // 만료까지 남은 일수 (음수면 이미 만료)
}

export const useAdminNotification = (navigation: any) => {
  // 새로고침(pull-to-refresh) 진행 여부
  const [refreshing, setRefreshing] = useState(false);

  // 현재 펼쳐진 알림 항목의 id (null이면 아무것도 펼쳐지지 않음)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 관리자 알림 목록
  const [alerts, setAlerts] = useState<AdminAlertItem[]>([]);

  // 알림 목록 로딩 여부
  const [loading, setLoading] = useState(true);

  // 만료 임박 회원 목록
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);

  // 만료 임박 회원 로딩 여부
  const [expiringLoading, setExpiringLoading] = useState(true);

  // 결과 안내 모달 표시 여부
  const [resultModalVisible, setResultModalVisible] = useState(false);

  // 결과 모달에 보여줄 내용 (제목, 메시지, 타입, 확인 콜백)
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  // 결과 모달을 열면서 내용을 세팅하는 함수
  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // 결과 모달을 닫고 onConfirm 콜백 실행
  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  // AsyncStorage에서 JWT 토큰을 꺼내 Authorization 헤더 객체로 반환
  // 토큰이 없으면 에러를 던져 호출부에서 처리하도록 함
  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('NO_TOKEN');
    return { Authorization: `Bearer ${token}` };
  };

  // 만료 임박 회원 목록을 서버에서 불러오는 함수
  const fetchExpiringMembers = async () => {
    try {
      const headers = await getAuthHeader();
      // 관리자 대시보드 API에서 만료 임박 회원 정보를 포함한 데이터를 받아옴
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, { headers });

      // 응답 데이터 내 expiringMembers 배열 추출 (없으면 빈 배열)
      const rawExpiring = response.data.data.expiringMembers || [];

      // 서버 응답 데이터를 ExpiringMember 타입에 맞게 변환
      const parsed: ExpiringMember[] = rawExpiring.map((m: any, idx: number) => {
        return {
          id: `expiring_${m.name ?? ''}_${idx}`, // 고유 id는 이름+인덱스로 생성
          name: m.name ?? '-',
          phone: m.phone ?? '-',
          endDate: m.endDate ?? '-',
          dDay: m.dDay ?? 0,
        };
      });

      setExpiringMembers(parsed);
    } catch (error: any) {
      // 토큰 없음 에러는 무시 (비로그인 상태)
      if (error.message === 'NO_TOKEN') return;
      console.log('만료 임박 회원 로드 실패:', error);
    } finally {
      setExpiringLoading(false);
    }
  };

  // 관리자 알림 목록을 서버에서 불러오는 함수
  const fetchAdminAlerts = async () => {
    try {
      const headers = await getAuthHeader();
      // 페이지 0, 사이즈 30으로 알림 목록 조회
      const response = await axios.get(`${API_BASE_URL}/admin/alerts?page=0&size=30`, { headers });

      // 페이징 응답에서 content 배열 추출
      const list = response.data.data.content || [];
      
      setAlerts(list);
    } catch (error: any) {
      // 토큰 없음 → 로그인 화면으로 이동
      if (error.message === 'NO_TOKEN') {
        showResultModal('인증 오류', '로그인 정보가 없습니다.', 'error', () => navigation.navigate('Login'));
        return;
      }
      // 그 외 에러는 메시지를 모달로 표시
      const errorMessage = error.response?.data?.message || '네트워크 연결을 확인해주세요.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 알림 목록과 만료 임박 회원을 동시에 불러옴
  useEffect(() => {
    fetchAdminAlerts();
    fetchExpiringMembers();
  }, []);

  // pull-to-refresh: 두 데이터를 동시에 재조회
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAdminAlerts(), fetchExpiringMembers()]);
    setRefreshing(false);
  }, []);

  // 알림 항목 클릭 시 펼치기/접기 + 읽음 처리
  const toggleExpandAndRead = async (item: AdminAlertItem) => {
    if (!item || !item.id) return;

    // 현재 클릭한 항목이 이미 열려 있으면 닫고, 아니면 열기
    const isCurrentlyExpanded = expandedId === item.id;
    setExpandedId(isCurrentlyExpanded ? null : item.id);

    // read / isRead 두 필드 중 하나라도 true면 이미 읽은 것으로 판단
    const isItemRead = item.read === true || item.isRead === true;
    
    // 새로 열리는 경우이고 아직 읽지 않은 경우에만 읽음 처리 API 호출
    if (!isCurrentlyExpanded && !isItemRead) {
      try {
        const headers = await getAuthHeader();
        // PATCH 요청으로 해당 알림을 읽음 상태로 변경
        await axios.patch(`${API_BASE_URL}/admin/alerts/${item.id}/read`, {}, { headers });
        // 로컬 상태도 즉시 업데이트 (서버 재조회 없이 UI 반영)
        setAlerts(prev =>
          prev.map(alert => alert.id === item.id ? { ...alert, read: true, isRead: true } : alert)
        );
      } catch (error) {
        console.log('관리자 알림 읽음 처리 실패:', error);
      }
    }
  };

  // 훅을 사용하는 컴포넌트에 필요한 상태와 함수들을 반환
  return {
    alerts,
    loading,
    expiringMembers,
    expiringLoading,
    refreshing,
    expandedId,
    resultModalVisible,
    resultModalConfig,
    onRefresh,
    toggleExpandAndRead,
    closeResultModal
  };
};