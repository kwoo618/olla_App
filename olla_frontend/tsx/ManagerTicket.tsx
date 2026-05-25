import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, RefreshControl, Keyboard, Dimensions, PanResponder, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

const MEMBER_LIST_API = `${API_BASE_URL}/admin/memberships/members`; 
const MEMBERSHIP_GRANT_API = `${API_BASE_URL}/admin/memberships/grant`; 
const MEMBERSHIP_BASE_API = `${API_BASE_URL}/admin/memberships`; 

LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'kr';

const resolveMembershipType = (
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

  return '이용권';
};

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  return dateStr;
};

const ManagerTicket = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ─── 결과 알림 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss(); 
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // ─── 확인(Confirm) 모달 상태 ───
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    message: '', confirmText: '확인', cancelText: '취소', onConfirm: () => {}, isDestructive: false
  });

  const showConfirmModal = (message: string, onConfirm: () => void, isDestructive: boolean = false, confirmText: string = '확인') => {
    Keyboard.dismiss();
    setConfirmModalConfig({ message, confirmText, cancelText: '취소', onConfirm, isDestructive });
    setConfirmModalVisible(true);
  };

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [isStartCalendarVisible, setStartCalendarVisible] = useState(false);
  const [editStart, setEditStart] = useState('');
  
  // ✅ 종료일 관련 상태 추가
  const [isEndCalendarVisible, setEndCalendarVisible] = useState(false);
  const [editEnd, setEditEnd] = useState('');

  const [editType, setEditType] = useState<'PERIOD' | 'COUNT'>('PERIOD');
  const [addValue, setAddValue] = useState(''); // COUNT 일 때만 사용하도록 유지

  const [isManageVisible, setManageVisible] = useState(false);
  const [selectedManageItem, setSelectedManageItem] = useState<any>(null);
  
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const GRANT_START_HEIGHT = SCREEN_HEIGHT * 0.50;
  const GRANT_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;
  const MANAGE_HEIGHT_1 = SCREEN_HEIGHT * 0.65;
  const MANAGE_HEIGHT_2 = SCREEN_HEIGHT * 0.85;
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95;

  const targetManageBaseSnap = useRef(MANAGE_HEIGHT_1);
  const manageHeightAnim = useRef(new Animated.Value(0)).current;
  const currentManageSnap = useRef(MANAGE_HEIGHT_1);

  const managePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        manageHeightAnim.setOffset(currentManageSnap.current);
        manageHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (currentManageSnap.current === FULL_SCREEN && gestureState.dy < 0) {
          manageHeightAnim.setValue(-gestureState.dy * 0.1);
        } else {
          manageHeightAnim.setValue(-gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        manageHeightAnim.flattenOffset();
        const finalHeight = currentManageSnap.current - gestureState.dy;
        const THRESHOLD = (targetManageBaseSnap.current + FULL_SCREEN) / 2;
        const CLOSE_THRESHOLD = targetManageBaseSnap.current * 0.75;
        
        if (finalHeight > THRESHOLD) {
          currentManageSnap.current = FULL_SCREEN;
          Animated.spring(manageHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight < CLOSE_THRESHOLD) {
          closeManageModal();
        } else {
          currentManageSnap.current = targetManageBaseSnap.current;
          Animated.spring(manageHeightAnim, { toValue: targetManageBaseSnap.current, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  const targetEditBaseSnap = useRef(GRANT_START_HEIGHT);
  const editHeightAnim = useRef(new Animated.Value(0)).current;
  const currentEditSnap = useRef(GRANT_START_HEIGHT);

  const editPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        editHeightAnim.setOffset(currentEditSnap.current);
        editHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (currentEditSnap.current === FULL_SCREEN && gestureState.dy < 0) {
          editHeightAnim.setValue(-gestureState.dy * 0.1);
        } else {
          editHeightAnim.setValue(-gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        editHeightAnim.flattenOffset();
        const finalHeight = currentEditSnap.current - gestureState.dy;
        const THRESHOLD = (targetEditBaseSnap.current + FULL_SCREEN) / 2;
        const CLOSE_THRESHOLD = targetEditBaseSnap.current * 0.75;

        if (finalHeight > THRESHOLD) {
          currentEditSnap.current = FULL_SCREEN;
          Animated.spring(editHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight < CLOSE_THRESHOLD) {
          closeEditModal();
        } else {
          currentEditSnap.current = targetEditBaseSnap.current;
          Animated.spring(editHeightAnim, { toValue: targetEditBaseSnap.current, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  const openManageModal = (group: any) => {
    setSelectedManageItem(group);
    setManageVisible(true);
    
    const mergedCount = group.displayMemberships ? group.displayMemberships.length : 1;
    const dynamicHeight = mergedCount > 1 ? MANAGE_HEIGHT_2 : MANAGE_HEIGHT_1;
    
    targetManageBaseSnap.current = dynamicHeight;
    currentManageSnap.current = dynamicHeight;

    manageHeightAnim.setValue(0);
    Animated.timing(manageHeightAnim, { toValue: dynamicHeight, duration: 300, useNativeDriver: false }).start();
  };

  const closeManageModal = (callback?: () => void) => {
    Animated.timing(manageHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setManageVisible(false);
      setSelectedManageItem(null);
      if (callback) {
        setTimeout(callback, Platform.OS === 'ios' ? 500 : 300); 
      }
    });
  };

  const openEditModal = () => {
    setEditModalVisible(true);
    
    targetEditBaseSnap.current = GRANT_START_HEIGHT;
    currentEditSnap.current = GRANT_START_HEIGHT;
    
    editHeightAnim.setValue(0);
    Animated.timing(editHeightAnim, { toValue: GRANT_START_HEIGHT, duration: 300, useNativeDriver: false }).start();
  };

  const closeEditModal = (callback?: () => void) => {
    Animated.timing(editHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setEditModalVisible(false);
      setSelectedUser(null);
      setModalSearch('');
      setAddValue('');
      setEditStart('');
      setEditEnd(''); // 닫을 때 종료일도 초기화
      
      targetEditBaseSnap.current = GRANT_START_HEIGHT;
      currentEditSnap.current = GRANT_START_HEIGHT;

      if (callback) callback();
    });
  };

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const targetType = editType === 'PERIOD' ? '회원권' : '일일권';
      const existingMemberships = selectedUser.memberships.filter((m: any) => 
        resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount) === targetType
      );

      if (existingMemberships.length > 0) {
        let latestEndDate = '';
        existingMemberships.forEach((m: any) => {
          if (m.endDate) {
            if (!latestEndDate || new Date(m.endDate) > new Date(latestEndDate)) {
              latestEndDate = m.endDate;
            }
          }
        });

        if (latestEndDate) {
          const nextDay = new Date(latestEndDate);
          nextDay.setDate(nextDay.getDate() + 1); 
          const yyyy = nextDay.getFullYear();
          const mm = String(nextDay.getMonth() + 1).padStart(2, '0');
          const dd = String(nextDay.getDate()).padStart(2, '0');
          setEditStart(`${yyyy}-${mm}-${dd}`);
          setEditEnd(''); // 기존 정보 로드 시 종료일은 리셋
          return;
        }
      }
      setEditStart(''); 
      setEditEnd('');
    }
  }, [selectedUser, editType]);

  const checkAdminAndFetchUsers = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');

      if (!token || role !== 'ADMIN') {
        showResultModal('권한 오류', '관리자만 접근할 수 있는 페이지입니다.', 'error', () => navigation.goBack());
        return;
      }
      await fetchUsers(token);
    } catch (error) {
      console.error("인증 에러:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchUsers();
    setRefreshing(false);
  }, []);

  const fetchUsers = async (token: string) => {
    try {
      const response = await axios.get(MEMBER_LIST_API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 1000, sort: 'id,desc' }
      });
      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '회원 목록을 불러오는데 실패했습니다.';
      showResultModal('오류', errorMessage, 'error');
    }
  };

  const getToday = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const calculateDDay = (targetDate: string) => {
    if (!targetDate) return '-';
    const end = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 ? `${days}일` : '만료';
  };

  const mergeByType = (memberships: any[]) => {
    const periodList = memberships.filter(
      (m: any) => resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount) === '회원권'
    );
    const countList = memberships.filter(
      (m: any) => resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount) === '일일권'
    );

    const merged: any[] = [];

    if (periodList.length > 0) {
      let earliestStart = '';
      let latestEnd = '';
      let totalRemainingDays = 0;
      const isHolding = periodList.some((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING');

      periodList.forEach((m: any) => {
        if (!earliestStart || (m.startDate && m.startDate < earliestStart)) earliestStart = m.startDate;
        if (!latestEnd || (m.endDate && m.endDate > latestEnd)) latestEnd = m.endDate;
      });

      if (latestEnd && earliestStart) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const start = new Date(earliestStart);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(latestEnd);
        end.setHours(0, 0, 0, 0);
        
        const effectiveStart = today.getTime() > start.getTime() ? today : start;
        const diff = Math.ceil((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
        
        totalRemainingDays = diff >= 0 ? diff : 0;
      }

      merged.push({
        _merged: true,
        _type: '회원권',
        _ids: periodList.map((m: any) => m.membershipId || m.id),
        _originals: periodList,
        membershipType: 'PERIOD',
        startDate: earliestStart,
        endDate: latestEnd,
        remainingCount: null,
        membershipStatus: isHolding ? 'HOLDING' : 'ACTIVE',
        _totalRemainingDays: totalRemainingDays,
      });
    }

    if (countList.length > 0) {
      const totalCount = countList.reduce((sum: number, m: any) => sum + (m.remainingCount ?? 0), 0);
      const isHolding = countList.some((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING');
      const earliestStart = countList.reduce((earliest: string, m: any) => {
        if (!earliest || (m.startDate && m.startDate < earliest)) return m.startDate;
        return earliest;
      }, '');

      merged.push({
        _merged: true,
        _type: '일일권',
        _ids: countList.map((m: any) => m.membershipId || m.id),
        _originals: countList,
        membershipType: 'COUNT',
        startDate: earliestStart,
        endDate: '',
        remainingCount: totalCount,
        membershipStatus: isHolding ? 'HOLDING' : 'ACTIVE',
      });
    }

    return merged;
  };

  const groupedHolders = useMemo(() => {
    const map = new Map();
    
    users.forEach((u: any) => {
      if (u.deleted === true || u.isDeleted === true || String(u.deleted) === 'true') return;
      const status = String(u.membershipStatus || '').toUpperCase();
      if (status === 'DELETED') return;
      
      if (status && status !== 'ACTIVE' && status !== 'HOLDING') return;

      const mName = u.name || u.member?.name || '이름없음';
      const mPhone = u.phone || u.member?.phone || u.phoneNumber || u.member?.phoneNumber || '번호없음';
      const mId = u.memberId !== undefined && u.memberId !== 0 ? u.memberId : (u.member?.id !== undefined ? u.member.id : `${mName}-${mPhone}`);
      
      if (searchQuery && !mName.includes(searchQuery) && !mPhone.includes(searchQuery)) return;

      const groupKey = `${mId}`; 

      if (!map.has(groupKey)) {
        map.set(groupKey, { memberId: mId, name: mName, phone: mPhone, memberships: [] });
      }
      
      if (Array.isArray(u.memberships)) {
        u.memberships.forEach((nestedM: any) => {
          if (String(nestedM.membershipStatus).toUpperCase() !== 'DELETED') {
            map.get(groupKey).memberships.push(nestedM);
          }
        });
      } else {
        map.get(groupKey).memberships.push(u);
      }
    });

    return Array.from(map.values())
      .filter(group => group.memberships.length > 0)
      .map(group => {
        const uniqueMemberships: any[] = [];
        const seen = new Set();
        group.memberships.forEach((m: any) => {
          let id = m.membershipId || m.id;
          if (!id || id === 0) {
            id = `${m.membershipType}-${m.remainingCount}-${m.startDate}-${m.endDate}`;
          }
          if (!seen.has(id)) {
            seen.add(id);
            uniqueMemberships.push(m);
          }
        });

        group.memberships = uniqueMemberships;
        group.displayMemberships = mergeByType(uniqueMemberships);
        return group;
      });
  }, [users, searchQuery]);

  const groupedSearchResults = useMemo(() => {
    const map = new Map();
    users.forEach((u: any) => {
      if (u.deleted === true || u.isDeleted === true || String(u.deleted) === 'true') return;
      const status = String(u.membershipStatus || '').toUpperCase();
      if (status === 'DELETED') return;

      const mName = u.name || u.member?.name || '이름없음';
      const mPhone = u.phone || u.member?.phone || u.phoneNumber || u.member?.phoneNumber || '번호없음';
      const mId = u.memberId !== undefined && u.memberId !== 0 ? u.memberId : (u.member?.id !== undefined ? u.member.id : `${mName}-${mPhone}`);
      
      if (!modalSearch || mName.includes(modalSearch) || mPhone.includes(modalSearch)) {
        const groupKey = `${mId}`;
        if (!map.has(groupKey)) {
          map.set(groupKey, { memberId: mId, name: mName, phone: mPhone, memberships: [] });
        }
        
        if (Array.isArray(u.memberships)) {
          u.memberships.forEach((nestedM: any) => {
            if (String(nestedM.membershipStatus).toUpperCase() !== 'DELETED') {
              map.get(groupKey).memberships.push(nestedM);
            }
          });
        } else if (status === 'ACTIVE' || status === 'HOLDING') {
          map.get(groupKey).memberships.push(u);
        }
      }
    });

    return Array.from(map.values()).map(group => {
      const uniqueMemberships: any[] = [];
      const seen = new Set();
      group.memberships.forEach((m: any) => {
        let id = m.membershipId || m.id;
        if (!id || id === 0) id = `${m.membershipType}-${m.remainingCount}-${m.startDate}-${m.endDate}`;
        if (!seen.has(id)) {
          seen.add(id);
          uniqueMemberships.push(m);
        }
      });
      group.memberships = uniqueMemberships;
      group.displayMemberships = mergeByType(uniqueMemberships);
      return group;
    });
  }, [users, modalSearch]);

  const handleSelectUser = (group: any) => {
    setSelectedUser(group);
    setEditType('PERIOD');
    setAddValue('');
    setEditEnd(''); // 회원 선택 시 종료일도 초기화
    
    targetEditBaseSnap.current = GRANT_EXPANDED_HEIGHT;
    currentEditSnap.current = GRANT_EXPANDED_HEIGHT;
    Animated.spring(editHeightAnim, { toValue: GRANT_EXPANDED_HEIGHT, useNativeDriver: false }).start();
  };

  const handleGrantTicket = async () => {
    if (!selectedUser) return;

    const startDateStr = editStart || getToday();
    
    // ✅ 회원권과 일일권 각각의 유효성 검증
    if (editType === 'PERIOD') {
      if (!editEnd || editEnd.length !== 10) {
        showResultModal('알림', '종료일을 정확하게 입력해주십시오.', 'info');
        return;
      }
      
      const startD = new Date(startDateStr);
      startD.setHours(0, 0, 0, 0);
      const endD = new Date(editEnd);
      endD.setHours(0, 0, 0, 0);
      
      if (endD.getTime() < startD.getTime()) {
        showResultModal('등록 불가', '종료일이 시작일보다 과거일 수 없습니다.', 'error');
        return;
      }
    } else {
      if (addValue && (isNaN(Number(addValue)) || Number(addValue) < 0)) {
        showResultModal('알림', '유효한 횟수를 입력해주십시오.', 'error');
        return;
      }
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const memberId = selectedUser.memberId || selectedUser.id;

      // ✅ 종료일을 지정하도록 Payload 수정
      const requestBody = editType === 'PERIOD'
        ? { memberId, startDate: startDateStr, endDate: editEnd }
        : { memberId, addCount: addValue && !isNaN(Number(addValue)) && Number(addValue) > 0 ? Number(addValue) : 1, startDate: startDateStr };

      await axios.post(MEMBERSHIP_GRANT_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });

      closeEditModal(() => {
        setTimeout(() => {
          showResultModal('성공', '이용권이 성공적으로 등록되었습니다.', 'success');
          fetchUsers(token!);
        }, Platform.OS === 'ios' ? 500 : 300);
      });
      
    } catch (error: any) {
      const serverMessage = error.response?.data?.message || '이용권 등록에 실패했습니다.';
      closeEditModal(() => {
        setTimeout(() => {
          if (serverMessage?.includes("is_deleted") || serverMessage?.includes("default value")) {
            showResultModal('서버 설정 오류', 'Membership 엔티티의 is_deleted 필드에 기본값이 없습니다.\n백엔드 서버를 수정해주세요.', 'error');
          } else {
            showResultModal('오류', serverMessage, 'error');
          }
        }, Platform.OS === 'ios' ? 500 : 300);
      });
    }
  };

  const togglePauseStatus = (membershipId: number, currentStatus: string) => {
    if (!membershipId) {
      showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error');
      return;
    }
    const isCurrentlyHolding = String(currentStatus).toUpperCase() === 'HOLDING';
    const actionText = isCurrentlyHolding ? '정지 해제' : '일시정지';
    const endpoint = isCurrentlyHolding ? 'unpause' : 'pause';

    closeManageModal(() => {
      showConfirmModal(
        `해당 내역을 ${actionText} 하시겠습니까?`,
        async () => {
          setConfirmModalVisible(false);
          try {
            const token = await AsyncStorage.getItem('userToken');
            await axios.patch(`${MEMBERSHIP_BASE_API}/${membershipId}/${endpoint}`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setTimeout(() => {
              showResultModal('성공', `이용권이 ${actionText} 되었습니다.`, 'success');
              fetchUsers(token!);
            }, Platform.OS === 'ios' ? 500 : 300);
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || '상태 변경에 실패했습니다.';
            setTimeout(() => {
              showResultModal('오류', errorMessage, 'error');
            }, Platform.OS === 'ios' ? 500 : 300);
          }
        }
      );
    });
  };

  const executeDeleteTicket = async (membershipId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      await axios.delete(`${MEMBERSHIP_BASE_API}/${membershipId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      setTimeout(() => {
        showResultModal('성공', '해당 내역 1건이 성공적으로 삭제되었습니다.', 'success', async () => {
          await fetchUsers(token);
        });
      }, Platform.OS === 'ios' ? 500 : 300);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.data?.message 
        || '이용권 삭제에 실패했습니다.';
      setTimeout(() => {
        showResultModal('오류', errorMessage, 'error');
      }, Platform.OS === 'ios' ? 500 : 300);
    }
  };

  const confirmDeleteSpecificTicket = (membershipId: number, description: string) => {
    if (!membershipId) {
      showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error');
      return;
    }

    closeManageModal(() => {
      showConfirmModal(
        `${description}\n해당 내역을 정말 삭제하시겠습니까?`,
        () => {
          setConfirmModalVisible(false);
          setTimeout(() => {
            executeDeleteTicket(membershipId);
          }, Platform.OS === 'ios' ? 500 : 300);
        },
        true,
        '삭제'
      );
    });
  };

  const calendarTheme = {
    backgroundColor: '#212121',
    calendarBackground: '#212121',
    textSectionTitleColor: '#999999',
    selectedDayBackgroundColor: '#A1BE44',
    selectedDayTextColor: '#000000',
    todayTextColor: '#A1BE44',
    dayTextColor: '#ffffff',
    textDisabledColor: '#444444',
    monthTextColor: '#ffffff',
    textDayFontWeight: '500' as const,
    textMonthFontWeight: 'bold' as const,
    textDayHeaderFontWeight: '500' as const,
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  };

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}
      >
        
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="회원 이름 또는 연락처로 검색"
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colInfo]}>회원/이용권</Text>
        <Text style={[styles.headerText, styles.colDate]}>시작일/종료일</Text>
        <Text style={[styles.headerText, styles.colDday]}>잔여</Text>
        <Text style={[styles.headerText, styles.colStatus]}>상태</Text>
      </View>
      <View style={styles.headerDivider} />

        {groupedHolders.length === 0 ? (
          <Text style={styles.emptyText}>보유 중인 이용권이 없습니다.</Text>
        ) : (
          groupedHolders.map((group: any) => {
            const { memberId, name, displayMemberships, memberships } = group;
            
            const subText = displayMemberships.map((m: any) => m._type).join(' / ');
            
            const activeCount = memberships.filter((m: any) => String(m.membershipStatus).toUpperCase() === 'ACTIVE').length;
            const holdingCount = memberships.filter((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING').length;

            let badgeText = '이용중';
            let badgeStyle = styles.badgeActive;
            let badgeTextStyle = styles.badgeTextActive;

            if (holdingCount > 0 && activeCount === 0) {
              badgeText = '정지';
              badgeStyle = styles.badgeHolding;
              badgeTextStyle = styles.badgeTextHolding;
            } else if (holdingCount > 0 && activeCount > 0) {
              badgeText = '일부 정지';
              badgeStyle = styles.badgePartial;
              badgeTextStyle = styles.badgeTextPartial;
            }

            return (
              <TouchableOpacity key={memberId} style={styles.tableRow} activeOpacity={0.7} onPress={() => openManageModal(group)}>
                
                <View style={styles.colInfo}>
                  <Text style={styles.rowTextName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.rowTextSub}>{subText}</Text>
                </View>

                <View style={styles.colDate}>
                  {displayMemberships.map((m: any, idx: number) => {
                    const isCount = m._type === '일일권';
                    return (
                      <Text key={`date-${m._type}-${idx}`} style={[styles.rowTextDate, idx > 0 && { marginTop: 6 }]} numberOfLines={1}>
                        {isCount
                          ? formatShortDate(m.startDate)
                          : `${formatShortDate(m.startDate)} ~ ${formatShortDate(m.endDate)}`
                        }
                      </Text>
                    );
                  })}
                </View>

                <View style={styles.colDday}>
                  {displayMemberships.map((m: any, idx: number) => {
                    const isCount = m._type === '일일권';
                    return (
                      <Text key={`dday-${m._type}-${idx}`} style={[styles.rowTextDday, idx > 0 && { marginTop: 6 }]} numberOfLines={1}>
                        {isCount
                          ? `${m.remainingCount ?? 0}회`
                          : (m._totalRemainingDays !== undefined ? `${m._totalRemainingDays}일` : calculateDDay(m.endDate))
                        }
                      </Text>
                    );
                  })}
                </View>

                <View style={[styles.colStatus, styles.center]}>
                  <View style={[styles.badge, badgeStyle]}>
                    <Text style={badgeTextStyle}>{badgeText}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom + 5, 20) }]} activeOpacity={0.8} onPress={openEditModal}>
        <Text style={styles.fabText}>+ 이용권 등록</Text>
      </TouchableOpacity>

      {/* ─── 투 버튼 확인(Confirm) 모달 ─── */}
      <Modal visible={confirmModalVisible} animationType="fade" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>{confirmModalConfig.message}</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity 
                style={[styles.btnYes, confirmModalConfig.isDestructive ? { backgroundColor: '#FF4D4D' } : { backgroundColor: '#A1BE44' }]} 
                onPress={confirmModalConfig.onConfirm}
              >
                <Text style={[styles.btnTextBlack, confirmModalConfig.isDestructive && { color: '#ffffff' }]}>{confirmModalConfig.confirmText}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.btnTextWhite}>{confirmModalConfig.cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 결과 알림 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => {
              setResultModalVisible(false);
              if (typeof resultModalConfig.onConfirm === 'function') resultModalConfig.onConfirm();
            }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ 1. 이용권 관리 바텀시트 모달 */}
      <Modal visible={isManageVisible} transparent={true} animationType="fade" onRequestClose={() => closeManageModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => closeManageModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: manageHeightAnim, overflow: 'hidden' }]}>
            
            <View {...managePanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>이용권 관리</Text>
                <TouchableOpacity onPress={() => closeManageModal()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
            </View>

            {selectedManageItem && (() => {
              const { name, memberships, displayMemberships } = selectedManageItem;
              const displayTypes = memberships.map((m: any) => resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount));
              const uniqueTypes = [...new Set(displayTypes)];
              const manageDisplayType = uniqueTypes.join(' / ');
              
              const activeCount = memberships.filter((m: any) => String(m.membershipStatus).toUpperCase() === 'ACTIVE').length;
              const holdingCount = memberships.filter((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING').length;
              
              let statusText = '이용중';
              if (holdingCount > 0 && activeCount === 0) statusText = '전체 정지중';
              else if (holdingCount > 0 && activeCount > 0) statusText = '일부 정지중';

              const manageItemSubText = `${manageDisplayType} ${statusText}`;

              return (
                <View style={{ flex: 1 }}>
                  <View style={styles.manageInfoBox}>
                    <Text style={styles.manageItemName}>{name}</Text>
                    <Text style={styles.manageItemSub}>{manageItemSubText}</Text>
                    
                    <View style={styles.manageDetailContainer}>
                      {displayMemberships.map((m: any, idx: number) => {
                        const isCountType = m._type === '일일권';
                        const remainText = isCountType
                          ? `[일일권] 총 잔여 ${m.remainingCount ?? 0}회`
                          : `[회원권] 총 잔여 ${m._totalRemainingDays}일 (${m.startDate || '-'} ~ ${m.endDate || '-'})`;
                        return (
                          <Text key={`merged-detail-${idx}`} style={styles.manageDetailText}>
                            • {remainText}
                          </Text>
                        );
                      })}
                    </View>
                  </View>

                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {displayMemberships.map((m: any, idx: number) => {
                      const mType = m._type;

                      return (
                        <View key={`manage-action-${mType}-${idx}`} style={styles.manageActionGroup}>
                          <Text style={styles.manageActionGroupTitle}>{mType} 상세 내역</Text>
                          
                          {m._originals.map((orig: any, oIdx: number) => {
                            const origId = orig.membershipId || orig.id;
                            const origIsHolding = String(orig.membershipStatus).toUpperCase() === 'HOLDING';
                            const origIsCountType = mType === '일일권';
                            
                            const description = origIsCountType
                              ? `잔여 ${orig.remainingCount ?? 0}회`
                              : `${formatShortDate(orig.startDate)} ~ ${formatShortDate(orig.endDate)}`;

                            return (
                              <View key={`orig-${origId}-${oIdx}`} style={styles.originalItemRow}>
                                <View style={styles.originalItemInfo}>
                                  <Text style={styles.originalItemTitle}>{description}</Text>
                                  <Text style={[styles.originalItemStatus, origIsHolding && styles.originalItemStatusHolding]}>
                                    {origIsHolding ? '정지중' : '이용중'}
                                  </Text>
                                </View>
                                
                                <View style={styles.originalItemActions}>
                                  {!origIsCountType && (
                                    <TouchableOpacity 
                                      style={styles.actionIconBtn}
                                      onPress={() => togglePauseStatus(origId, orig.membershipStatus)}
                                    >
                                      <Text style={styles.actionIconText}>{origIsHolding ? '재개' : '정지'}</Text>
                                    </TouchableOpacity>
                                  )}
                                  <TouchableOpacity 
                                    style={styles.actionIconBtnDanger}
                                    onPress={() => confirmDeleteSpecificTicket(origId, `[${mType}] ${description}`)}
                                  >
                                    <Text style={styles.actionIconDangerText}>삭제</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity style={[styles.closeFullBtn, { marginTop: 10, marginBottom: 20 }]} onPress={() => closeManageModal()}>
                    <Text style={styles.closeFullBtnText}>닫기</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </Animated.View>
        </View>
      </Modal>

      {/* ✅ 2. 이용권 등록 바텀 시트 모달 */}
      <Modal visible={isEditModalVisible} transparent={true} animationType="fade" onRequestClose={() => closeEditModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => closeEditModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[styles.bottomSheet, { height: editHeightAnim, overflow: 'hidden' }]}>
              
              <View {...editPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>이용권 등록</Text>
                  <TouchableOpacity onPress={() => closeEditModal()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horizontalDivider} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
                
                <View style={styles.modalSearchBox}>
                  <Text style={styles.searchIcon}>🔎</Text>
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="부여할 회원을 검색하세요"
                    placeholderTextColor="#666"
                    value={modalSearch}
                    onChangeText={setModalSearch}
                  />
                </View>

                <View style={styles.modalTableHeader}>
                  <Text style={[styles.modalHeaderText, { flex: 1.5 }]}>회원정보</Text>
                  <Text style={[styles.modalHeaderText, { flex: 2, textAlign: 'center' }]}>연락처</Text>
                  <Text style={[styles.modalHeaderText, { flex: 1.5, textAlign: 'center' }]}>현재 이용권</Text>
                </View>
                <View style={styles.headerDivider} />

                <View style={{ height: 160, marginBottom: 20 }}>
                  <ScrollView style={styles.searchResultTable} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                    {groupedSearchResults.length === 0 ? (
                      <Text style={styles.modalEmptyText}>검색된 회원이 없습니다.</Text>
                    ) : (
                      groupedSearchResults.map((group: any) => {
                        const isSelected = selectedUser && selectedUser.memberId === group.memberId;
                        const displayTicket = group.displayMemberships.length > 0
                          ? group.displayMemberships.map((m: any) => m._type).join(' / ')
                          : '없음';

                        return (
                          <TouchableOpacity
                            key={group.memberId}
                            style={[styles.searchResultRow, isSelected && styles.selectedRow]}
                            onPress={() => handleSelectUser(group)}
                          >
                            <Text style={[styles.resultTextName, { flex: 1.5 }]} numberOfLines={1}>{group.name}</Text>
                            <Text style={[styles.resultTextSub, { flex: 2, textAlign: 'center' }]}>{group.phone}</Text>
                            <Text style={[styles.resultTextType, { flex: 1.5, textAlign: 'center' }]}>
                              {displayTicket}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>

                {selectedUser && (
                  <View style={styles.formContainer}>
                    <Text style={styles.inputLabel}>이용권 종류</Text>
                    <View style={styles.typeToggleRow}>
                      <TouchableOpacity
                        style={[styles.typeBtn, editType === 'PERIOD' && styles.typeBtnActive]}
                        onPress={() => { setEditType('PERIOD'); setAddValue(''); setEditEnd(''); }}
                      >
                        <Text style={[styles.typeBtnText, editType === 'PERIOD' && styles.typeBtnTextActive]}>회원권</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeBtn, editType === 'COUNT' && styles.typeBtnActive]}
                        onPress={() => { setEditType('COUNT'); setAddValue(''); }}
                      >
                        <Text style={[styles.typeBtnText, editType === 'COUNT' && styles.typeBtnTextActive]}>일일권</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.horizontalDateRow}>
                      {/* 시작일 Block */}
                      <View style={styles.dateBlock}>
                        <Text style={styles.inputLabel}>시작일</Text>
                        <View style={styles.dateInputBox}>
                          <TextInput
                            style={styles.dateTextInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#666"
                            value={editStart || getToday()}
                            onChangeText={(text) => {
                              const numeric = text.replace(/[^0-9]/g, '');
                              let formatted = numeric;
                              if (numeric.length > 4 && numeric.length <= 6) formatted = `${numeric.slice(0, 4)}-${numeric.slice(4)}`;
                              else if (numeric.length > 6) formatted = `${numeric.slice(0, 4)}-${numeric.slice(4, 6)}-${numeric.slice(6, 8)}`;
                              setEditStart(formatted);
                            }}
                            keyboardType="numeric"
                            maxLength={10}
                          />
                          <TouchableOpacity onPress={() => setStartCalendarVisible(true)} style={styles.calendarIconBtn}>
                            <Image source={require('../assets/DATE.png')} style={styles.dateIcon} />
                          </TouchableOpacity>
                        </View>
                        {editStart && editStart !== getToday() && (
                          <TouchableOpacity onPress={() => setEditStart('')} style={styles.resetDateBtn}>
                            <Text style={styles.resetDateText}>오늘로 초기화</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.dateSpacer} />

                      {/* ✅ 회원권(종료일 달력) or 일일권(횟수) Block */}
                      {editType === 'PERIOD' ? (
                        <View style={styles.dateBlock}>
                          <Text style={styles.inputLabel}>종료일</Text>
                          <View style={styles.dateInputBox}>
                            <TextInput
                              style={styles.dateTextInput}
                              placeholder="YYYY-MM-DD"
                              placeholderTextColor="#666"
                              value={editEnd}
                              onChangeText={(text) => {
                                const numeric = text.replace(/[^0-9]/g, '');
                                let formatted = numeric;
                                if (numeric.length > 4 && numeric.length <= 6) formatted = `${numeric.slice(0, 4)}-${numeric.slice(4)}`;
                                else if (numeric.length > 6) formatted = `${numeric.slice(0, 4)}-${numeric.slice(4, 6)}-${numeric.slice(6, 8)}`;
                                setEditEnd(formatted);
                              }}
                              keyboardType="numeric"
                              maxLength={10}
                            />
                            <TouchableOpacity onPress={() => setEndCalendarVisible(true)} style={styles.calendarIconBtn}>
                              <Image source={require('../assets/DATE.png')} style={styles.dateIcon} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.dateBlock}>
                          <Text style={styles.inputLabel}>횟수 (비우면 1회)</Text>
                          <TextInput
                            style={styles.amountInput}
                            placeholder="기본 1회"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={addValue}
                            onChangeText={setAddValue}
                          />
                        </View>
                      )}
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleGrantTicket}>
                      <Text style={styles.submitBtnText}>등록 완료</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ✅ 시작일 달력 팝업 모달 */}
      <Modal visible={isStartCalendarVisible} animationType="fade" transparent={true}>
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarBox}>
            <Text style={styles.calendarTitle}>시작일 선택</Text>
            <Calendar
              current={editStart || getToday()}
              onDayPress={(day: any) => {
                setEditStart(day.dateString);
                setStartCalendarVisible(false);
              }}
              theme={calendarTheme}
              markedDates={{
                [editStart || getToday()]: { selected: true, selectedColor: '#A1BE44' }
              }}
            />
            <TouchableOpacity style={styles.calendarCloseBtn} onPress={() => setStartCalendarVisible(false)}>
              <Text style={styles.calendarCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ 종료일 달력 팝업 모달 */}
      <Modal visible={isEndCalendarVisible} animationType="fade" transparent={true}>
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarBox}>
            <Text style={styles.calendarTitle}>종료일 선택</Text>
            <Calendar
              current={editEnd || editStart || getToday()}
              minDate={editStart || getToday()} // 시작일 이전 날짜 비활성화
              onDayPress={(day: any) => {
                setEditEnd(day.dateString);
                setEndCalendarVisible(false);
              }}
              theme={calendarTheme}
              markedDates={{
                [editEnd]: { selected: true, selectedColor: '#A1BE44' }
              }}
            />
            <TouchableOpacity style={styles.calendarCloseBtn} onPress={() => setEndCalendarVisible(false)}>
              <Text style={styles.calendarCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ─── 스타일 시트 ───
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  searchContainer: { paddingHorizontal: 20, marginTop: 15, marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 20, height: 60 },
  searchIcon: { fontSize: 20, marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 17 },

  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  headerText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  headerDivider: { height: 1, backgroundColor: '#333333', marginHorizontal: 20, marginBottom: 10 },

  listContainer: { paddingHorizontal: 20 },

  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 18, paddingHorizontal: 5, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A' },

  colInfo: { flex: 2.2, paddingLeft: 5 },
  colDate: { flex: 2.8, alignItems: 'center' },
  colDday: { flex: 1.4, alignItems: 'center' },
  colStatus: { flex: 1.6 },

  rowTextName: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  rowTextSub: { color: '#999', fontSize: 13 },
  rowTextDate: { color: '#ccc', fontSize: 13, textAlign: 'center' },
  rowTextDday: { color: '#A1BE44', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 17, textAlign: 'center', marginTop: 40 },

  center: { alignItems: 'center', justifyContent: 'center' },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeActive: { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeHolding: { backgroundColor: 'rgba(255, 153, 0, 0.2)' },
  badgePartial: { backgroundColor: 'rgba(77, 166, 255, 0.2)' },
  badgeTextActive: { color: '#A1BE44', fontSize: 13, fontWeight: 'bold' },
  badgeTextHolding: { color: '#FF9900', fontSize: 13, fontWeight: 'bold' },
  badgeTextPartial: { color: '#4DA6FF', fontSize: 13, fontWeight: 'bold' },

  fab: { position: 'absolute', right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 25, paddingVertical: 18, borderRadius: 30, elevation: 5 },
  fabText: { color: '#000', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' },
  closeIcon: { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 15, height: 55, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  modalSearchInput: { flex: 1, color: '#fff', fontSize: 17 },

  modalTableHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 5 },
  modalHeaderText: { color: '#999', fontSize: 14, fontWeight: 'bold' },

  searchResultTable: { backgroundColor: '#000', borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  selectedRow: { backgroundColor: 'rgba(161, 190, 68, 0.15)', borderColor: '#A1BE44', borderWidth: 1, borderRadius: 8 },
  resultTextName: { color: '#fff', fontSize: 16, fontWeight: 'bold', paddingLeft: 10 },
  resultTextSub: { color: '#aaa', fontSize: 15 },
  resultTextType: { color: '#A1BE44', fontSize: 15, fontWeight: 'bold' },
  modalEmptyText: { color: '#666', textAlign: 'center', paddingVertical: 20, fontSize: 16 },

  formContainer: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginTop: 10 },
  typeToggleRow: { flexDirection: 'row', marginBottom: 20 },
  typeBtn: { flex: 1, height: 55, backgroundColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#333' },
  typeBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  typeBtnText: { color: '#999', fontWeight: 'bold', fontSize: 16 },
  typeBtnTextActive: { color: '#A1BE44' },

  horizontalDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateBlock: { flex: 1 },
  dateSpacer: { width: 15 },
  inputLabel: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 10, marginLeft: 2 },
  
  dateInputBox: { height: 55, backgroundColor: '#000', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12, paddingRight: 5, borderWidth: 1, borderColor: '#333' },
  dateTextInput: { flex: 1, color: '#fff', fontSize: 17, padding: 0 },
  calendarIconBtn: { padding: 8 },
  dateIcon: { width: 22, height: 22, tintColor: '#A1BE44' },
  
  resetDateBtn: { marginTop: 6, alignSelf: 'flex-start' },
  resetDateText: { color: '#A1BE44', fontSize: 13 },
  amountInput: { height: 55, backgroundColor: '#000', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#333', color: '#fff', fontSize: 17 },

  submitBtn: { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },

  calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  calendarBox: { width: '90%', backgroundColor: '#212121', borderRadius: 16, padding: 15 },
  calendarTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  calendarCloseBtn: { marginTop: 15, paddingVertical: 16, backgroundColor: '#333333', borderRadius: 10, alignItems: 'center' },
  calendarCloseText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 24 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  deleteModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteModalText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', lineHeight: 26 },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },

  manageInfoBox: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginBottom: 16 },
  manageItemName: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  manageItemSub: { color: '#999999', fontSize: 15 },
  
  manageDetailContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#333' },
  manageDetailText: { color: '#E0E0E0', fontSize: 15, marginBottom: 8, lineHeight: 22 },

  manageActionGroup: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, marginBottom: 16 },
  manageActionGroupTitle: { color: '#A1BE44', fontSize: 16, fontWeight: 'bold', marginBottom: 16 }, 
  
  originalItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2C2C2C', padding: 14, borderRadius: 10, marginBottom: 10 },
  originalItemInfo: { flex: 1 },
  originalItemTitle: { color: '#ffffff', fontSize: 15, marginBottom: 6, fontWeight: 'bold' },
  originalItemStatus: { color: '#A1BE44', fontSize: 13, fontWeight: 'bold' },
  originalItemStatusHolding: { color: '#FF9900' },
  originalItemActions: { flexDirection: 'row', alignItems: 'center' },
  actionIconBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#3A3A3A', borderRadius: 8, marginLeft: 8 },
  actionIconBtnDanger: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255, 77, 77, 0.1)', borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: '#FF4D4D' },
  actionIconText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  actionIconDangerText: { color: '#FF4D4D', fontSize: 14, fontWeight: 'bold' },

  closeFullBtn: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  closeFullBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default ManagerTicket;