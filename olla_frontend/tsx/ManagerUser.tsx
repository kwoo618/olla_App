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
const PROFILE_API = `${API_BASE_URL}/members`;

const ManagerUser = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false); 
    
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
  
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const addSlideAnim = useRef(new Animated.Value(800)).current;

  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'남자' | '여자' | null>(null);
  const [newBirth, setNewBirth] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // ─── 회원 정보 상세 팝업 상태 ───
  const [isDetailVisible, setDetailVisible] = useState(false);
  const detailSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

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
      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error: any) {
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
        gender: newGender === '남자' ? '남' : '여', 
        birthDate: newBirth,
        email: `offline_${newPhone.replace(/-/g, '')}@olla.local` 
      };
      await axios.post(OFFLINE_REGISTER_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showResultModal("성공", "신규 회원이 등록되었습니다.", "success");
      closeAddModal();
      fetchUsers(token!); 
    } catch (error: any) {
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
      false, 
      "삭제"
    );
  };

  const openDetailModal = async (memberId: number, fallbackName: string, fallbackPhone: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${PROFILE_API}/${memberId}/profile`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      const d = response.data?.data?.data || response.data?.data; 
      
      if (!d) { 
        showResultModal('프로필 조회 불가', '상세 정보를 불러올 수 없습니다.', 'error'); 
        return; 
      }
      
      const detail = d.detail || {};
      
      setSelectedUser({
        name: d.name || fallbackName,
        phone: d.phone || fallbackPhone || '-', 
        profileImageUrl: d.profileImageUrl,
        age: detail.age || d.age || '-',
        height: detail.height || d.height || '-',
        weight: detail.weight || d.weight || '-',
        arm: detail.armSpan || d.armSpan || '-',
        shoe: detail.footSize || d.footSize || '-',
      });

      setDetailVisible(true);
      setTimeout(() => { Animated.timing(detailSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '회원 상세 정보를 불러올 수 없습니다.';
      showResultModal('프로필 조회 불가', errorMessage, 'error');
    }
  };

  const closeDetailModal = () => {
    Animated.timing(detailSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { 
      setDetailVisible(false); 
      setSelectedUser(null); 
    });
  };

  const renderDetailRow = (label: string, value: string, unit: string = '') => {
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value !== '-' && value ? value + unit : '-'}</Text>
      </View>
    );
  };

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
        <Text style={[styles.headerText, styles.colName, { textAlign: 'center' }]}>회원 정보</Text>
        {/* 💡 연락처 헤더에 가운데 정렬 추가하고, 우측 여백을 줘서 전화번호들 가운데 위치하도록 미세 조정 */}
        <Text style={[styles.headerText, styles.colPhone, { textAlign: 'center', paddingRight: 20 }]}>연락처</Text>
        <View style={styles.colStatus}>
          <Text style={styles.headerText}>이용권 종류</Text>
        </View>
        <View style={styles.colAction}>
          <Text style={styles.headerText}>관리</Text>
        </View>
      </View>
      <View style={styles.headerDivider} />

      
        {filteredAndSortedUsers.length === 0 ? (
          <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
        ) : (
          filteredAndSortedUsers.map((user: any, index: number) => {
            const memberInfo = user.member || user;
            const memberId = user.memberId || user.id || memberInfo.id;
            const isDeleted = memberInfo.isDeleted || user.isDeleted; 
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

            const userName = memberInfo.name || '이름 없음';
            const userPhone = memberInfo.phone || '연락처 없음';
            const profileUrl = memberInfo.profileImageUrl;

            return (
              <View key={`user-${memberId || index}`} style={styles.tableRow}>
                
                <TouchableOpacity 
                  style={[styles.colName, styles.profileNameContainer]} 
                  activeOpacity={0.7}
                  onPress={() => openDetailModal(memberId, userName, userPhone)}
                >
                  {profileUrl ? (
                    <Image source={{ uri: profileUrl }} style={styles.listProfileImg} />
                  ) : userName === '최강우' ? (
                    <View style={styles.listTextProfileImg}>
                      <Text style={styles.listTextProfileText}>최</Text>
                    </View>
                  ) : (
                    <Image source={require('../assets/profile.png')} style={styles.listProfileImg} />
                  )}
                  <Text style={styles.rowTextBold} numberOfLines={1}>
                    {userName}
                  </Text>
                </TouchableOpacity>

                {/* 연락처 리스트 텍스트는 그대로 왼쪽 정렬 유지 */}
                <Text style={[styles.rowText, styles.colPhone]} numberOfLines={1}>
                  {userPhone}
                </Text>
                
                <View style={styles.colStatus}>
                  <View style={[styles.badge, badgeStyle]}>
                    <Text style={badgeTextStyle}>{displayType}</Text>
                  </View>
                </View>
                
                <View style={styles.colAction}>
                  {!isDeleted && (
                    <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(memberId)}>
                      <Image source={require('../assets/trash.png')} style={styles.trashIcon} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(insets.bottom + 5, 15) }]} 
        activeOpacity={0.8} 
        onPress={openAddModal}
      >
        <Text style={styles.fabText}>+ 등록</Text>
      </TouchableOpacity>

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

      <Modal visible={isDetailVisible} transparent={true} animationType="fade" onRequestClose={closeDetailModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeDetailModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: detailSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>회원 정보</Text>
                <TouchableOpacity onPress={closeDetailModal}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
              
              {selectedUser && (
                <View style={styles.detailContainer}>
                  <View style={styles.detailProfileWrapper}>
                    {selectedUser.profileImageUrl ? (
                      <Image source={{ uri: selectedUser.profileImageUrl }} style={styles.profileBig} />
                    ) : selectedUser.name === '최강우' ? (
                      <View style={[styles.textProfileImg, { width: 80, height: 80, borderRadius: 40 }]}>
                        <Text style={[styles.textProfileText, { fontSize: 32 }]}>최</Text>
                      </View>
                    ) : (
                      <Image source={require('../assets/profile.png')} style={styles.profileBig} />
                    )}
                    <Text style={styles.profileName}>{selectedUser.name}</Text>
                  </View>
                  
                  <View style={styles.infoBox}>
                    {renderDetailRow('이름', selectedUser.name)}
                    {renderDetailRow('전화번호', selectedUser.phone)}
                    {renderDetailRow('나이', selectedUser.age, '세')}
                    {renderDetailRow('키', selectedUser.height, 'cm')}
                    {renderDetailRow('몸무게', selectedUser.weight, 'kg')}
                    {renderDetailRow('팔길이', selectedUser.arm, 'cm')}
                    {renderDetailRow('암벽화 사이즈', selectedUser.shoe, 'mm')}
                  </View>
                  
                  <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}>
                    <Text style={styles.closeFullBtnText}>닫기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

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
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
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
                  <TouchableOpacity style={[styles.submitBtn, !isFormValid && { backgroundColor: '#444' }]} disabled={!isFormValid} onPress={handleRegister}>
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
  searchContainer: { paddingHorizontal: 20, marginTop: 15, marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 20, height: 60 }, 
  searchIcon: { fontSize: 22, marginRight: 10 }, 
  searchInput: { flex: 1, color: '#ffffff', fontSize: 17 }, 
  
  listContainer: { paddingHorizontal: 15 },
  headerDivider: { height: 1, backgroundColor: '#333333', marginHorizontal: 15, marginBottom: 10 },
  
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15 }, 
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 20, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A', paddingHorizontal: 15 }, 
  
  colName: { flex: 10, justifyContent: 'flex-start' }, 
  colPhone: { flex: 11, textAlign: 'left', paddingLeft: 5 }, 
  colStatus: { flex: 8, alignItems: 'center' }, 
  colAction: { flex: 4, alignItems: 'center' }, 
  
  headerText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' }, 
  profileNameContainer: { flexDirection: 'row', alignItems: 'center' }, 
  listProfileImg: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#444', marginRight: 10 }, 
  listTextProfileImg: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#444', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  listTextProfileText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  rowTextBold: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }, 
  rowText: { color: '#CCCCCC', fontSize: 15 }, 
  emptyText: { color: '#666666', fontSize: 17, textAlign: 'center', marginTop: 50 }, 
  
  badge: { width: 75, paddingVertical: 8, borderRadius: 20, alignItems: 'center' }, 
  badgePeriod: { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeCount: { backgroundColor: 'rgba(0, 157, 255, 0.2)' },
  badgeInactive: { backgroundColor: 'rgba(142, 142, 142, 0.2)' },
  badgeTextPeriod: { color: '#A1BE44', fontSize: 13, fontWeight: 'bold' }, 
  badgeTextCount: { color: '#009DFF', fontSize: 13, fontWeight: 'bold' }, 
  badgeTextInactive: { color: '#8E8E8E', fontSize: 13, fontWeight: 'bold' }, 
  
  trashBtn: { padding: 5 }, 
  trashIcon: { width: 22, height: 22, tintColor: '#FF4D4D', resizeMode: 'contain' }, 
  
  fab: { position: 'absolute', right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 30, paddingVertical: 18, borderRadius: 35, elevation: 5 }, 
  fabText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxHeight: '85%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' }, 
  closeIcon: { color: '#999999', fontSize: 28, paddingHorizontal: 10 }, 
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },
  formContainer: { backgroundColor: '#262626', borderRadius: 16, padding: 20 },
  inputLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }, 
  inputWrap: { backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 16, marginBottom: 20 }, 
  modalInput: { color: '#fff', fontSize: 18 }, 
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  genderBtn: { flex: 1, backgroundColor: '#000', borderWidth: 1, borderColor: '#444', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginHorizontal: 4 }, 
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#999', fontSize: 18, fontWeight: 'bold' }, 
  genderBtnTextActive: { color: '#A1BE44' },
  submitBtn: { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center' }, 
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }, 

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, 
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, 
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 24 }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, 
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 

  deleteModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' }, 
  deleteTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }, 
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginRight: 5 }, 
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginLeft: 5 }, 
  btnTextBlack: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 
  btnTextWhite: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 

  // ─── 회원 상세 정보 팝업 전용 스타일 ───
  detailContainer: { width: '100%' },
  detailProfileWrapper: { alignSelf: 'center', alignItems: 'center', marginBottom: 25 },
  profileBig: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#444' },
  profileName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 12 }, 
  infoBox: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  detailLabel: { color: '#999', fontSize: 17, fontWeight: 'bold' }, 
  detailValue: { color: '#fff', fontSize: 17, fontWeight: 'bold' }, 
  closeFullBtn: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  closeFullBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  textProfileImg: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#444444' },
  textProfileText: { color: '#ffffff', fontWeight: 'bold' },
});

export default ManagerUser;