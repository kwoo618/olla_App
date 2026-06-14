// ============================================================
// useNotice.ts
// 공지사항 화면에서 사용하는 커스텀 훅
// - 공지사항 목록 조회 (중요 공지 우선 정렬)
// - 공지사항 펼치기/접기 토글
// - 공지사항 이미지 뷰어 열기/닫기
// - pull-to-refresh
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

// 서버에서 받아온 이미지 경로를 완전한 URL로 변환하는 유틸 함수
// - null/undefined/'null'/'undefined' 문자열이면 null 반환
// - 이미 완전한 URL(http, file, content 프로토콜)이면 그대로 반환
// - 상대 경로라면 API 도메인을 앞에 붙여 절대 URL로 변환
export const getFullImageUrl = (path?: string | null): string | null => {
  if (!path || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

// 공지사항 단건 데이터 타입
export interface Notice {
  id: number;
  important: boolean;   // 중요 공지 여부 (true면 목록 상단 고정)
  title: string;
  content: string;
  imageUrl?: string;    // 첨부 이미지 경로 (없을 수도 있음)
  createdAt: string;    // 작성 일시 (ISO 8601)
}

export const useNotice = (navigation: any) => {
  // 최초 데이터 로딩 여부 (스켈레톤/스피너 표시용)
  const [loading, setLoading] = useState(true);
  // pull-to-refresh 진행 여부
  const [refreshing, setRefreshing] = useState(false);
  // 서버에서 받아온 공지사항 목록 (중요 공지 우선 → 최신순 정렬된 상태로 저장)
  const [notices, setNotices] = useState<Notice[]>([]);
  // 현재 펼쳐진 공지사항의 id (null이면 모두 접힌 상태)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 결과 안내 모달 표시 여부
  const [resultModalVisible, setResultModalVisible] = useState(false);
  // 결과 안내 모달에 표시할 제목/메시지/타입/콜백
  const [resultModalConfig, setResultModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
    onConfirm: () => {},
  });

  // 이미지 전체화면 뷰어 표시 여부
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  // 이미지 뷰어에 표시할 완전한 이미지 URL
  const [imageViewerUrl, setImageViewerUrl] = useState('');

  // 결과 모달을 열고 내용을 설정하는 헬퍼 함수
  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  // 공지사항 이미지를 전체화면으로 열기
  // - 경로를 절대 URL로 변환하고, 유효하지 않으면 아무것도 하지 않음
  const openImageViewer = useCallback((url?: string | null) => {
    const resolved = getFullImageUrl(url);
    if (!resolved) return;
    setImageViewerUrl(resolved);
    setImageViewerVisible(true);
  }, []);

  // 이미지 전체화면 뷰어 닫기 및 URL 초기화
  const closeImageViewer = useCallback(() => {
    setImageViewerVisible(false);
    setImageViewerUrl('');
  }, []);

  // 공지사항 목록 API 조회
  // - 로그인 토큰이 있으면 인증 헤더 포함, 없어도 공개 공지는 조회 가능
  // - 중요 공지(important: true)를 앞으로, 같은 그룹 내에서는 최신순 정렬
  const fetchNotices = useCallback(async () => {
    try {
      // 토큰 조회 실패해도 비로그인 상태로 계속 진행
      let token: string | null = null;
      try {
        token = await AsyncStorage.getItem('userToken');
      } catch (e) {
        // AsyncStorage 초기화 전 에러 → 토큰 없이 진행
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${API_BASE_URL}/notices`, { headers });

      // 서버 응답 구조: response.data.data.content (페이지네이션 형태)
      const raw = response.data.data.content || [];
      const list: Notice[] = Array.isArray(raw) ? raw : [];

      // 중요 공지 우선, 같은 중요도 내에서는 최신순 정렬
      list.sort((a, b) => {
        if (a.important !== b.important) return a.important ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setNotices(list);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '네트워크 연결을 확인해주세요.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      // 성공/실패 여부에 관계없이 로딩 종료
      setLoading(false);
    }
  }, [showResultModal]);

  // 컴포넌트 마운트 시 공지사항 최초 로드
  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // pull-to-refresh 핸들러: 목록 재조회 후 refreshing 해제
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotices();
    setRefreshing(false);
  }, [fetchNotices]);

  // 공지사항 행 탭 시 펼치기/접기 토글
  // - 이미 펼쳐진 항목을 다시 탭하면 접음 (null로 설정)
  // - 다른 항목을 탭하면 해당 항목만 펼침
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
    imageViewerVisible,
    imageViewerUrl,
    openImageViewer,
    closeImageViewer,
  };
};