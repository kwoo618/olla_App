import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

export const getFullImageUrl = (path?: string | null): string | null => {
  if (!path || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
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

  // 모달 상태
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
    onConfirm: () => {},
  });

  // 이미지 뷰어 상태
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState('');

  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  const openImageViewer = useCallback((url?: string | null) => {
    const resolved = getFullImageUrl(url);
    if (!resolved) return;
    setImageViewerUrl(resolved);
    setImageViewerVisible(true);
  }, []);

  const closeImageViewer = useCallback(() => {
    setImageViewerVisible(false);
    setImageViewerUrl('');
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showResultModal('인증 오류', '로그인 정보가 없습니다.', 'error', () => {
          navigation.navigate('Login');
        });
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/admin/notices`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = response.data.data.content || [];
      const list: Notice[] = Array.isArray(raw) ? raw : [];

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
    resultModalConfig,
    // 이미지 뷰어
    imageViewerVisible,
    imageViewerUrl,
    openImageViewer,
    closeImageViewer,
  };
};