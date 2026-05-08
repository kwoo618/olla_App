import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://172.29.145.90:8080/api/v1';
const MEMBER_LIST_API = `${API_BASE_URL}/admin/memberships/members`; 
const OFFLINE_REGISTER_API = `${API_BASE_URL}/admin/members/offline`; 
const MEMBER_DELETE_API = `${API_BASE_URL}/admin/members`; 

const ManagerUser = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalVisible, setAddModalVisible] = useState(false);

  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'남자' | '여자' | null>(null);
  const [newBirth, setNewBirth] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');

      if (!token || role !== 'ADMIN') {
        Alert.alert("권한 오류", "관리자만 접근할 수 있는 페이지입니다.");
        navigation.goBack();
        return;
      }
      await fetchUsers(token);
    } catch (error) {
      console.error("인증 확인 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      const response = await axios.get(MEMBER_LIST_API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 1000, sort: 'id,desc' } 
      });
      const memberList = response.data?.data?.content || response.data?.data || [];
      setUsers(memberList);
    } catch (error) {
      Alert.alert("오류", "회원 목록을 불러오는데 실패했습니다.");
    }
  };

  const isValidBirthDate = (dateStr: string) => {
    const regex = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regex.test(dateStr)) return false;
    
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const handleRegister = async () => {
    if (!newName || !newGender || newBirth.length < 10 || newPhone.length < 12) {
      Alert.alert("알림", "모든 정보를 형식에 맞게 입력해주세요.");
      return;
    }

    if (!isValidBirthDate(newBirth)) {
      Alert.alert("오류", "존재하지 않는 생년월일입니다. 올바르게 입력해주세요. (예: 1990-01-01)");
      return;
    }

    const isDuplicatePhone = users.some(u => {
      const existingPhone = u.member?.phone || u.phone || '';
      return existingPhone === newPhone;
    });

    if (isDuplicatePhone) {
      Alert.alert("오류", "이미 등록된 전화번호입니다.");
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // 💡 백엔드 Enum 타입 매칭을 위해 영어 값으로 변환하여 전송 (MALE / FEMALE)
      const requestBody = {
        name: newName,
        phone: newPhone,
        gender: newGender === '남자' ? 'MALE' : 'FEMALE',
        birthDate: newBirth
      };

      await axios.post(OFFLINE_REGISTER_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("성공", "신규 회원이 등록되었습니다.");
      closeAddModal();
      fetchUsers(token!); 
    } catch (error: any) {
      console.error("회원 등록 실패:", error);
      Alert.alert("오류", "회원 등록 중 오류가 발생했습니다.");
    }
  };

  // 💡 알림(Alert)창으로 변경된 회원 삭제 처리 함수
  const executeDelete = async (memberId: number | string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${MEMBER_DELETE_API}/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert("성공", "회원이 삭제되었습니다.");
      fetchUsers(token!); 
    } catch (error: any) {
      console.error("회원 삭제 실패:", error);
      Alert.alert("오류", "회원 삭제에 실패했습니다.");
    }
  };

  const confirmDelete = (memberId: number | string) => { 
    if (!memberId) {
      Alert.alert("오류", "회원 식별자(ID)가 없습니다.");
      return;
    }
    
    Alert.alert(
      "회원 삭제 확인",
      "해당 회원을 삭제하시겠습니까?\n관련된 데이터가 모두 삭제됩니다.",
      [
        { text: "취소", style: "cancel" },
        { text: "삭제", onPress: () => executeDelete(memberId), style: "destructive" }
      ]
    );
  };

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
      formatted = `${numeric.slice(0, 4)}-${numeric.slice(4)}`;
    } else if (numeric.length > 6) {
      formatted = `${numeric.slice(0, 4)}-${numeric.slice(4, 6)}-${numeric.slice(6, 8)}`;
    }
    setNewBirth(formatted);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setNewName(''); setNewGender(null); setNewBirth(''); setNewPhone('');
  };

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter((user: any) => {
      const targetName = user.member?.name || user.name || '';
      const targetPhone = user.member?.phone || user.phone || '';
      return targetName.includes(searchQuery) || targetPhone.includes(searchQuery);
    });

    return filtered.sort((a: any, b: any) => {
      const nameA = a.member?.name || a.name || '';
      const nameB = b.member?.name || b.name || '';
      const isKoreanA = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(nameA);
      const isKoreanB = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(nameB);
      if (isKoreanA && !isKoreanB) return -1; 
      if (!isKoreanA && isKoreanB) return 1;  
      return nameA.localeCompare(nameB);
    });
  }, [users, searchQuery]);

  const isFormValid = newName && newGender && newBirth.length === 10 && newPhone.length >= 12;

  if (loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.background} edges={[]}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput 
            style={styles.searchInput} 
            placeholder="이름, 연락처 등으로 검색" 
            placeholderTextColor="#666" 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colName]}>회원 정보</Text>
        <Text style={[styles.headerText, styles.colPhone, { textAlign: 'center' }]}>연락처</Text>
        <Text style={[styles.headerText, styles.colStatus, { textAlign: 'center' }]}>이용권 종류</Text>
        <Text style={[styles.headerText, styles.colAction, { textAlign: 'center' }]}>관리</Text>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {filteredAndSortedUsers.length === 0 ? (
          <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
        ) : (
          filteredAndSortedUsers.map((user: any, index: number) => {
            const memberInfo = user.member || user;
            const memberId = memberInfo.id || user.id || user.memberId;
            const membershipInfo = user.activeMembership || user.membership || user;
            const memType = membershipInfo?.membershipType || membershipInfo?.type || user.membershipType;

            let displayType = '없음';
            let badgeStyle = styles.badgeInactive;
            let badgeTextStyle = styles.badgeTextInactive;

            if (memType === 'PERIOD') {
              displayType = '회원권';
              badgeStyle = styles.badgePeriod;
              badgeTextStyle = styles.badgeTextPeriod;
            } else if (memType === 'COUNT') {
              displayType = '일일권';
              badgeStyle = styles.badgeCount;
              badgeTextStyle = styles.badgeTextCount;
            }

            return (
              <View key={`user-${memberId || index}`} style={styles.tableRow}>
                <Text style={[styles.rowTextBold, styles.colName]} numberOfLines={1}>
                  {memberInfo.name || '이름 없음'}
                </Text>
                <Text style={[styles.rowText, styles.colPhone, { textAlign: 'center' }]} numberOfLines={1}>
                  {memberInfo.phone || '연락처 없음'}
                </Text>
                
                <View style={[styles.colStatus, styles.centerAlign]}>
                  <View style={[styles.badge, badgeStyle]}>
                    <Text style={badgeTextStyle}>{displayType}</Text>
                  </View>
                </View>
                
                <View style={[styles.colAction, styles.centerAlign]}>
                  <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(memberId)}>
                    <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.fabText}>+ 등록</Text>
      </TouchableOpacity>

      {/* 신규 회원 등록 모달 */}
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
                <TouchableOpacity style={[styles.genderBtn, newGender === '남자' && styles.genderBtnActive]} onPress={() => setNewGender('남자')}>
                  <Text style={[styles.genderBtnText, newGender === '남자' && styles.genderBtnTextActive]}>남자</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.genderBtn, newGender === '여자' && styles.genderBtnActive]} onPress={() => setNewGender('여자')}>
                  <Text style={[styles.genderBtnText, newGender === '여자' && styles.genderBtnTextActive]}>여자</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>생년월일</Text>
              <TextInput style={styles.modalInput} placeholder="YYYY-MM-DD" placeholderTextColor="#666" keyboardType="numeric" maxLength={10} value={newBirth} onChangeText={formatBirth} />
              
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

// 💡 Flex 값을 전체 9.0 기준으로 넉넉하고 조화롭게 조정 (폰트 및 여백 최적화)
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 15, paddingTop: 15 },
  searchContainer: { marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 15, height: 50 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 15 },
  
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5 },
  headerText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  headerDivider: { height: 1, backgroundColor: '#333333', marginBottom: 10 },
  listContainer: { paddingBottom: 100 },
  
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 5, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  
  colName: { flex: 2.2, paddingLeft: 8 },
  colPhone: { flex: 3.2 },
  colStatus: { flex: 2.2 },
  colAction: { flex: 1.4 },

  rowTextBold: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  rowText: { color: '#CCCCCC', fontSize: 13 },
  centerAlign: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666666', fontSize: 15, textAlign: 'center', marginTop: 40 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgePeriod: { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeCount: { backgroundColor: 'rgba(0, 157, 255, 0.2)' },
  badgeInactive: { backgroundColor: 'rgba(142, 142, 142, 0.2)' },
  badgeTextPeriod: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },
  badgeTextCount: { color: '#009DFF', fontSize: 11, fontWeight: 'bold' },
  badgeTextInactive: { color: '#8E8E8E', fontSize: 11, fontWeight: 'bold' },
  
  trashBtn: { padding: 6 },
  trashIcon: { width: 18, height: 18, tintColor: '#FF4D4D', resizeMode: 'contain' },
  
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
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