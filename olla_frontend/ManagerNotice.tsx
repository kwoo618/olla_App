import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Modal, TextInput, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ManagerNotice = () => {
  // 공지사항 데이터 상태 (updatedAt 추가)
  const [notices, setNotices] = useState([
    {
      id: 1,
      title: 'OLLA 클라이밍 센터 오픈 안내',
      content: '새로운 OLLA 클라이밍 센터가 오픈했습니다. 많은 관심 부탁드립니다!',
      date: '2026-04-05',
      isImportant: true,
      updatedAt: 1700000000000, 
    },
    {
      id: 2,
      title: '우천시에 따른 우산 및 물기 대비 공지',
      content: '비가 오는 날에는 센터 입구에 비치된 우산꽂이를 이용해 주시기 바랍니다.',
      date: '2026-04-05',
      isImportant: false,
      updatedAt: 1690000000000,
    },
  ]);

  // 💡 정렬 로직 (중요 공지 우선 -> 최근 수정순)
  const sortedNotices = useMemo(() => {
    return [...notices].sort((a, b) => {
      if (a.isImportant && !b.isImportant) return -1; // a가 중요면 위로
      if (!a.isImportant && b.isImportant) return 1;  // b가 중요면 위로
      // 중요도가 같으면 최근 수정일(updatedAt) 기준 내림차순
      return b.updatedAt - a.updatedAt;
    });
  }, [notices]);

  // 등록/수정 모달 상태
  const [isWriteModalVisible, setWriteModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  // 삭제 모달 상태
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<number | null>(null);

  const getToday = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  // 💡 작성 모달 열기
  const openWriteModal = () => {
    setModalMode('create');
    setNewTitle('');
    setNewContent('');
    setIsImportant(false);
    setWriteModalVisible(true);
  };

  // 💡 수정 모달 열기 (기존 정보 세팅)
  const openEditModal = (notice: any) => {
    setModalMode('edit');
    setSelectedNoticeId(notice.id);
    setNewTitle(notice.title);
    setNewContent(notice.content);
    setIsImportant(notice.isImportant);
    setWriteModalVisible(true);
  };

  // 💡 등록 및 수정 실행
  const handleSaveNotice = () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    if (modalMode === 'create') {
      const newNotice = {
        id: Date.now(),
        title: newTitle,
        content: newContent,
        date: getToday(),
        isImportant: isImportant,
        updatedAt: Date.now(), // 현재 시간 기록
      };
      setNotices([newNotice, ...notices]);
    } else {
      // 수정 모드일 때
      setNotices(notices.map(n => 
        n.id === selectedNoticeId 
          ? { ...n, title: newTitle, content: newContent, isImportant: isImportant, updatedAt: Date.now() } 
          : n
      ));
    }
    setWriteModalVisible(false);
  };

  // 💡 삭제 실행
  const confirmDelete = (id: number) => {
    setNoticeToDelete(id);
    setDeleteModalVisible(true);
  };

  const executeDelete = () => {
    if (noticeToDelete !== null) {
      setNotices(notices.filter(n => n.id !== noticeToDelete));
    }
    setDeleteModalVisible(false);
    setNoticeToDelete(null);
  };

  return (
    <SafeAreaView style={styles.background} edges={[]}>
      
      {/* 공지사항 리스트 영역 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sortedNotices.map((notice) => (
          <View key={notice.id} style={styles.noticeCard}>
            
            <View style={styles.noticeContent}>
              {notice.isImportant && (
                <View style={styles.importantBadge}>
                  <Text style={styles.importantBadgeText}>중요</Text>
                </View>
              )}
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.noticeDate}>{notice.date}</Text>
            </View>

            <View style={styles.noticeActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(notice)}>
                <Image source={require('./assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(notice.id)}>
                <Image source={require('./assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF4D4D' }]} />
              </TouchableOpacity>
            </View>
            
          </View>
        ))}
      </ScrollView>

      {/* 플로팅 작성 버튼 */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openWriteModal}>
        <Text style={styles.fabText}>+ 작성</Text>
      </TouchableOpacity>

      {/* ================================================================= */}
      {/* 💡 새 공지 작성 / 수정 모달 */}
      {/* ================================================================= */}
      <Modal visible={isWriteModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBox}>
            
            <Text style={styles.modalHeaderTitle}>
              {modalMode === 'create' ? '새 공지 작성' : '공지 수정'}
            </Text>

            {/* 공지 제목 */}
            <Text style={styles.inputLabel}>공지 제목</Text>
            <TextInput
              style={styles.textInput}
              placeholder="공지 제목을 입력해주세요."
              placeholderTextColor="#666666"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            {/* 공지 내용 */}
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

            {/* 중요 공지 설정 체크박스 */}
            <TouchableOpacity style={styles.checkboxRow} activeOpacity={0.8} onPress={() => setIsImportant(!isImportant)}>
              <View style={[styles.checkbox, isImportant && styles.checkboxChecked]}>
                {isImportant && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>중요 공지로 설정</Text>
            </TouchableOpacity>

            {/* 취소 / 등록하기 버튼 */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setWriteModalVisible(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.registerBtn, (!newTitle || !newContent) && { opacity: 0.5 }]} onPress={handleSaveNotice} disabled={!newTitle || !newContent}>
                <Text style={styles.registerBtnText}>{modalMode === 'create' ? '등록하기' : '수정하기'}</Text>
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* 💡 삭제 확인 모달 */}
      {/* ================================================================= */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>공지사항을 삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.btnYes} onPress={executeDelete}>
                <Text style={styles.btnTextBlack}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setDeleteModalVisible(false)}>
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
  scrollContent: { 
    paddingBottom: 100 
  },

  // 💡 크기가 축소된 카드 스타일
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2C',
    borderRadius: 12, // 기존 16에서 축소
    paddingVertical: 14, // 기존 20에서 축소
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
  
  noticeTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 }, // 폰트 크기 살짝 축소
  noticeDate: { color: '#999999', fontSize: 12 },
  
  noticeActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 6, marginLeft: 2 },
  actionIcon: { width: 18, height: 18, resizeMode: 'contain' },

  fab: { 
    position: 'absolute', bottom: 30, right: 20, backgroundColor: '#A1BE44', 
    paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 
  },
  fabText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  // ===================================
  // 작성/수정 모달 스타일
  // ===================================
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 20, 
    padding: 24 
  },
  modalHeaderTitle: { 
    color: '#ffffff', 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20,
    textAlign: 'center' 
  },
  inputLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  textInput: { 
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333', 
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

  // ===================================
  // 삭제 확인 모달 스타일
  // ===================================
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default ManagerNotice;