import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.0.8:8080/api/v1';
const NOTICE_API = `${API_BASE_URL}/admin/notices`;

interface Notice {
  id: number;
  authorName: string;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: string;
  important: boolean;
}

const ManagerNotice = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // 💡 애니메이션 설정
  const [isWriteModalVisible, setWriteModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(800)).current;

  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<number | null>(null);

  // ✅ 정렬: 중요 공지 우선 → 최신순
  const sortedNotices = useMemo(() => {
    return [...notices].sort((a, b) => {
      if (a.important && !b.important) return -1;
      if (!a.important && b.important) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notices]);

  const getToken = async () => {
    return await AsyncStorage.getItem('userToken');
  };

  // ✅ 목록 조회
  const fetchNotices = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.get(NOTICE_API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 100, sort: 'createdAt,desc' }
      });
      const data = response.data;
      // 페이지네이션 응답 or 배열 모두 대응
      const list: Notice[] = data?.content || data?.data?.content || data?.data || data || [];
      setNotices(list);
    } catch (error) {
      Alert.alert('오류', '공지사항을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    return isoString.split('T')[0];
  };

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

  const openEditModal = (notice: Notice) => {
    setModalMode('edit');
    setSelectedNoticeId(notice.id);
    setNewTitle(notice.title);
    setNewContent(notice.content);
    setIsImportant(notice.important);
    setWriteModalVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closeWriteModal = () => {
    Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setWriteModalVisible(false);
    });
  };

  // ✅ 등록 / 수정 저장
  const handleSaveNotice = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);

    try {
      const token = await getToken();
      const body = {
        title: newTitle,
        content: newContent,
        imageUrl: '',
        important: isImportant,
      };

      if (modalMode === 'create') {
        await axios.post(NOTICE_API, body, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.put(`${NOTICE_API}/${selectedNoticeId}`, body, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      closeWriteModal(); // 💡 저장 성공 시 스르륵 닫히도록 변경
      await fetchNotices();
    } catch (error: any) {
      const msg = error?.response?.data?.message || '저장에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setSaving(false);
    }
  };

  // ✅ 삭제 확인
  const confirmDelete = (id: number) => {
    setNoticeToDelete(id);
    setDeleteModalVisible(true);
  };

  // ✅ 삭제 실행
  const executeDelete = async () => {
    if (noticeToDelete === null) return;
    try {
      const token = await getToken();
      await axios.delete(`${NOTICE_API}/${noticeToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteModalVisible(false);
      setNoticeToDelete(null);
      await fetchNotices();
    } catch (error) {
      Alert.alert('오류', '삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
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
                {notice.important && (
                  <View style={styles.importantBadge}>
                    <Text style={styles.importantBadgeText}>중요</Text>
                  </View>
                )}
                <Text style={styles.noticeTitle}>{notice.title}</Text>
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

      {/* 작성 FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openWriteModal}>
        <Text style={styles.fabText}>+ 작성</Text>
      </TouchableOpacity>

      {/* 💡 작성 / 수정 바텀 시트 모달 */}
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

      {/* 삭제 확인 모달 (중앙 알림창 형태 유지) */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>공지사항을 삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.btnYes} onPress={executeDelete}>
                <Text style={styles.btnTextBlack}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => { setDeleteModalVisible(false); setNoticeToDelete(null); }}>
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
  background: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingTop: 20
  },
  scrollContent: { paddingBottom: 100 },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center', marginTop: 60 },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  noticeContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingRight: 10,
  },
  importantBadge: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  importantBadgeText: { color: '#FF4D4D', fontSize: 11, fontWeight: 'bold' },
  noticeTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  noticeDate: { color: '#999999', fontSize: 12 },
  noticeAuthor: { color: '#666666', fontSize: 11, marginTop: 2 },

  noticeActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 6, marginLeft: 2 },
  actionIcon: { width: 18, height: 18, resizeMode: 'contain' },

  fab: {
    position: 'absolute', bottom: 15, right: 20, backgroundColor: '#A1BE44',
    paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4
  },
  fabText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  // 💡 바텀 시트 모달 스타일
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxHeight: '90%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeIcon: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  inputLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  textInput: {
    backgroundColor: '#000', borderWidth: 1, borderColor: '#333333',
    borderRadius: 12, color: '#ffffff', padding: 14, fontSize: 15, marginBottom: 16
  },
  contentInput: { height: 140, paddingTop: 14 },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 5 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#666666', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#A1BE44', borderColor: '#A1BE44' },
  checkmark: { color: '#000000', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { color: '#ffffff', fontSize: 15 },

  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, backgroundColor: '#333333', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginRight: 6 },
  cancelBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  registerBtn: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginLeft: 6 },
  registerBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  // 삭제 모달 스타일 (기존 중앙 팝업)
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default ManagerNotice;