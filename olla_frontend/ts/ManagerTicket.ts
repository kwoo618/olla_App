// ============================================================
// useManagerTicket.ts
// 관리자 이용권 관리 화면에서 사용하는 커스텀 훅
// - 회원 목록 조회 (이용권 보유 회원 그룹핑)
// - 이용권 등록 (회원권/일일권 부여)
// - 이용권 일시정지 / 해제
// - 이용권 삭제
// - 등록 / 관리 바텀시트 애니메이션 (PanResponder 드래그 + 스냅 포인트)
// - 결과 안내 모달 / 확인 모달 제어
// - 회원권·일일권 타입 통합 표시(mergeByType)
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Platform, Dimensions, Animated, PanResponder, Keyboard } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// 회원 목록 API (이용권 포함)
const MEMBER_LIST_API      = `${API_BASE_URL}/admin/memberships/members`;
// 이용권 부여 API
const MEMBERSHIP_GRANT_API = `${API_BASE_URL}/admin/memberships/grant`;
// 이용권 단건 제어 API (pause/unpause/delete)
const MEMBERSHIP_BASE_API  = `${API_BASE_URL}/admin/memberships`;

// iOS 모달 중첩 시 앱 멈춤 방지를 위한 안전 딜레이
// iOS는 모달 애니메이션 완료까지 400ms, Android는 150ms
const MODAL_SAFE_DELAY = Platform.OS === 'ios' ? 400 : 150;

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

// 서버에서 오는 이용권 타입 문자열을 한글 레이블로 변환
// 우선순위: COUNT 계열 → '일일권', PERIOD 계열 → '회원권'
// 문자열 판단이 불가한 경우 remainingCount 유무 / startDate+endDate 유무로 대체 판단
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

