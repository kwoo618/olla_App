import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Platform, Dimensions, Animated, PanResponder, Keyboard } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

const MEMBER_LIST_API      = `${API_BASE_URL}/admin/memberships/members`;
const MEMBERSHIP_GRANT_API = `${API_BASE_URL}/admin/memberships/grant`;
const MEMBERSHIP_BASE_API  = `${API_BASE_URL}/admin/memberships`;

// 유틸 
export const resolveMembershipType = (
  typeStr: string,
  startDate: string,
  endDate: string,
  remainingCount: number | null,
): string => {
  const upper = String(typeStr || '').toUpperCase();
  if (upper === 'COUNT'  || upper.includes('횟수') || upper.includes('COUNT'))  return '일일권';
  if (upper === 'PERIOD' || upper.includes('기간') || upper.includes('PERIOD') || upper.includes('MONTH')) return '회원권';
  if (remainingCount !== null && remainingCount !== undefined) return '일일권';
  if (startDate && endDate) return '회원권';
  return '이용권';
};

export const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  return dateStr;
};

export const getToday = () => {
  const d      = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const calculateDDay = (targetDate: string) => {
  if (!targetDate) return '-';
  const end   = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days >= 0 ? `${days}일` : '만료';
};

export const mergeByType = (memberships: any[]) => {
  const periodList = memberships.filter(
    (m: any) => resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount) === '회원권',
  );
  const countList = memberships.filter(
    (m: any) => resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount) === '일일권',
  );

  const merged: any[] = [];

  if (periodList.length > 0) {
    let earliestStart      = '';
    let latestEnd          = '';
    let totalRemainingDays = 0;
    const isHolding = periodList.some((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING');

    periodList.forEach((m: any) => {
      if (!earliestStart || (m.startDate && m.startDate < earliestStart)) earliestStart = m.startDate;
      if (!latestEnd     || (m.endDate   && m.endDate   > latestEnd))     latestEnd     = m.endDate;
    });

    if (latestEnd && earliestStart) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const start = new Date(earliestStart); start.setHours(0, 0, 0, 0);
      const end   = new Date(latestEnd);     end.setHours(0, 0, 0, 0);
      const effectiveStart = today.getTime() > start.getTime() ? today : start;
      const diff = Math.ceil((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
      totalRemainingDays = diff >= 0 ? diff : 0;
    }

    merged.push({
      _merged: true, _type: '회원권',
      _ids: periodList.map((m: any) => m.membershipId || m.id),
      _originals: periodList,
      membershipType: 'PERIOD',
      startDate: earliestStart, endDate: latestEnd,
      remainingCount: null,
      membershipStatus: isHolding ? 'HOLDING' : 'ACTIVE',
      _totalRemainingDays: totalRemainingDays,
    });
  }

  if (countList.length > 0) {
    const totalCount    = countList.reduce((sum: number, m: any) => sum + (m.remainingCount ?? 0), 0);
    const isHolding     = countList.some((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING');
    const earliestStart = countList.reduce((earliest: string, m: any) => {
      if (!earliest || (m.startDate && m.startDate < earliest)) return m.startDate;
      return earliest;
    }, '');

    merged.push({
      _merged: true, _type: '일일권',
      _ids: countList.map((m: any) => m.membershipId || m.id),
      _originals: countList,
      membershipType: 'COUNT',
      startDate: earliestStart, endDate: '',
      remainingCount: totalCount,
      membershipStatus: isHolding ? 'HOLDING' : 'ACTIVE',
    });
  }

  return merged;
};

export const useManagerTicket = (navigation: any) => {
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const GRANT_START_HEIGHT    = SCREEN_HEIGHT * 0.50;
  const GRANT_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;
  const MANAGE_HEIGHT_1       = SCREEN_HEIGHT * 0.65;
  const MANAGE_HEIGHT_2       = SCREEN_HEIGHT * 0.85;
  const FULL_SCREEN           = SCREEN_HEIGHT * 0.95;

  // 목록 상태
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers]           = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 결과 모달
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState<{
    title: string; message: string; type: string; onConfirm: () => void;
  }>({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  // 확인 모달 
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig]   = useState({
    message: '', confirmText: '확인', cancelText: '취소',
    onConfirm: () => {}, isDestructive: false,
  });

  const showConfirmModal = useCallback((
    message: string,
    onConfirm: () => void,
    isDestructive = false,
    confirmText   = '확인',
  ) => {
    Keyboard.dismiss();
    setConfirmModalConfig({ message, confirmText, cancelText: '취소', onConfirm, isDestructive });
    setConfirmModalVisible(true);
  }, []);

  // ─── 관리 바텀시트 ─────────────────────────────────────────────────────────
  const [isManageVisible, setManageVisible]         = useState(false);
  const [selectedManageItem, setSelectedManageItem] = useState<any>(null);

  const targetManageBaseSnap = useRef(MANAGE_HEIGHT_1);
  const manageHeightAnim     = useRef(new Animated.Value(0)).current;
  const currentManageSnap    = useRef(MANAGE_HEIGHT_1);

  const managePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        manageHeightAnim.setOffset(currentManageSnap.current);
        manageHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        if (currentManageSnap.current === FULL_SCREEN && gs.dy < 0) {
          manageHeightAnim.setValue(-gs.dy * 0.1);
        } else {
          manageHeightAnim.setValue(-gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        manageHeightAnim.flattenOffset();
        const finalHeight     = currentManageSnap.current - gs.dy;
        const THRESHOLD       = (targetManageBaseSnap.current + FULL_SCREEN) / 2;
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
      },
    }),
  ).current;

  // 등록 바텀시트 
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [modalSearch, setModalSearch]             = useState('');
  const [selectedUser, setSelectedUser]           = useState<any>(null);

  const [isStartCalendarVisible, setStartCalendarVisible] = useState(false);
  const [editStart, setEditStart]                         = useState('');
  const [isEndCalendarVisible, setEndCalendarVisible]     = useState(false);
  const [editEnd, setEditEnd]                             = useState('');
  const [editType, setEditType]                           = useState<'PERIOD' | 'COUNT'>('PERIOD');
  const [addValue, setAddValue]                           = useState('');

  const targetEditBaseSnap = useRef(GRANT_START_HEIGHT);
  const editHeightAnim     = useRef(new Animated.Value(0)).current;
  const currentEditSnap    = useRef(GRANT_START_HEIGHT);

  const editPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        editHeightAnim.setOffset(currentEditSnap.current);
        editHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        if (currentEditSnap.current === FULL_SCREEN && gs.dy < 0) {
          editHeightAnim.setValue(-gs.dy * 0.1);
        } else {
          editHeightAnim.setValue(-gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        editHeightAnim.flattenOffset();
        const finalHeight     = currentEditSnap.current - gs.dy;
        const THRESHOLD       = (targetEditBaseSnap.current + FULL_SCREEN) / 2;
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
      },
    }),
  ).current;

  // 모달 제어
  const openManageModal = useCallback((group: any) => {
    setSelectedManageItem(group);
    setManageVisible(true);
    const mergedCount   = group.displayMemberships ? group.displayMemberships.length : 1;
    const dynamicHeight = mergedCount > 1 ? MANAGE_HEIGHT_2 : MANAGE_HEIGHT_1;
    targetManageBaseSnap.current = dynamicHeight;
    currentManageSnap.current    = dynamicHeight;
    manageHeightAnim.setValue(0);
    Animated.timing(manageHeightAnim, { toValue: dynamicHeight, duration: 300, useNativeDriver: false }).start();
  }, [manageHeightAnim, MANAGE_HEIGHT_1, MANAGE_HEIGHT_2]);

  const closeManageModal = useCallback((callback?: () => void) => {
    Animated.timing(manageHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setManageVisible(false);
      setSelectedManageItem(null);
      if (callback) setTimeout(callback, Platform.OS === 'ios' ? 500 : 300);
    });
  }, [manageHeightAnim]);

  const openEditModal = useCallback(() => {
    setEditModalVisible(true);
    targetEditBaseSnap.current = GRANT_START_HEIGHT;
    currentEditSnap.current    = GRANT_START_HEIGHT;
    editHeightAnim.setValue(0);
    Animated.timing(editHeightAnim, { toValue: GRANT_START_HEIGHT, duration: 300, useNativeDriver: false }).start();
  }, [editHeightAnim, GRANT_START_HEIGHT]);

  const closeEditModal = useCallback((callback?: () => void) => {
    Animated.timing(editHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setEditModalVisible(false);
      setSelectedUser(null);
      setModalSearch('');
      setAddValue('');
      setEditStart('');
      setEditEnd('');
      targetEditBaseSnap.current = GRANT_START_HEIGHT;
      currentEditSnap.current    = GRANT_START_HEIGHT;
      if (callback) callback();
    });
  }, [editHeightAnim, GRANT_START_HEIGHT]);

  // API
  const fetchUsers = useCallback(async (token: string) => {
    try {
      const response = await axios.get(MEMBER_LIST_API, {
        headers: { Authorization: `Bearer ${token}` },
        params:  { size: 1000, sort: 'id,desc' },
      });
      
      const raw = response.data.data.content ?? [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error: any) {
      showResultModal('오류', error.response?.data?.message ?? '회원 목록을 불러오는데 실패했습니다.', 'error');
    }
  }, [showResultModal]);

  const checkAdminAndFetchUsers = useCallback(async () => {
    try {
      const role  = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');
      if (!token || role !== 'ADMIN') {
        showResultModal('권한 오류', '관리자만 접근할 수 있는 페이지입니다.', 'error', () => navigation.goBack());
        return;
      }
      await fetchUsers(token);
    } catch (error) {
      console.error('인증 에러:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, showResultModal, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchUsers();
    setRefreshing(false);
  }, [checkAdminAndFetchUsers]);

  useEffect(() => { checkAdminAndFetchUsers(); }, [checkAdminAndFetchUsers]);

  // 선택된 유저/타입 변경 시 시작일 자동 계산
  useEffect(() => {
    if (!selectedUser) return;
    const targetType         = editType === 'PERIOD' ? '회원권' : '일일권';
    const existingMemberships = selectedUser.memberships.filter((m: any) =>
      resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount) === targetType,
    );

    if (existingMemberships.length > 0) {
      let latestEndDate = '';
      existingMemberships.forEach((m: any) => {
        if (m.endDate && (!latestEndDate || new Date(m.endDate) > new Date(latestEndDate))) {
          latestEndDate = m.endDate;
        }
      });
      if (latestEndDate) {
        const nextDay = new Date(latestEndDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const yyyy = nextDay.getFullYear();
        const mm   = String(nextDay.getMonth() + 1).padStart(2, '0');
        const dd   = String(nextDay.getDate()).padStart(2, '0');
        setEditStart(`${yyyy}-${mm}-${dd}`);
        setEditEnd('');
        return;
      }
    }
    setEditStart('');
    setEditEnd('');
  }, [selectedUser, editType]);

  // 회원 선택 
  const handleSelectUser = useCallback((group: any) => {
    setSelectedUser(group);
    setEditType('PERIOD');
    setAddValue('');
    setEditEnd('');
    targetEditBaseSnap.current = GRANT_EXPANDED_HEIGHT;
    currentEditSnap.current    = GRANT_EXPANDED_HEIGHT;
    Animated.spring(editHeightAnim, { toValue: GRANT_EXPANDED_HEIGHT, useNativeDriver: false }).start();
  }, [editHeightAnim, GRANT_EXPANDED_HEIGHT]);

  // 이용권 등록 
  const handleGrantTicket = useCallback(async () => {
    if (!selectedUser) return;
    const startDateStr = editStart || getToday();

    if (editType === 'PERIOD') {
      if (!editEnd || editEnd.length !== 10) {
        showResultModal('알림', '종료일을 정확하게 입력해주십시오.', 'info');
        return;
      }
      const startD = new Date(startDateStr); startD.setHours(0, 0, 0, 0);
      const endD   = new Date(editEnd);      endD.setHours(0, 0, 0, 0);
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
      const token    = await AsyncStorage.getItem('userToken');
      const memberId = selectedUser.memberId || selectedUser.id;
      const requestBody = editType === 'PERIOD'
        ? { memberId, startDate: startDateStr, endDate: editEnd }
        : { memberId, addCount: addValue && !isNaN(Number(addValue)) && Number(addValue) > 0 ? Number(addValue) : 1, startDate: startDateStr };

      await axios.post(MEMBERSHIP_GRANT_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` },
      });

      closeEditModal(() => {
        setTimeout(() => {
          showResultModal('성공', '이용권이 성공적으로 등록되었습니다.', 'success');
          fetchUsers(token!);
        }, Platform.OS === 'ios' ? 500 : 300);
      });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message ?? '이용권 등록에 실패했습니다.';
      closeEditModal(() => {
        setTimeout(() => {
          if (serverMessage?.includes('is_deleted') || serverMessage?.includes('default value')) {
            showResultModal('서버 설정 오류', 'Membership 엔티티의 is_deleted 필드에 기본값이 없습니다.\n백엔드 서버를 수정해주세요.', 'error');
          } else {
            showResultModal('오류', serverMessage, 'error');
          }
        }, Platform.OS === 'ios' ? 500 : 300);
      });
    }
  }, [selectedUser, editStart, editEnd, editType, addValue, closeEditModal, showResultModal, fetchUsers]);

  // 일시정지 / 해제 
  const togglePauseStatus = useCallback((membershipId: number, currentStatus: string) => {
    if (!membershipId) { showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error'); return; }
    const isCurrentlyHolding = String(currentStatus).toUpperCase() === 'HOLDING';
    const actionText = isCurrentlyHolding ? '정지 해제' : '일시정지';
    const endpoint   = isCurrentlyHolding ? 'unpause' : 'pause';

    closeManageModal(() => {
      showConfirmModal(`해당 내역을 ${actionText} 하시겠습니까?`, async () => {
        setConfirmModalVisible(false);
        try {
          const token = await AsyncStorage.getItem('userToken');
          await axios.patch(`${MEMBERSHIP_BASE_API}/${membershipId}/${endpoint}`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setTimeout(() => {
            showResultModal('성공', `이용권이 ${actionText} 되었습니다.`, 'success');
            fetchUsers(token!);
          }, Platform.OS === 'ios' ? 500 : 300);
        } catch (error: any) {
          setTimeout(() => {
            showResultModal('오류', error.response?.data?.message ?? '상태 변경에 실패했습니다.', 'error');
          }, Platform.OS === 'ios' ? 500 : 300);
        }
      });
    });
  }, [closeManageModal, showConfirmModal, showResultModal, fetchUsers]);

  // 삭제
  const executeDeleteTicket = useCallback(async (membershipId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      await axios.delete(`${MEMBERSHIP_BASE_API}/${membershipId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      setTimeout(() => {
        showResultModal('성공', '해당 내역 1건이 성공적으로 삭제되었습니다.', 'success', async () => {
          await fetchUsers(token);
        });
      }, Platform.OS === 'ios' ? 500 : 300);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ?? '이용권 삭제에 실패했습니다.';
      setTimeout(() => {
        showResultModal('오류', errorMessage, 'error');
      }, Platform.OS === 'ios' ? 500 : 300);
    }
  }, [showResultModal, fetchUsers]);

  const confirmDeleteSpecificTicket = useCallback((membershipId: number, description: string) => {
    if (!membershipId) { showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error'); return; }
    closeManageModal(() => {
      showConfirmModal(
        `${description}\n해당 내역을 정말 삭제하시겠습니까?`,
        () => {
          setConfirmModalVisible(false);
          setTimeout(() => executeDeleteTicket(membershipId), Platform.OS === 'ios' ? 500 : 300);
        },
        true,
        '삭제',
      );
    });
  }, [closeManageModal, showConfirmModal, executeDeleteTicket, showResultModal]);

  // 가공된 목록 
  const groupedHolders = useMemo(() => {
    const map = new Map();
    users.forEach((u: any) => {
      if (u.deleted === true || u.isDeleted === true || String(u.deleted) === 'true') return;
      const status = String(u.membershipStatus || '').toUpperCase();
      if (status === 'DELETED') return;
      if (status && status !== 'ACTIVE' && status !== 'HOLDING') return;

      const mName  = u.name  || u.member?.name  || '이름없음';
      const mPhone = u.phone || u.member?.phone  || u.phoneNumber || u.member?.phoneNumber || '번호없음';
      const mId    = u.memberId !== undefined && u.memberId !== 0 ? u.memberId
        : (u.member?.id !== undefined ? u.member.id : `${mName}-${mPhone}`);

      if (searchQuery && !mName.includes(searchQuery) && !mPhone.includes(searchQuery)) return;

      const groupKey = `${mId}`;
      if (!map.has(groupKey)) map.set(groupKey, { memberId: mId, name: mName, phone: mPhone, memberships: [] });

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
          if (!id || id === 0) id = `${m.membershipType}-${m.remainingCount}-${m.startDate}-${m.endDate}`;
          if (!seen.has(id)) { seen.add(id); uniqueMemberships.push(m); }
        });
        group.memberships        = uniqueMemberships;
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

      const mName  = u.name  || u.member?.name  || '이름없음';
      const mPhone = u.phone || u.member?.phone  || u.phoneNumber || u.member?.phoneNumber || '번호없음';
      const mId    = u.memberId !== undefined && u.memberId !== 0 ? u.memberId
        : (u.member?.id !== undefined ? u.member.id : `${mName}-${mPhone}`);

      if (!modalSearch || mName.includes(modalSearch) || mPhone.includes(modalSearch)) {
        const groupKey = `${mId}`;
        if (!map.has(groupKey)) map.set(groupKey, { memberId: mId, name: mName, phone: mPhone, memberships: [] });

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
        if (!seen.has(id)) { seen.add(id); uniqueMemberships.push(m); }
      });
      group.memberships        = uniqueMemberships;
      group.displayMemberships = mergeByType(uniqueMemberships);
      return group;
    });
  }, [users, modalSearch]);

  return {
    // 목록
    loading, refreshing, searchQuery, setSearchQuery, groupedHolders, onRefresh,
    // 결과 모달
    resultModalVisible, setResultModalVisible, resultModalConfig,
    // 확인 모달
    confirmModalVisible, setConfirmModalVisible, confirmModalConfig,
    // 관리 바텀시트
    isManageVisible, selectedManageItem,
    manageHeightAnim, managePanResponder,
    openManageModal, closeManageModal,
    // 등록 바텀시트
    isEditModalVisible, modalSearch, setModalSearch,
    selectedUser, editType, setEditType,
    addValue, setAddValue,
    editStart, setEditStart, isStartCalendarVisible, setStartCalendarVisible,
    editEnd, setEditEnd, isEndCalendarVisible, setEndCalendarVisible,
    editHeightAnim, editPanResponder,
    openEditModal, closeEditModal,
    handleSelectUser, handleGrantTicket,
    // 액션
    togglePauseStatus, confirmDeleteSpecificTicket,
    groupedSearchResults,
  };
};