import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Platform, Dimensions, Animated, PanResponder, Keyboard } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

const MEMBER_LIST_API      = `${API_BASE_URL}/admin/memberships/members`;
const MEMBERSHIP_GRANT_API = `${API_BASE_URL}/admin/memberships/grant`;
const MEMBERSHIP_BASE_API  = `${API_BASE_URL}/admin/memberships`;

// 💡 iOS 모달 중첩 방지를 위한 안전 딜레이 시간
const MODAL_SAFE_DELAY = Platform.OS === 'ios' ? 400 : 150;

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
  
  // 💡 [수정됨] 0일 남았을 경우 (오늘 만료) 'D-Day'로 표시
  if (days === 0) return 'D-Day';
  return days > 0 ? `${days}일` : '만료';
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
      const end   = new Date(latestEnd);      end.setHours(0, 0, 0, 0);
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

  // 확인 모달 
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig]   = useState({
    message: '', confirmText: '확인', cancelText: '취소',
    onConfirm: () => {}, isDestructive: false,
  });

  // 💡 [안전 장치] 모달 띄우기 유틸리티 (앱 멈춤 방지를 위해 InteractionManager 제거)
  const safeShowModal = useCallback((showAction: () => void) => {
    Keyboard.dismiss();
    setTimeout(() => {
      showAction();
    }, MODAL_SAFE_DELAY);
  }, []);

  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    safeShowModal(() => {
      setResultModalConfig({ title, message, type, onConfirm });
      setResultModalVisible(true);
    });
  }, [safeShowModal]);

  const showConfirmModal = useCallback((
    message: string,
    onConfirm: () => void,
    isDestructive = false,
    confirmText   = '확인',
  ) => {
    safeShowModal(() => {
      setConfirmModalConfig({ message, confirmText, cancelText: '취소', onConfirm, isDestructive });
      setConfirmModalVisible(true);
    });
  }, [safeShowModal]);

  // 관리 바텀시트
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

  // 💡 폼 내부 에러 텍스트 (앱 멈춤 방지용 안전 설계)
  const [formError, setFormError]                         = useState('');

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
    Keyboard.dismiss();
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
    Keyboard.dismiss();
    Animated.timing(manageHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setManageVisible(false);
      setSelectedManageItem(null);
      if (callback) callback(); 
    });
  }, [manageHeightAnim]);

  const openEditModal = useCallback(() => {
    Keyboard.dismiss();
    setEditModalVisible(true);
    setFormError(''); // 모달 열때 에러 초기화
    targetEditBaseSnap.current = GRANT_START_HEIGHT;
    currentEditSnap.current    = GRANT_START_HEIGHT;
    editHeightAnim.setValue(0);
    Animated.timing(editHeightAnim, { toValue: GRANT_START_HEIGHT, duration: 300, useNativeDriver: false }).start();
  }, [editHeightAnim, GRANT_START_HEIGHT]);

  const closeEditModal = useCallback((callback?: () => void) => {
    Keyboard.dismiss();
    Animated.timing(editHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setEditModalVisible(false);
      setSelectedUser(null);
      setModalSearch('');
      setAddValue('');
      setEditStart('');
      setEditEnd('');
      setFormError(''); // 모달 닫을때 에러 초기화
      targetEditBaseSnap.current = GRANT_START_HEIGHT;
      currentEditSnap.current    = GRANT_START_HEIGHT;
      if (callback) callback(); 
    });
  }, [editHeightAnim, GRANT_START_HEIGHT]);

  // 달력 모달 열기/닫기 제어
  const openStartCalendar = useCallback(() => {
    Keyboard.dismiss();
    setStartCalendarVisible(true);
  }, []);

  const closeStartCalendar = useCallback(() => {
    setStartCalendarVisible(false);
  }, []);

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
    const targetType = editType === 'PERIOD' ? '회원권' : '일일권';
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
        return;
      }
    }
    setEditStart(getToday());
  }, [selectedUser, editType]);

  // 입력값이 변경될 때마다 자동 계산 및 에러 메시지 리셋
  useEffect(() => {
    setFormError(''); // 입력 시 에러 숨김
    if (editType === 'PERIOD' && addValue && !isNaN(Number(addValue))) {
      const startD = new Date(editStart || getToday());
      startD.setMonth(startD.getMonth() + Number(addValue)); // 입력한 개월 수 만큼 달 추가
      const yyyy = startD.getFullYear();
      const mm   = String(startD.getMonth() + 1).padStart(2, '0');
      const dd   = String(startD.getDate()).padStart(2, '0');
      setEditEnd(`${yyyy}-${mm}-${dd}`);
    } else {
      setEditEnd(''); // 횟수권이거나 입력된 개월 수가 없을 때
    }
  }, [editStart, addValue, editType]);

  // 회원 선택 
  const handleSelectUser = useCallback((group: any) => {
    Keyboard.dismiss();
    setSelectedUser(group);
    setEditType('PERIOD');
    setAddValue('');
    setEditEnd('');
    setFormError('');
    targetEditBaseSnap.current = GRANT_EXPANDED_HEIGHT;
    currentEditSnap.current    = GRANT_EXPANDED_HEIGHT;
    Animated.spring(editHeightAnim, { toValue: GRANT_EXPANDED_HEIGHT, useNativeDriver: false }).start();
  }, [editHeightAnim, GRANT_EXPANDED_HEIGHT]);

  // 이용권 등록 및 유효성 검사 
  const handleGrantTicket = useCallback(async () => {
    if (!selectedUser) return;
    setFormError(''); // 이전 에러 초기화

    // 오프라인 회원 일일권 차단
    const memberEmail = selectedUser?.email || '';
    const isOfflineMember = memberEmail.includes('@olla.local');
    if (isOfflineMember && editType === 'COUNT') {
      setFormError('오프라인 등록 회원에게는 일일권을 추가할 수 없습니다.');
      return;
    }

    const startDateStr = editStart || getToday();
    const numericAddValue = Number(addValue);

    // 💡 1. 입력값 검증
    if (!addValue || isNaN(numericAddValue) || numericAddValue <= 0) {
      const unit = editType === 'PERIOD' ? '개월 수' : '횟수';
      setFormError(`유효한 ${unit}를 입력해주십시오.`);
      return;
    }

    // 💡 2. 회원권일 경우 과거 날짜 차단 검증
    if (editType === 'PERIOD') {
      if (!editEnd || editEnd.length !== 10) {
        setFormError('종료일을 정확하게 계산할 수 없습니다.');
        return;
      }
      
      const startD = new Date(startDateStr); startD.setHours(0, 0, 0, 0);
      const endD   = new Date(editEnd);      endD.setHours(0, 0, 0, 0);
      const todayD = new Date();             todayD.setHours(0, 0, 0, 0);

      // 시작일보다 종료일이 과거일 수 없음
      if (endD.getTime() < startD.getTime()) {
        setFormError('종료일이 시작일보다 과거일 수 없습니다.');
        return;
      }
      
      // 이미 끝난 날짜를 등록하는 것 차단 (오늘 날짜 기준)
      if (endD.getTime() < todayD.getTime()) {
        setFormError(`종료일(${editEnd})이 현재 날짜보다 과거입니다.\n시작일이나 개월 수를 늘려주세요.`);
        return;
      }
    }

    try {
      const token    = await AsyncStorage.getItem('userToken');
      const memberId = selectedUser.memberId || selectedUser.id;
      
      const requestBody = {
        memberId,
        startDate: startDateStr,
        addMonths: editType === 'PERIOD' ? numericAddValue : 0,
        addCount: editType === 'COUNT' ? numericAddValue : 0,
      };
      // 오프라인 회원 일일권 추가 안되게 수정 
      const isOfflineMember = selectedUser?.phone?.startsWith('offline') || 
        selectedUser?.memberships?.some((m: any) => m.isOffline === true);

      await axios.post(MEMBERSHIP_GRANT_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` },
      });

      closeEditModal(() => {
        showResultModal('성공', '이용권이 성공적으로 등록되었습니다.', 'success');
        fetchUsers(token!);
      });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message ?? '이용권 등록에 실패했습니다.';
      // 백엔드 에러 발생 시에도 빨간 글씨로 모달 내부에 표시하여 앱 멈춤 방지
      if (serverMessage?.includes('is_deleted') || serverMessage?.includes('default value')) {
        setFormError('서버 설정 오류: 백엔드의 Membership 엔티티를 확인하세요.');
      } else {
        setFormError(serverMessage);
      }
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
          
          showResultModal('성공', `이용권이 ${actionText} 되었습니다.`, 'success');
          fetchUsers(token!);
        } catch (error: any) {
          showResultModal('오류', error.response?.data?.message ?? '상태 변경에 실패했습니다.', 'error');
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
      showResultModal('성공', '해당 내역 1건이 성공적으로 삭제되었습니다.', 'success', async () => {
        await fetchUsers(token);
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ?? '이용권 삭제에 실패했습니다.';
      showResultModal('오류', errorMessage, 'error');
    }
  }, [showResultModal, fetchUsers]);

  const confirmDeleteSpecificTicket = useCallback((membershipId: number, description: string) => {
    if (!membershipId) { showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error'); return; }
    
    closeManageModal(() => {
      showConfirmModal(
        `${description}\n해당 내역을 정말 삭제하시겠습니까?`,
        () => {
          setConfirmModalVisible(false);
          setTimeout(() => executeDeleteTicket(membershipId), MODAL_SAFE_DELAY);
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
    loading, refreshing, searchQuery, setSearchQuery, groupedHolders, onRefresh,
    resultModalVisible, setResultModalVisible, resultModalConfig,
    confirmModalVisible, setConfirmModalVisible, confirmModalConfig,
    
    // 모달 내 폼 에러 상태
    formError,

    isManageVisible, selectedManageItem,
    manageHeightAnim, managePanResponder,
    openManageModal, closeManageModal,
    
    isEditModalVisible, modalSearch, setModalSearch,
    selectedUser, editType, setEditType,
    addValue, setAddValue,
    editStart, setEditStart, 
    isStartCalendarVisible, openStartCalendar, closeStartCalendar, 
    editEnd, setEditEnd, isEndCalendarVisible, setEndCalendarVisible,
    editHeightAnim, editPanResponder,
    openEditModal, closeEditModal,
    handleSelectUser, handleGrantTicket,
    
    togglePauseStatus, confirmDeleteSpecificTicket,
    groupedSearchResults,
  };
};