// 날짜 문자열(YYYY-MM-DD)을 YY.MM.DD 형태로 축약
export const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  return dateStr;
};

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (로컬 타임존 기준)
export const getToday = () => {
  const d      = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

// 목표 날짜까지 남은 일수를 계산하여 D-Day 형식으로 반환
// - 당일 만료: 'D-Day'
// - 남은 경우: '{n}일'
// - 지난 경우: '만료'
export const calculateDDay = (targetDate: string) => {
  if (!targetDate) return '-';
  const end   = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  // 0일 남았을 경우 (오늘 만료) 'D-Day'로 표시
  if (days === 0) return 'D-Day';
  return days > 0 ? `${days}일` : '만료';
};

// 같은 회원의 이용권 목록을 타입별로 병합하여 UI 표시용 단일 객체로 만들기
// - 회원권(PERIOD): 가장 이른 시작일 ~ 가장 늦은 종료일로 합산, 남은 일수 계산
// - 일일권(COUNT): 잔여 횟수 합산
// - 두 타입 모두 보유한 경우 각각 하나씩 merged 배열에 추가
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
    // 하나라도 HOLDING 상태면 병합 결과도 HOLDING으로 표시
    const isHolding = periodList.some((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING');

    // 전체 회원권 중 가장 이른 시작일 / 가장 늦은 종료일 계산
    periodList.forEach((m: any) => {
      if (!earliestStart || (m.startDate && m.startDate < earliestStart)) earliestStart = m.startDate;
      if (!latestEnd     || (m.endDate   && m.endDate   > latestEnd))     latestEnd     = m.endDate;
    });

    // 오늘부터 최종 종료일까지 남은 일수 계산 (시작일이 오늘 이후면 시작일 기준)
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
    // 일일권 전체 잔여 횟수 합산
    const totalCount    = countList.reduce((sum: number, m: any) => sum + (m.remainingCount ?? 0), 0);
    const isHolding     = countList.some((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING');
    // 일일권 중 가장 이른 시작일
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

// ─── 훅 본체 ──────────────────────────────────────────────────────────────────
export const useManagerTicket = (navigation: any) => {
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  // 바텀시트 높이 스냅 포인트 정의
  const GRANT_START_HEIGHT    = SCREEN_HEIGHT * 0.50; // 등록 시트 초기 높이 (회원 검색 단계)
  const GRANT_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85; // 등록 시트 확장 높이 (폼 입력 단계)
  const MANAGE_HEIGHT_1       = SCREEN_HEIGHT * 0.65; // 관리 시트: 이용권 1종 보유
  const MANAGE_HEIGHT_2       = SCREEN_HEIGHT * 0.85; // 관리 시트: 이용권 2종 보유
  const FULL_SCREEN           = SCREEN_HEIGHT * 0.95; // 최대 확장 높이

  // ─── 목록 상태 ─────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers]           = useState<any[]>([]); // 서버에서 받은 원본 회원 배열
  const [searchQuery, setSearchQuery] = useState('');      // 메인 목록 검색어

  // ─── 결과 안내 모달 ────────────────────────────────────────────────────────
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState<{
    title: string; message: string; type: string; onConfirm: () => void;
  }>({ title: '', message: '', type: 'info', onConfirm: () => {} });

  // ─── 확인(컨펌) 모달 ───────────────────────────────────────────────────────
  // 일시정지/삭제 등 파괴적 액션 전 사용자 재확인용 모달
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig]   = useState({
    message: '', confirmText: '확인', cancelText: '취소',
    onConfirm: () => {}, isDestructive: false,
  });

  // 모달 안전 표시 유틸: 키보드를 먼저 내린 후 딜레이를 두고 모달 열기
  // iOS에서 키보드+모달 동시 처리 시 앱이 멈추는 문제 방지
  const safeShowModal = useCallback((showAction: () => void) => {
    Keyboard.dismiss();
    setTimeout(() => {
      showAction();
    }, MODAL_SAFE_DELAY);
  }, []);

  // 결과 안내 모달 열기 유틸
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

  // 확인 모달 열기 유틸
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

  // ─── 관리 바텀시트 상태 ────────────────────────────────────────────────────
  const [isManageVisible, setManageVisible]         = useState(false);
  const [selectedManageItem, setSelectedManageItem] = useState<any>(null); // 현재 관리 중인 회원 그룹

  // 관리 시트 기준 스냅 높이 (이용권 종류 수에 따라 동적 결정)
  const targetManageBaseSnap = useRef(MANAGE_HEIGHT_1);
  const manageHeightAnim     = useRef(new Animated.Value(0)).current;
  const currentManageSnap    = useRef(MANAGE_HEIGHT_1); // 현재 시트 높이 (드래그 기준점)

  // 관리 바텀시트 드래그 핸들러
  // - 위로 드래그 → 중간 스냅 → 전체화면 스냅 2단계
  // - 아래로 드래그 → 75% 미만이면 자동 닫힘
  const managePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        manageHeightAnim.setOffset(currentManageSnap.current);
        manageHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        // 전체화면 상태에서 위로 더 드래그하면 저항감 부여 (0.1배)
        if (currentManageSnap.current === FULL_SCREEN && gs.dy < 0) {
          manageHeightAnim.setValue(-gs.dy * 0.1);
        } else {
          manageHeightAnim.setValue(-gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        manageHeightAnim.flattenOffset();
        const finalHeight     = currentManageSnap.current - gs.dy;
        // 중간 스냅과 전체화면의 중간값을 기준으로 어느 스냅으로 갈지 결정
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

  // ─── 등록 바텀시트 상태 ────────────────────────────────────────────────────
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [modalSearch, setModalSearch]             = useState('');     // 등록 시트 내 회원 검색어
  const [selectedUser, setSelectedUser]           = useState<any>(null); // 이용권을 부여할 대상 회원

  // 달력 표시 상태 (시작일 선택)
  const [isStartCalendarVisible, setStartCalendarVisible] = useState(false);
  const [editStart, setEditStart]                         = useState(''); // 이용권 시작일
  // 달력 표시 상태 (종료일 선택 - 회원권의 경우 개월 수 입력으로 자동 계산)
  const [isEndCalendarVisible, setEndCalendarVisible]     = useState(false);
  const [editEnd, setEditEnd]                             = useState('');   // 이용권 종료일 (자동 계산)
  const [editType, setEditType]                           = useState<'PERIOD' | 'COUNT'>('PERIOD'); // 부여할 이용권 타입
  const [addValue, setAddValue]                           = useState(''); // 개월 수 또는 횟수 입력값

  // 폼 내부 에러 텍스트 (모달 앱 멈춤 방지용 인라인 에러 표시)
  const [formError, setFormError]                         = useState('');

  // 등록 시트 기준 스냅 높이
  const targetEditBaseSnap = useRef(GRANT_START_HEIGHT);
  const editHeightAnim     = useRef(new Animated.Value(0)).current;
  const currentEditSnap    = useRef(GRANT_START_HEIGHT);

  // 등록 바텀시트 드래그 핸들러 (관리 시트와 동일한 패턴)
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

  // ─── 모달 제어 함수 ────────────────────────────────────────────────────────

  // 관리 시트 열기: 보유 이용권 종류 수에 따라 시트 높이 동적 결정
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

  // 관리 시트 닫기: 슬라이드 다운 → 상태 초기화 → 콜백 실행
  const closeManageModal = useCallback((callback?: () => void) => {
    Keyboard.dismiss();
    Animated.timing(manageHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setManageVisible(false);
      setSelectedManageItem(null);
      if (callback) callback(); 
    });
  }, [manageHeightAnim]);

  // 등록 시트 열기: 초기 높이(회원 검색 단계)로 슬라이드 업
  const openEditModal = useCallback(() => {
    Keyboard.dismiss();
    setEditModalVisible(true);
    setFormError(''); // 모달 열 때 이전 에러 초기화
    targetEditBaseSnap.current = GRANT_START_HEIGHT;
    currentEditSnap.current    = GRANT_START_HEIGHT;
    editHeightAnim.setValue(0);
    Animated.timing(editHeightAnim, { toValue: GRANT_START_HEIGHT, duration: 300, useNativeDriver: false }).start();
  }, [editHeightAnim, GRANT_START_HEIGHT]);

  // 등록 시트 닫기: 슬라이드 다운 → 모든 폼 상태 초기화 → 콜백 실행
  const closeEditModal = useCallback((callback?: () => void) => {
    Keyboard.dismiss();
    Animated.timing(editHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setEditModalVisible(false);
      setSelectedUser(null);
      setModalSearch('');
      setAddValue('');
      setEditStart('');
      setEditEnd('');
      setFormError(''); // 모달 닫을 때 에러 초기화
      targetEditBaseSnap.current = GRANT_START_HEIGHT;
      currentEditSnap.current    = GRANT_START_HEIGHT;
      if (callback) callback(); 
    });
  }, [editHeightAnim, GRANT_START_HEIGHT]);

  // 시작일 달력 열기 (키보드 먼저 내린 후)
  const openStartCalendar = useCallback(() => {
    Keyboard.dismiss();
    setStartCalendarVisible(true);
  }, []);

  // 시작일 달력 닫기
  const closeStartCalendar = useCallback(() => {
    setStartCalendarVisible(false);
  }, []);

  // ─── API: 회원 목록 조회 ───────────────────────────────────────────────────
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

  // 관리자 권한 확인 후 회원 목록 조회 (비관리자 접근 차단)
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

  // pull-to-refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchUsers();
    setRefreshing(false);
  }, [checkAdminAndFetchUsers]);

  // 컴포넌트 마운트 시 최초 로드
  useEffect(() => { checkAdminAndFetchUsers(); }, [checkAdminAndFetchUsers]);

  // ─── 자동 시작일 계산 ──────────────────────────────────────────────────────
  // 회원 선택 또는 이용권 타입 변경 시, 해당 타입 기존 이용권의 최종 종료일 + 1일을 자동 시작일로 설정
  // 기존 이용권이 없으면 오늘 날짜를 시작일로 설정
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
        // 기존 종료일 + 1일 = 새 이용권 시작일
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

  // ─── 자동 종료일 계산 및 에러 초기화 ──────────────────────────────────────
  // 시작일 또는 개월 수 입력값이 변경될 때마다 종료일을 자동 재계산
  // 타입이 COUNT(일일권)이거나 addValue가 없으면 종료일 초기화
  useEffect(() => {
    setFormError(''); // 입력 변경 시 기존 에러 메시지 숨김
    if (editType === 'PERIOD' && addValue && !isNaN(Number(addValue))) {
      const startD = new Date(editStart || getToday());
      startD.setMonth(startD.getMonth() + Number(addValue)); // 입력한 개월 수만큼 달 추가
      const yyyy = startD.getFullYear();
      const mm   = String(startD.getMonth() + 1).padStart(2, '0');
      const dd   = String(startD.getDate()).padStart(2, '0');
      setEditEnd(`${yyyy}-${mm}-${dd}`);
    } else {
      setEditEnd(''); // 횟수권이거나 개월 수 미입력 시 종료일 비움
    }
  }, [editStart, addValue, editType]);

  // ─── 회원 선택 핸들러 ──────────────────────────────────────────────────────
  // 검색 결과에서 회원 선택 시: 선택된 회원 저장 + 시트를 확장 높이로 스프링 애니메이션
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

  // ─── 이용권 등록 ─────────────────────────────────────────────────────────
  // 유효성 검사 → API 호출 → 성공 시 목록 갱신 및 안내 모달 표시
  const handleGrantTicket = useCallback(async () => {
    if (!selectedUser) return;
    setFormError(''); // 이전 에러 초기화

    // 오프라인 등록 회원(이메일이 @olla.local 도메인)에게 일일권 부여 차단
    const memberEmail = selectedUser?.email || '';
    const memberPhone = selectedUser?.phone || '';
    const isOfflineMember = 
      memberEmail.includes('@olla.local') ||
      memberPhone.startsWith('offline') ||
      selectedUser?.memberships?.some((m: any) => m.isOffline === true);

    if (isOfflineMember && editType === 'COUNT') {
      setFormError('오프라인 등록 회원에게는 일일권을 추가할 수 없습니다.');
      return;
    }

    const startDateStr    = editStart || getToday();
    const numericAddValue = Number(addValue);

    // 유효성 검사 1: 개월 수 또는 횟수 입력 확인
    if (!addValue || isNaN(numericAddValue) || numericAddValue <= 0) {
      const unit = editType === 'PERIOD' ? '개월 수' : '횟수';
      setFormError(`유효한 ${unit}를 입력해주십시오.`);
      return;
    }

    // 유효성 검사 2: 회원권의 경우 종료일이 과거이면 차단
    if (editType === 'PERIOD') {
      if (!editEnd || editEnd.length !== 10) {
        setFormError('종료일을 정확하게 계산할 수 없습니다.');
        return;
      }
      
      const startD = new Date(startDateStr); startD.setHours(0, 0, 0, 0);
      const endD   = new Date(editEnd);      endD.setHours(0, 0, 0, 0);
      const todayD = new Date();             todayD.setHours(0, 0, 0, 0);

      // 종료일이 시작일보다 이전인 경우 차단
      if (endD.getTime() < startD.getTime()) {
        setFormError('종료일이 시작일보다 과거일 수 없습니다.');
        return;
      }
      
      // 종료일이 오늘보다 이전인 경우 차단 (이미 만료된 이용권 등록 방지)
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
        addMonths: editType === 'PERIOD' ? numericAddValue : 0, // 회원권: 개월 수
        addCount:  editType === 'COUNT'  ? numericAddValue : 0, // 일일권: 횟수
      };

      await axios.post(MEMBERSHIP_GRANT_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 등록 성공 → 시트 닫기 → 결과 모달 표시 → 목록 갱신
      closeEditModal(() => {
        showResultModal('성공', '이용권이 성공적으로 등록되었습니다.', 'success');
        fetchUsers(token!);
      });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message ?? '이용권 등록에 실패했습니다.';
      // 백엔드 DB 설정 오류인 경우 디버깅 메시지 표시
      if (serverMessage?.includes('is_deleted') || serverMessage?.includes('default value')) {
        setFormError('서버 설정 오류: 백엔드의 Membership 엔티티를 확인하세요.');
      } else {
        setFormError(serverMessage);
      }
    }
  }, [selectedUser, editStart, editEnd, editType, addValue, closeEditModal, showResultModal, fetchUsers]);

  // ─── 일시정지 / 해제 ──────────────────────────────────────────────────────
  // 현재 상태(HOLDING/ACTIVE)에 따라 반대 액션을 API로 전송
  // 관리 시트 닫기 → 확인 모달 표시 → 확인 시 API 호출 순서로 진행
  const togglePauseStatus = useCallback((membershipId: number, currentStatus: string) => {
    if (!membershipId) { showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error'); return; }
    const isCurrentlyHolding = String(currentStatus).toUpperCase() === 'HOLDING';
    const actionText = isCurrentlyHolding ? '정지 해제' : '일시정지';
    const endpoint   = isCurrentlyHolding ? 'unpause' : 'pause'; // PATCH /memberships/{id}/pause or unpause

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

  // ─── 이용권 삭제 ──────────────────────────────────────────────────────────

  // 실제 삭제 API 호출 → 성공 시 목록 갱신
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

  // 삭제 전 확인 모달 표시 (관리 시트 닫기 → 확인 모달 → 삭제 실행)
  const confirmDeleteSpecificTicket = useCallback((membershipId: number, description: string) => {
    if (!membershipId) { showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error'); return; }
    
    closeManageModal(() => {
      showConfirmModal(
        `${description}\n해당 내역을 정말 삭제하시겠습니까?`,
        () => {
          setConfirmModalVisible(false);
          // 확인 모달 닫힘 애니메이션 완료 후 삭제 실행 (iOS 멈춤 방지)
          setTimeout(() => executeDeleteTicket(membershipId), MODAL_SAFE_DELAY);
        },
        true,
        '삭제',
      );
    });
  }, [closeManageModal, showConfirmModal, executeDeleteTicket, showResultModal]);

  // ─── 이용권 보유 회원 목록 (가공) ─────────────────────────────────────────
  // - 삭제된 회원 및 DELETED 상태 이용권 필터링
  // - 같은 memberId를 가진 데이터 행을 하나의 그룹으로 병합
  // - 중복 이용권 id 제거
  // - mergeByType으로 타입별 표시용 병합 객체 생성
  // - searchQuery로 이름/전화번호 필터링
  const groupedHolders = useMemo(() => {
    const map = new Map();
    users.forEach((u: any) => {
      // 탈퇴 회원 제외
      if (u.deleted === true || u.isDeleted === true || String(u.deleted) === 'true') return;
      const status = String(u.membershipStatus || '').toUpperCase();
      if (status === 'DELETED') return;
      // ACTIVE / HOLDING 이외의 상태는 목록에서 제외
      if (status && status !== 'ACTIVE' && status !== 'HOLDING') return;

      const mName  = u.name  || u.member?.name  || '이름없음';
      const mPhone = u.phone || u.member?.phone  || u.phoneNumber || u.member?.phoneNumber || '번호없음';
      const mId    = u.memberId !== undefined && u.memberId !== 0 ? u.memberId
        : (u.member?.id !== undefined ? u.member.id : `${mName}-${mPhone}`);

      // 검색어 필터 (이름 또는 전화번호)
      if (searchQuery && !mName.includes(searchQuery) && !mPhone.includes(searchQuery)) return;

      const groupKey = `${mId}`;
      if (!map.has(groupKey)) map.set(groupKey, { memberId: mId, name: mName, phone: mPhone, memberships: [] });

      // 중첩 memberships 배열이 있으면 펼쳐서 추가, 없으면 행 자체를 이용권으로 추가
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
      .filter(group => group.memberships.length > 0) // 이용권 없는 회원 제외
      .map(group => {
        // 동일 id 중복 제거 (서버 응답에 중복이 올 수 있음)
        const uniqueMemberships: any[] = [];
        const seen = new Set();
        group.memberships.forEach((m: any) => {
          let id = m.membershipId || m.id;
          if (!id || id === 0) id = `${m.membershipType}-${m.remainingCount}-${m.startDate}-${m.endDate}`;
          if (!seen.has(id)) { seen.add(id); uniqueMemberships.push(m); }
        });
        group.memberships        = uniqueMemberships;
        group.displayMemberships = mergeByType(uniqueMemberships); // UI 표시용 병합 결과
        return group;
      });
  }, [users, searchQuery]);

  // ─── 등록 시트 내 회원 검색 결과 목록 (가공) ──────────────────────────────
  // groupedHolders와 유사하지만 modalSearch(시트 내 검색어) 기준으로 필터링
  // 삭제 회원 제외, 이용권 없는 회원도 포함(신규 부여 대상이 될 수 있으므로)
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

  // ─── 훅 사용 컴포넌트에 노출할 상태와 함수 반환 ──────────────────────────
  return {
    loading, refreshing, searchQuery, setSearchQuery, groupedHolders, onRefresh,
    resultModalVisible, setResultModalVisible, resultModalConfig,
    confirmModalVisible, setConfirmModalVisible, confirmModalConfig,
    
    // 등록 폼 내부 에러 (인라인 표시용)
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