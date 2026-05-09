import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.0.23:8080/api/v1';
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

  const [isWriteModalVisible, setWriteModalVisible] = useState(false);
  const [modalMode,           setModalMode]          = useState<'create' | 'edit'>('create');
  const [selectedNoticeId,    setSelectedNoticeId]   = useState<number | null>(null);
  const [newTitle,    setNewTitle]    = useState('');
  const [newContent,  setNewContent]  = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [saving,      setSaving]      = useState(false);

  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noticeToDelete,       setNoticeToDelete]      = useState<number | null>(null);

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
      Alert.alert('오류', '공지사항을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNoticeDetail = async (id: number): Promise<Notice | null> => {
    try {
      const res = await axios.get(`${NOTICE_API}/${id}`);
      return res.data?.data ?? res.data ?? null;
    } catch {
      Alert.alert('오류', '공지 정보를 불러오는데 실패했습니다.');
      return null;
    }
  };

  const formatDate = (isoString: string) => isoString?.split('T')[0] ?? '-';

  const openWriteModal = () => {
    setModalMode('create');
    setSelectedNoticeId(null);
    setNewTitle('');
    setNewContent('');
    setIsImportant(false);
    setWriteModalVisible(true);
  };

  const openEditModal = async (notice: Notice) => {
    const detail = await fetchNoticeDetail(notice.id);
    if (!detail) return;
    setModalMode('edit');
    setSelectedNoticeId(detail.id);
    setNewTitle(detail.title);
    setNewContent(detail.content);
    setIsImportant(detail.important);
    setWriteModalVisible(true);
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
      setWriteModalVisible(false);
      await fetchNotices();
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? '저장에 실패했습니다.';
      Alert.alert('오류', msg);
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
      await fetchNotices();
    } catch {
      Alert.alert('오류', '삭제에 실패했습니다.');
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
                <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(notice.id)}>
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

      <Modal visible={isWriteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBox}
          >
            <Text style={styles.modalHeaderTitle}>
              {modalMode === 'create' ? '새 공지 작성' : '공지 수정'}
            </Text>

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
              multiline
              textAlignVertical="top"
              value={newContent}
              onChangeText={setNewContent}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={() => setIsImportant(prev => !prev)}
            >
              <View style={[styles.checkbox, isImportant && styles.checkboxChecked]}>
                {isImportant && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>중요 공지로 설정</Text>
            </TouchableOpacity>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setWriteModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.registerBtn, (!newTitle.trim() || !newContent.trim() || saving) && { opacity: 0.5 }]}
                onPress={handleSaveNotice}
                disabled={!newTitle.trim() || !newContent.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.registerBtnText}>{modalMode === 'create' ? '등록하기' : '수정하기'}</Text>
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={isDeleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
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
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 20 },
  center:     { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center', marginTop: 60 },

  noticeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2C2C2C', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#333333',
  },

  noticeContent: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', paddingRight: 10 },

  // 수정한 스타일 (HomeScreen 스타일)
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 10, fontWeight: 'bold' },
  noticeTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', flex: 1 },

  noticeDate:   { color: '#999999', fontSize: 12 },
  noticeAuthor: { color: '#666666', fontSize: 11, marginTop: 2 },

  noticeActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn:  { padding: 6, marginLeft: 2 },
  actionIcon: { width: 18, height: 18, resizeMode: 'contain' },

  fab: {
    position: 'absolute', bottom: 30, right: 20,
    backgroundColor: '#A1BE44', paddingHorizontal: 20, paddingVertical: 15,
    borderRadius: 30, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '90%', backgroundColor: '#212121', borderRadius: 20, padding: 24 },
  modalHeaderTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },

  inputLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  textInput: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333',
    borderRadius: 12, color: '#ffffff', padding: 14, fontSize: 15, marginBottom: 16,
  },
  contentInput: { height: 140, paddingTop: 14 },

  checkboxRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 5 },
  checkbox:        { width: 22, height: 22, borderWidth: 2, borderColor: '#666666', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#A1BE44', borderColor: '#A1BE44' },
  checkmark:       { color: '#000000', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel:   { color: '#ffffff', fontSize: 15 },

  btnRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn:    { flex: 1, backgroundColor: '#333333', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginRight: 6 },
  cancelBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  registerBtn:  { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginLeft: 6 },
  registerBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteTitle:    { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  deleteBtnRow:   { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes:         { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo:          { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack:   { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  btnTextWhite:   { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default ManagerNotice;