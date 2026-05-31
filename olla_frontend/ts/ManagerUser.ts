import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Dimensions, Animated, PanResponder, Keyboard, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

const MEMBER_LIST_API = `${API_BASE_URL}/admin/memberships/members`; 
const OFFLINE_REGISTER_API = `${API_BASE_URL}/admin/members/offline`; 
const MEMBER_DELETE_API = `${API_BASE_URL}/admin/members`; 
const PROFILE_API = `${API_BASE_URL}/members`;
const ALERT_SEND_API_URL = `${API_BASE_URL}/admin/alerts/send`; 

// 💡 [API 명세서 대응] 이미지 상대경로 -> 절대경로 변환 유틸
export const getFullImageUrl = (path: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // API_BASE_URL이 '/api/v1'을 포함한다면 제거하고 도메인만 추출
  const domain = API_BASE_URL.replace('/api/v1', '');
  return `${domain}${path}`;
};

export const resolveMembershipType = (
  typeStr: string,
  startDate: string,
  endDate: string,
  remainingCount: number | null
): string => {
  const upper = String(typeStr || '').toUpperCase();
  if (upper === 'COUNT' || upper.includes('횟수') || upper.includes('COUNT')) return '일일권';
  if (upper === 'PERIOD' || upper.includes('기간') || upper.includes('PERIOD') || upper.includes('MONTH')) return '회원권';
  if (remainingCount !== null && remainingCount !== undefined) return '일일권';
  if (startDate && endDate) return '회원권';
  return '없음';
};

