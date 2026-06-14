// ============================================================
// useManagerDashboard.ts
// 관리자 대시보드 화면에서 사용하는 커스텀 훅
// - 대시보드 통계 / 요약 / 시간대별 혼잡도 조회
// - 공지사항 / 게시글 / 회원 목록 조회 및 삭제
// - 금일 방문자 조회
// - 활성 이용권 수 집계
// - 회원 프로필 상세 조회 및 알림 발송
// - QR 스캐너를 이용한 출석 처리
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

// API 기본 경로 상수
const BASE    = API_BASE_URL;
const ADMIN   = `${BASE}/admin`;
const MEMBERS = `${BASE}/members`;

// 응답 파싱 헬퍼: response.data.data 바로 반환
const extractData = (res: any): any   => res.data.data;
// 응답 파싱 헬퍼: 페이징 응답의 content 배열 반환
const extractList = (res: any): any[] => res.data.data.content;

// JWT 토큰을 AsyncStorage에서 꺼내 Authorization 헤더 객체로 반환
export const authHeader = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token}` };
};

// AsyncStorage에서 userToken만 반환 (헤더 객체 없이 토큰 문자열만 필요한 경우 사용)
const getToken = () => AsyncStorage.getItem('userToken');

// 현재 날짜시각을 "YYYY/MM/DD HH:mm:ss" 형식으로 반환 (마지막 업데이트 시각 표시용)
const getFormattedNow = () => {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}/${p(now.getMonth() + 1)}/${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
};

// 영문 성별 코드를 한글로 변환
export const translateGender = (gender: string | null | undefined): string => {
  if (!gender) return '-';
  switch (gender.toUpperCase()) {
    case 'MALE':   return '남성';
    case 'FEMALE': return '여성';
    default:       return gender;
  }
};

// 서버에서 받은 이미지 경로를 완전한 URL로 변환
// - http/file/content로 시작하면 그대로 반환
// - 상대 경로면 API 도메인을 붙여서 반환
// - null/undefined/'null'/'undefined' 이면 null 반환
export const resolveImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url === 'null' || url === 'undefined') return null;
  if (url.startsWith('http') || url.startsWith('file:') || url.startsWith('content:')) return url;
  const domain = BASE.replace('/api/v1', '');
  const formattedPath = url.startsWith('/') ? url : `/${url}`;
  return `${domain}${formattedPath}`;
};

// 이미지 URL을 RN Image source 형태로 반환
// - URL이 있으면 { uri: ... }, 없으면 기본 프로필 이미지 require 반환
export const getProfileImageSource = (url: string | null | undefined) => {
  const resolved = resolveImageUrl(url);
  if (resolved) return { uri: resolved };
  return require('../assets/profile.png');
};

// URL이 유효한 이미지 URL인지 타입 가드로 판단
export const isValidImageUrl = (url: string | null | undefined): url is string =>
  !!url && url !== 'null' && url !== 'undefined';

// 차트 관련 상수: 요일 번호 → 한글 레이블
export const DAY_LABELS: Record<number, string> = { 1:'월', 2:'화', 3:'수', 4:'목', 5:'금', 6:'토' };

// 요일 선택 드롭다운용 옵션 배열
export const DAY_SELECT_OPTIONS = [
  { label:'월요일', value:1 }, { label:'화요일', value:2 }, { label:'수요일', value:3 },
  { label:'목요일', value:4 }, { label:'금요일', value:5 }, { label:'토요일', value:6 },
];

// 요일별 시간대 범위 반환 (토요일은 7시간, 평일은 10시간, 모두 13시부터 시작)
export const getHourRange = (dayOfWeek: number) =>
  dayOfWeek === 6
    ? Array.from({ length: 7 },  (_, i) => i + 13)
    : Array.from({ length: 10 }, (_, i) => i + 13);

// 만료 임박 회원 타입
export interface ExpiringMember {
  id: string;
  name: string;
  phone: string;
  endDate: string;
  dDay: number | string; // 0이면 문자열 '1'로 보정 (서버 0 반환 방어)
}

// 대시보드 통계 상태 타입
export interface DashboardStats {
  newMembersToday: number;   // 오늘 신규 가입 수
  lastUpdated: string;       // 마지막 업데이트 시각
  expiringMembers: ExpiringMember[]; // 만료 임박 회원 목록
  selectedDay: number;       // 시간대별 혼잡도에서 선택된 요일
  dayDropdownOpen: boolean;  // 요일 드롭다운 열림 여부
}

// 대시보드 요약 통계 타입
export interface DashboardSummary {
  totalVisitsToday: number;    // 오늘 방문자 수
  expiringIn3Days: number;     // 3일 내 만료 회원 수
  newMembersThisWeek: number;  // 이번 주 신규 가입 수
}

// 주요 지표 타입
export interface Metrics {
  totalMembers: number;      // 전체 회원 수
  activeMemberships: number; // 활성 이용권 수
  todayVisitors: number;     // 오늘 방문자 수
  totalPosts: number;        // 전체 게시글 수
}

export const useManagerDashboard = (navigation: any) => {
  // 초기 데이터 로딩 여부
  const [loading, setLoading]       = useState(true);
  // pull-to-refresh 상태
  const [refreshing, setRefreshing] = useState(false);

  // 대시보드에 표시할 데이터
  const [notices, setNotices]             = useState<any[]>([]);         // 공지사항 최신 2건
  const [posts, setPosts]                 = useState<any[]>([]);          // 게시글 최신 2건
  const [recentMembers, setRecentMembers] = useState<any[]>([]);          // 최근 회원 2명
  const [visitedMemberNames, setVisitedMemberNames] = useState<Set<string>>(new Set()); // 오늘 방문한 회원 이름 Set

  // 대시보드 통계 상태 (초기값: 요일 6=토요일, 드롭다운 닫힘)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    newMembersToday: 0,
    lastUpdated: '',
    expiringMembers: [],
    selectedDay: 6,
    dayDropdownOpen: false,
  });
  // 대시보드 요약 통계
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>({
    totalVisitsToday: 0,
    expiringIn3Days: 0,
    newMembersThisWeek: 0,
  });
  // 주요 지표
  const [metrics, setMetrics] = useState<Metrics>({
    totalMembers: 0,
    activeMemberships: 0,
    todayVisitors: 0,
    totalPosts: 0,
  });

  // 차트 데이터
  const [weeklyCongestionRate, setWeeklyCongestionRate]   = useState<number[]>([]);           // 요일별 혼잡도 비율 (0~100)
  const [hourlyCongestionByDay, setHourlyCongestionByDay] = useState<Record<number, number[]>>({}); // 요일별 시간대 혼잡도 캐시
  const [hourlyData, setHourlyData]                       = useState<number[]>([]);            // 현재 선택된 요일의 시간대 혼잡도

  // 결과 안내 모달 상태
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState<{
    title: string; message: string; type: string; onConfirm: () => void;
  }>({ title: '', message: '', type: 'info', onConfirm: () => {} });

  // 공지/게시글 삭제 확인 모달 상태
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  // 삭제 대상 (type: 'notice' | 'post', id: 항목 id)
  const [itemToDelete, setItemToDelete]               = useState<{ type: 'notice' | 'post'; id: number } | null>(null);

  // 회원 상세 모달 표시 여부
  const [isDetailVisible, setDetailVisible]           = useState(false);
  // 상세 조회 중인 회원 정보
  const [selectedUser, setSelectedUser]               = useState<any>(null);

  // 개별 알림 발송 모달 상태
  const [isSendAlertModalVisible, setSendAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle]     = useState('');
  const [alertContent, setAlertContent] = useState('');

  // QR 스캐너 상태
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [isProcessing, setIsProcessing]       = useState(false); // QR 처리 중 여부 (중복 처리 방지)
  const [cameraReady, setCameraReady]         = useState(false); // 카메라 준비 완료 여부
  // QR 중복 스캔 방지 플래그 (ref로 관리해 리렌더링 없이 즉시 반영)
  const scannedRef                            = useRef(false);

  // 결과 모달 열기
  const showResultModal = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info',
    onConfirm: () => void = () => {},
  ) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  }, []);

  // 결과 모달 닫기 + onConfirm 실행
  const closeResultModal = useCallback(() => {
    setResultModalVisible(false);
    setResultModalConfig(prev => { prev.onConfirm?.(); return prev; });
  }, []);

  // 삭제 확인 모달 열기 (type과 id를 지정해 어떤 항목을 삭제할지 저장)
  const confirmDelete = useCallback((type: 'notice' | 'post', id: number) => {
    setItemToDelete({ type, id });
    setDeleteModalVisible(true);
  }, []);

  // ─── API 호출 함수들 ──────────────────────────────────────────────────────

  // 대시보드 메인 통계 조회
  // - 신규 가입자, 만료 임박 회원, 요일별/시간대별 혼잡도, 전체 회원 수 포함
  const fetchDashboardMain = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${ADMIN}/dashboard`, { headers });
      const data = extractData(res);

      // 만료 임박 회원 파싱 (dDay가 0이면 '1'로 보정 — 당일 만료 표시 이슈 방어)
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
        lastUpdated:     getFormattedNow(), // 현재 시각으로 업데이트 시각 갱신
        // 새 데이터가 있으면 교체, 없으면 기존 유지
        expiringMembers: expiringMembers.length > 0 ? expiringMembers : prev.expiringMembers,
      }));

      // 요일별 혼잡도: 최댓값 기준으로 0~100 비율로 정규화
      if (Array.isArray(data.weeklyCongestion) && data.weeklyCongestion.length > 0) {
        const counts = (data.weeklyCongestion as number[]).slice(0, 6); // 월~토 6개
        const max    = Math.max(...counts, 1); // 0으로 나누기 방지
        setWeeklyCongestionRate(counts.map(v => Math.round((v / max) * 100)));
      } else {
        // 데이터 없을 때 기본값 유지
        setWeeklyCongestionRate(prev => (prev.length > 0 ? prev : [30, 45, 40, 50, 70, 100]));
      }

      // 시간대별 혼잡도 캐시 업데이트 (일요일(7) 제외)
      if (data.hourlyCongestionByDay && typeof data.hourlyCongestionByDay === 'object') {
        const normalized: Record<number, number[]> = {};
        Object.entries(data.hourlyCongestionByDay).forEach(([k, v]) => {
          const day = Number(k);
          if (day !== 7) normalized[day] = Array.isArray(v) ? (v as unknown[]).map(Number) : [];
        });
        setHourlyCongestionByDay(normalized);
      }

      // 전체 회원 수 업데이트
      if (data.totalMembers != null) setMetrics(prev => ({ ...prev, totalMembers: Number(data.totalMembers) }));
    } catch (e: any) {
      console.log('대시보드 통계 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  // 대시보드 요약 통계 조회 (오늘 방문자, 3일 내 만료, 이번 주 신규 가입)
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
      // 오늘 방문자 수를 metrics에도 반영
      setMetrics(prev => ({ ...prev, todayVisitors: Number(data.totalVisitsToday ?? prev.todayVisitors) }));
    } catch (e: any) {
      console.log('대시보드 요약 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  // 특정 요일의 시간대별 혼잡도 조회
  // - 캐시(hourlyCongestionByDay)에 데이터가 있으면 먼저 화면에 표시 후 서버 재조회
  // - 일요일(7)은 영업 안 함으로 스킵
  // - 데이터 없을 때 요일별 기본값으로 폴백
  const fetchHourlyByDay = useCallback(async (dayOfWeek: number) => {
    if (dayOfWeek === 7) return;

    // 캐시에 데이터가 있으면 즉시 표시 (서버 응답 전 빠른 UI 반영)
    setHourlyCongestionByDay(prev => {
      if (prev[dayOfWeek]?.length > 0) setHourlyData(prev[dayOfWeek]);
      return prev;
    });

    try {
      const headers = await authHeader();
      const res = await axios.get(`${ADMIN}/dashboard/hourly`, { headers, params: { dayOfWeek } });
      const list = (extractData(res) ?? []).map(Number) as number[];
      // 캐시 업데이트
      setHourlyCongestionByDay(prev => ({ ...prev, [dayOfWeek]: list }));
      // 기본값: 토요일 7개, 평일 10개
      const fallback = dayOfWeek === 6 ? [10, 20, 35, 60, 80, 55, 30] : [10, 20, 30, 50, 70, 90, 100, 80, 60, 40];
      setHourlyData(list.length > 0 ? list : fallback);
    } catch (e: any) {
      console.log('시간대별 혼잡도 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  // 공지사항 최신 2건 조회 (최신 id 내림차순)
  const fetchNotices = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${ADMIN}/notices`, { headers, params: { page: 0, size: 2, sort: 'id,desc' } });
      setNotices(extractList(res));
    } catch (e: any) {
      console.log('공지사항 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  // 게시글 목록 조회 (최대 20건, 최신 id 내림차순)
  // - 모임 일시 기준으로 isPast 여부 판단
  // - 마감(isPast) 글은 뒤로, 나머지는 최신 순 정렬
  // - 대시보드에는 최신 2건만 표시, 전체 수는 metrics에 반영
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

      // 대시보드에는 최신 2건만 표시
      setPosts(sorted.slice(0, 2));
      // 전체 게시글 수를 metrics에 반영
      setMetrics(prev => ({ ...prev, totalPosts: totalElements }));
    } catch (e: any) {
      console.log('게시글 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  // 회원 목록 조회 (최대 1000명)
  // - 탈퇴 처리된 회원(deleted/isDeleted/status=DELETED) 필터링
  // - 대시보드에는 최신 2명만 표시
  // - 프로필 이미지 URL 변환 적용
  const fetchMembers = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${ADMIN}/memberships/members`, { headers, params: { page: 0, size: 1000, sort: 'id,desc' } });
      const list = extractList(res);

      // 탈퇴 처리된 회원 제외
      const validMembers = list.filter((user: any) => {
        const m = user.member ?? user;
        return !(user.deleted === true || m.isDeleted === true || m.status === 'DELETED');
      });

      // 대시보드에는 최신 2명만 표시, 프로필 이미지 URL 변환 적용
      setRecentMembers(validMembers.slice(0, 2).map((user: any) => ({
        ...user,
        profileImageUrl: resolveImageUrl(user.profileImageUrl ?? user.member?.profileImageUrl ?? user.profileImage),
      })));
      setMetrics(prev => ({ ...prev, totalMembers: validMembers.length }));
    } catch (e: any) {
      console.log('회원 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  // 금일 방문자 조회
  // - 방문자 수를 metrics에 반영
  // - 방문 로그에서 회원 이름 Set으로 추출 (중복 제거)
  const fetchVisits = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${ADMIN}/visits/today`, { headers });
      const data = extractData(res);

      setMetrics(prev => ({ ...prev, todayVisitors: data?.totalVisitsToday ?? prev.todayVisitors }));

      // 방문 로그에서 회원 이름만 추출 (Set으로 중복 제거)
      const names = new Set<string>();
      (data?.visitLogs ?? []).forEach((log: any) => { if (log.memberName) names.add(log.memberName); });
      setVisitedMemberNames(names);
    } catch (e: any) {
      console.log('금일 방문자 로드 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  // 활성 이용권 수 집계 (최대 2000명의 이용권 목록을 순회하여 ACTIVE 상태인 이용권 수 카운트)
  // - 탈퇴 회원 제외
  // - memberships 배열이 중첩된 경우와 단일 activeMembership 필드 두 구조 모두 대응
  const fetchActiveMemberships = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${ADMIN}/memberships/members`, { headers, params: { page: 0, size: 2000 } });
      const usersList = extractList(res);

      let activeCount = 0;

      usersList.forEach((user: any) => {
        const m = user.member ?? user;
        // 탈퇴 회원 건너뜀
        if (user.deleted === true || m.isDeleted === true || m.status === 'DELETED') return;

        if (Array.isArray(user.memberships)) {
          // 중첩 memberships 배열에서 ACTIVE인 항목 카운트
          user.memberships.forEach((membership: any) => {
            if (String(membership.membershipStatus || membership.status).toUpperCase() === 'ACTIVE') {
              activeCount += 1;
            }
          });
        } else if (user.activeMembership && String(user.activeMembership.status).toUpperCase() === 'ACTIVE') {
          // 단일 activeMembership 필드 구조
          activeCount += 1;
        }
      });

      setMetrics(prev => ({ ...prev, activeMemberships: activeCount }));
    } catch (e: any) {
      console.log('활성 이용권 집계 실패:', e.response?.data?.message ?? e.message);
    }
  }, []);

  // 관리자 권한 확인 후 모든 데이터를 병렬로 로드
  // - userRole이 'ADMIN'이 아니거나 토큰 없으면 권한 오류 모달 후 이전 화면으로 이동
  const checkAdminAndFetchData = useCallback(async () => {
    try {
      const [role, token] = await Promise.all([AsyncStorage.getItem('userRole'), getToken()]);
      if (!token || role !== 'ADMIN') {
        showResultModal('권한 오류', '관리자만 접근할 수 있는 페이지입니다.', 'error', () => navigation.goBack());
        return;
      }
      // 모든 API를 병렬로 호출하여 로딩 시간 최소화
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

  // pull-to-refresh 처리
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchData();
    setRefreshing(false);
  }, [checkAdminAndFetchData]);

  // 요일 선택 시 드롭다운 닫고 해당 요일의 시간대별 혼잡도 조회
  const handleDaySelect = useCallback((dayOfWeek: number) => {
    setDashboardStats(prev => ({ ...prev, selectedDay: dayOfWeek, dayDropdownOpen: false }));
    fetchHourlyByDay(dayOfWeek);
  }, [fetchHourlyByDay]);

  // 대시보드 통계 관련 데이터만 선택적으로 새로고침
  const refreshDashboardData = useCallback(async () => {
    await Promise.all([
      fetchDashboardMain(), 
      fetchDashboardSummary(),
      fetchActiveMemberships(),
      fetchHourlyByDay(dashboardStats.selectedDay)
    ]);
  }, [fetchDashboardMain, fetchDashboardSummary, fetchActiveMemberships, fetchHourlyByDay, dashboardStats.selectedDay]);

  // 공지사항 또는 게시글 삭제 실행 (itemToDelete의 type에 따라 분기)
  // - 삭제 후 해당 목록 재조회
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
      // 성공/실패 모두 삭제 모달 닫고 타겟 초기화
      setDeleteModalVisible(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, showResultModal, fetchNotices, fetchPosts]);

  // 회원 프로필 상세 조회
  // - /members/{memberId}/profile 호출
  // - detail 중첩 객체 또는 최상위 필드 모두 대응
  // - 알림 발송 시 selectedUser.memberId가 필요하므로 memberId도 저장
  const loadUserDetail = useCallback(async (memberId: number, fallbackName: string, fallbackPhone: string) => {
    try {
      const headers = await authHeader();
      const res  = await axios.get(`${MEMBERS}/${memberId}/profile`, { headers });
      const d    = extractData(res);
      if (!d) {
        showResultModal('프로필 조회 불가', '상세 정보를 불러올 수 없습니다.', 'error');
        return false;
      }

      // detail 중첩 객체가 있으면 우선 사용, 없으면 최상위 필드 사용
      const detail = d.detail ?? d;
      setSelectedUser({
        memberId, // 알림 발송 시 사용
        name:            d.name    ?? fallbackName,
        phone:           d.phone   ?? fallbackPhone ?? '-',
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

  // 특정 회원에게 알림 발송
  // - 제목/내용 유효성 확인 후 /admin/alerts/send 호출
  // - iOS/Android 딜레이 차이를 고려한 setTimeout 처리
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
        // 입력 필드 초기화
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

  // QR 스캐너 열기
  // - scannedRef 초기화 (이전 스캔 결과 리셋)
  // - 카메라 준비는 500ms 후 (애니메이션 완료 후 활성화)
  const openScanner = useCallback(() => {
    scannedRef.current = false;
    setIsProcessing(false);
    setScannerVisible(true);
    setTimeout(() => setCameraReady(true), 500);
  }, []);

  // QR 스캐너 닫기
  // - 카메라 비활성화 및 scannedRef 초기화 (800ms 딜레이로 애니메이션 후 리셋)
  const closeScanner = useCallback(() => {
    setScannerVisible(false);
    setIsProcessing(false);
    setCameraReady(false);
    setTimeout(() => { scannedRef.current = false; }, 800);
  }, []);

  // QR 바코드 스캔 처리
  // - scannedRef와 isProcessing으로 중복 처리 방지
  // - 스캔 실패 또는 이미 출석 시 스캐너 재오픈 (reopenScanner 콜백)
  // - 출석 성공 시 방문자 및 회원 목록 갱신
  const handleBarCodeScanned = useCallback(async (qrData: string) => {
    // 이미 처리 중이면 무시
    if (scannedRef.current || isProcessing) return;
    scannedRef.current = true;
    setIsProcessing(true);

    // 스캐너 재오픈 함수 (모달 확인 후 다시 스캔할 수 있도록)
    const reopenScanner = () => {
      setTimeout(() => {
        scannedRef.current = false;
        setIsProcessing(false);
        setScannerVisible(true);
        setTimeout(() => setCameraReady(true), 500);
      }, 300);
    };

    try {
      const headers = await authHeader();
      // 출석 처리 API 호출 (deductionCount: 1 = 일일권 1회 차감)
      const res    = await axios.post(`${ADMIN}/visits/scan`, { qrToken: qrData, deductionCount: 1 }, { headers });
      const result = extractData(res);
      const { statusCode = '', memberName = '회원', remainingInfo = '', message = '' } = result ?? {};

      closeScanner();
      setTimeout(() => {
        if (statusCode === 'ALREADY' || message.includes('이미 출석')) {
          // 오늘 이미 출석한 경우
          showResultModal(
            '금일 출석 완료',
            `${memberName}님은\n오늘 이미 출석하셨습니다.`,
            'info',
            reopenScanner, // 확인 후 스캐너 재오픈
          );
        } else if (statusCode === 'ERROR') {
          // 출석 처리 실패
          showResultModal('출석 실패', message || '출석 처리에 실패했습니다.', 'error', () => {
            reopenScanner();
          });
        } else {
          // 출석 성공: 방문자/회원 목록 갱신
          fetchVisits();
          fetchMembers();
          showResultModal(
            '출석 완료!',
            // 이름, 잔여 정보, 메시지 중 값이 있는 것만 줄바꿈으로 합침
            [memberName ? `${memberName}님 환영합니다!` : '', remainingInfo, message].filter(Boolean).join('\n\n'),
          );
        }
      }, 300);
    } catch (e: any) {
      closeScanner();
      setTimeout(() => showResultModal('출석 실패', e.response?.data?.message ?? '출석 처리에 실패했습니다.', 'error', () => {
        reopenScanner();
      }), 300);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, closeScanner, showResultModal, fetchVisits, fetchMembers]);

  // 훅 사용 컴포넌트에 노출할 상태와 함수들 반환
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
    getProfileImageSource,
  };
};