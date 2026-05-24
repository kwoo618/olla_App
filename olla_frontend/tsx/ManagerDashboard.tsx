import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Modal, Platform, PermissionsAndroid,
  RefreshControl, Animated, Dimensions, PanResponder, TouchableWithoutFeedback, TextInput,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'react-native-camera-kit';
import { API_BASE_URL } from '../src/constants/Config';

const POST_API_URL        = `${API_BASE_URL}/posts`;
const NOTICE_API_URL      = `${API_BASE_URL}/admin/notices`;
const MEMBER_API_URL      = `${API_BASE_URL}/admin/memberships/members`;
const MEMBERSHIP_API_URL  = `${API_BASE_URL}/admin/memberships`;
const VISIT_TODAY_API_URL = `${API_BASE_URL}/admin/visits/today`;
const QR_SCAN_API_URL     = `${API_BASE_URL}/admin/visits/scan`;
const PROFILE_API_URL     = `${API_BASE_URL}/members`;
const DASHBOARD_API_URL   = `${API_BASE_URL}/admin/dashboard`;
const HOURLY_API_URL      = `${API_BASE_URL}/admin/dashboard/hourly`;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_INNER_W = SCREEN_WIDTH - 40; // 좌우 padding 20

const DAY_LABELS: Record<number, string> = {
  1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 7: '일',
};
const DAY_SELECT_OPTIONS = [
  { label: '월요일', value: 1 },
  { label: '화요일', value: 2 },
  { label: '수요일', value: 3 },
  { label: '목요일', value: 4 },
  { label: '금요일', value: 5 },
  { label: '토요일', value: 6 },
  { label: '일요일', value: 7 },
];

const translateGender = (gender: string) => {
  if (!gender || gender === '-') return '-';
  const g = String(gender).toUpperCase();
  if (g === 'MALE' || g === 'M') return '남자';
  if (g === 'FEMALE' || g === 'F') return '여자';
  return gender;
};

const isValidImageUrl = (url: string | null | undefined) => {
  return url && typeof url === 'string' && url.trim() !== '' && url !== 'null' && url !== 'undefined';
};

// 🌟 더미 데이터 (만료 임박 회원)
const DUMMY_EXPIRING_MEMBERS = [
  { id: 'd1', name: '김오름', phone: '010-1234-5678', endDate: '2026-05-26', dDay: 2 },
  { id: 'd2', name: '이바위', phone: '010-9876-5432', endDate: '2026-05-28', dDay: 4 },
  { id: 'd3', name: '박홀드', phone: '010-5555-4444', endDate: '2026-06-02', dDay: 9 },
  { id: 'd4', name: '최초크', phone: '010-1111-2222', endDate: '2026-06-05', dDay: 12 },
];

