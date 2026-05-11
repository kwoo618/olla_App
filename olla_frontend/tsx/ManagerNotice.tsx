import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// API 설정 및 토큰 인터셉터 (기존 로직 유지)
const NOTICE_API   = `${API_BASE_URL}/admin/notices`;

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
  imageUrl:   string;
  createdAt:  string;
  important:  boolean;
}

interface NoticeBody {
  title:    string;
  content:  string;
  imageUrl: string;
  important: boolean;
}

const ManagerNotice = ({ route, navigation }: any) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── 커스텀 알림 모달 상태 추가 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // 💡 작성/수정 모달 상태 및 바텀 시트 애니메이션
  const [isWriteModalVisible, setWriteModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(800)).current;

  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [saving, setSaving] = useState(false);

  // 삭제 모달 상태
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<number | null>(null);

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

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(NOTICE_API, {
        params: { page: 0, size: 100, sort: 'createdAt,desc' },
      });
      const list: Notice[] = res.data?.data?.content ?? res.data?.content ?? [];
      setNotices(list);
    } catch {
      showResultModal('오류', '공지사항을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchNoticeDetail = async (id: number): Promise<Notice | null> => {
    try {
      const res = await axios.get(`${NOTICE_API}/${id}`);
      return res.data?.data ?? res.data ?? null;
    } catch {
      showResultModal('오류', '공지 정보를 불러오는데 실패했습니다.', 'error');
      return null;
    }
  };

  const formatDate = (isoString: string) => isoString?.split('T')[0] ?? '-';

  // 💡 작성/수정 모달 제어 함수 (애니메이션 포함)
  const openWriteModal = () => {
    setModalMode('create');
    setSelectedNoticeId(null);
    setNewTitle('');
    setNewContent('');
    setIsImportant(false);
    setWriteModalVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  // 기존 상세 조회 로직과 디자인 애니메이션 병합
  const openEditModal = async (notice: Notice) => {
    const detail = await fetchNoticeDetail(notice.id);
    if (!detail) return;
    
    setModalMode('edit');
    setSelectedNoticeId(detail.id);
    setNewTitle(detail.title);
    setNewContent(detail.content);
    setIsImportant(detail.important);
    setWriteModalVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const openEditModalById = async (id: number) => {
    const detail = await fetchNoticeDetail(id);
    if (!detail) return;
    setModalMode('edit');
    setSelectedNoticeId(detail.id);
    setNewTitle(detail.title);
    setNewContent(detail.content);
    setIsImportant(detail.important);
    setWriteModalVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closeWriteModal = () => {
    Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setWriteModalVisible(false);
    });
  };

  const handleSaveNotice = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);

    const body: NoticeBody = {
      title:     newTitle.trim(),
      content:   newContent.trim(),
      imageUrl:  '',
      important: isImportant,
    };

    try {
      if (modalMode === 'create') {
        await axios.post(NOTICE_API, body);
      } else {
        await axios.put(`${NOTICE_API}/${selectedNoticeId}`, body);
      }

      closeWriteModal(); // 💡 저장 성공 시 스르륵 닫히도록 변경
      showResultModal('성공', modalMode === 'create' ? '새 공지가 등록되었습니다.' : '공지가 수정되었습니다.', 'success');
      await fetchNotices();
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? '저장에 실패했습니다.';
      showResultModal('오류', msg, 'error');
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
      showResultModal('성공', '공지사항이 삭제되었습니다.', 'success');
      await fetchNotices();
    } catch {
      showResultModal('오류', '삭제에 실패했습니다.', 'error');
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sortedNotices.length === 0 ? (
          <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
        ) : (
          sortedNotices.map((notice) => (
            <View key={notice.id} style={styles.noticeCard}>
              <View style={styles.noticeContent}>
                <View style={styles.noticeHeaderRow}>
                  {notice.important && (
                    <View style={styles.noticeBadge}>
                      <Text style={styles.noticeBadgeText}>중요</Text>
                    </View>
                  )}
                  <Text style={styles.noticeTitle}>{notice.title}</Text>
                </View>
                <Text style={styles.noticeDate}>{formatDate(notice.createdAt)}</Text>
                {notice.authorName ? (
                  <Text style={styles.noticeAuthor}>{notice.authorName}</Text>
                ) : null}
              </View>

              <View style={styles.noticeActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(notice)}>
                  <Image source={require('../assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => confirmDelete(notice.id)}>
                  <Image source={require('../assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF4D4D' }]} />
                </TouchableOpacity>
              </View>
            </View>
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

      {/* 💡 작성 / 수정 바텀 시트 모달 (디자인 적용) */}
      <Modal visible={isWriteModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeWriteModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {modalMode === 'create' ? '새 공지 작성' : '공지 수정'}
                </Text>
                <TouchableOpacity onPress={closeWriteModal}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />

              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                  
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

                  <TouchableOpacity style={styles.checkboxRow} activeOpacity={0.8} onPress={() => setIsImportant(!isImportant)}>
                    <View style={[styles.checkbox, isImportant && styles.checkboxChecked]}>
                      {isImportant && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>중요 공지로 설정</Text>
                  </TouchableOpacity>

                  <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeWriteModal} disabled={saving}>
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
              </KeyboardAvoidingView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true}>
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

// ─────────────────────────── 스타일 (글씨 크기 및 여백 확대 적용) ───────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 20 },
  center:     { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  emptyText: { color: '#666', fontSize: 17, textAlign: 'center', marginTop: 60 }, // 💡 15 -> 17

  noticeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2C2C2C', borderRadius: 16, // 💡 12 -> 16
    paddingVertical: 18, paddingHorizontal: 20, // 💡 패딩 14, 16 -> 18, 20
    marginBottom: 15, borderWidth: 1, borderColor: '#333333', // 💡 마진 12 -> 15
  },

  noticeContent: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', paddingRight: 10 },

  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 }, // 💡 4 -> 6
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 }, // 💡 6, 2 -> 8, 4
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' }, // 💡 10 -> 12
  noticeTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', flex: 1 }, // 💡 15 -> 18

  noticeDate:   { color: '#999999', fontSize: 14 }, // 💡 12 -> 14
  noticeAuthor: { color: '#666666', fontSize: 13, marginTop: 4 }, // 💡 11 -> 13

  noticeActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn:  { padding: 8, marginLeft: 4 }, // 💡 6, 2 -> 8, 4
  deleteBtn: { backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 8 }, // 💡 삭제 버튼 강조
  actionIcon: { width: 22, height: 22, resizeMode: 'contain' }, // 💡 18 -> 22

  fab: {
    position: 'absolute', bottom: 15, right: 20, backgroundColor: '#A1BE44',
    paddingHorizontal: 25, paddingVertical: 18, borderRadius: 35, elevation: 5, // 💡 패딩 및 라운드 확대
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4
  },
  fabText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18

  // 💡 바텀 시트 모달 스타일
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxHeight: '90%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' }, // 💡 20 -> 23
  closeIcon: { color: '#999999', fontSize: 28, paddingHorizontal: 10 }, // 💡 24 -> 28
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  inputLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 10, marginLeft: 2 }, // 💡 14 -> 16
  textInput: {
    backgroundColor: '#000', borderWidth: 1, borderColor: '#333333',
    borderRadius: 12, color: '#ffffff', padding: 16, fontSize: 17, marginBottom: 20 // 💡 패딩 14 -> 16, 15 -> 17
  },
  contentInput: { height: 160, paddingTop: 16 }, // 💡 140 -> 160

  checkboxRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginTop: 5 }, // 💡 24 -> 25
  checkbox:        { width: 24, height: 24, borderWidth: 2, borderColor: '#666666', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, // 💡 22 -> 24
  checkboxChecked: { backgroundColor: '#A1BE44', borderColor: '#A1BE44' },
  checkmark:       { color: '#000000', fontSize: 16, fontWeight: 'bold' }, // 💡 14 -> 16
  checkboxLabel:   { color: '#ffffff', fontSize: 17 }, // 💡 15 -> 17

  btnRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn:    { flex: 1, backgroundColor: '#333333', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginRight: 6 }, // 💡 15 -> 18
  cancelBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
  registerBtn:  { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginLeft: 6 }, // 💡 15 -> 18
  registerBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18

  // 삭제 모달 스타일 (기존 중앙 팝업 통일)
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' }, // 💡 300 -> 320
  deleteTitle:    { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' }, // 💡 16 -> 20
  deleteBtnRow:   { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes:         { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginRight: 5 }, // 💡 12 -> 16
  btnNo:          { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginLeft: 5 }, // 💡 12 -> 16
  btnTextBlack:   { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
  btnTextWhite:   { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18

  // ─── 커스텀 알림 모달 전용 스타일 (통일) ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, // 💡 300 -> 320
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, // 💡 18 -> 20
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, // 💡 15 -> 17
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, // 💡 14 -> 16
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
});

export default ManagerNotice;