export const useManagerUser = (navigation: any) => {
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.65;
  const ADD_MODAL_HEIGHT = SCREEN_HEIGHT * 0.65;
  const ALERT_MODAL_HEIGHT = SCREEN_HEIGHT * 0.55;

  // --- 상태 관리 ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });
  
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({ 
    message: '', confirmText: '확인', cancelText: '취소', onConfirm: () => {}, isDestructive: false 
  });

  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'남자' | '여자' | null>(null);
  const [newBirth, setNewBirth] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [isDetailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [isSendAlertModalVisible, setSendAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertContent, setAlertContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- 애니메이션 (PanResponder) ---
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
        if (gestureState.dy < 0) {
          detailHeightAnim.setValue(-gestureState.dy * 0.1);
        } else {
          detailHeightAnim.setValue(-gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        detailHeightAnim.flattenOffset();
        const finalHeight = currentDetailSnap.current - gestureState.dy;
        const CLOSE_THRESHOLD = DETAIL_MODAL_HEIGHT * 0.75;
        if (finalHeight < CLOSE_THRESHOLD) {
          closeDetailModal();
        } else {
          currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
          Animated.spring(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

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
        if (gestureState.dy < 0) {
          addHeightAnim.setValue(-gestureState.dy * 0.1);
        } else {
          addHeightAnim.setValue(-gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        addHeightAnim.flattenOffset();
        const finalHeight = currentAddSnap.current - gestureState.dy;
        const CLOSE_THRESHOLD = ADD_MODAL_HEIGHT * 0.75;
        if (finalHeight < CLOSE_THRESHOLD) {
          closeAddModal();
        } else {
          currentAddSnap.current = ADD_MODAL_HEIGHT;
          Animated.spring(addHeightAnim, { toValue: ADD_MODAL_HEIGHT, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  const alertHeightAnim = useRef(new Animated.Value(0)).current;
  const currentAlertSnap = useRef(ALERT_MODAL_HEIGHT);
  const alertPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        alertHeightAnim.setOffset(currentAlertSnap.current);
        alertHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          alertHeightAnim.setValue(-gestureState.dy * 0.1);
        } else {
          alertHeightAnim.setValue(-gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        alertHeightAnim.flattenOffset();
        const finalHeight = currentAlertSnap.current - gestureState.dy;
        const CLOSE_THRESHOLD = ALERT_MODAL_HEIGHT * 0.75;
        if (finalHeight < CLOSE_THRESHOLD) {
          closeAlertModal();
        } else {
          currentAlertSnap.current = ALERT_MODAL_HEIGHT;
          Animated.spring(alertHeightAnim, { toValue: ALERT_MODAL_HEIGHT, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // --- 데이터 로직 ---
  const fetchUsers = useCallback(async (token: string) => {
    try {
      const response = await axios.get(MEMBER_LIST_API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 1000, sort: 'id,desc' } 
      });
      // 💡 [API 명세서 대응] response.data.data.content 로 접근
      const raw = response.data?.data?.content || response.data?.data || [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "목록 로드 실패";
      showResultModal("오류", errorMessage, "error");
    }
  }, []);

  const checkAdminAndFetchUsers = useCallback(async (isRefresh = false) => {
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
      console.error("인증 확인 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, navigation]);

  useEffect(() => { checkAdminAndFetchUsers(); }, [checkAdminAndFetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchUsers(true); 
    setRefreshing(false);
  }, [checkAdminAndFetchUsers]);

  // --- 유틸 함수 ---
  const isValidBirthDate = (dateStr: string) => {
    const regex = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regex.test(dateStr)) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
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

  // --- 액션 핸들러 ---
  const handleRegister = async () => {
    if (!newName || !newGender || newBirth.length < 10 || newPhone.length < 12) {
      showResultModal("알림", "정보를 모두 올바르게 입력해주세요.", "info");
      return;
    }
    if (!isValidBirthDate(newBirth)) {
      showResultModal("오류", "존재하지 않는 생년월일입니다.", "error");
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
      const errorMessage = error.response?.data?.message || "등록 실패";
      closeAddModal(() => {
        setTimeout(() => showResultModal("오류", errorMessage, "error"), 300);
      });
    }
  };

  const executeDelete = async (memberId: number | string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${MEMBER_DELETE_API}/${memberId}`, { headers: { Authorization: `Bearer ${token}` } });
      setTimeout(() => showResultModal("성공", "삭제되었습니다.", "success"), 300);
      fetchUsers(token!); 
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "삭제 실패";
      setTimeout(() => showResultModal("오류", errorMessage, "error"), 300);
    }
  };

  const confirmDelete = (memberId: number | string) => { 
    showConfirmModal("정말 삭제하시겠습니까?", () => {
      setConfirmModalVisible(false);
      executeDelete(memberId);
    }, true, "삭제");
  };

  const handleSendAlert = async () => {
    if (!alertTitle.trim() || !alertContent.trim()) {
      showResultModal("알림", "제목과 내용을 모두 입력해주세요.", "info");
      return;
    }
    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(ALERT_SEND_API_URL, {
        memberId: selectedUser?.memberId,
        title: alertTitle,
        content: alertContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      closeAlertModal(() => {
        setTimeout(() => showResultModal("발송 성공", `${selectedUser?.name}님에게 알림을 발송했습니다.`, "success"), 300);
      });
    } catch (error: any) {
      setIsProcessing(false);
      showResultModal("발송 실패", error.response?.data?.message || "알림 발송에 실패했습니다.", "error");
    }
  };

  // --- 모달 제어 ---
  const openDetailModal = async (memberId: number, fallbackName: string, fallbackPhone: string) => {
    try {
      Keyboard.dismiss();
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${PROFILE_API}/${memberId}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      // 💡 [API 명세서 대응] response.data.data 로 단건 조회 접근
      const d = response.data?.data; 
      if (!d) return;
      
      const rawGender = d.detail?.gender || d.gender;
      let displayGender = '-';
      if (rawGender === 'MALE' || rawGender === '남' || rawGender === '남자') displayGender = '남자';
      else if (rawGender === 'FEMALE' || rawGender === '여' || rawGender === '여자') displayGender = '여자';

      setSelectedUser({
        memberId: memberId,
        name: d.name || fallbackName,
        gender: displayGender,
        phone: d.phone || fallbackPhone || '-', 
        profileImageUrl: getFullImageUrl(d.profileImageUrl), // 💡 상대경로 변환 적용
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
      showResultModal('오류', '상세 정보 로드 불가', 'error');
    }
  };

  const closeDetailModal = useCallback(() => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => { 
      setDetailVisible(false); 
      setSelectedUser(null); 
    });
  }, [detailHeightAnim]);

  const openAddModal = () => {
    setAddModalVisible(true);
    currentAddSnap.current = ADD_MODAL_HEIGHT;
    addHeightAnim.setValue(0);
    Animated.timing(addHeightAnim, { toValue: ADD_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  };

  const closeAddModal = useCallback((callback?: () => void) => {
    Animated.timing(addHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setAddModalVisible(false);
      setNewName(''); setNewGender(null); setNewBirth(''); setNewPhone('');
      if (callback) callback();
    });
  }, [addHeightAnim]);

  const openAlertModal = () => {
    setSendAlertModalVisible(true);
    currentAlertSnap.current = ALERT_MODAL_HEIGHT;
    alertHeightAnim.setValue(0);
    Animated.timing(alertHeightAnim, { toValue: ALERT_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  };

  const closeAlertModal = useCallback((callback?: () => void) => {
    Animated.timing(alertHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setSendAlertModalVisible(false);
      setAlertTitle('');
      setAlertContent('');
      setIsProcessing(false);
      if (callback) callback();
    });
  }, [alertHeightAnim]);

  const showResultModal = useCallback((title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  const showConfirmModal = useCallback((message: string, onConfirm: () => void, isDestructive: boolean = false, confirmText: string = '확인') => {
    Keyboard.dismiss();
    setConfirmModalConfig({ message, confirmText, cancelText: '취소', onConfirm, isDestructive });
    setConfirmModalVisible(true);
  }, []);

  // --- Derived State ---
  const filteredAndSortedUsers = useMemo(() => {
    const map = new Map();
    
    users.forEach((user: any) => {
      const memberInfo = user.member || user;
      if (user.deleted === true || user.isDeleted === true || String(user.deleted) === 'true' || memberInfo.status === 'DELETED') return;
      
      const targetName = user.name || memberInfo.name || '이름없음';
      const targetPhone = user.phone || user.phoneNumber || memberInfo.phone || memberInfo.phoneNumber || '';
      const memberId = user.memberId || user.id || memberInfo.id;
      
      if (searchQuery && !targetName.includes(searchQuery) && !targetPhone.includes(searchQuery)) return;
      
      if (!map.has(memberId)) {
        map.set(memberId, { ...user, memberInfo, targetName, targetPhone, memberships: [] });
      }
      
      if (Array.isArray(user.memberships)) {
        user.memberships.forEach((m: any) => {
          if (String(m.membershipStatus || m.status).toUpperCase() !== 'DELETED') {
            map.get(memberId).memberships.push(m);
          }
        });
      } else if (user.activeMembership) {
        map.get(memberId).memberships.push(user.activeMembership);
      }
    });
    
    return Array.from(map.values()).sort((a, b) => a.targetName.localeCompare(b.targetName));
  }, [users, searchQuery]);

  const isFormValid = Boolean(newName && newGender && newBirth.length === 10 && newPhone.length >= 12);

  return {
    loading, refreshing, onRefresh,
    searchQuery, setSearchQuery, filteredAndSortedUsers,
    
    resultModalVisible, setResultModalVisible, resultModalConfig, showResultModal,
    confirmModalVisible, setConfirmModalVisible, confirmModalConfig, confirmDelete,
    
    isAddModalVisible, openAddModal, closeAddModal,
    newName, setNewName, newGender, setNewGender, newBirth, formatBirth, newPhone, formatPhone,
    isFormValid, handleRegister,
    
    isDetailVisible, selectedUser, openDetailModal, closeDetailModal, detailHeightAnim, detailPanResponder,
    
    isSendAlertModalVisible, openAlertModal, closeAlertModal, alertHeightAnim, alertPanResponder,
    alertTitle, setAlertTitle, alertContent, setAlertContent, isProcessing, handleSendAlert,
    addHeightAnim, addPanResponder
  };
};