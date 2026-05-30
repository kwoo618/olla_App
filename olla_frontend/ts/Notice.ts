import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

// 💡 [API 명세서 대응] 이미지 상대경로 -> 절대경로 변환 유틸
export const getFullImageUrl = (path?: string) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  
  // API_BASE_URL이 '/api/v1'을 포함한다면 제거하고 도메인만 추출
  const domain = API_BASE_URL.replace('/api/v1', '');
  return `${domain}${path}`;
};

export interface Notice {
  id: number;
  important: boolean;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export const useNotice = (navigation: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // --- 모달 상태 관리 ---
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

  // --- API 통신 로직 ---
  const fetchNotices = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showResultModal('인증 오류', '로그인 정보가 없습니다.', 'error', () => {
          navigation.navigate('Login');
        });
        return;
      }

      // 관리자가 작성한 공지사항 목록 조회
      const response = await axios.get(`${API_BASE_URL}/admin/notices`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      
      const raw = response.data.data || [];
      const list: Notice[] = Array.isArray(raw) ? raw : [];

      // 정렬: 중요 공지가 위로, 그 다음 최신순 정렬
      list.sort((a, b) => {
        if (a.important !== b.important) return a.important ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setNotices(list);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '네트워크 연결을 확인해주세요.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [navigation, showResultModal]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotices();
    setRefreshing(false);
  }, [fetchNotices]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  return {
    loading,
    refreshing,
    notices,
    expandedId,
    toggleExpand,
    onRefresh,
    resultModalVisible,
    setResultModalVisible,
    resultModalConfig
  };
};