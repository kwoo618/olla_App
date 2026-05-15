import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, RefreshControl, Dimensions, PanResponder, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_BASE_URL } from '../src/constants/Config';

const NOTICE_API = `${API_BASE_URL}/admin/notices`;

axios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error('토큰 가져오기 실패:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

interface Notice {
  id:         number;
  authorName: string;
  title:      string;
  content:    string;
  imageUrl:   string | null;
  createdAt:  string;
  important:  boolean;
}

interface NoticeBody {
  title:       string;
  content:     string;
  imageUrl:    string;
  important:   boolean;
  topFixed:    boolean;
  isImportant: boolean;
  isTopFixed:  boolean;
}

const ManagerNotice = ({ route, navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [notices, setNotices]       = useState<Notice[]>([]);
  const [loading, setLoading]       = useState(true);

  // ─── 커스텀 결과 알림 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // ─── 상세 보기 모달 상태 ───
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailNotice, setDetailNotice]               = useState<Notice | null>(null);
  const detailSlideAnim = useRef(new Animated.Value(800)).current;

  // ─── 작성/수정 모달 상태 및 드래그 애니메이션 ───
  const [isWriteModalVisible, setWriteModalVisible] = useState(false);
  const [modalMode, setModalMode]                   = useState<'create' | 'edit'>('create');
  const [selectedNoticeId, setSelectedNoticeId]     = useState<number | null>(null);

  const [newTitle, setNewTitle]               = useState('');
  const [newContent, setNewContent]           = useState('');
  const [isImportant, setIsImportant]         = useState(false);
  const [saving, setSaving]                   = useState(false);

  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  // 💡 모달 높이를 85% -> 92%로 확장하여 하단 버튼이 짤리지 않게 공간 확보
  const WRITE_MODAL_HEIGHT = SCREEN_HEIGHT * 0.85; 
  
  const writeHeightAnim = useRef(new Animated.Value(0)).current;
  const currentWriteSnap = useRef(WRITE_MODAL_HEIGHT);

  const writePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        writeHeightAnim.setOffset(currentWriteSnap.current);
        writeHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        writeHeightAnim.setValue(Math.min(0, -gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        writeHeightAnim.flattenOffset();
        const finalHeight = currentWriteSnap.current - gestureState.dy;
        const CLOSE_THRESHOLD = currentWriteSnap.current * 0.7; 

        if (finalHeight < CLOSE_THRESHOLD) {
          closeWriteModal();
        } else {
          Animated.spring(writeHeightAnim, { toValue: currentWriteSnap.current, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // ─── 삭제 모달 상태 ───
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noticeToDelete, setNoticeToDelete]           = useState<number | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  useEffect(() => {
    const editId = route?.params?.editNoticeId;
    if (editId) {
      openEditModalById(editId);
      navigation?.setParams?.({ editNoticeId: undefined });
    }
  }, [route?.params?.editNoticeId]);

  const sortedNotices = useMemo(() =>
    [...notices].sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
    [notices]
  );

  const fetchNotices = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await axios.get(NOTICE_API, {
        params: { page: 0, size: 100, sort: 'createdAt,desc' },
      });
      const list: Notice[] = res.data?.data?.data?.content ?? res.data?.data?.data ?? [];
      setNotices(list);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '공지사항을 불러오는데 실패했습니다.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotices(true);
    setRefreshing(false);
  }, []);

  const fetchNoticeDetail = async (id: number): Promise<Notice | null> => {
    try {
      const res = await axios.get(`${NOTICE_API}/${id}`);
      return res.data?.data?.data ?? null;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '공지 정보를 불러오는데 실패했습니다.';
      showResultModal('오류', errorMessage, 'error');
      return null;
    }
  };

  const formatDate = (isoString: string) => isoString?.split('T')[0] ?? '-';

  // ─── 상세 보기 모달 제어 ───
  const openDetailModal = async (notice: Notice) => {
    const detail = await fetchNoticeDetail(notice.id);
    if (!detail) return;
    setDetailNotice(detail);
    setDetailModalVisible(true);
    setTimeout(() => {
      Animated.timing(detailSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 50);
  };

  const closeDetailModal = (callback?: () => void) => {
    Animated.timing(detailSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setDetailModalVisible(false);
      setDetailNotice(null);
      if (callback) callback();
    });
  };

  // ─── 이미지 첨부 제어 ───
  const handleSelectImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        console.log('이미지 선택 오류:', response.errorMessage);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri ?? '';
        setSelectedImageUri(uri);
        setUploadedImageUrl(uri); // TODO: 추후 업로드 API 추가 시 서버 URL로 교체
      }
    });
  };

  const handleRemoveImage = () => {
    setSelectedImageUri('');
    setUploadedImageUrl('');
  };

  // ─── 작성/수정 모달 제어 ───
  const openWriteModal = () => {
    setModalMode('create');
    setSelectedNoticeId(null);
    setNewTitle('');
    setNewContent('');
    setIsImportant(false);
    setSelectedImageUri('');
    setUploadedImageUrl('');
    setWriteModalVisible(true);
    
    currentWriteSnap.current = WRITE_MODAL_HEIGHT;
    writeHeightAnim.setValue(0);
    setTimeout(() => {
      Animated.timing(writeHeightAnim, { toValue: WRITE_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }, 50);
  };

  const openEditModal = async (notice: Notice) => {
    const detail = await fetchNoticeDetail(notice.id);
    if (!detail) return;
    
    setModalMode('edit');
    setSelectedNoticeId(detail.id);
    setNewTitle(detail.title);
    setNewContent(detail.content);
    setIsImportant(detail.important);
    setSelectedImageUri(detail.imageUrl ?? '');
    setUploadedImageUrl(detail.imageUrl ?? '');
    setWriteModalVisible(true);
    
    currentWriteSnap.current = WRITE_MODAL_HEIGHT;
    writeHeightAnim.setValue(0);
    setTimeout(() => {
      Animated.timing(writeHeightAnim, { toValue: WRITE_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }, 50);
  };

  const openEditModalById = async (id: number) => {
    const detail = await fetchNoticeDetail(id);
    if (!detail) return;
    
    setModalMode('edit');
    setSelectedNoticeId(detail.id);
    setNewTitle(detail.title);
    setNewContent(detail.content);
    setIsImportant(detail.important);
    setSelectedImageUri(detail.imageUrl ?? '');
    setUploadedImageUrl(detail.imageUrl ?? '');
    setWriteModalVisible(true);
    
    currentWriteSnap.current = WRITE_MODAL_HEIGHT;
    writeHeightAnim.setValue(0);
    setTimeout(() => {
      Animated.timing(writeHeightAnim, { toValue: WRITE_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }, 50);
  };

  const closeWriteModal = (callback?: () => void) => {
    Animated.timing(writeHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setWriteModalVisible(false);
      if (callback) callback();
    });
  };

  // ─── 공지 저장 및 삭제 제어 ───
  const handleSaveNotice = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);

    const body: NoticeBody = {
      title:       newTitle.trim(),
      content:     newContent.trim(),
      imageUrl:    uploadedImageUrl,
      important:   isImportant,
      topFixed:    isImportant,
      isImportant: isImportant,
      isTopFixed:  isImportant,
    };

    try {
      if (modalMode === 'create') {
        await axios.post(NOTICE_API, body);
      } else {
        await axios.put(`${NOTICE_API}/${selectedNoticeId}`, body);
      }
      closeWriteModal(() => {
        setTimeout(() => {
          showResultModal('성공', modalMode === 'create' ? '새 공지가 등록되었습니다.' : '공지가 수정되었습니다.', 'success');
        }, 300);
      });
      await fetchNotices(true);
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? '저장에 실패했습니다.';
      closeWriteModal(() => {
        setTimeout(() => {
          showResultModal('오류', msg, 'error');
        }, 300);
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: number) => {
    setNoticeToDelete(id);
    setDeleteModalVisible(true);
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setNoticeToDelete(null);
  };

  const executeDelete = async () => {
    if (noticeToDelete === null) return;
    try {
      await axios.delete(`${NOTICE_API}/${noticeToDelete}`);
      cancelDelete();
      setTimeout(() => {
        showResultModal('성공', '공지사항이 삭제되었습니다.', 'success');
      }, 300);
      await fetchNotices(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '삭제에 실패했습니다.';
      cancelDelete();
      setTimeout(() => {
        showResultModal('오류', errorMessage, 'error');
      }, 300);
    }
  };

  if (loading) {
    return (
      <View style={[styles.background, styles.center]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.background} edges={[]}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
      >
        {sortedNotices.length === 0 ? (
          <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
        ) : (
          sortedNotices.map((notice) => (
            // 카드 전체 터치 시 상세 모달 오픈
            <TouchableOpacity key={notice.id} style={styles.noticeCard} activeOpacity={0.75} onPress={() => openDetailModal(notice)}>
              <View style={styles.noticeContent}>
                <View style={styles.noticeHeaderRow}>
                  {notice.important && (
                    <View style={styles.noticeBadge}>
                      <Text style={styles.noticeBadgeText}>중요</Text>
                    </View>
                  )}
                  <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                </View>
                <Text style={styles.noticeDate}>{formatDate(notice.createdAt)}</Text>
                {notice.authorName ? (
                  <Text style={styles.noticeAuthor}>{notice.authorName}</Text>
                ) : null}
              </View>

              <View style={styles.noticeActions}>
                {/* 수정/삭제 버튼 터치 시 이벤트 전파(e.stopPropagation)를 차단하여 상세 모달이 열리지 않게 방지 */}
                <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); openEditModal(notice); }}>
                  <Image source={require('../assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={(e) => { e.stopPropagation(); confirmDelete(notice.id); }}>
                  <Image source={require('../assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openWriteModal}>
        <Text style={styles.fabText}>+ 작성</Text>
      </TouchableOpacity>

      {/* ─── 커스텀 알림 결과 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => {
              setResultModalVisible(false);
              if (typeof resultModalConfig.onConfirm === 'function') {
                resultModalConfig.onConfirm();
              }
            }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 상세 보기 바텀시트 모달 ─── */}
      <Modal visible={isDetailModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => closeDetailModal()}>
          <Animated.View style={[styles.detailBottomSheet, { transform: [{ translateY: detailSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle} numberOfLines={1}>공지 상세</Text>
                <TouchableOpacity onPress={() => closeDetailModal()}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {detailNotice?.important && (
                  <View style={styles.detailBadgeRow}>
                    <View style={styles.noticeBadge}>
                      <Text style={styles.noticeBadgeText}>중요</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.detailTitle}>{detailNotice?.title}</Text>

                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailMeta}>{formatDate(detailNotice?.createdAt ?? '')}</Text>
                  {detailNotice?.authorName ? (
                    <Text style={styles.detailMeta}> · {detailNotice.authorName}</Text>
                  ) : null}
                </View>

                <View style={styles.horizontalDivider} />

                {!!detailNotice?.imageUrl && (
                  <Image
                    source={{ uri: detailNotice.imageUrl }}
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.detailContent}>{detailNotice?.content}</Text>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => closeDetailModal(() => {
                      setTimeout(() => detailNotice && openEditModal(detailNotice), 100);
                    })}
                  >
                    <Text style={styles.cancelBtnText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.registerBtn, { backgroundColor: '#FF4D4D' }]}
                    onPress={() => closeDetailModal(() => {
                      setTimeout(() => detailNotice && confirmDelete(detailNotice.id), 100);
                    })}
                  >
                    <Text style={styles.registerBtnText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 작성 / 수정 바텀 시트 모달 (PanResponder 적용) ─── */}
      <Modal visible={isWriteModalVisible} animationType="fade" transparent={true} onRequestClose={() => closeWriteModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => closeWriteModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[styles.bottomSheet, { height: writeHeightAnim, overflow: 'hidden' }]}>
              
              <View {...writePanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>
                    {modalMode === 'create' ? '새 공지 작성' : '공지 수정'}
                  </Text>
                  <TouchableOpacity onPress={() => closeWriteModal()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horizontalDivider} />
              </View>

              {/* 💡 하단 버튼이 베젤에 잘리지 않도록 paddingBottom을 60으로 늘려 넉넉히 확보 */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.inputLabel}>공지 제목</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="공지 제목을 입력해주세요."
                  placeholderTextColor="#666666"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                <Text style={styles.inputLabel}>공지 내용</Text>
                <TextInput
                  style={[styles.textInput, styles.contentInput]}
                  placeholder="공지 내용을 입력해 주세요."
                  placeholderTextColor="#666666"
                  multiline={true}
                  textAlignVertical="top"
                  value={newContent}
                  onChangeText={setNewContent}
                />

                <Text style={styles.inputLabel}>이미지 첨부 (선택)</Text>
                <TouchableOpacity style={styles.imagePickerWrapper} activeOpacity={0.7} onPress={handleSelectImage}>
                  {selectedImageUri ? (
                    <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>탭하여 이미지 선택</Text>
                    </View>
                  )}
                  {selectedImageUri ? (
                    <View style={styles.imageEditOverlay}>
                      <Text style={styles.imageEditOverlayText}>수정</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                {selectedImageUri ? (
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={handleRemoveImage}>
                    <Text style={styles.imageRemoveBtnText}>✕ 이미지 제거</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={{ height: 20 }} />

                <TouchableOpacity style={styles.checkboxRow} activeOpacity={0.8} onPress={() => setIsImportant(!isImportant)}>
                  <View style={[styles.checkbox, isImportant && styles.checkboxChecked]}>
                    {isImportant && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>중요 공지로 설정</Text>
                </TouchableOpacity>

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => closeWriteModal()} disabled={saving}>
                    <Text style={styles.cancelBtnText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.registerBtn, (!newTitle || !newContent || saving) && { opacity: 0.5 }]}
                    onPress={handleSaveNotice}
                    disabled={!newTitle || !newContent || saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#000" />
                      : <Text style={styles.registerBtnText}>{modalMode === 'create' ? '등록하기' : '수정하기'}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ─── 삭제 확인 모달 ─── */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true} onRequestClose={cancelDelete}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>공지사항을 삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.btnYes} onPress={executeDelete}>
                <Text style={styles.btnTextBlack}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={cancelDelete}>
                <Text style={styles.btnTextWhite}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background:    { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 20 },
  center:        { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  emptyText:     { color: '#666', fontSize: 17, textAlign: 'center', marginTop: 60 },

  noticeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2C2C2C', borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 20,
    marginBottom: 15, borderWidth: 1, borderColor: '#333333',
  },
  noticeContent:   { flex: 1, flexDirection: 'column', alignItems: 'flex-start', paddingRight: 10 },
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noticeBadge:     { backgroundColor: '#A1BE44', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' },
  noticeTitle:     { color: '#ffffff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  noticeDate:      { color: '#999999', fontSize: 14 },
  noticeAuthor:    { color: '#666666', fontSize: 13, marginTop: 4 },
  noticeActions:   { flexDirection: 'row', alignItems: 'center' },
  actionBtn:       { padding: 8, marginLeft: 4 },
  deleteBtn:       { borderRadius: 8 },
  actionIcon:      { width: 22, height: 22, resizeMode: 'contain' },

  fab: {
    position: 'absolute', bottom: 15, right: 20, backgroundColor: '#A1BE44',
    paddingHorizontal: 25, paddingVertical: 18, borderRadius: 35, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet:       { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, width: '100%' },
  detailBottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxHeight: '90%' },
  dragHandle:        { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sheetTitle:        { color: '#ffffff', fontSize: 23, fontWeight: 'bold', flex: 1 },
  closeIcon:         { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  inputLabel:   { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 10, marginLeft: 2 },
  textInput:    { backgroundColor: '#000', borderWidth: 1, borderColor: '#333333', borderRadius: 12, color: '#ffffff', padding: 16, fontSize: 17, marginBottom: 20 },
  
  // 💡 본문 입력칸 높이 160 -> 140으로 최적화하여 버튼 공간 확보
  contentInput: { height: 140, paddingTop: 16 },

  // 💡 이미지 픽커 박스 높이 160 -> 140으로 최적화하여 버튼 공간 확보
  imagePickerWrapper: { width: '100%', height: 140, borderRadius: 12, backgroundColor: '#2C2C2C', overflow: 'hidden', borderWidth: 1, borderColor: '#444444', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  imagePreview:       { width: '100%', height: '100%' },
  imagePlaceholder:   { alignItems: 'center' },
  imagePlaceholderText: { color: '#666666', fontSize: 15 },
  imageEditOverlay:   { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, alignItems: 'center' },
  imageEditOverlayText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  imageRemoveBtn:     { alignItems: 'flex-end', paddingRight: 5 },
  imageRemoveBtnText: { color: '#FF4D4D', fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },

  checkboxRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginTop: 5 },
  checkbox:        { width: 24, height: 24, borderWidth: 2, borderColor: '#666666', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#A1BE44', borderColor: '#A1BE44' },
  checkmark:       { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel:   { color: '#ffffff', fontSize: 17 },

  btnRow:          { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn:       { flex: 1, backgroundColor: '#333333', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginRight: 6 },
  cancelBtnText:   { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  registerBtn:     { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginLeft: 6 },
  registerBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  // 상세 보기 전용 스타일
  detailBadgeRow: { flexDirection: 'row', marginBottom: 10 },
  detailTitle:    { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 8, lineHeight: 30 },
  detailMetaRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  detailMeta:     { color: '#999999', fontSize: 14 },
  detailImage:    { width: '100%', height: 200, borderRadius: 12, marginBottom: 20, backgroundColor: '#2C2C2C' },
  detailContent:  { color: '#dddddd', fontSize: 16, lineHeight: 26, marginBottom: 30 },

  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox:     { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteTitle:        { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  deleteBtnRow:       { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes:             { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo:              { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack:       { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  btnTextWhite:       { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox:     { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle:   { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn:     { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default ManagerNotice;