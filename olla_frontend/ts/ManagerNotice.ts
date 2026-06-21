// ============================================================
// useManagerNotice.ts
// 관리자 공지사항 화면에서 사용하는 커스텀 훅
// - 공지사항 목록 조회 및 정렬 (중요 공지 상단 고정, 최신순)
// - 공지사항 상세 조회
// - 공지사항 작성 / 수정 (이미지 업로드 포함)
// - 공지사항 삭제
// - 상세 / 작성·수정 바텀시트 애니메이션 (PanResponder 드래그 닫기)
// - 이미지 뷰어 열기/닫기
// - 결과 안내 모달 제어
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Platform, Dimensions, Animated, PanResponder } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_BASE_URL } from '../src/constants/Config'; // resolveImageUrl에서 계속 사용하므로 유지
import {
  getAdminNotices,
  getAdminNoticeDetail,
  createNotice,
  updateNotice,
  deleteNotice,
  uploadImage,
} from '../src/constants/api/admin';

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

// 서버에서 받아오는 공지사항 단건 타입
export interface Notice {
  id:         number;
  authorName: string;
  title:      string;
  content:    string;
  imageUrl:   string | null;
  createdAt:  string;
  important:  boolean;   // 중요 공지 여부 (목록 상단 고정 기준)
}

// 공지사항 작성/수정 요청 바디 타입
export interface NoticeBody {
  title:       string;
  content:     string;
  imageUrl:    string;
  important:   boolean;
  topFixed:    boolean;
  isImportant: boolean;
  isTopFixed:  boolean;
}

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

// ISO 날짜 문자열(YYYY-MM-DDTHH:mm:ss)에서 날짜 부분(YYYY-MM-DD)만 반환
export const formatDate = (isoString: string) => isoString?.split('T')[0] ?? '-';

// 서버에서 받은 이미지 경로를 실제로 사용 가능한 전체 URL로 변환
// - 이미 http/file/content 로 시작하는 경우 그대로 반환
// - 상대경로인 경우 API_BASE_URL에서 '/api/v1'을 제거한 도메인 루트에 붙여 반환
// - null / 'null' / 'undefined' 등 유효하지 않은 값은 빈 문자열 반환
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

