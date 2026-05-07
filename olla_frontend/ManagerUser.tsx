import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// 💡 App.tsx에서 users와 setUsers를 받아옵니다.
const ManagerUser = ({ users, setUsers }: any) => {
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isAddModalVisible, setAddModalVisible] = useState(false);

  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'남자' | '여자' | null>(null);
  const [newBirth, setNewBirth] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
    setNewPhone(formatted);
  };

  const formatBirth = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    let formatted = numeric;
    if (numeric.length > 4 && numeric.length <= 6) {
      formatted = `${numeric.slice(0, 4)}/${numeric.slice(4)}`;
    } else if (numeric.length > 6) {
      formatted = `${numeric.slice(0, 4)}/${numeric.slice(4, 6)}/${numeric.slice(6, 8)}`;
    }
    setNewBirth(formatted);
  };

  const handleRegister = () => {
    if (!newName || !newGender || newBirth.length < 10 || newPhone.length < 12) return;
    const newUser = {
      id: Date.now(),
      name: newName,
      phone: newPhone,
      status: '미출석', // 💡 새로 추가된 회원은 기본적으로 '미출석' 상태
      ticket: null // 새로 추가된 회원은 티켓이 없음
    };
    setUsers([...users, newUser]);
    closeAddModal();
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setNewName(''); setNewGender(null); setNewBirth(''); 
    setNewEmail(''); setNewPhone('');
  };

  const confirmDelete = (id: number) => { setUserToDelete(id); setDeleteModalVisible(true); };
  const executeDelete = () => {
    if (userToDelete !== null) setUsers(users.filter((user: any) => user.id !== userToDelete));
    setDeleteModalVisible(false); setUserToDelete(null);
  };

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter((user: any) => 
      user.name.includes(searchQuery) || user.phone.includes(searchQuery)
    );
    return filtered.sort((a: any, b: any) => {
      const isKoreanA = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(a.name);
      const isKoreanB = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(b.name);
      if (isKoreanA && !isKoreanB) return -1; 
      if (!isKoreanA && isKoreanB) return 1;  
      return a.name.localeCompare(b.name);
    });
  }, [users, searchQuery]);

  const isFormValid = newName && newGender && newBirth.length === 10 && newPhone.length >= 12;

  return (
    <SafeAreaView style={styles.background} edges={['top', 'left', 'right']}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput style={styles.searchInput} placeholder="이름, 연락처 등으로 검색" placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colName]}>회원 정보</Text>
        <Text style={[styles.headerText, styles.colPhone, { textAlign: 'center' }]}>연락처</Text>
        {/* 💡 헤더 텍스트 변경: 현재 상태 -> 당일 출석 */}
        <Text style={[styles.headerText, styles.colStatus, { textAlign: 'center' }]}>당일 출석</Text>
        <Text style={[styles.headerText, styles.colAction, { textAlign: 'center' }]}>삭제</Text>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(insets.bottom + 100, 100) }]}
      >
        {filteredAndSortedUsers.length === 0 ? (
          <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
        ) : (
          filteredAndSortedUsers.map((user: any) => (
            <View key={user.id} style={styles.tableRow}>
              <Text style={[styles.rowTextBold, styles.colName]} numberOfLines={1}>{user.name}</Text>
              <Text style={[styles.rowText, styles.colPhone, { textAlign: 'center' }]}>{user.phone}</Text>
              <View style={[styles.colStatus, styles.centerAlign]}>
                {/* 💡 활동중 -> 출석으로 판단 기준 변경 */}
                <View style={[styles.badge, user.status === '출석' || user.status === '활동중' ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={user.status === '출석' || user.status === '활동중' ? styles.badgeTextActive : styles.badgeTextInactive}>
                    {user.status === '활동중' ? '출석' : (user.status === '비활중' ? '미출석' : user.status)}
                  </Text>
                </View>
              </View>
              <View style={[styles.colAction, styles.centerAlign]}>
                <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(user.id)}>
                  <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(insets.bottom + 30, 30) }]} 
        activeOpacity={0.8} 
        onPress={() => setAddModalVisible(true)}
      >
        <Text style={styles.fabText}>+ 등록</Text>
      </TouchableOpacity>

      {/* 모달 영역 */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.modalTitle}>삭제하시겠습니까?</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnYes} onPress={executeDelete}><Text style={styles.btnTextBlack}>예</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setDeleteModalVisible(false)}><Text style={styles.btnTextWhite}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isAddModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.addModalBox}>
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>신규 회원 등록</Text>
              <TouchableOpacity onPress={closeAddModal}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput style={styles.modalInput} placeholder="이름 입력" placeholderTextColor="#666" value={newName} onChangeText={setNewName} />
              <Text style={styles.inputLabel}>성별</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity style={[styles.genderBtn, newGender === '남자' && styles.genderBtnActive]} onPress={() => setNewGender('남자')}><Text style={[styles.genderBtnText, newGender === '남자' && styles.genderBtnTextActive]}>남자</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.genderBtn, newGender === '여자' && styles.genderBtnActive]} onPress={() => setNewGender('여자')}><Text style={[styles.genderBtnText, newGender === '여자' && styles.genderBtnTextActive]}>여자</Text></TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>생년월일</Text>
              <TextInput style={styles.modalInput} placeholder="YYYY/MM/DD" placeholderTextColor="#666" keyboardType="numeric" maxLength={10} value={newBirth} onChangeText={formatBirth} />
              <Text style={styles.inputLabel}>이메일 (선택)</Text>
              <TextInput style={styles.modalInput} placeholder="example@email.com" placeholderTextColor="#666" value={newEmail} onChangeText={setNewEmail} />
              <Text style={styles.inputLabel}>전화번호</Text>
              <TextInput style={styles.modalInput} placeholder="010-0000-0000" placeholderTextColor="#666" keyboardType="phone-pad" maxLength={13} value={newPhone} onChangeText={formatPhone} />
              <TouchableOpacity style={[styles.submitBtn, !isFormValid && { backgroundColor: '#444' }]} disabled={!isFormValid} onPress={handleRegister}>
                <Text style={[styles.submitBtnText, !isFormValid && { color: '#888' }]}>등록 완료</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 15 },
  searchContainer: { marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 15, height: 50 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 15 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5 },
  headerText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  headerDivider: { height: 1, backgroundColor: '#333333', marginBottom: 10 },
  listContainer: { flexGrow: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 5, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A' },
  rowTextBold: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  rowText: { color: '#CCCCCC', fontSize: 14 },
  centerAlign: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666666', fontSize: 15, textAlign: 'center', marginTop: 40 },
  colName: { flex: 2, paddingLeft: 10 },
  colPhone: { flex: 3 },
  colStatus: { flex: 2 },
  colAction: { flex: 1 },
  
  // 💡 배지 너비 고정(width: 65) 및 가운데 정렬로 통일
  badge: { width: 65, paddingVertical: 6, borderRadius: 20, alignItems: 'center' },
  badgeActive: { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeInactive: { backgroundColor: 'rgba(142, 142, 142, 0.2)' },
  badgeTextActive: { color: '#A1BE44', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  badgeTextInactive: { color: '#8E8E8E', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  
  trashBtn: { padding: 8 },
  trashIcon: { width: 20, height: 20, tintColor: '#FF4D4D', resizeMode: 'contain' },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  modalTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 25 },
  modalBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  addModalBox: { width: '90%', maxHeight: '80%', backgroundColor: '#212121', borderRadius: 20, padding: 20 },
  addModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addModalTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeIcon: { color: '#666', fontSize: 24 },
  inputLabel: { color: '#fff', fontSize: 13, marginBottom: 8, marginLeft: 2 },
  modalInput: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#444', borderRadius: 10, color: '#fff', padding: 12, marginBottom: 15 },
  genderRow: { flexDirection: 'row', marginBottom: 15 },
  genderBtn: { flex: 1, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#444', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginHorizontal: 4 },
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#666', fontWeight: 'bold' },
  genderBtnTextActive: { color: '#A1BE44' },
  submitBtn: { backgroundColor: '#A1BE44', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});

export default ManagerUser;