const ManagerDashboard = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');

  // 시간 포맷 헬퍼 (오전/오후 시:분:초)
  const getFormattedTime = () => {
    const now = new Date();
    return now.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });
  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'notice' | 'post', id: number } | null>(null);

  const [visitedMemberNames, setVisitedMemberNames] = useState<Set<string>>(new Set());

  // 백엔드 응답값 상태
  const [weeklyCongestionRate, setWeeklyCongestionRate] = useState<number[]>([]);
  const [hourlyCongestionByDay, setHourlyCongestionByDay] = useState<Record<number, number[]>>({});
  const [hourlyData, setHourlyData] = useState<number[]>([]);

  const [dashboardStats, setDashboardStats] = useState<{
    newMembersToday: number;
    lastUpdated: string;
    expiringMembers: any[];
    selectedDay: number;
    dataMode: 'realtime' | 'cumulative';
    dayDropdownOpen: boolean;
  }>({
    newMembersToday: 0,
    lastUpdated: '',
    expiringMembers: [],
    selectedDay: 6,
    dataMode: 'realtime',
    dayDropdownOpen: false,
  });

  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    activeMemberships: 0,
    todayVisitors: 0,
    totalPosts: 0,
  });

  const [isScannerVisible, setScannerVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const scannedRef = useRef(false);

  const [isDetailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // 체크리스트 상태 관리 (ID 기반)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.78;
  const detailHeightAnim = useRef(new Animated.Value(0)).current;
  const currentDetailSnap = useRef(DETAIL_MODAL_HEIGHT);

  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        detailHeightAnim.setOffset(currentDetailSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        detailHeightAnim.setValue(gs.dy < 0 ? -gs.dy * 0.1 : -gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        detailHeightAnim.flattenOffset();
        if (currentDetailSnap.current - gs.dy < currentDetailSnap.current * 0.75) {
          closeDetailModal();
        } else {
          Animated.spring(detailHeightAnim, { toValue: currentDetailSnap.current, friction: 7, tension: 40, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (isScannerVisible) { setTimeout(() => setCameraReady(true), 500); }
    else { setCameraReady(false); }
  }, [isScannerVisible]);

  useEffect(() => { checkAdminAndFetchData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchData();
    setRefreshing(false);
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const role  = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');
      if (!token || role !== 'ADMIN') {
        showResultModal('권한 오류', '관리자만 접근할 수 있는 페이지입니다.', 'error', () => navigation.goBack());
        return;
      }
      await Promise.all([
        fetchNotices(token),
        fetchPosts(token),
        fetchMembers(token),
        fetchVisits(token),
        fetchActiveMemberships(token),
        fetchDashboardStats(token),
      ]);
    } catch (error: any) {
      console.error('데이터 로딩 실패:', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (token: string) => {
    try {
      const response = await axios.get(DASHBOARD_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data ?? {};

      // 백엔드 데이터와 더미 데이터를 결합 (없으면 더미 데이터만 표시)
      let realExpiring = (data.expiringMembers ?? []).map((m: any, idx: number) => ({
        id: `real_${idx}`,
        name: m.name,
        phone: m.phone,
        endDate: m.endDate,
        dDay: m.dDay ?? m.dday ?? 0,
      }));
      
      const combinedExpiring = realExpiring.length > 0 ? realExpiring : DUMMY_EXPIRING_MEMBERS;

      setDashboardStats(prev => ({
        ...prev,
        newMembersToday: data.newMembersToday ?? 0,
        lastUpdated: data.lastUpdated ?? '',
        expiringMembers: combinedExpiring,
      }));

      if (Array.isArray(data.weeklyCongestionRate) && data.weeklyCongestionRate.length > 0) {
        setWeeklyCongestionRate(data.weeklyCongestionRate);
      } else if (Array.isArray(data.weeklyCongestion) && data.weeklyCongestion.length > 0) {
        const max = Math.max(...data.weeklyCongestion, 1);
        setWeeklyCongestionRate(data.weeklyCongestion.map((v: number) => Math.round((v / max) * 100)));
      } else {
        // 데이터 없을 시 더미 그래프 데이터
        setWeeklyCongestionRate([30, 45, 40, 50, 70, 100, 85]);
      }

      if (data.hourlyCongestionByDay) {
        const normalized: Record<number, number[]> = {};
        Object.entries(data.hourlyCongestionByDay).forEach(([k, v]) => {
          normalized[Number(k)] = v as number[];
        });
        setHourlyCongestionByDay(normalized);
        setHourlyData(normalized[6] ?? [10, 15, 20, 25, 40, 60, 80, 100, 90, 70, 50, 30, 20, 10, 5]);
      } else {
        setHourlyData([10, 15, 20, 25, 40, 60, 80, 100, 90, 70, 50, 30, 20, 10, 5]);
      }

      if (data.totalMembers)     setMetrics(prev => ({ ...prev, totalMembers: data.totalMembers }));
      if (data.activeMemberships) setMetrics(prev => ({ ...prev, activeMemberships: data.activeMemberships }));
    } catch (error: any) {
      console.error('대시보드 통계 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const fetchHourlyByDay = async (dayOfWeek: number) => {
    try {
      if (hourlyCongestionByDay[dayOfWeek]) {
        setHourlyData(hourlyCongestionByDay[dayOfWeek]);
        return;
      }
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await axios.get(HOURLY_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { dayOfWeek },
      });
      const list: number[] = response.data?.data ?? [];
      setHourlyCongestionByDay(prev => ({ ...prev, [dayOfWeek]: list }));
      setHourlyData(list.length > 0 ? list : [10, 15, 20, 25, 40, 60, 80, 100, 90, 70, 50, 30, 20, 10, 5]);
    } catch (error: any) {
      console.error('시간대별 혼잡도 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const handleDaySelect = (dayOfWeek: number) => {
    setDashboardStats(prev => ({ ...prev, selectedDay: dayOfWeek, dayDropdownOpen: false }));
    fetchHourlyByDay(dayOfWeek);
  };

  const fetchNotices = async (token: string) => {
    try {
      const response = await axios.get(NOTICE_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 2, sort: 'id,desc' },
      });
      const noticeList = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      setNotices(Array.isArray(noticeList) ? noticeList : []);
    } catch (error: any) {
      console.error('공지사항 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const sortPosts = (list: any[]) =>
    list.sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });

  const fetchPosts = async (token: string) => {
    try {
      const response = await axios.get(POST_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 20, sort: 'id,desc' },
      });
      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const totalElements = response.data?.data?.totalElements ?? list.length;
      const mappedList = list.map((item: any) => ({
        ...item,
        isPast: new Date(item.meetDateTime).getTime() < Date.now(),
      }));
      setPosts(sortPosts(mappedList).slice(0, 2));
      setMetrics(prev => ({ ...prev, totalPosts: totalElements }));
    } catch (error: any) {
      console.error('게시글 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const fetchMembers = async (token: string) => {
    try {
      const response = await axios.get(MEMBER_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 1000, sort: 'id,desc' },
      });
      const rawList = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      const list = Array.isArray(rawList) ? rawList : [];
      const validMembers = list.filter((user: any) => {
        const memberInfo = user.member || user;
        return !(user.deleted === true || memberInfo.isDeleted === true || memberInfo.status === 'DELETED');
      });
      setRecentMembers(validMembers.slice(0, 2));
      setMetrics(prev => ({ ...prev, totalMembers: validMembers.length }));
    } catch (error: any) {
      console.error('회원 데이터 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const fetchVisits = async (token: string) => {
    try {
      const response = await axios.get(VISIT_TODAY_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data?.data ?? response.data?.data ?? response.data;
      const todayCount = data?.totalVisitsToday ?? 0;
      setMetrics(prev => ({ ...prev, todayVisitors: todayCount }));
      const logs = data?.visitLogs || [];
      const visitedNames = new Set<string>();
      logs.forEach((log: any) => { if (log.memberName) visitedNames.add(log.memberName); });
      setVisitedMemberNames(visitedNames);
    } catch (error: any) {
      console.error('금일 방문자 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const fetchActiveMemberships = async (token: string) => {
    try {
      const response = await axios.get(`${MEMBERSHIP_API_URL}/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = response.data?.data?.data ?? response.data?.data ?? response.data;
      let activeCount = 0;
      if (typeof d === 'number') activeCount = d;
      else if (typeof d?.totalElements === 'number') activeCount = d.totalElements;
      else if (typeof d?.count === 'number') activeCount = d.count;
      else if (typeof d?.total === 'number') activeCount = d.total;
      else if (Array.isArray(d)) activeCount = d.length;
      else if (Array.isArray(d?.content)) activeCount = d.totalElements ?? d.content.length;
      if (activeCount === 0 && d === undefined) throw new Error('Need fallback');
      setMetrics(prev => ({ ...prev, activeMemberships: activeCount }));
    } catch {
      try {
        const fallbackRes = await axios.get(MEMBER_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
          params: { size: 1000 },
        });
        const list = fallbackRes.data?.data?.data?.content ?? fallbackRes.data?.data?.data ?? [];
        let count = 0;
        list.forEach((user: any) => {
          const memberInfo = user.member || user;
          if (user.deleted || memberInfo.isDeleted || memberInfo.status === 'DELETED') return;
          const isActive = (
            user.membershipStatus === 'ACTIVE' || user.status === 'ACTIVE' ||
            (Array.isArray(user.memberships) && user.memberships.some((m: any) => m.membershipStatus === 'ACTIVE' || m.status === 'ACTIVE')) ||
            (user.activeMembership && (user.activeMembership.status === 'ACTIVE' || user.activeMembership.membershipStatus === 'ACTIVE'))
          );
          if (isActive) count++;
        });
        setMetrics(prev => ({ ...prev, activeMemberships: count }));
      } catch (fallbackError) {
        console.error('활성이용권 폴백 로드 실패', fallbackError);
      }
    }
  };

  const confirmDelete = (type: 'notice' | 'post', id: number) => {
    setItemToDelete({ type, id });
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (itemToDelete.type === 'notice') {
        await axios.delete(`${NOTICE_API_URL}/${itemToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
        showResultModal('성공', '공지사항이 삭제되었습니다.', 'success');
        fetchNotices(token!);
      } else {
        await axios.delete(`${POST_API_URL}/${itemToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
        showResultModal('성공', '게시글이 삭제되었습니다.', 'success');
        fetchPosts(token!);
      }
    } catch (error: any) {
      showResultModal('오류', error.response?.data?.message || '삭제에 실패했습니다.', 'error');
    }
    setDeleteModalVisible(false);
    setItemToDelete(null);
  };

  const handleEditNotice = (noticeId: number) => {
    navigation.navigate('ManagerNotice', { editNoticeId: noticeId });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  const openDetailModal = async (memberId: number, fallbackName: string, fallbackPhone: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${PROFILE_API_URL}/${memberId}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = response.data?.data?.data || response.data?.data;
      if (!d) { showResultModal('프로필 조회 불가', '상세 정보를 불러올 수 없습니다.', 'error'); return; }
      const detail = d.detail || {};
      setSelectedUser({
        name: d.name || fallbackName,
        phone: d.phone || fallbackPhone || '-',
        profileImageUrl: d.profileImageUrl || d.profileImage,
        gender: translateGender(detail.gender || d.gender || '-'),
        age: detail.age || d.age || '-',
        height: detail.height || d.height || '-',
        weight: detail.weight || d.weight || '-',
        arm: detail.armSpan || d.armSpan || '-',
        shoe: detail.footSize || d.footSize || '-',
      });
      setDetailVisible(true);
      currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
      detailHeightAnim.setValue(0);
      Animated.spring(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, friction: 8, tension: 45, useNativeDriver: false }).start();
    } catch (error: any) {
      showResultModal('프로필 조회 불가', error.response?.data?.message || '회원 상세 정보를 불러올 수 없습니다.', 'error');
    }
  };

  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setDetailVisible(false);
      setSelectedUser(null);
    });
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: '카메라 권한 필요', message: 'QR 코드 스캔을 위해 카메라 권한이 필요합니다.',
          buttonNeutral: '나중에', buttonNegative: '거절', buttonPositive: '허용',
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch { return false; }
    }
    return true;
  };

  const openScanner = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) { showResultModal('권한 오류', '카메라 접근 권한을 허용해주세요.', 'error'); return; }
    scannedRef.current = false;
    setIsProcessing(false);
    setScannerVisible(true);
  };

  const closeScanner = () => {
    setScannerVisible(false);
    setIsProcessing(false);
    setTimeout(() => { scannedRef.current = false; }, 800);
  };

  const handleBarCodeScanned = async (qrData: string) => {
    if (scannedRef.current || isProcessing) return;
    scannedRef.current = true;
    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsProcessing(false); closeScanner();
        setTimeout(() => showResultModal('오류', '로그인 정보가 없습니다.', 'error'), 300);
        return;
      }
      const response = await axios.post(
        QR_SCAN_API_URL,
        { qrToken: qrData, deductionCount: 1 },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setIsProcessing(false);
      const result        = response.data?.data ?? {};
      const statusCode    = result.statusCode || '';
      const memberName    = result.memberName || '회원';
      const remainingInfo = result.remainingInfo || '';
      const message       = result.message || '';
      closeScanner();
      setTimeout(() => {
        if (statusCode === 'ALREADY' || message.includes('이미 출석') || message.includes('오늘 이미')) {
          showResultModal('금일 출석 완료', `${memberName}님은\n오늘 이미 출석하셨습니다.`, 'info');
        } else if (statusCode === 'ERROR') {
          showResultModal('출석 실패', message || '출석 처리에 실패했습니다.', 'error', () => {
            setTimeout(() => { scannedRef.current = false; setIsProcessing(false); setScannerVisible(true); }, 300);
          });
        } else {
          AsyncStorage.getItem('userToken').then(t => { if (t) { fetchVisits(t); fetchMembers(t); } });
          showResultModal('출석 완료!', [`${memberName}님 환영합니다!`, remainingInfo, message].filter(Boolean).join('\n\n'));
        }
      }, 300);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '출석 처리에 실패했습니다.';
      setIsProcessing(false); closeScanner();
      setTimeout(() => {
        showResultModal('출석 실패', errorMsg, 'error', () => {
          setTimeout(() => { scannedRef.current = false; setIsProcessing(false); setScannerVisible(true); }, 300);
        });
      }, 300);
    }
  };

  const toggleCheck = (id: string) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCheckedItems(newSet);
  };

  // ─── 수직형 바 그래프 (요일별 혼잡도) ───
  const renderWeeklyBar = () => {
    const CHART_H = 150;
    const barWidth = Math.floor((CARD_INNER_W - 40) / 7);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>📊 요일별 전체 혼잡도 (%)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H + 24, marginTop: 15 }}>
          {/* Y축 */}
          <View style={{ width: 30, height: CHART_H, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 }}>
            <Text style={styles.yAxisText}>100</Text>
            <Text style={styles.yAxisText}>50</Text>
            <Text style={styles.yAxisText}>0</Text>
          </View>
          {/* 바 영역 */}
          <View style={{ flex: 1, height: CHART_H + 24 }}>
            {[0, 0.5, 1].map((r, i) => (
              <View key={i} style={{
                position: 'absolute', top: CHART_H * (1 - r),
                left: 0, right: 0, height: 1, backgroundColor: '#383838',
              }} />
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, paddingHorizontal: 5 }}>
              {weeklyCongestionRate.map((val, idx) => {
                const dayOfWeek = idx + 1;
                const barH = Math.max((val / 100) * CHART_H, 4);
                const isSelected = dashboardStats.selectedDay === dayOfWeek;
                const barColor = isSelected ? '#A1BE44' : '#444444';
                
                return (
                  <TouchableOpacity
                    key={idx}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: CHART_H }}
                    activeOpacity={0.7}
                    onPress={() => handleDaySelect(dayOfWeek)}
                  >
                    <Text style={[styles.barValText, isSelected && { color: '#A1BE44' }]}>{val}%</Text>
                    <View style={[styles.bar, { height: barH, backgroundColor: barColor, width: barWidth - 10, borderRadius: 6 }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 5, marginTop: 8 }}>
              {weeklyCongestionRate.map((_, idx) => {
                const dayOfWeek = idx + 1;
                const isSelected = dashboardStats.selectedDay === dayOfWeek;
                return (
                  <Text key={idx} style={[styles.barDayLabel, { flex: 1 }, isSelected && { color: '#A1BE44', fontWeight: 'bold' }]}>
                    {DAY_LABELS[dayOfWeek]}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── 수직형 선 그래프 (시간대별 분포) ───
  const renderHourlyLine = () => {
    const dayLabel = DAY_LABELS[dashboardStats.selectedDay] ?? '';
    const CHART_H = 150;
    const maxVal = Math.max(...hourlyData, 1);
    
    // 그래프 라인 영역 너비
    const lineW = CARD_INNER_W - 30; // Y축 너비 30 제외
    const stepX = hourlyData.length > 1 ? lineW / (hourlyData.length - 1) : lineW;

    const points = hourlyData.map((v, i) => ({
      x: i * stepX,
      y: CHART_H - (v / maxVal) * CHART_H,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>📈 {dayLabel}요일 시간대별 상세 분포</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H + 24, marginTop: 15 }}>
          {/* Y축 */}
          <View style={{ width: 30, height: CHART_H, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 }}>
            <Text style={styles.yAxisText}>Max</Text>
            <Text style={styles.yAxisText}>Mid</Text>
            <Text style={styles.yAxisText}>0</Text>
          </View>
          {/* 차트 영역 */}
          <View style={{ width: lineW, height: CHART_H + 24 }}>
            {[0, 0.5, 1].map((r, i) => (
              <View key={i} style={{
                position: 'absolute', top: CHART_H * (1 - r),
                left: 0, right: 0, height: 1, backgroundColor: '#383838',
              }} />
            ))}
            <View style={{ position: 'relative', height: CHART_H }}>
              {points.slice(0, -1).map((p, i) => {
                const next = points[i + 1];
                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <View key={i} style={{
                    position: 'absolute', left: p.x, top: p.y,
                    width: len, height: 2, backgroundColor: '#A1BE44',
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: '0 0',
                  }} />
                );
              })}
              {points.map((p, i) => (
                <View key={i} style={{
                  position: 'absolute', left: p.x - 4, top: p.y - 4,
                  width: 8, height: 8, borderRadius: 4, backgroundColor: '#A1BE44',
                  borderWidth: 2, borderColor: '#2C2C2C'
                }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              {hourlyData.map((_, i) => {
                const hour = i + 9;
                return i % 3 === 0 ? (
                  <Text key={i} style={styles.xAxisText}>{hour}시</Text>
                ) : null;
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── 만료 임박 회원 체크리스트 ───
  const renderExpiringMembers = () => {
    const list = dashboardStats.expiringMembers;
    if (!list || list.length === 0) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.expiringTitle}>🔔 만료 임박 회원 체크리스트 (2주 이내)</Text>
        <View style={styles.divider} />
        <View style={styles.expiringHeader}>
          <Text style={[styles.expiringCol, { width: 40, textAlign: 'center' }]}>확인</Text>
          <Text style={[styles.expiringCol, { flex: 1.2 }]}>이름</Text>
          <Text style={[styles.expiringCol, { flex: 2 }]}>연락처</Text>
          <Text style={[styles.expiringCol, { flex: 1.5 }]}>만료일</Text>
          <Text style={[styles.expiringCol, { width: 50, textAlign: 'center' }]}>상태</Text>
        </View>
        {list.map((m, idx) => {
          const dDay = m.dDay;
          const isChecked = checkedItems.has(m.id);
          const ddayColor = isChecked ? '#666666' : dDay <= 3 ? '#FF4D4D' : dDay <= 7 ? '#FF9800' : '#A1BE44';
          const maskedPhone = m.phone ? m.phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3') : '-';
          
          return (
            <TouchableOpacity 
              key={m.id} 
              activeOpacity={0.8}
              onPress={() => toggleCheck(m.id)}
              style={[styles.expiringRow, idx % 2 === 1 && { backgroundColor: '#222222' }]}
            >
              {/* 체크박스 */}
              <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                </View>
              </View>
              <Text style={[styles.expiringValue, { flex: 1.2 }, isChecked && styles.textStrikethrough]}>{m.name}</Text>
              <Text style={[styles.expiringValue, { flex: 2 }, isChecked && styles.textStrikethrough]}>{maskedPhone}</Text>
              <Text style={[styles.expiringValue, { flex: 1.5, fontSize: 12 }, isChecked && styles.textStrikethrough]}>{m.endDate}</Text>
              <View style={{ width: 50, alignItems: 'center', justifyContent: 'center' }}>
                <View style={[styles.ddayBadge, { backgroundColor: isChecked ? '#333' : `${ddayColor}33` }]}>
                  <Text style={[styles.ddayText, { color: ddayColor }]}>D-{dDay}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ─── 하단 컨트롤 바 (필요 시) ───
  const renderBottomControls = () => {
    const selectedLabel = DAY_SELECT_OPTIONS.find(o => o.value === dashboardStats.selectedDay)?.label ?? '토요일';
    return (
      <View style={styles.controlCard}>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>상세 조회 요일</Text>
          <View style={{ flex: 1, marginLeft: 10, position: 'relative', zIndex: 100 }}>
            <TouchableOpacity
              style={styles.dropdownBtn}
              activeOpacity={0.8}
              onPress={() => setDashboardStats(prev => ({ ...prev, dayDropdownOpen: !prev.dayDropdownOpen }))}
            >
              <Text style={styles.dropdownBtnText}>{selectedLabel}</Text>
              <Text style={styles.dropdownArrow}>{dashboardStats.dayDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {dashboardStats.dayDropdownOpen && (
              <View style={styles.dropdownList}>
                {DAY_SELECT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dropdownItem, dashboardStats.selectedDay === opt.value && styles.dropdownItemActive]}
                    onPress={() => handleDaySelect(opt.value)}
                  >
                    <Text style={[styles.dropdownItemText, dashboardStats.selectedDay === opt.value && { color: '#A1BE44' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          activeOpacity={0.8}
          onPress={async () => {
            const token = await AsyncStorage.getItem('userToken');
            if (token) await fetchDashboardStats(token);
          }}
        >
          <Text style={styles.refreshBtnText}>데이터 새로고침</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  const lastUpdatedDisplay = dashboardStats.lastUpdated 
    ? dashboardStats.lastUpdated 
    : `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;

  return (
    <View style={styles.background}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}
      >
        {/* 1. 상단 헤더: 타이틀 + 메트릭 4개 */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <Text style={styles.dashboardTitleBig}>관리자{"\n"}대시보드</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.metricGridRow}>
              <View style={styles.metricGridBox}>
                <Text style={styles.headerMetricLabel}>총 회원수</Text>
                <Text style={styles.headerMetricValue}>{metrics.totalMembers}명</Text>
              </View>
              <View style={styles.metricGridBox}>
                <Text style={styles.headerMetricLabel}>금일 신규</Text>
                <Text style={[styles.headerMetricValue, { color: '#A1BE44' }]}>{dashboardStats.newMembersToday}명</Text>
              </View>
            </View>
            <View style={styles.metricGridRow}>
              <View style={styles.metricGridBox}>
                <Text style={styles.headerMetricLabel}>활성 이용권</Text>
                <Text style={[styles.headerMetricValue, metrics.activeMemberships === 0 && { color: '#666' }]}>
                  {metrics.activeMemberships}개
                </Text>
              </View>
              <View style={styles.metricGridBox}>
                <Text style={styles.headerMetricLabel}>업데이트</Text>
                <Text style={[styles.headerMetricValue, { fontSize: 13, color: '#999999' }]}>
                  {lastUpdatedDisplay}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. 그래프 영역 */}
        <View style={styles.graphsWrapper}>
          {renderWeeklyBar()}
          {renderHourlyLine()}
        </View>

        {/* 🌟 3. 상세 조회 컨트롤 (그래프 바로 아래로 이동) */}
        {renderBottomControls()}

        {/* 4. 만료 임박 회원 체크리스트 */}
        {renderExpiringMembers()}

        {/* 5. 최근 가입회원 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 가입회원</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ManagerUser')}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          {recentMembers.length > 0 ? (
            recentMembers.map((memberResponse, index) => {
              const member     = memberResponse.member || memberResponse;
              const memberId   = member.memberId || member.id;
              const userName   = member.name || '이름 없음';
              const userPhone  = member.phone || '전화번호 없음';
              const profileUrl = member.profileImageUrl || member.profileImage;
              const hasValidImage = isValidImageUrl(profileUrl);
              const isVisited  = visitedMemberNames.has(userName);
              const badgeBg    = isVisited ? 'rgba(161,190,68,0.2)' : 'rgba(142,142,142,0.2)';
              const badgeColor = isVisited ? '#A1BE44' : '#8E8E8E';
              const label      = isVisited ? '출석함' : '미출석';
              return (
                <TouchableOpacity
                  key={member.id || index}
                  style={[styles.rowItem, index > 0 && { marginTop: 15 }]}
                  activeOpacity={0.7}
                  onPress={() => openDetailModal(memberId, userName, userPhone)}
                >
                  {hasValidImage ? (
                    <Image source={{ uri: profileUrl }} style={styles.profileImg} />
                  ) : userName === '최강우' ? (
                    <View style={styles.textProfileImg}><Text style={styles.textProfileText}>최</Text></View>
                  ) : (
                    <Image source={require('../assets/profile.png')} style={styles.profileImg} />
                  )}
                  <View style={styles.infoCol}>
                    <Text style={styles.nameText}>{userName}</Text>
                    <Text style={styles.subText}>{userPhone}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.badgeText, { color: badgeColor }]}>{label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyText}>가입 회원이 없습니다.</Text>
          )}
        </View>

        {/* 6. 최근 공지사항 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 공지사항</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ManagerNotice')}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          {notices.length > 0 ? (
            notices.map((notice, index) => (
              <View key={notice.id} style={[styles.noticeListItem, index > 0 && { marginTop: 20 }]}>
                <View style={styles.noticeTextContent}>
                  <View style={styles.noticeHeaderRow}>
                    {notice.important && (
                      <View style={styles.noticeBadge}><Text style={styles.noticeBadgeText}>중요</Text></View>
                    )}
                    <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                  </View>
                  <Text style={styles.subText}>{formatDate(notice.createdAt)}</Text>
                </View>
                <View style={styles.noticeActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditNotice(notice.id)}>
                    <Image source={require('../assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => confirmDelete('notice', notice.id)}>
                    <Image source={require('../assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>등록된 공지가 없습니다.</Text>
          )}
        </View>

      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openScanner}>
        <Image source={require('../assets/Camera.png')} style={styles.fabIcon} />
      </TouchableOpacity>

      {/* 결과 모달 */}
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

      {/* 삭제 모달 */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={[styles.resultModalTitle, { color: '#A1BE44' }]}>
              해당 {itemToDelete?.type === 'notice' ? '공지사항' : '게시글'} 삭제
            </Text>
            <Text style={styles.resultModalMessage}>정말 삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={executeDelete}>
                <Text style={[styles.deleteBtnYesText, { color: '#000000' }]}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.deleteBtnNoText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 회원 상세 바텀시트 */}
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
                <View style={styles.detailContainer}>
                  <View style={styles.detailProfileWrapper}>
                    {isValidImageUrl(selectedUser.profileImageUrl) ? (
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
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>이름</Text><Text style={styles.detailValue}>{selectedUser.name}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>성별</Text><Text style={styles.detailValue}>{selectedUser.gender}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>연락처</Text><Text style={styles.detailValue}>{selectedUser.phone}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>나이</Text><Text style={styles.detailValue}>{selectedUser.age}{selectedUser.age !== '-' && '세'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>키</Text><Text style={styles.detailValue}>{selectedUser.height}{selectedUser.height !== '-' && 'cm'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>몸무게</Text><Text style={styles.detailValue}>{selectedUser.weight}{selectedUser.weight !== '-' && 'kg'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>팔길이</Text><Text style={styles.detailValue}>{selectedUser.arm}{selectedUser.arm !== '-' && 'cm'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>암벽화 사이즈</Text><Text style={styles.detailValue}>{selectedUser.shoe}{selectedUser.shoe !== '-' && 'mm'}</Text></View>
                  </View>
                </View>
              )}
              <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}>
                <Text style={styles.closeFullBtnText}>닫기</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* QR 스캐너 모달 */}
      <Modal visible={isScannerVisible} animationType="slide" transparent={false} onRequestClose={closeScanner}>
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>QR 코드 스캔</Text>
            <TouchableOpacity onPress={closeScanner}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scannerContainer}>
            {isScannerVisible && cameraReady ? (
              <View style={StyleSheet.absoluteFill}>
                <Camera
                  style={StyleSheet.absoluteFill}
                  scanBarcode={true}
                  onReadCode={(event: any) => handleBarCodeScanned(event.nativeEvent.codeStringValue)}
                  showFrame={false}
                />
                <View style={styles.customFrameOverlay}>
                  <View style={styles.customSquareGuide} />
                </View>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#A1BE44" style={{ position: 'absolute' }} />
            )}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#A1BE44" />
                <Text style={styles.processingText}>처리 중...</Text>
              </View>
            )}
          </View>
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerDesc}>회원의 휴대폰에 있는 QR 코드를</Text>
            <Text style={styles.scannerDesc}>가이드 사각형 안으로 비춰주세요.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingBottom: 80 },

  // ── 1. 상단 헤더 카드 (좌우 분할) ──
  headerCard: {
    backgroundColor: '#2C2C2C', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  headerLeft: {
    flex: 1, borderRightWidth: 1, borderRightColor: '#444',
    paddingRight: 10, justifyContent: 'center'
  },
  dashboardTitleBig: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
  headerRight: { flex: 2, paddingLeft: 15 },
  metricGridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metricGridBox: { flex: 1, alignItems: 'flex-start', marginLeft: 5 },
  headerMetricLabel: { color: '#999999', fontSize: 11, marginBottom: 4 },
  headerMetricValue: { color: '#ffffff', fontSize: 16, fontWeight: '900' },

  // ── 2. 수직형 차트 래퍼 ──
  graphsWrapper: { marginBottom: 16 },
  chartContainer: {
    backgroundColor: '#2C2C2C', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 20, marginBottom: 16
  },
  chartTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  chartAxisLabel: { color: '#888888', fontSize: 9, marginBottom: 2 },
  yAxisText: { color: '#888888', fontSize: 10 },
  xAxisText: { color: '#888888', fontSize: 10 },
  bar: { width: '100%', borderRadius: 4, marginBottom: 0 },
  barValText: { color: '#cccccc', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  barDayLabel: { color: '#999999', fontSize: 11, textAlign: 'center' },

  // ── 3. 체크리스트 형태 만료 임박 회원 ──
  expiringTitle: { color: '#F5C842', fontSize: 17, fontWeight: 'bold' },
  expiringHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#444' },
  expiringCol: { color: '#999999', fontSize: 13, fontWeight: 'bold' },
  expiringRow: { flexDirection: 'row', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  expiringValue: { color: '#ffffff', fontSize: 14 },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#666666' },
  ddayBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ddayText: { fontSize: 12, fontWeight: 'bold' },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#666', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#A1BE44', borderColor: '#A1BE44' },

  // ── 하단 컨트롤 카드 ──
  controlCard: { backgroundColor: '#2C2C2C', borderRadius: 16, padding: 20, marginBottom: 16 },
  controlRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 15 },
  controlLabel: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#3A3A3A', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  dropdownBtnText: { color: '#ffffff', fontSize: 14 },
  dropdownArrow: { color: '#999999', fontSize: 10, marginLeft: 6 },
  dropdownList: {
    position: 'absolute', top: 45, left: 0, right: 0, zIndex: 99,
    backgroundColor: '#2C2C2C', borderRadius: 8,
    borderWidth: 1, borderColor: '#444',
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 12 },
  dropdownItemActive: { backgroundColor: '#3A3A3A' },
  dropdownItemText: { color: '#cccccc', fontSize: 14 },
  refreshBtn: { backgroundColor: '#3A3A3A', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  refreshBtnText: { color: '#A1BE44', fontSize: 16, fontWeight: 'bold' },

  // ── 공통 카드 ──
  card: { backgroundColor: '#2C2C2C', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#ffffff', fontSize: 19, fontWeight: 'bold' },
  viewAllBtn: { borderWidth: 1, borderColor: '#A1BE44', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  viewAllBtnText: { color: '#999999', fontSize: 14, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#444444', marginVertical: 15 },
  emptyText: { color: '#999', textAlign: 'center', marginVertical: 10, fontSize: 16 },

  // 회원 목록
  rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#444444', marginRight: 15 },
  textProfileImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#444444', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  textProfileText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  infoCol: { flex: 1 },
  nameText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  subText: { color: '#999999', fontSize: 15 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },

  // 공지/게시글
  noticeListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeTextContent: { flex: 1, paddingRight: 10 },
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' },
  noticeTitle: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', flex: 1 },
  noticeActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 6, marginLeft: 6 },
  deleteBtn: { borderRadius: 8, padding: 8 },
  actionIcon: { width: 24, height: 24, resizeMode: 'contain' },

  // FAB
  fab: { position: 'absolute', bottom: 15, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
  fabIcon: { width: 35, height: 35, tintColor: '#1A1A1A', resizeMode: 'contain' },

  // 스캐너
  scannerModalOverlay: { flex: 1, backgroundColor: '#1A1A1A' },
  scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1A1A1A' },
  scannerTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' },
  closeIcon: { color: '#999999', fontSize: 32 },
  scannerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  customFrameOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  customSquareGuide: { width: '65%', aspectRatio: 1, borderWidth: 3, borderColor: '#A1BE44', backgroundColor: 'transparent', borderRadius: 16 },
  processingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  processingText: { color: '#ffffff', fontSize: 18, marginTop: 12, fontWeight: 'bold' },
  scannerFooter: { padding: 40, alignItems: 'center', backgroundColor: '#1A1A1A' },
  scannerDesc: { color: '#ffffff', fontSize: 18, marginTop: 5 },

  // 바텀시트
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 25, paddingTop: 10, overflow: 'hidden', width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  detailContainer: { width: '100%' },
  detailProfileWrapper: { alignSelf: 'center', alignItems: 'center', marginBottom: 25 },
  profileBig: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#444' },
  profileName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  infoBox: { backgroundColor: '#262626', borderRadius: 15, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  detailLabel: { color: '#999', fontSize: 15 },
  detailValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  closeFullBtn: { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  closeFullBtnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },

  // 모달
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  deleteBtnYesText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  deleteBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});

export default ManagerDashboard;