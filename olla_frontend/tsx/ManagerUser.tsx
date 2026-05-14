import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, RefreshControl, Dimensions, PanResponder, TouchableWithoutFeedback
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
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'남자' | '여자' | null>(null);
  const [newBirth, setNewBirth] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [isDetailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // ─── 🌟 팝업창 개별 드래그 앤 드롭 치수 및 로직 🌟 ───
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  
  // 💡 여기서 각 팝업창의 높이를 개별적으로 조절하실 수 있습니다.
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.47; // 회원 상세 팝업
  const ADD_MODAL_HEIGHT = SCREEN_HEIGHT * 0.65;    // 신규 회원 등록: 화면의 65%
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95; 

  // 1️⃣ 회원 상세 정보 팝업 애니메이션 (위로 확장 방지, 아래로 닫기만 가능)
  const detailHeightAnim = useRef(new Animated.Value(0)).current;
  const currentDetailSnap = useRef(DETAIL_MODAL_HEIGHT);

  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        detailHeightAnim.setOffset(currentDetailSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // 💡 위로 드래그(dy < 0)할 때는 크기가 커지지 않도록 0으로 제한
        detailHeightAnim.setValue(Math.min(0, -gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        detailHeightAnim.flattenOffset();
        const finalHeight = currentDetailSnap.current - gestureState.dy;
        const CLOSE_THRESHOLD = currentDetailSnap.current * 0.7;

        if (finalHeight < CLOSE_THRESHOLD) {
          closeDetailModal();
        } else {
          // 닫히지 않으면 원래 설정된 상세 창 높이로 복귀
          Animated.spring(detailHeightAnim, { toValue: currentDetailSnap.current, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // 2️⃣ 회원 등록 팝업 애니메이션 (기존대로 전체화면 확장 지원)
  const addHeightAnim = useRef(new Animated.Value(0)).current;
  const currentAddSnap = useRef(ADD_MODAL_HEIGHT);

  const addPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        addHeightAnim.setOffset(currentAddSnap.current);
        addHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        addHeightAnim.setValue(-gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        addHeightAnim.flattenOffset();
        const finalHeight = currentAddSnap.current - gestureState.dy;
        const THRESHOLD = (ADD_MODAL_HEIGHT + FULL_SCREEN) / 2;
        const CLOSE_THRESHOLD = ADD_MODAL_HEIGHT * 0.7;

        if (finalHeight > THRESHOLD) {
          currentAddSnap.current = FULL_SCREEN;
          Animated.spring(addHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight < CLOSE_THRESHOLD) {
          closeAddModal();
        } else {
          currentAddSnap.current = ADD_MODAL_HEIGHT;
          Animated.spring(addHeightAnim, { toValue: ADD_MODAL_HEIGHT, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

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
      showResultModal("알림", "정보를 모두 올바르게 입력해주세요.", "info");
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
      showResultModal("오류", "회원 등록에 실패했습니다.", "error");
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
      currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
      detailHeightAnim.setValue(0);
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    } catch (error) {
      showResultModal('오류', '정보 로드 불가', 'error');
    }
  };

  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => { 
      setDetailVisible(false); 
      setSelectedUser(null); 
    });
  };

  const openAddModal = () => {
    setAddModalVisible(true);
    currentAddSnap.current = ADD_MODAL_HEIGHT;
    addHeightAnim.setValue(0);
    Animated.timing(addHeightAnim, { toValue: ADD_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  };

  const closeAddModal = (callback?: () => void) => {
    Animated.timing(addHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
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

      {/* 🌟 1. 회원 상세 정보 모달 (위로 확장 불가, 개별 높이 적용) 🌟 */}
      <Modal visible={isDetailVisible} transparent animationType="fade" onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeDetailModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: detailHeightAnim }]}>
            <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.sheetTitle}>회원 상세 정보</Text>
                <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: '#999', fontSize: 24 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {selectedUser && (
                <View style={styles.infoBox}>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>이름</Text><Text style={styles.detailValue}>{selectedUser.name}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>연락처</Text><Text style={styles.detailValue}>{selectedUser.phone}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>키/몸무게</Text><Text style={styles.detailValue}>{selectedUser.height}cm / {selectedUser.weight}kg</Text></View>
                </View>
              )}
              <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}>
                <Text style={styles.closeFullBtnText}>닫기</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* 🌟 2. 회원 등록 모달 (개별 높이 및 드래그 지원) 🌟 */}
      <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={() => closeAddModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => closeAddModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[styles.bottomSheet, { height: addHeightAnim, paddingBottom: 20 }]}>
              
              <View {...addPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={styles.sheetTitle}>신규 회원 등록</Text>
                  <TouchableOpacity onPress={() => closeAddModal()} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={{ color: '#999', fontSize: 24 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>이름</Text>
                  <TextInput style={styles.inputField} placeholder="이름 입력" placeholderTextColor="#666" value={newName} onChangeText={setNewName} />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>성별</Text>
                  <View style={styles.genderRow}>
                    <TouchableOpacity style={[styles.genderBtn, newGender === '남자' && styles.genderBtnActive]} onPress={() => setNewGender('남자')}>
                      <Text style={[styles.genderText, newGender === '남자' && styles.genderTextActive]}>남자</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.genderBtn, newGender === '여자' && styles.genderBtnActive]} onPress={() => setNewGender('여자')}>
                      <Text style={[styles.genderText, newGender === '여자' && styles.genderTextActive]}>여자</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>생년월일</Text>
                  <TextInput 
                    style={styles.inputField} 
                    placeholder="YYYY-MM-DD" 
                    placeholderTextColor="#666" 
                    value={newBirth} 
                    onChangeText={(txt) => {
                      const n = txt.replace(/\D/g, '');
                      setNewBirth(n.length > 6 ? `${n.slice(0, 4)}-${n.slice(4, 6)}-${n.slice(6, 8)}` : n.length > 4 ? `${n.slice(0, 4)}-${n.slice(4)}` : n);
                    }} 
                    keyboardType="numeric" 
                    maxLength={10} 
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>연락처</Text>
                  <TextInput 
                    style={styles.inputField} 
                    placeholder="010-0000-0000" 
                    placeholderTextColor="#666" 
                    value={newPhone} 
                    onChangeText={(txt) => {
                      const n = txt.replace(/\D/g, '');
                      setNewPhone(n.length > 7 ? `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7, 11)}` : n.length > 3 ? `${n.slice(0, 3)}-${n.slice(3)}` : n);
                    }} 
                    keyboardType="numeric" 
                    maxLength={13} 
                  />
                </View>

                <TouchableOpacity style={styles.closeFullBtn} onPress={handleRegister}>
                  <Text style={styles.closeFullBtnText}>등록하기</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 🌟 3. 회원 삭제 확인 모달 (메인 색상 통일) 🌟 */}
      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: '#A1BE44' }]}>
              {confirmModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{confirmModalConfig.message}</Text>
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
              <TouchableOpacity 
                style={[styles.resultModalBtn, { flex: 1, marginRight: 5, backgroundColor: '#A1BE44' }]} 
                onPress={confirmModalConfig.onConfirm}
              >
                <Text style={[styles.resultModalBtnText, { color: '#000000' }]}>{confirmModalConfig.confirmText}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.resultModalBtn, { flex: 1, marginLeft: 5, backgroundColor: '#262626' }]} 
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={[styles.resultModalBtnText, { color: '#ffffff' }]}>{confirmModalConfig.cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 공통 알림 결과 모달 */}
      <Modal visible={resultModalVisible} transparent animationType="fade">
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: resultModalConfig.type === 'error' ? '#FF4D4D' : '#A1BE44' }]}>{resultModalConfig.title}</Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => { setResultModalVisible(false); resultModalConfig.onConfirm(); }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
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
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 25, paddingTop: 10, overflow: 'hidden', width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  
  // 💡 신규 회원 등록 폼 관련 스타일
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  inputField: { backgroundColor: '#000', color: '#fff', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 15, fontSize: 16 },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genderBtn: { flex: 1, backgroundColor: '#000', borderWidth: 1, borderColor: '#444', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginHorizontal: 5 },
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
  genderTextActive: { color: '#A1BE44' },

  infoBox: { backgroundColor: '#262626', borderRadius: 15, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  detailLabel: { color: '#999', fontSize: 15 },
  detailValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  closeFullBtn: { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  closeFullBtnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: '80%', backgroundColor: '#212121', borderRadius: 20, padding: 25, alignItems: 'center' },
  resultModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  resultModalMessage: { color: '#fff', textAlign: 'center', marginBottom: 20, fontSize: 15 },
  resultModalBtn: { backgroundColor: '#A1BE44', width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  resultModalBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});

export default ManagerUser;