import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Platform, Dimensions, Animated, PanResponder } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_BASE_URL } from '../src/constants/Config';

const NOTICE_API = `${API_BASE_URL}/admin/notices`;

// axios 인터셉터 (앱 전역에서 한 번만 등록되도록 훅 밖에 선언)
axios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('토큰:', token);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error('토큰 가져오기 실패:', e);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 타입
export interface Notice {
  id:         number;
  authorName: string;
  title:      string;
  content:    string;
  imageUrl:   string | null;
  createdAt:  string;
  important:  boolean;
}

export interface NoticeBody {
  title:       string;
  content:     string;
  imageUrl:    string;
  important:   boolean;
  topFixed:    boolean;
  isImportant: boolean;
  isTopFixed:  boolean;
}

// 유틸
export const formatDate = (isoString: string) => isoString?.split('T')[0] ?? '-';

// 이미지 URL 변환 (MyPage의 getFullImageUrl 패턴과 동일하게 통일)
export const resolveImageUrl = (path: string | null | undefined): string => {
  if (!path || path === 'null' || path === 'undefined') return '';
  if (
    path.startsWith('http') ||
    path.startsWith('file:') ||
    path.startsWith('content:')
  ) return path;
  // 상대경로인 경우: API_BASE_URL에서 /api/v1 제거 후 도메인만 붙이기
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

export const useManagerNotice = (navigation: any, route: any) => {
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.62;
  const WRITE_MODAL_HEIGHT  = SCREEN_HEIGHT * 0.85;

  // 목록 상태
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notices, setNotices]       = useState<Notice[]>([]);

  // 결과 모달
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState<{
    title: string; message: string; type: string; onConfirm: () => void;
  }>({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  const closeResultModal = useCallback(() => {
    setResultModalVisible(false);
    setResultModalConfig(prev => { prev.onConfirm?.(); return prev; });
  }, []);

  // 상세 모달
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailNotice, setDetailNotice]               = useState<Notice | null>(null);

  const detailHeightAnim  = useRef(new Animated.Value(0)).current;
  const currentDetailSnap = useRef(DETAIL_MODAL_HEIGHT);

  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        detailHeightAnim.setOffset(currentDetailSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        detailHeightAnim.setValue(Math.min(0, -gs.dy));
      },
      onPanResponderRelease: (_, gs) => {
        detailHeightAnim.flattenOffset();
        const finalHeight = currentDetailSnap.current - gs.dy;
        if (finalHeight < currentDetailSnap.current * 0.7) {
          closeDetailModal();
        } else {
          Animated.spring(detailHeightAnim, { toValue: currentDetailSnap.current, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  // 작성/수정 모달
  const [isWriteModalVisible, setWriteModalVisible] = useState(false);
  const [modalMode, setModalMode]                   = useState<'create' | 'edit'>('create');
  const [selectedNoticeId, setSelectedNoticeId]     = useState<number | null>(null);
  const [newTitle, setNewTitle]                     = useState('');
  const [newContent, setNewContent]                 = useState('');
  const [isImportant, setIsImportant]               = useState(false);
  const [saving, setSaving]                         = useState(false);
  const [selectedImageUri, setSelectedImageUri]     = useState('');
  const [uploadedImageUrl, setUploadedImageUrl]     = useState('');
  const [isImageUploading, setIsImageUploading]     = useState(false);

  const writeHeightAnim  = useRef(new Animated.Value(0)).current;
  const currentWriteSnap = useRef(WRITE_MODAL_HEIGHT);

  const writePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        writeHeightAnim.setOffset(currentWriteSnap.current);
        writeHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        writeHeightAnim.setValue(Math.min(0, -gs.dy));
      },
      onPanResponderRelease: (_, gs) => {
        writeHeightAnim.flattenOffset();
        const finalHeight = currentWriteSnap.current - gs.dy;
        if (finalHeight < currentWriteSnap.current * 0.7) {
          closeWriteModal();
        } else {
          Animated.spring(writeHeightAnim, { toValue: currentWriteSnap.current, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  // 삭제 모달
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noticeToDelete, setNoticeToDelete]           = useState<number | null>(null);

  // 이미지 뷰어
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrl, setImageViewerUrl]         = useState('');

  const openImageViewer = useCallback((url: string) => {
    const resolved = resolveImageUrl(url);
    if (!resolved) return;
    setImageViewerUrl(resolved);
    setImageViewerVisible(true);
  }, []);

  const closeImageViewer = useCallback(() => {
    setImageViewerVisible(false);
    setImageViewerUrl('');
  }, []);

  // 정렬된 목록
  const sortedNotices = useMemo(() =>
    [...notices].sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
    [notices],
  );

  // ─── API ─────────────────────────────────────────────────────────────────
  const fetchNotices = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await axios.get(NOTICE_API, {
        params: { page: 0, size: 100, sort: 'createdAt,desc' },
      });
      const list: Notice[] = res.data.data.content ?? [];
      setNotices(list);
    } catch (error: any) {
      showResultModal('오류', error.response?.data?.message ?? '공지사항을 불러오는데 실패했습니다.', 'error');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [showResultModal]);

  const fetchNoticeDetail = useCallback(async (id: number): Promise<Notice | null> => {
    try {
      const res = await axios.get(`${NOTICE_API}/${id}`);
      return res.data.data ?? null;
    } catch (error: any) {
      showResultModal('오류', error.response?.data?.message ?? '공지 정보를 불러오는데 실패했습니다.', 'error');
      return null;
    }
  }, [showResultModal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotices(true);
    setRefreshing(false);
  }, [fetchNotices]);

  // 초기 로드 및 외부 편집 진입
  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  useEffect(() => {
    const editId = route?.params?.editNoticeId;
    if (editId) {
      openEditModalById(editId);
      navigation?.setParams?.({ editNoticeId: undefined });
    }
  }, [route?.params?.editNoticeId]);

  // ─── 상세 모달 제어 ───────────────────────────────────────────────────────
  const openDetailModal = useCallback(async (notice: Notice) => {
    const detail = await fetchNoticeDetail(notice.id);
    if (!detail) return;
    setDetailNotice(detail);
    setDetailModalVisible(true);
    currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
    detailHeightAnim.setValue(0);
    setTimeout(() => {
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }, 50);
  }, [fetchNoticeDetail, DETAIL_MODAL_HEIGHT, detailHeightAnim]);

  const closeDetailModal = useCallback((callback?: () => void) => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setDetailModalVisible(false);
      setDetailNotice(null);
      callback?.();
    });
  }, [detailHeightAnim]);

  // ─── 작성/수정 모달 제어 ──────────────────────────────────────────────────
  const _openWriteSheetAnimation = useCallback(() => {
    currentWriteSnap.current = WRITE_MODAL_HEIGHT;
    writeHeightAnim.setValue(0);
    setTimeout(() => {
      Animated.timing(writeHeightAnim, { toValue: WRITE_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }, 50);
  }, [WRITE_MODAL_HEIGHT, writeHeightAnim]);

  const openWriteModal = useCallback(() => {
    setModalMode('create');
    setSelectedNoticeId(null);
    setNewTitle('');
    setNewContent('');
    setIsImportant(false);
    setSelectedImageUri('');
    setUploadedImageUrl('');
    setWriteModalVisible(true);
    _openWriteSheetAnimation();
  }, [_openWriteSheetAnimation]);

  const openEditModal = useCallback(async (notice: Notice) => {
    const detail = await fetchNoticeDetail(notice.id);
    if (!detail) return;
    setModalMode('edit');
    setSelectedNoticeId(detail.id);
    setNewTitle(detail.title);
    setNewContent(detail.content);
    setIsImportant(detail.important);
    const resolvedUrl = resolveImageUrl(detail.imageUrl);
    setSelectedImageUri(resolvedUrl);
    setUploadedImageUrl(detail.imageUrl ?? '');
    setWriteModalVisible(true);
    _openWriteSheetAnimation();
  }, [fetchNoticeDetail, _openWriteSheetAnimation]);

  const openEditModalById = useCallback(async (id: number) => {
    const detail = await fetchNoticeDetail(id);
    if (!detail) return;
    setModalMode('edit');
    setSelectedNoticeId(detail.id);
    setNewTitle(detail.title);
    setNewContent(detail.content);
    setIsImportant(detail.important);
    const resolvedUrl = resolveImageUrl(detail.imageUrl);
    setSelectedImageUri(resolvedUrl);
    setUploadedImageUrl(detail.imageUrl ?? '');
    setWriteModalVisible(true);
    _openWriteSheetAnimation();
  }, [fetchNoticeDetail, _openWriteSheetAnimation]);

  const closeWriteModal = useCallback((callback?: () => void) => {
    Animated.timing(writeHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setWriteModalVisible(false);
      callback?.();
    });
  }, [writeHeightAnim]);

  // ─── 이미지 선택 및 업로드 ────────────────────────────────────────────────
  const handleSelectImage = useCallback(() => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.5, maxWidth: 1024, maxHeight: 1024 }, async (response) => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (!asset) return;

      setSelectedImageUri(asset.uri ?? '');

      try {
        setIsImageUploading(true);

        const formData = new FormData();
        formData.append('file', {
          uri:  Platform.OS === 'ios' ? asset.uri?.replace('file://', '') : asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `notice_${Date.now()}.jpg`,
        } as any);

        const uploadRes = await axios.post(`${API_BASE_URL}/images`, formData, {
          timeout: 30000,
        });

        const dataObj = uploadRes.data?.data;
        let uploadedUrl: string | null = null;

        if (typeof dataObj === 'string' && dataObj.length > 0) {
          uploadedUrl = dataObj;
        } else if (dataObj && typeof dataObj === 'object') {
          uploadedUrl =
            dataObj.imageUrl ||
            dataObj.url ||
            dataObj.noticeImageUrl ||
            (Object.values(dataObj)[0] as string) ||
            null;
        }

        if (!uploadedUrl) throw new Error('서버에서 URL을 반환하지 않았습니다.');

        setSelectedImageUri(resolveImageUrl(uploadedUrl));
        setUploadedImageUrl(uploadedUrl);

      } catch (e: any) {
        showResultModal(
          '업로드 실패',
          e.response?.data?.message ?? e.message ?? '알 수 없는 오류',
          'error',
        );
        setSelectedImageUri('');
        setUploadedImageUrl('');
      } finally {
        setIsImageUploading(false);
      }
    });
  }, [showResultModal]);

  // ─── 공지 저장 ────────────────────────────────────────────────────────────
  const handleSaveNotice = useCallback(async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    if (isImageUploading) {
      showResultModal('안내', '이미지 업로드 완료 후 저장해주세요.', 'info');
      return;
    }
    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('userToken');

      if (modalMode === 'create') {
        const formData = new FormData();

        // ✅ 핵심 수정: React Native에서 @RequestPart가 인식하도록
        // type: 'application/json' 명시 → 백엔드 @RequestPart("request") 역직렬화 성공
        formData.append('request', {
          string: JSON.stringify({
            title:       newTitle.trim(),
            content:     newContent.trim(),
            imageUrl:    uploadedImageUrl,
            isImportant: isImportant,
          }),
          type: 'application/json',
          name: 'request',
        } as any);

        await axios.post(NOTICE_API, formData, {
          headers: {
            Authorization:  `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

      } else {
        // PUT은 JSON 그대로
        await axios.put(`${NOTICE_API}/${selectedNoticeId}`, {
          title:       newTitle.trim(),
          content:     newContent.trim(),
          imageUrl:    uploadedImageUrl,
          isImportant: isImportant,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      await fetchNotices(true);
      closeWriteModal(() => {
        setTimeout(() => {
          showResultModal('성공', modalMode === 'create' ? '새 공지가 등록되었습니다.' : '공지가 수정되었습니다.', 'success');
        }, 300);
      });

    } catch (error: any) {
      console.log('에러:', JSON.stringify(error?.response?.data));
      showResultModal('저장 실패', error?.response?.data?.message ?? `에러코드: ${error?.response?.status}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [newTitle, newContent, uploadedImageUrl,
    isImportant, isImageUploading, modalMode,
    selectedNoticeId, closeWriteModal, showResultModal,
    fetchNotices]);

  // ─── 공지 삭제 ────────────────────────────────────────────────────────────
  const confirmDelete = useCallback((id: number) => {
    setNoticeToDelete(id);
    setDeleteModalVisible(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
    setNoticeToDelete(null);
  }, []);

  const executeDelete = useCallback(async () => {
    if (noticeToDelete === null) return;
    try {
      await axios.delete(`${NOTICE_API}/${noticeToDelete}`);
      cancelDelete();
      await fetchNotices(true);
      setTimeout(() => showResultModal('성공', '공지사항이 삭제되었습니다.', 'success'), 300);
    } catch (error: any) {
      cancelDelete();
      setTimeout(() => showResultModal('오류', error.response?.data?.message ?? '삭제에 실패했습니다.', 'error'), 300);
    }
  }, [noticeToDelete, cancelDelete, showResultModal, fetchNotices]);

  return {
    // 목록
    loading, refreshing, sortedNotices, onRefresh,
    // 결과 모달
    resultModalVisible, resultModalConfig, closeResultModal,
    // 상세 모달
    isDetailModalVisible, detailNotice,
    detailHeightAnim, detailPanResponder,
    openDetailModal, closeDetailModal,
    // 작성/수정 모달
    isWriteModalVisible, modalMode,
    newTitle, setNewTitle,
    newContent, setNewContent,
    isImportant, setIsImportant,
    saving,
    selectedImageUri, isImageUploading,
    writeHeightAnim, writePanResponder,
    openWriteModal, openEditModal, closeWriteModal,
    handleSelectImage, handleSaveNotice,
    // 삭제 모달
    isDeleteModalVisible, noticeToDelete,
    confirmDelete, cancelDelete, executeDelete,
    // 이미지 뷰어
    imageViewerVisible, imageViewerUrl,
    openImageViewer, closeImageViewer,
  };
};