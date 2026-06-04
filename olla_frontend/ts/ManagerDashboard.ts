import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

const BASE    = API_BASE_URL;
const ADMIN   = `${BASE}/admin`;
const MEMBERS = `${BASE}/members`;

// 응답 파싱 헬퍼
const extractData = (res: any): any   => res.data.data;
const extractList = (res: any): any[] => res.data.data.content;

// 공통 유틸
export const authHeader = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token}` };
};

const getToken = () => AsyncStorage.getItem('userToken');

const getFormattedNow = () => {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}/${p(now.getMonth() + 1)}/${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
};

export const translateGender = (gender: string | null | undefined): string => {
  if (!gender) return '-';
  switch (gender.toUpperCase()) {
    case 'MALE':   return '남성';
    case 'FEMALE': return '여성';
    default:       return gender;
  }
};

// ✅ useMyPage의 getFullImageUrl과 동일한 방식으로 통일
export const resolveImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url === 'null' || url === 'undefined') return null;
  if (url.startsWith('http') || url.startsWith('file:') || url.startsWith('content:')) return url;
  const domain = BASE.replace('/api/v1', '');
  const formattedPath = url.startsWith('/') ? url : `/${url}`;
  return `${domain}${formattedPath}`;
};

export const isValidImageUrl = (url: string | null | undefined): url is string =>
  !!url && url !== 'null' && url !== 'undefined';

// 차트 관련 상수
export const DAY_LABELS: Record<number, string> = { 1:'월', 2:'화', 3:'수', 4:'목', 5:'금', 6:'토' };
export const DAY_SELECT_OPTIONS = [
  { label:'월요일', value:1 }, { label:'화요일', value:2 }, { label:'수요일', value:3 },
  { label:'목요일', value:4 }, { label:'금요일', value:5 }, { label:'토요일', value:6 },
];
export const getHourRange = (dayOfWeek: number) =>
  dayOfWeek === 6
    ? Array.from({ length: 7 },  (_, i) => i + 13)
    : Array.from({ length: 10 }, (_, i) => i + 13);

// 타입
export interface ExpiringMember {
  id: string;
  name: string;
  phone: string;
  endDate: string;
  dDay: number | string;
}

export interface DashboardStats {
  newMembersToday: number;
  lastUpdated: string;
  expiringMembers: ExpiringMember[];
  selectedDay: number;
  dayDropdownOpen: boolean;
}

export interface DashboardSummary {
  totalVisitsToday: number;
  expiringIn3Days: number;
  newMembersThisWeek: number;
}

export interface Metrics {
  totalMembers: number;
  activeMemberships: number;
  todayVisitors: number;
  totalPosts: number;
}

export const useManagerDashboard = (navigation: any) => {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 데이터
  const [notices, setNotices]             = useState<any[]>([]);
  const [posts, setPosts]                 = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [visitedMemberNames, setVisitedMemberNames] = useState<Set<string>>(new Set());

  // 대시보드 통계
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    newMembersToday: 0,
    lastUpdated: '',
    expiringMembers: [],
    selectedDay: 6,
    dayDropdownOpen: false,
  });
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>({
    totalVisitsToday: 0,
    expiringIn3Days: 0,
    newMembersThisWeek: 0,
  });
  const [metrics, setMetrics] = useState<Metrics>({
    totalMembers: 0,
    activeMemberships: 0,
    todayVisitors: 0,
    totalPosts: 0,
  });

  // 차트
  const [weeklyCongestionRate, setWeeklyCongestionRate]   = useState<number[]>([]);
  const [hourlyCongestionByDay, setHourlyCongestionByDay] = useState<Record<number, number[]>>({});
  const [hourlyData, setHourlyData]                       = useState<number[]>([]);

  // 모달 제어
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState<{
    title: string; message: string; type: string; onConfirm: () => void;
  }>({ title: '', message: '', type: 'info', onConfirm: () => {} });
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete]               = useState<{ type: 'notice' | 'post'; id: number } | null>(null);
  const [isDetailVisible, setDetailVisible]           = useState(false);
  const [selectedUser, setSelectedUser]               = useState<any>(null);
  const [isSendAlertModalVisible, setSendAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle]     = useState('');
  const [alertContent, setAlertContent] = useState('');

  // QR 스캐너
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [isProcessing, setIsProcessing]       = useState(false);
  const [cameraReady, setCameraReady]         = useState(false);
  const scannedRef                            = useRef(false);

  // 모달 헬퍼
  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  const closeResultModal = useCallback(() => {
    setResultModalVisible(false);
    setResultModalConfig(prev => { prev.onConfirm?.(); return prev; });
  }, []);

  const confirmDelete = useCallback((type: 'notice' | 'post', id: number) => {
    setItemToDelete({ type, id });
    setDeleteModalVisible(true);
  }, []);

  // API 호출
  const fetchDashboardMain = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${ADMIN}/dashboard`, { headers });
      const data = extractData(res);

      const expiringMembers: ExpiringMember[] = (data.expiringMembers ?? []).map((m: any, idx: number) => {
        const parsedDDay = Number(m.dDay ?? m.dday ?? 0);
        return {
          id:      `exp_${m.name ?? ''}_${idx}`,
          name:    m.name    ?? '-',
          phone:   m.phone   ?? '-',
          endDate: m.endDate ?? m.end_date ?? '-',
          dDay:    parsedDDay === 0 ? '1' : parsedDDay,
        };
      });

      setDashboardStats(prev => ({
        ...prev,
        newMembersToday: data.newMembersToday ?? prev.newMembersToday,
        lastUpdated:     getFormattedNow(),
        expiringMembers: expiringMembers.length > 0 ? expiringMembers : prev.expiringMembers,
      }));

      if (Array.isArray(data.weeklyCongestion) && data.weeklyCongestion.length > 0) {
        const counts = (data.weeklyCongestion as number[]).slice(0, 6);
        const max    = Math.max(...counts, 1);
        setWeeklyCongestionRate(counts.map(v => Math.round((v / max) * 100)));
      } else {
        setWeeklyCongestionRate(prev => (prev.length > 0 ? prev : [30, 45, 40, 50, 70, 100]));
      }

      if (data.hourlyCongestionByDay && typeof data.hourlyCongestionByDay === 'object') {
        const normalized: Record<number, number[]> = {};
        Object.entries(data.hourlyCongestionByDay).forEach(([k, v]) => {
          const day = Number(k);
          if (day !== 7) normalized[day] = Array.isArray(v) ? (v as unknown[]).map(Number) : [];
        });
        setHourlyCongestionByDay(normalized);
        const defaultData = normalized[6];
        setHourlyData(defaultData?.length > 0 ? defaultData : [10, 20, 35, 60, 80, 55, 30]);
      } else {
        setHourlyData(prev => (prev.length > 0 ? prev : [10, 20, 30, 50, 70, 90, 100, 80, 60, 40]));
      }

      if (data.totalMembers != null) setMetrics(prev => ({ ...prev, totalMembers: Number(data.totalMembers) }));
    } catch (e: any) {
      console.log('대시보드 통계 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  const fetchDashboardSummary = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${ADMIN}/dashboard/summary`, { headers });
      const data = extractData(res);

      setDashboardSummary({
        totalVisitsToday:   Number(data.totalVisitsToday  ?? 0),
        expiringIn3Days:    Number(data.expiringIn3Days    ?? 0),
        newMembersThisWeek: Number(data.newMembersThisWeek ?? 0),
      });
      setMetrics(prev => ({ ...prev, todayVisitors: Number(data.totalVisitsToday ?? prev.todayVisitors) }));
    } catch (e: any) {
      console.log('대시보드 요약 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  const fetchHourlyByDay = useCallback(async (dayOfWeek: number) => {
    if (dayOfWeek === 7) return;

    setHourlyCongestionByDay(prev => {
      if (prev[dayOfWeek]?.length > 0) {
        setHourlyData(prev[dayOfWeek]);
        return prev;
      }
      return prev;
    });

    try {
      const headers = await authHeader();
      const res     = await axios.get(`${ADMIN}/dashboard/hourly`, { headers, params: { dayOfWeek } });
      const list    = (extractData(res) ?? []).map(Number) as number[];
      setHourlyCongestionByDay(prev => ({ ...prev, [dayOfWeek]: list }));
      const fallback = dayOfWeek === 6 ? [10, 20, 35, 60, 80, 55, 30] : [10, 20, 30, 50, 70, 90, 100, 80, 60, 40];
      setHourlyData(list.length > 0 ? list : fallback);
    } catch (e: any) {
      console.log('시간대별 혼잡도 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${ADMIN}/notices`, { headers, params: { page: 0, size: 2, sort: 'id,desc' } });
      setNotices(extractList(res));
    } catch (e: any) {
      console.log('공지사항 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${BASE}/posts`, { headers, params: { page: 0, size: 20, sort: 'id,desc' } });
      const list = extractList(res);
      const totalElements = res.data.data.totalElements ?? list.length;

      const sorted = [...list]
        .map((item: any) => ({ ...item, isPast: new Date(item.meetDateTime).getTime() < Date.now() }))
        .sort((a, b) => {
          if (a.isPast && !b.isPast) return 1;
          if (!a.isPast && b.isPast) return -1;
          return b.id - a.id;
        });

      setPosts(sorted.slice(0, 2));
      setMetrics(prev => ({ ...prev, totalPosts: totalElements }));
    } catch (e: any) {
      console.log('게시글 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${ADMIN}/memberships/members`, { headers, params: { page: 0, size: 1000, sort: 'id,desc' } });
      const list = extractList(res);

      const validMembers = list.filter((user: any) => {
        const m = user.member ?? user;
        return !(user.deleted === true || m.isDeleted === true || m.status === 'DELETED');
      });

      // ✅ recentMembers에 담기 전에 이미지 URL 변환 적용
      setRecentMembers(validMembers.slice(0, 2).map((user: any) => ({
        ...user,
        profileImageUrl: resolveImageUrl(user.profileImageUrl ?? user.member?.profileImageUrl ?? user.profileImage),
      })));
      setMetrics(prev => ({ ...prev, totalMembers: validMembers.length }));
    } catch (e: any) {
      console.log('회원 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  const fetchVisits = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${ADMIN}/visits/today`, { headers });
      const data = extractData(res);

      setMetrics(prev => ({ ...prev, todayVisitors: data?.totalVisitsToday ?? prev.todayVisitors }));

      const names = new Set<string>();
      (data?.visitLogs ?? []).forEach((log: any) => { if (log.memberName) names.add(log.memberName); });
      setVisitedMemberNames(names);
    } catch (e: any) {
      console.log('금일 방문자 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  const fetchActiveMemberships = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${ADMIN}/memberships/members`, { headers, params: { page: 0, size: 2000 } });
      const usersList = extractList(res);

      let activeCount = 0;

      usersList.forEach((user: any) => {
        const m = user.member ?? user;
        if (user.deleted === true || m.isDeleted === true || m.status === 'DELETED') return;

        if (Array.isArray(user.memberships)) {
          user.memberships.forEach((membership: any) => {
            if (String(membership.membershipStatus || membership.status).toUpperCase() === 'ACTIVE') {
              activeCount += 1;
            }
          });
        } else if (user.activeMembership && String(user.activeMembership.status).toUpperCase() === 'ACTIVE') {
          activeCount += 1;
        }
      });

      setMetrics(prev => ({ ...prev, activeMemberships: activeCount }));
    } catch (e: any) {
      console.log('활성 이용권 집계 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  const checkAdminAndFetchData = useCallback(async () => {
    try {
      const [role, token] = await Promise.all([AsyncStorage.getItem('userRole'), getToken()]);
      if (!token || role !== 'ADMIN') {
        showResultModal('권한 오류', '관리자만 접근할 수 있는 페이지입니다.', 'error', () => navigation.goBack());
        return;
      }
      await Promise.all([
        fetchDashboardMain(),
        fetchDashboardSummary(),
        fetchNotices(),
        fetchPosts(),
        fetchMembers(),
        fetchVisits(),
        fetchActiveMemberships(),
      ]);
    } catch (e: any) {
      console.log('데이터 로딩 실패:', e.response?.data?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  }, [
    navigation,
    showResultModal,
    fetchDashboardMain,
    fetchDashboardSummary,
    fetchNotices,
    fetchPosts,
    fetchMembers,
    fetchVisits,
    fetchActiveMemberships,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchData();
    setRefreshing(false);
  }, [checkAdminAndFetchData]);

  const handleDaySelect = useCallback((dayOfWeek: number) => {
    setDashboardStats(prev => ({ ...prev, selectedDay: dayOfWeek, dayDropdownOpen: false }));
    fetchHourlyByDay(dayOfWeek);
  }, [fetchHourlyByDay]);

  const refreshDashboardData = useCallback(async () => {
    await Promise.all([
      fetchDashboardMain(), 
      fetchDashboardSummary(),
      fetchActiveMemberships()
    ]);
  }, [fetchDashboardMain, fetchDashboardSummary, fetchActiveMemberships]);

  // 공지 / 게시글 삭제
  const executeDelete = useCallback(async () => {
    if (!itemToDelete) return;
    try {
      const headers = await authHeader();
      if (itemToDelete.type === 'notice') {
        await axios.delete(`${ADMIN}/notices/${itemToDelete.id}`, { headers });
        showResultModal('성공', '공지사항이 삭제되었습니다.', 'success');
        fetchNotices();
      } else {
        await axios.delete(`${BASE}/posts/${itemToDelete.id}`, { headers });
        showResultModal('성공', '게시글이 삭제되었습니다.', 'success');
        fetchPosts();
      }
    } catch (e: any) {
      showResultModal('오류', e.response?.data?.message ?? '삭제에 실패했습니다.', 'error');
    } finally {
      setDeleteModalVisible(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, showResultModal, fetchNotices, fetchPosts]);

  // 회원 상세 조회
  const loadUserDetail = useCallback(async (memberId: number, fallbackName: string, fallbackPhone: string) => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${MEMBERS}/${memberId}/profile`, { headers });
      const d    = extractData(res);
      if (!d) {
        showResultModal('프로필 조회 불가', '상세 정보를 불러올 수 없습니다.', 'error');
        return false;
      }

      const detail = d.detail ?? d;
      setSelectedUser({
        memberId,
        name:            d.name    ?? fallbackName,
        phone:           d.phone   ?? fallbackPhone ?? '-',
        // ✅ 프로필 이미지 URL 변환 적용
        profileImageUrl: resolveImageUrl(d.profileImageUrl ?? d.profileImage),
        gender:          translateGender(detail.gender ?? d.gender),
        age:             String(detail.age      ?? d.age      ?? '-'),
        height:          String(detail.height   ?? d.height   ?? '-'),
        weight:          String(detail.weight   ?? d.weight   ?? '-'),
        arm:             String(detail.armSpan  ?? d.armSpan  ?? '-'),
        shoe:            String(detail.footSize ?? d.footSize ?? '-'),
      });
      return true;
    } catch (e: any) {
      showResultModal('프로필 조회 불가', e.response?.data?.message ?? '회원 상세 정보를 불러올 수 없습니다.', 'error');
      return false;
    }
  }, [showResultModal]);

  // 알림 발송
  const handleSendAlert = useCallback(async () => {
    if (!alertTitle.trim() || !alertContent.trim()) {
      showResultModal('알림', '제목과 내용을 모두 입력해주세요.', 'info');
      return;
    }
    if (!selectedUser?.memberId) {
      showResultModal('오류', '회원 정보를 찾을 수 없습니다.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const headers = await authHeader();
      await axios.post(
        `${ADMIN}/alerts/send`,
        { memberId: selectedUser.memberId, title: alertTitle, content: alertContent },
        { headers },
      );
      setSendAlertModalVisible(false);
      setTimeout(() => {
        showResultModal('발송 성공', `${selectedUser.name}님에게 알림을 발송했습니다.`, 'success');
        setAlertTitle('');
        setAlertContent('');
      }, Platform.OS === 'ios' ? 400 : 150);
    } catch (e: any) {
      setSendAlertModalVisible(false);
      setTimeout(
        () => showResultModal('발송 실패', e.response?.data?.message ?? '알림 발송에 실패했습니다.', 'error'),
        Platform.OS === 'ios' ? 400 : 150,
      );
    } finally {
      setIsProcessing(false);
    }
  }, [alertTitle, alertContent, selectedUser, showResultModal]);

  // QR 스캐너
  const openScanner = useCallback(() => {
    scannedRef.current = false;
    setIsProcessing(false);
    setScannerVisible(true);
    setTimeout(() => setCameraReady(true), 500);
  }, []);

  const closeScanner = useCallback(() => {
    setScannerVisible(false);
    setIsProcessing(false);
    setCameraReady(false);
    setTimeout(() => { scannedRef.current = false; }, 800);
  }, []);

  const handleBarCodeScanned = useCallback(async (qrData: string) => {
    if (scannedRef.current || isProcessing) return;
    scannedRef.current = true;
    setIsProcessing(true);
    try {
      const headers = await authHeader();
      const res    = await axios.post(`${ADMIN}/visits/scan`, { qrToken: qrData, deductionCount: 1 }, { headers });
      const result = extractData(res);
      const { statusCode = '', memberName = '회원', remainingInfo = '', message = '' } = result ?? {};

      closeScanner();
      setTimeout(() => {
        if (statusCode === 'ALREADY' || message.includes('이미 출석')) {
          showResultModal('금일 출석 완료', `${memberName}님은\n오늘 이미 출석하셨습니다.`, 'info');
        } else if (statusCode === 'ERROR') {
          showResultModal('출석 실패', message || '출석 처리에 실패했습니다.', 'error', () => {
            setTimeout(() => {
              scannedRef.current = false;
              setIsProcessing(false);
              setScannerVisible(true);
            }, 300);
          });
        } else {
          fetchVisits();
          fetchMembers();
          showResultModal('출석 완료!', [memberName ? `${memberName}님 환영합니다!` : '', remainingInfo, message].filter(Boolean).join('\n\n'));
        }
      }, 300);
    } catch (e: any) {
      closeScanner();
      setTimeout(() => showResultModal('출석 실패', e.response?.data?.message ?? '출석 처리에 실패했습니다.', 'error', () => {
        setTimeout(() => {
          scannedRef.current = false;
          setIsProcessing(false);
          setScannerVisible(true);
        }, 300);
      }), 300);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, closeScanner, showResultModal, fetchVisits, fetchMembers]);

  return {
    // 상태
    loading, refreshing,
    notices, posts, recentMembers, visitedMemberNames,
    dashboardStats, setDashboardStats,
    dashboardSummary,
    metrics,
    weeklyCongestionRate, hourlyData,
    // QR 스캐너
    isScannerVisible, isProcessing, cameraReady, scannedRef,
    // 모달
    resultModalVisible, resultModalConfig,
    isDeleteModalVisible, setDeleteModalVisible, itemToDelete,
    isDetailVisible, setDetailVisible, selectedUser, setSelectedUser,
    isSendAlertModalVisible, setSendAlertModalVisible,
    alertTitle, setAlertTitle, alertContent, setAlertContent,
    // 액션
    checkAdminAndFetchData, onRefresh,
    handleDaySelect, refreshDashboardData,
    confirmDelete, executeDelete,
    loadUserDetail,
    handleSendAlert,
    openScanner, closeScanner, handleBarCodeScanned,
    showResultModal, closeResultModal,
  };
};