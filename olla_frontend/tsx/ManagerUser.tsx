import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

const MEMBER_LIST_API = `${API_BASE_URL}/admin/memberships/members`; 
const OFFLINE_REGISTER_API = `${API_BASE_URL}/admin/members/offline`; 
const MEMBER_DELETE_API = `${API_BASE_URL}/admin/members`; 

const ManagerUser = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false); // 새로고침 
    
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');

  // ─── 커스텀 알림 결과 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // ─── 투 버튼 커스텀 확인(Confirm) 모달 상태 ───
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '', message: '', confirmText: '확인', cancelText: '취소', onConfirm: () => {}, isDestructive: false
  });

  const showConfirmModal = (title: string, message: string, onConfirm: () => void, isDestructive: boolean = false, confirmText: string = '확인') => {
    setConfirmModalConfig({ title, message, confirmText, cancelText: '취소', onConfirm, isDestructive });
    setConfirmModalVisible(true);
  };
  
  // 💡 애니메이션 설정
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const addSlideAnim = useRef(new Animated.Value(800)).current;

  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'남자' | '여자' | null>(null);
  const [newBirth, setNewBirth] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchUsers(true); // 새로고침 시에는 중앙 로딩 스피너 무시
    setRefreshing(false);
  }, []);

  const checkAdminAndFetchUsers = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true); // 새로고침이 아닐 때만 화면 전체 로딩 활성화
    try {
      const role = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');

      if (!token || role !== 'ADMIN') {
        showResultModal("권한 오류", "관리자만 접근할 수 있는 페이지입니다.", "error", () => navigation.goBack());
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
      // ✅ ApiResponse Depth 1단계 추가 적용
      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error: any) {
      // ✅ 에러 메시지 처리 적용
      const errorMessage = error.response?.data?.message || "회원 목록을 불러오는데 실패했습니다.";
      showResultModal("오류", errorMessage, "error");
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
      showResultModal("알림", "모든 정보를 형식에 맞게 입력해주세요.", "info");
      return;
    }
    if (!isValidBirthDate(newBirth)) {
      showResultModal("오류", "존재하지 않는 생년월일입니다.", "error");
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const requestBody = {
        name: newName,
        phone: newPhone,
        gender: newGender === '남자' ? 'MALE' : 'FEMALE',
        birthDate: newBirth
      };
      await axios.post(OFFLINE_REGISTER_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showResultModal("성공", "신규 회원이 등록되었습니다.", "success");
      closeAddModal();
      fetchUsers(token!); 
    } catch (error: any) {
      // ✅ 에러 메시지 처리 적용 (예: "이미 등록된 전화번호입니다.")
      const errorMessage = error.response?.data?.message || "회원 등록 중 오류가 발생했습니다.";
      showResultModal("오류", errorMessage, "error");
    }
  };

  const executeDelete = async (memberId: number | string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${MEMBER_DELETE_API}/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showResultModal("성공", "회원이 삭제되었습니다.", "success");
      fetchUsers(token!); 
    } catch (error: any) {
      // ✅ 에러 메시지 처리 적용
      const errorMessage = error.response?.data?.message || "회원 삭제에 실패했습니다.";
      showResultModal("오류", errorMessage, "error");
    }
  };

  const confirmDelete = (memberId: number | string) => { 
    showConfirmModal(
      "회원 삭제 확인",
      "해당 회원을 삭제하시겠습니까?",
      () => {
        setConfirmModalVisible(false);
        executeDelete(memberId);
      },
      true, // isDestructive = true (빨간색 버튼)
      "삭제"
    );
  };

  // 모달 제어 함수
  const openAddModal = () => {
    setAddModalVisible(true);
    Animated.timing(addSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closeAddModal = () => {
    Animated.timing(addSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setAddModalVisible(false);
      setNewName(''); setNewGender(null); setNewBirth(''); setNewPhone('');
    });
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

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter((user: any) => {
      const targetName = user.member?.name || user.name || '';
      const targetPhone = user.member?.phone || user.phone || '';
      return targetName.includes(searchQuery) || targetPhone.includes(searchQuery);
    });
    return filtered.sort((a: any, b: any) => {
      const nameA = a.member?.name || a.name || '';
      const nameB = b.member?.name || b.name || '';
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
    <SafeAreaView style={styles.background} edges={['top', 'left', 'right']}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.listContainer, { paddingBottom: 150 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
      >
      
      {/* 상단 검색바 - 여백 제거됨 */}
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

      {/* 리스트 헤더 */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colName]}>회원 정보</Text>
        <Text style={[styles.headerText, styles.colPhone, { textAlign: 'center' }]}>연락처</Text>
        <Text style={[styles.headerText, styles.colStatus, { textAlign: 'center' }]}>이용권 종류</Text>
        <Text style={[styles.headerText, styles.colAction, { textAlign: 'center' }]}>관리</Text>
      </View>
      <View style={styles.headerDivider} />

      
        {filteredAndSortedUsers.length === 0 ? (
          <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
        ) : (
          filteredAndSortedUsers.map((user: any, index: number) => {
            const memberInfo = user.member || user;
            const memberId = memberInfo.id || user.id;
            const membershipInfo = user.activeMembership || user.membership || user;
            const memType = membershipInfo?.membershipType || membershipInfo?.type;

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
                    <Image source={require('../assets/trash.png')} style={styles.trashIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 등록 플로팅 버튼 */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(insets.bottom + 5, 15) }]} 
        activeOpacity={0.8} 
        onPress={openAddModal}
      >
        <Text style={styles.fabText}>+ 등록</Text>
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

      {/* ─── 투 버튼 확인(Confirm) 모달 ─── */}
      <Modal visible={confirmModalVisible} animationType="fade" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>{confirmModalConfig.title}</Text>
            <Text style={[styles.resultModalMessage, { marginBottom: 25 }]}>{confirmModalConfig.message}</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity 
                style={[styles.btnYes, confirmModalConfig.isDestructive && { backgroundColor: '#FF4D4D' }]} 
                onPress={confirmModalConfig.onConfirm}
              >
                <Text style={styles.btnTextBlack}>{confirmModalConfig.confirmText}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.btnTextWhite}>{confirmModalConfig.cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 신규 회원 등록 모달 */}
      <Modal visible={isAddModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeAddModal} />
          
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: addSlideAnim }] }]}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>신규 회원 등록</Text>
              <TouchableOpacity onPress={closeAddModal}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.horizontalDivider} />
            
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 30 }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>이름</Text>
                  <View style={styles.inputWrap}>
                    <TextInput style={styles.modalInput} placeholder="성함을 입력해주세요" placeholderTextColor="#666" value={newName} onChangeText={setNewName} />
                  </View>

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
                  <View style={styles.inputWrap}>
                    <TextInput style={styles.modalInput} placeholder="YYYY-MM-DD" placeholderTextColor="#666" keyboardType="numeric" maxLength={10} value={newBirth} onChangeText={formatBirth} />
                  </View>

                  <Text style={styles.inputLabel}>전화번호</Text>
                  <View style={styles.inputWrap}>
                    <TextInput style={styles.modalInput} placeholder="010-0000-0000" placeholderTextColor="#666" keyboardType="phone-pad" maxLength={13} value={newPhone} onChangeText={formatPhone} />
                  </View>

                  <TouchableOpacity 
                    style={[styles.submitBtn, !isFormValid && { backgroundColor: '#444' }]} 
                    disabled={!isFormValid} 
                    onPress={handleRegister}
                  >
                    <Text style={[styles.submitBtnText, !isFormValid && { color: '#888' }]}>등록 완료</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  
  // 💡 검색창 상단 마진을 완전히 제거 (marginTop: 0)
  searchContainer: { paddingHorizontal: 20, marginTop: 0, marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 15, height: 50 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 15 },
  
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 25 },
  headerText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  headerDivider: { height: 1, backgroundColor: '#333333', marginHorizontal: 20, marginBottom: 10 },
  listContainer: { paddingHorizontal: 20 },
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A' },
  rowTextBold: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  rowText: { color: '#CCCCCC', fontSize: 14 },
  centerAlign: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666666', fontSize: 15, textAlign: 'center', marginTop: 40 },
  colName: { flex: 2, paddingLeft: 15 },
  colPhone: { flex: 3 },
  colStatus: { flex: 2 },
  colAction: { flex: 1 },
  badge: { width: 65, paddingVertical: 6, borderRadius: 20, alignItems: 'center' },
  badgePeriod: { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeCount: { backgroundColor: 'rgba(0, 157, 255, 0.2)' },
  badgeInactive: { backgroundColor: 'rgba(142, 142, 142, 0.2)' },
  badgeTextPeriod: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },
  badgeTextCount: { color: '#009DFF', fontSize: 11, fontWeight: 'bold' },
  badgeTextInactive: { color: '#8E8E8E', fontSize: 11, fontWeight: 'bold' },
  
  trashBtn: { padding: 6 },
  trashIcon: { width: 18, height: 18, tintColor: '#FF4D4D', resizeMode: 'contain' },
  
  fab: { position: 'absolute', right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  
  // 모달 레이아웃 뷰 변경
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxHeight: '85%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeIcon: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },
  
  formContainer: { backgroundColor: '#262626', borderRadius: 16, padding: 20 },
  inputLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginLeft: 2 },
  inputWrap: { backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 20 },
  modalInput: { color: '#fff', fontSize: 16, padding: 0 },
  
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  genderBtn: { flex: 1, backgroundColor: '#000', borderWidth: 1, borderColor: '#444', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4 },
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
  genderBtnTextActive: { color: '#A1BE44' },
  
  submitBtn: { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  // ─── 커스텀 알림 모달 전용 스타일 ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 15, marginBottom: 25, textAlign: 'center', lineHeight: 20 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  // 투 버튼 확인 모달 관련 스타일 추가
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default ManagerUser;