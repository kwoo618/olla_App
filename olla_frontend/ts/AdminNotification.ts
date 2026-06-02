import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

export interface AdminAlertItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  read?: boolean;
  isRead?: boolean;
}

export interface ExpiringMember {
  id: string;
  name: string;
  phone: string;
  endDate: string;
  dDay: number;
}

export const useAdminNotification = (navigation: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<AdminAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
  const [expiringLoading, setExpiringLoading] = useState(true);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('NO_TOKEN');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchExpiringMembers = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, { headers });

      // 백엔드 맵핑 바로 접근 (없을 경우 앱 터짐 방지용 || [] 만 추가)
      const rawExpiring = response.data.data.expiringMembers || [];

      const parsed: ExpiringMember[] = rawExpiring.map((m: any, idx: number) => {
        return {
          id: `expiring_${m.name ?? ''}_${idx}`,
          name: m.name ?? '-',
          phone: m.phone ?? '-',
          endDate: m.endDate ?? '-',
          dDay: m.dDay ?? 0,
        };
      });

      setExpiringMembers(parsed);
    } catch (error: any) {
      if (error.message === 'NO_TOKEN') return;
      console.log('만료 임박 회원 로드 실패:', error);
    } finally {
      setExpiringLoading(false);
    }
  };

  const fetchAdminAlerts = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/admin/alerts?page=0&size=30`, { headers });

      // 백엔드 규칙대로 페이징 리스트는 content 안에 있음
      const list = response.data.data.content || [];
      
      setAlerts(list);
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
  };

  useEffect(() => {
    fetchAdminAlerts();
    fetchExpiringMembers();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAdminAlerts(), fetchExpiringMembers()]);
    setRefreshing(false);
  }, []);

  const toggleExpandAndRead = async (item: AdminAlertItem) => {
    if (!item || !item.id) return;
    const isCurrentlyExpanded = expandedId === item.id;
    setExpandedId(isCurrentlyExpanded ? null : item.id);

    const isItemRead = item.read === true || item.isRead === true;
    
    if (!isCurrentlyExpanded && !isItemRead) {
      try {
        const headers = await getAuthHeader();
        await axios.patch(`${API_BASE_URL}/admin/alerts/${item.id}/read`, {}, { headers });
        setAlerts(prev =>
          prev.map(alert => alert.id === item.id ? { ...alert, read: true, isRead: true } : alert)
        );
      } catch (error) {
        console.log('관리자 알림 읽음 처리 실패:', error);
      }
    }
  };

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