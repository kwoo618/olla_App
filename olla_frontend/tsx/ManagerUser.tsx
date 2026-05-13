import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
const PROFILE_API = `${API_BASE_URL}/members`;

const ManagerUser = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false); 
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');

  // --- 모달 상태 관리 ---
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '', message: '', confirmText: '확인', cancelText: '취소', onConfirm: () => {}, isDestructive: false
  });
  
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const addSlideAnim = useRef(new Animated.Value(800)).current;
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'남자' | '여자' | null>(null);
  const [newBirth, setNewBirth] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [isDetailVisible, setDetailVisible] = useState(false);
  const detailSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // --- 데이터 패칭 로직 ---
  useEffect(() => { checkAdminAndFetchUsers(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchUsers(true); 
    setRefreshing(false);
  }, []);

  const checkAdminAndFetchUsers = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true); 
    try {
      const role = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');
      if (!token || role !== 'ADMIN') {
        showResultModal("권한 오류", "관리자만 접근할 수 있습니다.", "error", () => navigation.goBack());
        return;
      }
      await fetchUsers(token);
    } catch (error) {
      console.error(error);
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
      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error: any) {
      showResultModal("오류", "목록 로드 실패", "error");
    }
  };

  // --- 회원 관리 액션 (등록, 삭제) ---
  const handleRegister = async () => {
    if (!newName || !newGender || newBirth.length < 10 || newPhone.length < 12) {
      showResultModal("알림", "정보를 모두 입력해주세요.", "info");
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const requestBody = {
        name: newName, phone: newPhone,
        gender: newGender === '남자' ? '남' : '여', 
        birthDate: newBirth,
        email: `offline_${newPhone.replace(/-/g, '')}@olla.local` 
      };
      await axios.post(OFFLINE_REGISTER_API, requestBody, { headers: { Authorization: `Bearer ${token}` } });
      closeAddModal(() => {
        setTimeout(() => showResultModal("성공", "신규 회원이 등록되었습니다.", "success"), 300);
      });
      fetchUsers(token!); 
    } catch (error: any) {
      showResultModal("오류", "등록 실패", "error");
    }
  };

  const confirmDelete = (memberId: number | string) => { 
    showConfirmModal("회원 삭제", "정말 삭제하시겠습니까?", () => {
      setConfirmModalVisible(false);
      executeDelete(memberId);
    }, true, "삭제");
  };

  const executeDelete = async (memberId: number | string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${MEMBER_DELETE_API}/${memberId}`, { headers: { Authorization: `Bearer ${token}` } });
      setTimeout(() => showResultModal("성공", "삭제되었습니다.", "success"), 300);
      fetchUsers(token!); 
    } catch (error) {
      showResultModal("오류", "삭제 실패", "error");
    }
  };

  // --- 모달 제어 함수 ---
  const openDetailModal = async (memberId: number, fallbackName: string, fallbackPhone: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${PROFILE_API}/${memberId}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const d = response.data?.data?.data || response.data?.data; 
      if (!d) return;
      
      setSelectedUser({
        name: d.name || fallbackName,
        phone: d.phone || fallbackPhone || '-', 
        profileImageUrl: d.profileImageUrl,
        age: d.detail?.age || d.age || '-',
        height: d.detail?.height || d.height || '-',
        weight: d.detail?.weight || d.weight || '-',
        arm: d.detail?.armSpan || d.armSpan || '-',
        shoe: d.detail?.footSize || d.footSize || '-',
      });
      setDetailVisible(true);
      setTimeout(() => { Animated.timing(detailSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
    } catch (error) {
      showResultModal('오류', '정보 로드 불가', 'error');
    }
  };

  const closeDetailModal = () => {
    Animated.timing(detailSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { 
      setDetailVisible(false); 
      setSelectedUser(null); 
    });
  };

  const openAddModal = () => {
    setAddModalVisible(true);
    setTimeout(() => { Animated.timing(addSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
  };

  const closeAddModal = (callback?: () => void) => {
    Animated.timing(addSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setAddModalVisible(false);
      setNewName(''); setNewGender(null); setNewBirth(''); setNewPhone('');
      if (callback) callback();
    });
  };

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const showConfirmModal = (title: string, message: string, onConfirm: () => void, isDestructive: boolean = false, confirmText: string = '확인') => {
    setConfirmModalConfig({ title, message, confirmText, cancelText: '취소', onConfirm, isDestructive });
    setConfirmModalVisible(true);
  };

  const filteredAndSortedUsers = useMemo(() => {
    return users
      .filter((user: any) => {
        if (user.deleted === true) return false;
        const targetName = user.name || user.member?.name || '';
        const targetPhone = user.phone || user.member?.phone || '';
        return targetName.includes(searchQuery) || targetPhone.includes(searchQuery);
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, searchQuery]);

  if (loading) return <View style={styles.background}><ActivityIndicator size="large" color="#A1BE44" /></View>;

  return (
    <SafeAreaView style={styles.background} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />} contentContainerStyle={{ paddingBottom: 150 }}>
        
        {/* 검색바 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔎</Text>
            <TextInput style={styles.searchInput} placeholder="회원 검색" placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        </View>

        {/* 테이블 헤더 */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colName, { textAlign: 'center' }]}>회원 정보</Text>
          <Text style={[styles.headerText, styles.colPhone, { textAlign: 'center' }]}>연락처</Text>
          <Text style={[styles.headerText, styles.colStatus, { textAlign: 'center' }]}>상태</Text>
          <Text style={[styles.headerText, styles.colAction, { textAlign: 'center' }]}>관리</Text>
        </View>
        <View style={styles.headerDivider} />

        {/* 회원 리스트 */}
        {filteredAndSortedUsers.map((user, index) => {
          const memberInfo = user.member || user;
          const memberId = user.memberId || user.id || memberInfo.id;
          const memType = user.membershipType || user.activeMembership?.membershipType;
          
          let displayType = '없음';
          let badgeStyle = styles.badgeInactive;
          if (memType === 'PERIOD') { displayType = '회원권'; badgeStyle = styles.badgePeriod; }
          else if (memType === 'COUNT') { displayType = '일일권'; badgeStyle = styles.badgeCount; }

          return (
            <View key={`u-${memberId || index}`} style={styles.tableRow}>
              <TouchableOpacity style={[styles.colName, styles.profileNameContainer]} onPress={() => openDetailModal(memberId, memberInfo.name, memberInfo.phone)}>
                <Image source={memberInfo.profileImageUrl ? { uri: memberInfo.profileImageUrl } : require('../assets/profile.png')} style={styles.listProfileImg} />
                <Text style={styles.rowTextBold} numberOfLines={1}>{memberInfo.name || '이름없음'}</Text>
              </TouchableOpacity>
              
              <Text style={[styles.rowText, styles.colPhone, { textAlign: 'center' }]}>{memberInfo.phone || '-'}</Text>
              
              <View style={[styles.colStatus, styles.centerAlign]}>
                <View style={[styles.badge, badgeStyle]}><Text style={styles.badgeText}>{displayType}</Text></View>
              </View>

              <View style={[styles.colAction, styles.centerAlign]}>
                <TouchableOpacity onPress={() => confirmDelete(memberId)}>
                  <Image source={require('../assets/trash.png')} style={styles.trashIcon} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 등록 FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom, 20) }]} onPress={openAddModal}>
        <Text style={styles.fabText}>+ 회원 등록</Text>
      </TouchableOpacity>

      {/* 모달 섹션 (상세 정보, 등록, 알림) */}
      <Modal visible={isDetailVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeDetailModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: detailSlideAnim }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>회원 상세 정보</Text>
            {selectedUser && (
              <View style={styles.infoBox}>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>이름</Text><Text style={styles.detailValue}>{selectedUser.name}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>연락처</Text><Text style={styles.detailValue}>{selectedUser.phone}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>키/몸무게</Text><Text style={styles.detailValue}>{selectedUser.height}cm / {selectedUser.weight}kg</Text></View>
              </View>
            )}
            <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}><Text style={styles.closeFullBtnText}>닫기</Text></TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* 알림 결과 모달 */}
      <Modal visible={resultModalVisible} transparent animationType="fade">
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: resultModalConfig.type === 'error' ? '#FF4D4D' : '#A1BE44' }]}>{resultModalConfig.title}</Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => { setResultModalVisible(false); resultModalConfig.onConfirm(); }}><Text style={styles.resultModalBtnText}>확인</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  searchContainer: { paddingHorizontal: 20, marginVertical: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 15, height: 55 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10 },
  headerText: { color: '#999', fontSize: 13, fontWeight: 'bold' },
  headerDivider: { height: 1, backgroundColor: '#333', marginHorizontal: 20, marginBottom: 10 },
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 15, marginBottom: 10, marginHorizontal: 15 },
  colName: { flex: 3 },
  colPhone: { flex: 4 },
  colStatus: { flex: 2 },
  colAction: { flex: 1 },
  centerAlign: { alignItems: 'center', justifyContent: 'center' },
  profileNameContainer: { flexDirection: 'row', alignItems: 'center' },
  listProfileImg: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  rowTextBold: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  rowText: { color: '#ccc', fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePeriod: { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeCount: { backgroundColor: 'rgba(0, 157, 255, 0.2)' },
  badgeInactive: { backgroundColor: '#333' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#A1BE44' },
  trashIcon: { width: 20, height: 20, tintColor: '#FF4D4D' },
  fab: { position: 'absolute', right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  fabText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  infoBox: { backgroundColor: '#262626', borderRadius: 15, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  detailLabel: { color: '#999', fontSize: 15 },
  detailValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  closeFullBtn: { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  closeFullBtnText: { color: '#000', fontWeight: 'bold' },
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: '80%', backgroundColor: '#212121', borderRadius: 20, padding: 25, alignItems: 'center' },
  resultModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  resultModalMessage: { color: '#fff', textAlign: 'center', marginBottom: 20 },
  resultModalBtn: { backgroundColor: '#A1BE44', width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  resultModalBtnText: { color: '#000', fontWeight: 'bold' }
});

export default ManagerUser;