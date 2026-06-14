// ============================================================
// useManagerUser.ts
// 관리자 회원 관리 화면에서 사용하는 커스텀 훅
// - 회원 목록 조회 및 검색 (이름/전화번호)
// - 오프라인 신규 회원 등록
// - 회원 상세 프로필 조회 (바텀시트)
// - 회원 삭제
// - 개별 회원에게 알림(푸시) 발송
// - 바텀시트 애니메이션 (상세/등록/알림 - PanResponder 드래그 닫기)
// - 결과 안내 모달 / 확인 모달 제어
// ============================================================

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Dimensions, Animated, PanResponder, Keyboard, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// 이용권 포함 회원 목록 API
const MEMBER_LIST_API = `${API_BASE_URL}/admin/memberships/members`; 
// 오프라인 신규 회원 등록 API
const OFFLINE_REGISTER_API = `${API_BASE_URL}/admin/members/offline`; 
// 회원 삭제 API
const MEMBER_DELETE_API = `${API_BASE_URL}/admin/members`; 
// 회원 상세 프로필 조회 API
const PROFILE_API = `${API_BASE_URL}/members`;
// 개별 회원 알림 발송 API
const ALERT_SEND_API_URL = `${API_BASE_URL}/admin/alerts/send`; 

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

// 서버에서 받은 이미지 상대경로를 전체 URL로 변환
// - 이미 절대경로(http/file/content)면 그대로 반환
// - 빈 값 / 'null' / 'undefined' 등 유효하지 않은 값은 null 반환
// - 상대경로면 API_BASE_URL에서 '/api/v1'을 제거한 도메인에 붙여 반환
export const getFullImageUrl = (path: string | null | undefined): string | null => {
  if (!path || path.trim() === '' || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

// 이미지 소스 헬퍼 — 유효한 URL이면 { uri } 객체, 없으면 로컬 profile.png로 폴백
export const getProfileImageSource = (url: string | null | undefined) => {
  const resolved = getFullImageUrl(url);
  if (resolved) return { uri: resolved };
  return require('../assets/profile.png');
};

// 이용권 타입 문자열을 한글 레이블로 변환 (COUNT → 일일권, PERIOD → 회원권)
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

// ─── 훅 본체 ──────────────────────────────────────────────────────────────────
export const useManagerUser = (navigation: any) => {
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  // 각 바텀시트 높이 (화면 비율 기준)
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.65; // 상세 프로필 시트 높이
  const ADD_MODAL_HEIGHT    = SCREEN_HEIGHT * 0.65; // 신규 등록 시트 높이
  const ALERT_MODAL_HEIGHT  = SCREEN_HEIGHT * 0.55; // 알림 발송 시트 높이

  // ─── 목록 상태 ─────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers]           = useState<any[]>([]); // 서버에서 받은 원본 회원 배열
  const [searchQuery, setSearchQuery] = useState('');      // 메인 화면 검색어

  // ─── 결과 안내 모달 ────────────────────────────────────────────────────────
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });
  
  // ─── 확인(컨펌) 모달 ───────────────────────────────────────────────────────
  // 삭제 등 파괴적 액션 전 재확인용
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig]   = useState({ 
    message: '', confirmText: '확인', cancelText: '취소', onConfirm: () => {}, isDestructive: false 
  });

  // ─── 신규 회원 등록 모달 상태 ──────────────────────────────────────────────
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName]     = useState('');        // 이름 입력값
  const [newGender, setNewGender] = useState<'남' | '여' | null>(null); // 성별 선택값
  const [newBirth, setNewBirth]   = useState('');        // 생년월일 입력값 (YYYY-MM-DD 형식)
  const [newPhone, setNewPhone]   = useState('');        // 전화번호 입력값 (자동 하이픈 포함)
  const [newHeight, setNewHeight] = useState('');        // 키 (선택 입력)
  const [newWeight, setNewWeight] = useState('');        // 몸무게 (선택 입력)

  // ─── 상세 프로필 모달 상태 ─────────────────────────────────────────────────
  const [isDetailVisible, setDetailVisible]   = useState(false);
  const [selectedUser, setSelectedUser]       = useState<any>(null); // 현재 상세 보기 중인 회원 정보

  // ─── 알림 발송 모달 상태 ───────────────────────────────────────────────────
  const [isSendAlertModalVisible, setSendAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle]     = useState('');   // 알림 제목
  const [alertContent, setAlertContent] = useState('');   // 알림 내용
  const [isProcessing, setIsProcessing] = useState(false); // 발송 API 호출 중 여부

  // ─── 바텀시트 애니메이션: 상세 프로필 ─────────────────────────────────────
  const detailHeightAnim    = useRef(new Animated.Value(0)).current;
  const currentDetailSnap   = useRef(DETAIL_MODAL_HEIGHT); // 드래그 기준 높이
  const detailPanResponder  = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        detailHeightAnim.setOffset(currentDetailSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // 위로 드래그 시 저항감 부여 (0.1배), 아래로는 그대로
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
          // 원래 높이로 스프링 복귀
          currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
          Animated.spring(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // ─── 바텀시트 애니메이션: 신규 등록 ───────────────────────────────────────
  const addHeightAnim   = useRef(new Animated.Value(0)).current;
  const currentAddSnap  = useRef(ADD_MODAL_HEIGHT);
  const addPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gestureState) => Math.abs(gestureState.dy) > 5,
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

  // ─── 바텀시트 애니메이션: 알림 발송 ───────────────────────────────────────
  const alertHeightAnim   = useRef(new Animated.Value(0)).current;
  const currentAlertSnap  = useRef(ALERT_MODAL_HEIGHT);
  const alertPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gestureState) => Math.abs(gestureState.dy) > 5,
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

  // ─── API: 회원 목록 조회 ───────────────────────────────────────────────────
  const fetchUsers = useCallback(async (token: string) => {
    try {
      const response = await axios.get(MEMBER_LIST_API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 1000, sort: 'id,desc' } 
      });
      
      const raw = response.data.data.content || [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "목록 로드 실패";
      showResultModal("오류", errorMessage, "error");
    }
  }, []);

  // 관리자 권한 확인 후 목록 조회 (비관리자는 차단 후 이전 화면으로)
  const checkAdminAndFetchUsers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true); 
    try {
      const role  = await AsyncStorage.getItem('userRole');
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

  // 컴포넌트 마운트 시 최초 로드
  useEffect(() => { checkAdminAndFetchUsers(); }, [checkAdminAndFetchUsers]);

  // pull-to-refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchUsers(true); 
    setRefreshing(false);
  }, [checkAdminAndFetchUsers]);

  // ─── 유틸: 생년월일 유효성 검사 ───────────────────────────────────────────
  // YYYY-MM-DD 형식 정규식 + 실제로 존재하는 날짜인지 이중 확인
  const isValidBirthDate = (dateStr: string) => {
    const regex = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regex.test(dateStr)) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  // 전화번호 입력 자동 포맷 (숫자만 추출 → 010-XXXX-XXXX 형식으로 변환)
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

  // 생년월일 입력 자동 포맷 (숫자만 추출 → YYYY-MM-DD 형식으로 변환)
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

  // ─── 신규 회원 등록 ────────────────────────────────────────────────────────
  // 필수값(이름, 성별, 생년월일, 전화번호) 검증 → API 호출 → 성공 시 모달 닫기 + 목록 갱신
  // 오프라인 회원은 이메일을 offline_전화번호@olla.local 형식으로 자동 생성
  const handleRegister = async () => {
    if (!newName || !newGender || newBirth.length < 10 || newPhone.replace(/-/g, '').length < 10) {
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
        name:      newName,
        phone:     newPhone,
        gender:    newGender,
        birthDate: newBirth,
        email:     `offline_${newPhone.replace(/-/g, '')}@olla.local`, // 오프라인 회원 이메일 자동 생성
        height:    newHeight ? parseFloat(newHeight) : null,
        weight:    newWeight ? parseFloat(newWeight) : null,
      };
      await axios.post(OFFLINE_REGISTER_API, requestBody, { headers: { Authorization: `Bearer ${token}` } });
      
      // 모달 닫기 → 딜레이 후 결과 안내 → 목록 갱신
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

  // ─── 회원 삭제 ────────────────────────────────────────────────────────────

  // 실제 삭제 API 호출 → 결과 모달 표시 → 목록 갱신
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

  // 삭제 확인 모달 표시 (확인 클릭 시 실제 삭제 실행)
  const confirmDelete = (memberId: number | string) => { 
    showConfirmModal("정말 삭제하시겠습니까?", () => {
      setConfirmModalVisible(false);
      executeDelete(memberId);
    }, true, "삭제");
  };

  // ─── 개별 회원 알림 발송 ──────────────────────────────────────────────────
  // 선택된 회원(selectedUser.memberId)에게 제목+내용으로 푸시 알림 발송
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
        title:    alertTitle,
        content:  alertContent
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

  // ─── 모달 제어 함수 ────────────────────────────────────────────────────────

  // 상세 프로필 모달 열기: 회원 프로필 API 조회 → 성별 변환 → 바텀시트 슬라이드 업
  const openDetailModal = async (memberId: number, fallbackName: string, fallbackPhone: string) => {
    try {
      Keyboard.dismiss();
      const token    = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${PROFILE_API}/${memberId}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const d        = response.data.data; 
      if (!d) return;
      
      // 서버 성별 코드(MALE/FEMALE 또는 남/여)를 한글 표시값으로 변환
      const rawGender = d.gender || d.detail?.gender;
      let displayGender = '-';
      if (rawGender === 'MALE'   || rawGender === '남' || rawGender === '남자') displayGender = '남자';
      else if (rawGender === 'FEMALE' || rawGender === '여' || rawGender === '여자') displayGender = '여자';

      setSelectedUser({
        memberId,
        name:            d.name   || fallbackName,
        gender:          displayGender,
        phone:           d.phone  || fallbackPhone || '-', 
        profileImageUrl: getFullImageUrl(d.profileImageUrl ?? d.profileImage),
        age:             d.age    || d.detail?.age    || '-',
        height:          d.height || d.detail?.height || '-',
        weight:          d.weight || d.detail?.weight || '-',
        arm:             d.armSpan    || d.detail?.armSpan   || '-',
        shoe:            d.footSize   || d.detail?.footSize  || '-',
      });

      setDetailVisible(true);
      currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
      detailHeightAnim.setValue(0);
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    } catch (error) {
      showResultModal('오류', '상세 정보 로드 불가', 'error');
    }
  };

  // 상세 프로필 모달 닫기: 슬라이드 다운 → 모달 숨김
  const closeDetailModal = useCallback(() => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => { 
      setDetailVisible(false); 
    });
  }, [detailHeightAnim]);

  // 신규 등록 모달 열기: 슬라이드 업 애니메이션
  const openAddModal = () => {
    setAddModalVisible(true);
    currentAddSnap.current = ADD_MODAL_HEIGHT;
    addHeightAnim.setValue(0);
    Animated.timing(addHeightAnim, { toValue: ADD_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  };

  // 신규 등록 모달 닫기: 슬라이드 다운 → 모든 폼 입력값 초기화 → 콜백 실행
  const closeAddModal = useCallback((callback?: () => void) => {
    Animated.timing(addHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setAddModalVisible(false);
      setNewName(''); setNewGender(null); setNewBirth(''); setNewPhone('');
      setNewHeight(''); setNewWeight('');
      if (callback) callback();
    });
  }, [addHeightAnim]);

  // 알림 발송 모달 열기: 슬라이드 업 애니메이션
  const openAlertModal = () => {
    setSendAlertModalVisible(true);
    currentAlertSnap.current = ALERT_MODAL_HEIGHT;
    alertHeightAnim.setValue(0);
    Animated.timing(alertHeightAnim, { toValue: ALERT_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  };

  // 알림 발송 모달 닫기: 슬라이드 다운 → 입력값 초기화 → 콜백 실행
  const closeAlertModal = useCallback((callback?: () => void) => {
    Animated.timing(alertHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setSendAlertModalVisible(false);
      setAlertTitle('');
      setAlertContent('');
      setIsProcessing(false);
      if (callback) callback();
    });
  }, [alertHeightAnim]);

  // 결과 안내 모달 열기 유틸 (키보드 내린 후 모달 표시)
  const showResultModal = useCallback((title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  // 확인 모달 열기 유틸
  const showConfirmModal = useCallback((message: string, onConfirm: () => void, isDestructive: boolean = false, confirmText: string = '확인') => {
    Keyboard.dismiss();
    setConfirmModalConfig({ message, confirmText, cancelText: '취소', onConfirm, isDestructive });
    setConfirmModalVisible(true);
  }, []);

  // ─── 회원 목록 가공 (검색 필터링 + 중복 제거 + 이름순 정렬) ──────────────
  // - 탈퇴/삭제 회원 제외
  // - searchQuery로 이름/전화번호 필터링
  // - 같은 memberId를 가진 행을 하나로 병합
  // - 이름 가나다순 정렬
  const filteredAndSortedUsers = useMemo(() => {
    const map = new Map();
    
    users.forEach((user: any) => {
      const memberInfo = user.member || user;
      // 탈퇴 처리된 회원 제외
      if (user.deleted === true || user.isDeleted === true || String(user.deleted) === 'true' || memberInfo.status === 'DELETED') return;
      
      const targetName  = user.name  || memberInfo.name  || '이름없음';
      const targetPhone = user.phone || user.phoneNumber || memberInfo.phone || memberInfo.phoneNumber || '';
      const memberId    = user.memberId || user.id || memberInfo.id;
      
      // 검색어 필터 (이름 또는 전화번호)
      if (searchQuery && !targetName.includes(searchQuery) && !targetPhone.includes(searchQuery)) return;
      
      // 같은 회원 id면 하나의 그룹으로 병합
      if (!map.has(memberId)) {
        map.set(memberId, { ...user, memberInfo, targetName, targetPhone, memberships: [] });
      }
      
      // 이용권 배열 펼쳐 추가 (DELETED 상태 제외)
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
    
    // 이름 가나다순 정렬
    return Array.from(map.values()).sort((a, b) => a.targetName.localeCompare(b.targetName));
  }, [users, searchQuery]);

  // 신규 등록 폼 완성 여부 (필수 항목 모두 입력 시 true → 등록 버튼 활성화)
  const isFormValid = Boolean(newName && newGender && newBirth.length === 10 && newPhone.length >= 12);

  // ─── 훅 사용 컴포넌트에 노출할 상태와 함수 반환 ──────────────────────────
  return {
    loading, refreshing, onRefresh,
    searchQuery, setSearchQuery, filteredAndSortedUsers,
    
    resultModalVisible, setResultModalVisible, resultModalConfig, showResultModal,
    confirmModalVisible, setConfirmModalVisible, confirmModalConfig, confirmDelete,
    
    isAddModalVisible, openAddModal, closeAddModal,
    newName, setNewName, newGender, setNewGender, newBirth, formatBirth, newPhone, formatPhone,
    newHeight, setNewHeight, newWeight, setNewWeight,
    isFormValid, handleRegister,
    
    isDetailVisible, selectedUser, openDetailModal, closeDetailModal, detailHeightAnim, detailPanResponder,
    
    isSendAlertModalVisible, openAlertModal, closeAlertModal, alertHeightAnim, alertPanResponder,
    alertTitle, setAlertTitle, alertContent, setAlertContent, isProcessing, handleSendAlert,
    addHeightAnim, addPanResponder,
    getProfileImageSource,
  };
};