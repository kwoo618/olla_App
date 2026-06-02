import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  read?: boolean;
  important?: boolean;
}

export interface MyMembership {
  id: number;
  name: string;
  endDate: string;
  dDay: number;
  status: string;
}

export const useNotification = (navigation: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const [myMemberships, setMyMemberships] = useState<MyMembership[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(true);

  // --- 결과 모달 상태 ---
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error', 
    onConfirm: () => {} 
  });

  const showResultModal = useCallback((
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'error' = 'info', 
    onConfirm: () => void = () => {}
  ) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('NO_TOKEN');
    return { Authorization: `Bearer ${token}` };
  };

  // --- 내 회원권(만료 임박) 조회 ---
  const fetchMyMemberships = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });

      const data = response.data?.data ?? response.data ?? {};
      const list: any[] = Array.isArray(data) ? data : data.content ?? data.memberships ?? [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiring: MyMembership[] = list
        .map((m: any) => {
          const endDate = m.endDate ?? m.end_date ?? null;
          if (!endDate) return null;
          
          const end = new Date(endDate);
          end.setHours(0, 0, 0, 0);
          const diffMs = end.getTime() - today.getTime();
          const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          
          return {
            id: m.id ?? 0,
            name: m.name ?? m.membershipName ?? m.type ?? '이용권',
            endDate,
            dDay,
            status: m.status ?? 'ACTIVE',
          };
        })
        .filter((m): m is MyMembership => m !== null && m.dDay >= 0 && m.dDay <= 7 && m.status === 'ACTIVE');

      setMyMemberships(expiring);
    } catch (error: any) {
      if (error.message === 'NO_TOKEN') return;
      console.log('회원권 조회 실패:', error);
    } finally {
      setMembershipLoading(false);
    }
  }, []);

  // --- 알림 목록 조회 ---
  const fetchNotifications = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/notifications?page=0&size=50`, { headers });

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

  // --- 초기 로드 ---
  useEffect(() => {
    fetchNotifications();
    fetchMyMemberships();
  }, [fetchNotifications, fetchMyMemberships]);

  // --- 당겨서 새로고침 ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchNotifications(), fetchMyMemberships()]);
    setRefreshing(false);
  }, [fetchNotifications, fetchMyMemberships]);

  // --- 알림 펼치기 & 읽음 처리 ---
  const toggleExpandAndRead = useCallback(async (item: NotificationItem) => {
    if (!item || !item.id) return;
    
    const isCurrentlyExpanded = expandedId === item.id;
    setExpandedId(isCurrentlyExpanded ? null : item.id);

    const isItemRead = item.isRead === true || item.read === true;
    
    if (!isCurrentlyExpanded && !isItemRead) {
      try {
        const headers = await getAuthHeader();
        await axios.patch(`${API_BASE_URL}/notifications/${item.id}/read`, {}, { headers });
        
        setNotifications(prev =>
          prev.map(noti => noti.id === item.id ? { ...noti, isRead: true, read: true } : noti)
        );
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