// ─── 훅 본체 ──────────────────────────────────────────────────────────────────
export const useManagerNotice = (navigation: any, route: any) => {
  // 디바이스 화면 높이 기반 바텀시트 높이 계산
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.62; // 상세 모달: 화면의 62%
  const WRITE_MODAL_HEIGHT  = SCREEN_HEIGHT * 0.85; // 작성/수정 모달: 화면의 85%

  // ─── 목록 상태 ─────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);    // 최초 목록 로딩 여부
  const [refreshing, setRefreshing] = useState(false);   // pull-to-refresh 진행 여부
  const [notices, setNotices]       = useState<Notice[]>([]); // 공지사항 원본 배열

  // ─── 결과 안내 모달 ────────────────────────────────────────────────────────
  // API 성공/실패 결과를 사용자에게 알리는 공용 모달 상태
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState<{
    title: string; message: string; type: string; onConfirm: () => void;
  }>({ title: '', message: '', type: 'info', onConfirm: () => {} });

  // 결과 모달 열기 유틸 (title, message, type, 확인 콜백 수신)
  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  // 결과 모달 닫기 + onConfirm 실행
  const closeResultModal = useCallback(() => {
    setResultModalVisible(false);
    setResultModalConfig(prev => { prev.onConfirm?.(); return prev; });
  }, []);

  // ─── 상세 모달 상태 ────────────────────────────────────────────────────────
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailNotice, setDetailNotice]               = useState<Notice | null>(null); // 현재 상세 보기 중인 공지

  // 상세 바텀시트 애니메이션 값 (높이 기반 슬라이드)
  const detailHeightAnim  = useRef(new Animated.Value(0)).current;
  // 현재 상세 바텀시트의 스냅 높이 (드래그 기준점으로 사용)
  const currentDetailSnap = useRef(DETAIL_MODAL_HEIGHT);

  // 상세 바텀시트 드래그 핸들러 (PanResponder)
  // - 위로 드래그: 높이 증가 방지 (최대 고정)
  // - 아래로 드래그 → 원래 높이의 70% 미만이면 자동 닫힘
  // - 그 외엔 스프링 애니메이션으로 원위치 복귀
  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        // 드래그 시작 시점의 높이를 오프셋으로 설정
        detailHeightAnim.setOffset(currentDetailSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        // 위로 드래그(-dy)는 0으로 클램프, 아래로만 줄어들도록 제한
        detailHeightAnim.setValue(Math.min(0, -gs.dy));
      },
      onPanResponderRelease: (_, gs) => {
        detailHeightAnim.flattenOffset();
        const finalHeight = currentDetailSnap.current - gs.dy;
        if (finalHeight < currentDetailSnap.current * 0.7) {
          // 70% 미만으로 내려오면 모달 닫기
          closeDetailModal();
        } else {
          // 그 이상이면 원래 높이로 스프링 복귀
          Animated.spring(detailHeightAnim, { toValue: currentDetailSnap.current, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  // ─── 작성/수정 모달 상태 ───────────────────────────────────────────────────
  const [isWriteModalVisible, setWriteModalVisible] = useState(false);
  const [modalMode, setModalMode]                   = useState<'create' | 'edit'>('create'); // 현재 모달이 작성인지 수정인지
  const [selectedNoticeId, setSelectedNoticeId]     = useState<number | null>(null); // 수정 모드일 때 대상 공지 id
  const [newTitle, setNewTitle]                     = useState('');    // 제목 입력값
  const [newContent, setNewContent]                 = useState('');    // 내용 입력값
  const [isImportant, setIsImportant]               = useState(false); // 중요 공지 여부 토글
  const [saving, setSaving]                         = useState(false); // 저장 API 호출 중 여부
  const [selectedImageUri, setSelectedImageUri]     = useState('');   // 미리보기용 로컬/원격 이미지 URI
  const [uploadedImageUrl, setUploadedImageUrl]     = useState('');   // 서버에 업로드된 이미지 경로 (저장 시 전송)
  const [isImageUploading, setIsImageUploading]     = useState(false); // 이미지 업로드 중 여부

  // 작성/수정 바텀시트 애니메이션 값
  const writeHeightAnim  = useRef(new Animated.Value(0)).current;
  // 현재 작성/수정 바텀시트의 스냅 높이
  const currentWriteSnap = useRef(WRITE_MODAL_HEIGHT);

  // 작성/수정 바텀시트 드래그 핸들러 (상세 모달과 동일한 패턴)
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

  // ─── 삭제 확인 모달 상태 ───────────────────────────────────────────────────
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noticeToDelete, setNoticeToDelete]           = useState<number | null>(null); // 삭제 대기 중인 공지 id

  // ─── 이미지 뷰어 상태 ──────────────────────────────────────────────────────
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrl, setImageViewerUrl]         = useState(''); // 전체 화면으로 볼 이미지 URL

  // 이미지 뷰어 열기 (경로 변환 후 상태 저장)
  const openImageViewer = useCallback((url: string) => {
    const resolved = resolveImageUrl(url);
    if (!resolved) return;
    setImageViewerUrl(resolved);
    setImageViewerVisible(true);
  }, []);

  // 이미지 뷰어 닫기
  const closeImageViewer = useCallback(() => {
    setImageViewerVisible(false);
    setImageViewerUrl('');
  }, []);

  // ─── 정렬된 공지 목록 ──────────────────────────────────────────────────────
  // useMemo로 notices가 바뀔 때만 재계산
  // 정렬 기준: 1) 중요 공지 상단, 2) 최신 등록일 순
  const sortedNotices = useMemo(() =>
    [...notices].sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
    [notices],
  );

  // ─── API: 목록 조회 ────────────────────────────────────────────────────────
  // isRefresh=true이면 refreshing 스피너만 표시 (loading은 유지)
  const fetchNotices = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await getAdminNotices({ page: 0, size: 100, sort: 'createdAt,desc' });
      const list: Notice[] = res.data.data.content ?? [];
      setNotices(list);
    } catch (error: any) {
      showResultModal('오류', error.response?.data?.message ?? '공지사항을 불러오는데 실패했습니다.', 'error');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [showResultModal]);

  // ─── API: 공지 단건 상세 조회 ──────────────────────────────────────────────
  // 상세 모달 및 수정 모달 진입 시 최신 데이터 보장을 위해 별도 호출
  const fetchNoticeDetail = useCallback(async (id: number): Promise<Notice | null> => {
    try {
      const res = await getAdminNoticeDetail(id);
      return res.data.data ?? null;
    } catch (error: any) {
      showResultModal('오류', error.response?.data?.message ?? '공지 정보를 불러오는데 실패했습니다.', 'error');
      return null;
    }
  }, [showResultModal]);

  // pull-to-refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotices(true);
    setRefreshing(false);
  }, [fetchNotices]);

  // ─── 초기 로드 및 외부 편집 진입 처리 ────────────────────────────────────
  // 컴포넌트 마운트 시 목록 최초 로드
  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // 다른 화면에서 route.params.editNoticeId로 편집 진입 시 수정 모달 자동 오픈
  useEffect(() => {
    const editId = route?.params?.editNoticeId;
    if (editId) {
      openEditModalById(editId);
      // 처리 후 params 초기화 (뒤로갔다 돌아와도 재실행 방지)
      navigation?.setParams?.({ editNoticeId: undefined });
    }
  }, [route?.params?.editNoticeId]);

  // ─── 상세 모달 제어 ────────────────────────────────────────────────────────

  // 공지 클릭 → 상세 API 조회 → 바텀시트 슬라이드 업 애니메이션
  const openDetailModal = useCallback(async (notice: Notice) => {
    const detail = await fetchNoticeDetail(notice.id);
    if (!detail) return;
    setDetailNotice(detail);
    setDetailModalVisible(true);
    currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
    detailHeightAnim.setValue(0);
    // 모달이 렌더링된 직후 애니메이션 시작 (50ms 딜레이)
    setTimeout(() => {
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }, 50);
  }, [fetchNoticeDetail, DETAIL_MODAL_HEIGHT, detailHeightAnim]);

  // 상세 모달 닫기: 슬라이드 다운 → 상태 초기화 → 콜백 실행
  const closeDetailModal = useCallback((callback?: () => void) => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setDetailModalVisible(false);
      setDetailNotice(null);
      callback?.();
    });
  }, [detailHeightAnim]);

  // ─── 작성/수정 모달 제어 ──────────────────────────────────────────────────

  // 바텀시트 슬라이드 업 애니메이션 공통 함수
  const _openWriteSheetAnimation = useCallback(() => {
    currentWriteSnap.current = WRITE_MODAL_HEIGHT;
    writeHeightAnim.setValue(0);
    setTimeout(() => {
      Animated.timing(writeHeightAnim, { toValue: WRITE_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }, 50);
  }, [WRITE_MODAL_HEIGHT, writeHeightAnim]);

  // 새 공지 작성 모달 열기: 모든 폼 필드 초기화 후 바텀시트 열기
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

  // 기존 공지 수정 모달 열기: 공지 객체를 받아 상세 조회 후 폼에 채워 넣기
  const openEditModal = useCallback(async (notice: Notice) => {
    const detail = await fetchNoticeDetail(notice.id);
    if (!detail) return;
    setModalMode('edit');
    setSelectedNoticeId(detail.id);
    setNewTitle(detail.title);
    setNewContent(detail.content);
    setIsImportant(detail.important);
    const resolvedUrl = resolveImageUrl(detail.imageUrl);
    setSelectedImageUri(resolvedUrl);          // 미리보기용 전체 URL
    setUploadedImageUrl(detail.imageUrl ?? ''); // 저장 시 전송할 원본 경로
    setWriteModalVisible(true);
    _openWriteSheetAnimation();
  }, [fetchNoticeDetail, _openWriteSheetAnimation]);

  // id로 직접 수정 모달 열기 (외부 진입점: route.params 등에서 사용)
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

  // 작성/수정 모달 닫기: 슬라이드 다운 → 모달 숨김 → 콜백 실행
  const closeWriteModal = useCallback((callback?: () => void) => {
    Animated.timing(writeHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setWriteModalVisible(false);
      callback?.();
    });
  }, [writeHeightAnim]);

  // ─── 이미지 선택 및 업로드 ────────────────────────────────────────────────
  // 갤러리에서 이미지 선택 → 미리보기 즉시 반영 → 서버 업로드 → uploadedImageUrl 저장
  const handleSelectImage = useCallback(() => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.5, maxWidth: 1024, maxHeight: 1024 }, async (response) => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (!asset) return;

      // 선택 즉시 로컬 URI로 미리보기 반영
      setSelectedImageUri(asset.uri ?? '');

      try {
        setIsImageUploading(true);

        const formData = new FormData();
        formData.append('file', {
          uri:  Platform.OS === 'ios' ? asset.uri?.replace('file://', '') : asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `notice_${Date.now()}.jpg`,
        } as any);

        const uploadRes = await uploadImage(formData);

        // 서버 응답 형태가 string / object 양쪽 모두 대응
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

        // 미리보기는 전체 URL로, 저장 시 전송값은 서버 원본 경로로 분리 관리
        setSelectedImageUri(resolveImageUrl(uploadedUrl));
        setUploadedImageUrl(uploadedUrl);

      } catch (e: any) {
        showResultModal(
          '업로드 실패',
          e.response?.data?.message ?? e.message ?? '알 수 없는 오류',
          'error',
        );
        // 업로드 실패 시 이미지 상태 초기화
        setSelectedImageUri('');
        setUploadedImageUrl('');
      } finally {
        setIsImageUploading(false);
      }
    });
  }, [showResultModal]);

  // ─── 공지 저장 (작성/수정) ────────────────────────────────────────────────
  const handleSaveNotice = useCallback(async () => {
    // 제목/내용 미입력 방어
    if (!newTitle.trim() || !newContent.trim()) return;
    // 이미지 업로드 중에는 저장 차단
    if (isImageUploading) {
      showResultModal('안내', '이미지 업로드 완료 후 저장해주세요.', 'info');
      return;
    }
    setSaving(true);

    try {

       if (modalMode === 'create') {
        // 작성 모드: multipart/form-data로 전송
        // React Native에서 @RequestPart가 JSON을 인식하도록 type: 'application/json' 명시
        const formData = new FormData();
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

        await createNotice(formData);

      } else {
        // 수정 모드: JSON body로 PUT 요청
        await updateNotice(selectedNoticeId as number, {
          title:       newTitle.trim(),
          content:     newContent.trim(),
          imageUrl:    uploadedImageUrl,
          isImportant: isImportant,
        });
      }

      // 저장 성공 → 목록 갱신 → 모달 닫기 → 결과 안내 모달 표시
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

  // 삭제 확인 모달 열기 (id 저장 후 모달 표시)
  const confirmDelete = useCallback((id: number) => {
    setNoticeToDelete(id);
    setDeleteModalVisible(true);
  }, []);

  // 삭제 취소 (모달 닫기 + 대기 id 초기화)
  const cancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
    setNoticeToDelete(null);
  }, []);

  // 실제 삭제 API 호출 → 목록 갱신 → 결과 안내
  const executeDelete = useCallback(async () => {
    if (noticeToDelete === null) return;
    try {
      await deleteNotice(noticeToDelete as number);
      cancelDelete();
      await fetchNotices(true);
      setTimeout(() => showResultModal('성공', '공지사항이 삭제되었습니다.', 'success'), 300);
    } catch (error: any) {
      cancelDelete();
      setTimeout(() => showResultModal('오류', error.response?.data?.message ?? '삭제에 실패했습니다.', 'error'), 300);
    }
  }, [noticeToDelete, cancelDelete, showResultModal, fetchNotices]);

  // ─── 훅 사용 컴포넌트에 노출할 상태와 함수 반환 ──────────────────────────
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