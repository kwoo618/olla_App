import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Animated,
  RefreshControl
} from 'react-native';
import { API_BASE_URL } from '../src/constants/Config';

const MAX_HOLDS: { [key: string]: number } = {
  "흰색": 26, "노랑": 33, "초록": 28, "파랑": 26, "빨강": 26, "보라": 25, "주황": 28, "검정": 30
};

const colorOrder = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];
const reverseColorMap: { [key: string]: string } = {
  "WHITE": "흰색", "YELLOW": "노랑", "ORANGE": "주황", "GREEN": "초록",
  "BLUE": "파랑", "RED": "빨강", "PURPLE": "보라", "BLACK": "검정"
};

const HomeScreen = ({ navigation }: any) => {
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;

  // ─── 당겨서 새로고침(Pull-to-Refresh) 상태 ───
  const [refreshing, setRefreshing] = useState(false);

  // ─── 커스텀 알림 모달 상태 추가 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  const [qrToken, setQrToken] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState('');
  const [myMemberId, setMyMemberId] = useState<number | null>(null);

  const [userStats, setUserStats] = useState({
    monthlyVisits: 0,
    difficultyColor: '없음',
    difficultyType: '',
    difficultyStatus: '',
    enduranceRank: 0,
    enduranceMinutes: 0,
    enduranceSeconds: 0,
  });

  const [notice, setNotice] = useState({
    title: '공지사항을 불러오는 중...',
    content: '',
    important: false,
  });

  const [membership, setMembership] = useState({
    membershipType: '-',
    remainingDays: 0,
    remainingCount: 0,
    startDate: '',
    endDate: '',
    status: '',
    isLoading: true
  });

  const [attendedDates, setAttendedDates] = useState<number[]>([]);

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedFullDate, setSelectedFullDate] = useState<Date | null>(null);

  const fetchQrToken = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      const response = await axios.get(`${API_BASE_URL}/visit/qr`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      // ✅ Depth 1단계 추가 적용
      const qrData = response.data?.data?.data;
      if (qrData) {
        setQrToken(qrData);
      }
    } catch (error: any) {
      // ✅ 에러 메시지 처리 적용
      const errorMessage = error.response?.data?.message || 'QR 코드 발급에 실패했습니다.';
      console.error('QR 토큰 발급 실패:', errorMessage);
      showResultModal('오류', errorMessage, 'error');
    }
  };

  const openModal = (type: string) => {
    setActiveModal(type);
    if (type === 'QR') {
      setQrToken(null);
      fetchQrToken();
    }
    setTimeout(() => {
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 50);
  };

  const closeModal = () => {
    Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }).start(() => {
      setActiveModal(null);
    });
  };

  const extractList = (serverData: any) => {
    if (!serverData) return [];
    if (Array.isArray(serverData)) return serverData;
    if (Array.isArray(serverData.list)) return serverData.list;
    if (Array.isArray(serverData.data)) return serverData.data;
    if (serverData.masters || serverData.challengers) {
      return [...(serverData.masters || []), ...(serverData.challengers || [])];
    }
    return [];
  };

  const isMyRecord = (item: any, myId: number | null, nickname: string): boolean => {
    if (myId !== null && (item.memberId ?? item.id) !== null && (item.memberId ?? item.id) !== undefined) {
      return Number(item.memberId ?? item.id) === myId;
    }
    return item.name === nickname || item.nickname === nickname;
  };

  const resolveMembershipType = (
    typeStr: string,
    startDate: string,
    endDate: string,
    remainingCount: number | null
  ): string => {
    const upper = typeStr.toUpperCase();
    if (upper === 'COUNT' || upper.includes('횟수') || upper.includes('COUNT')) return '일일권';
    if (upper === 'PERIOD' || upper.includes('기간') || upper.includes('PERIOD') || upper.includes('MONTH')) {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return totalDays <= 1 ? '일일권' : '기간권';
      }
      return '기간권';
    }
    if (remainingCount !== null && remainingCount !== undefined) return '일일권';
    if (endDate) return '기간권';
    return '-';
  };

  // ─── 메인 데이터 패치 함수 ───
  const fetchMainData = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        setMembership(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const storedRole = await AsyncStorage.getItem('userRole');
      setUserRole(storedRole);

      const config = { headers: { Authorization: `Bearer ${userToken}` } };

      let nickname = '';
      let memberId: number | null = null;
      
      // [1] 내 정보(프로필) 로드
      try {
        const profileRes = await axios.get(`${API_BASE_URL}/members/me`, config);
        // ✅ Depth 1단계 추가 적용
        const pData = profileRes.data?.data?.data;
        if (pData) {
          nickname = pData.nickname || pData.name || '';
          memberId = pData.memberId ?? pData.id ?? null;
          setMyNickname(nickname);
          setMyMemberId(memberId !== null ? Number(memberId) : null);
        }
      } catch (error: any) {
        console.error('프로필 로드 실패:', error.response?.data?.message || error.message);
      }

      // [2] 공지사항 로드
      try {
        const noticeResponse = await axios.get(`${API_BASE_URL}/admin/notices`);
        // ✅ Depth 1단계 추가 적용
        const noticeList: any[] = noticeResponse.data?.data?.data.content ?? noticeResponse.data?.data?.data ?? [];

        if (noticeList.length > 0) {
          const importantNotices = noticeList
            .filter((n: any) => n.important === true)
            .sort((a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          const normalNotices = noticeList
            .filter((n: any) => n.important !== true)
            .sort((a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          const target = importantNotices.length > 0 ? importantNotices[0] : normalNotices[0];
          setNotice({
            title: target.title,
            content: target.content,
            important: target.important === true,
          });
        } else {
          setNotice({ title: '현재 등록된 공지가 없습니다.', content: '', important: false });
        }
      } catch (error: any) {
        console.log('공지사항 로드 실패:', error.response?.data?.message || error.message);
        setNotice({ title: '공지사항을 불러올 수 없습니다.', content: '', important: false });
      }

      // [3] 회원권 로드
      try {
        const memResponse = await axios.get(`${API_BASE_URL}/memberships/me`, config);
        // ✅ Depth 1단계 추가 적용
        const data = memResponse.data?.data?.data;
        if (data) {
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          const rawType = String(data.membershipType || '');
          const displayType = resolveMembershipType(rawType, data.startDate || '', data.endDate || '', data.remainingCount ?? null);
          let remainingDays = 0;
          if (data.endDate) {
            const end = new Date(data.endDate);
            end.setHours(0, 0, 0, 0);
            const diff = Math.ceil((end.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            remainingDays = diff >= 0 ? diff : 0;
          }
          setMembership({
            membershipType: displayType,
            remainingDays,
            remainingCount: data.remainingCount ?? 0,
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            status: data.status === 'ACTIVE' ? '이용중' : data.status === 'HOLDING' ? '정지중' : '만료',
            isLoading: false
          });
        } else {
          setMembership(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error: any) {
        console.error('회원권 로드 실패:', error.response?.data?.message || error.message);
        setMembership(prev => ({ ...prev, isLoading: false }));
      }

      // [4] 랭킹 및 기록 로드 (프로필이 있을 경우)
      if (nickname || memberId !== null) {
        let myEndRank = 0;
        let myEndMin = 0;
        let myEndSec = 0;

        try {
          const endRes = await axios.get(`${API_BASE_URL}/rankings/endurance/distance`, config);
          // ✅ Depth 1단계 추가 적용
          const endList = extractList(endRes.data?.data?.data);
          const myEndRecord = endList.find((item: any) => isMyRecord(item, memberId, nickname));
          if (myEndRecord) {
            endList.sort((a: any, b: any) => {
              if (a.ranking && b.ranking) return a.ranking - b.ranking;
              return (b.oneWayCount || 0) - (a.oneWayCount || 0);
            });
            const myRankIndex = endList.findIndex((item: any) => isMyRecord(item, memberId, nickname));
            myEndRank = myRankIndex !== -1 ? myRankIndex + 1 : 0;
            const totalSec = myEndRecord.timeSeconds || 0;
            myEndMin = Math.floor(totalSec / 60);
            myEndSec = totalSec % 60;
          }
        } catch (error: any) {
          console.log('지구력 기록 로드 실패:', error.response?.data?.message || error.message);
        }

        let bestColor = '없음';
        let bestType = '';
        let bestStatus = '';

        try {
          const [bestRes, historyRes, allRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/records/beginner/best`, config).catch(() => null),
            axios.get(`${API_BASE_URL}/records/beginner/history`, config).catch(() => null),
            axios.get(`${API_BASE_URL}/records/beginner`, config).catch(() => null)
          ]);
          
          let myRealBestRecords: any[] = [];
          [bestRes, historyRes, allRes].forEach(res => {
            if (res) {
              // ✅ Depth 1단계 추가 적용
              const data = res.data?.data?.data;
              if (Array.isArray(data)) myRealBestRecords = [...myRealBestRecords, ...data];
              else if (data?.list && Array.isArray(data.list)) myRealBestRecords = [...myRealBestRecords, ...data.list];
            }
          });

          let highestScore = -1;
          myRealBestRecords.forEach((r: any) => {
            const krColor = reverseColorMap[r.difficulty] || r.color;
            if (!krColor) return;
            const colorIdx = colorOrder.indexOf(krColor);
            if (colorIdx === -1) return;
            const maxHoldForColor = MAX_HOLDS[krColor] || 0;
            const attemptType = r.attemptType || r.attempt_type || r.type || r.recordType || '';
            const isRoundTrip = String(attemptType).toUpperCase().includes('ROUND') || String(attemptType).includes('왕복') || r.isRoundTrip === true;
            let holdCount = r.maxHoldNo ?? r.total ?? r.score ?? 0;
            const isSuccess = r.success === true || String(r.success) === 'true' || r.isSuccess === true || String(r.isSuccess) === 'true' || r.isMaster === true || String(r.status) === '완료';
            if (isSuccess || holdCount === 0) holdCount = maxHoldForColor;
            const colorWeight = colorIdx * 100000;
            const typeWeight = isRoundTrip ? 50000 : 0;
            const score = colorWeight + typeWeight + Number(holdCount);
            if (score > highestScore) {
              highestScore = score;
              bestColor = krColor;
              bestType = isRoundTrip ? '왕복' : '편도';
              bestStatus = isSuccess ? '완료' : '진행중';
            }
          });
        } catch (error: any) {
          console.log('초보벽 최고기록 로드 실패:', error.response?.data?.message || error.message);
        }

        setUserStats(prev => ({
          ...prev,
          difficultyColor: bestColor,
          difficultyType: bestType,
          difficultyStatus: bestStatus,
          enduranceRank: myEndRank,
          enduranceMinutes: myEndMin,
          enduranceSeconds: myEndSec
        }));
      }
    } catch (error) {
      console.error('데이터 전체 로드 중 오류:', error);
    }
  };

  // ─── 출석 데이터 패치 함수 ───
  const fetchVisitHistory = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      const year = viewDate.getFullYear();
      const month = String(viewDate.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}-${month}`;
      
      const response = await axios.get(
        `${API_BASE_URL}/visit/my-history?yearMonth=${yearMonth}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      // Depth 1단계 추가 적용
      let rawData = response.data?.data?.data;
      if (rawData && !Array.isArray(rawData) && rawData.data) rawData = rawData.data;
      
      let daysAttended: number[] = [];
      if (Array.isArray(rawData)) {
        daysAttended = rawData
          .map((item: any) => {
            if (typeof item === 'string') {
              const parts = item.split('-');
              if (parts.length >= 3) return parseInt(parts[2], 10);
            } else if (Array.isArray(item) && item.length >= 3) {
              return parseInt(item[2], 10);
            }
            return -1;
          })
          .filter((day: number) => day > 0 && !isNaN(day));
      }
      setAttendedDates(daysAttended);
      
      if (year === today.getFullYear() && viewDate.getMonth() === today.getMonth()) {
        setUserStats(prev => ({ ...prev, monthlyVisits: daysAttended.length }));
      }
    } catch (error: any) {
      console.error('출석 내역 로드 실패:', error.response?.data?.message || error.message);
      setAttendedDates([]);
    }
  };

  useEffect(() => {
    fetchMainData();
  }, []);

  useEffect(() => {
    fetchVisitHistory();
  }, [viewDate.getFullYear(), viewDate.getMonth()]);

  // ─── 새로고침(Pull to Refresh) 핸들러 ───
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMainData(), fetchVisitHistory()]);
    setRefreshing(false);
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    if (newDate.getFullYear() >= 2020 && newDate.getFullYear() <= 2120) setViewDate(newDate);
  };

  const onDateClick = (day: number) => {
    setSelectedFullDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const isCountType = membership.membershipType === '일일권';
  const hasMembership =
    isCountType
      ? membership.remainingCount > 0
      : !!(membership.startDate && membership.endDate);

  const isTodayAttended = 
    viewDate.getFullYear() === today.getFullYear() && 
    viewDate.getMonth() === today.getMonth() && 
    attendedDates.includes(today.getDate());

  let displayStatus = membership.status;
  if (isCountType && membership.status === '이용중') {
    displayStatus = isTodayAttended ? '이용중' : '미사용';
  }

  const handlePopupPress = (title: string) => {
    if (title === '공지사항') {
      navigation.navigate('Notice');
    } else if (title === 'QR') {
      if (!hasMembership) {
        showResultModal('입장 불가', '현재 활성화된 이용권이 없습니다. 이용권을 먼저 구매해주세요.', 'info');
        return;
      }
      openModal('QR');
    } else if (title === '회원권') {
      openModal('Membership');
    } else if (title === '이번달 방문') {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } else if (title === '지구력 랭킹') {
      navigation.navigate('Ranking', { targetTab: '지구력' });
    }
  };

  return (
    <View style={styles.background}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A1BE44"
            colors={['#A1BE44']}
          />
        }
      >
        <TouchableOpacity style={styles.noticeCard} onPress={() => handlePopupPress('공지사항')}>
          <View style={styles.noticeHeaderRow}>
            {notice.important && (
              <View style={styles.noticeBadge}>
                <Text style={styles.noticeBadgeText}>중요</Text>
              </View>
            )}
            <Text style={styles.noticeHeadline} numberOfLines={1}>{notice.title}</Text>
          </View>
          <Text style={styles.noticeBody} numberOfLines={1}>{notice.content}</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity style={styles.QRCardCentered} onPress={() => handlePopupPress('QR')}>
            <Image source={require('../assets/QR.png')} style={styles.largeIcon} />
            <Text style={styles.cardTitleCentered} numberOfLines={1} adjustsFontSizeToFit>QR 입장</Text>
            <Text style={styles.microSubTitle}>탭하여 입장</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.UserCardCentered} onPress={() => handlePopupPress('회원권')}>
            <View style={[styles.circleGraphDummy, !hasMembership && { borderColor: '#444444' }]}>
              {/* 💡 크기 확대 */}
              <Text style={[styles.circleGraphText, !hasMembership && { color: '#999999', fontSize: 15 }]}>
                {membership.isLoading
                  ? ''
                  : hasMembership
                    ? isCountType
                      ? `${membership.remainingCount}회`
                      : `D-${membership.remainingDays}`
                    : '없음'}
              </Text>
            </View>
            <Text style={styles.cardTitleCentered}>
              {hasMembership ? membership.membershipType : '이용권'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.unifiedDataFrame}>
          <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('이번달 방문')}>
            <Text style={styles.microSubTitle}>이번달 방문</Text>
            <Text style={styles.microValue} numberOfLines={1} adjustsFontSizeToFit>
              {userStats.monthlyVisits}<Text style={styles.microUnit}>회</Text>
            </Text>
          </TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => navigation.navigate('Recode', { openSection: 'difficulty' })}>
            <Text style={styles.microSubTitle}>초보벽 {'\n'}최고 난이도</Text>
            {userStats.difficultyColor === '없음' ? (
              <Text style={styles.microValuecolor} numberOfLines={1} adjustsFontSizeToFit>미기록</Text>
            ) : (
              <>
                <Text style={styles.microValuecolor} numberOfLines={1} adjustsFontSizeToFit>
                  {userStats.difficultyColor}
                </Text>
                <Text style={styles.microUnit}>
                  {userStats.difficultyType} <Text style={{ color: '#999999' }}>{userStats.difficultyStatus}</Text>
                </Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('지구력 랭킹')}>
            <Text style={styles.microSubTitle}>지구력 랭킹</Text>
            <Text style={styles.microValue} numberOfLines={1} adjustsFontSizeToFit>
              {userStats.enduranceRank === 0 ? '-' : userStats.enduranceRank}
              <Text style={styles.microUnit}>위</Text>
            </Text>
          </TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => navigation.navigate('Recode', { openSection: 'endurance' })}>
            <Text style={styles.microSubTitle}>지구력 {'\n'}최고 기록</Text>
            <Text style={styles.microValue} numberOfLines={1} adjustsFontSizeToFit>
              {userStats.enduranceMinutes}<Text style={styles.microUnit}>분 </Text>
              {userStats.enduranceSeconds}<Text style={styles.microUnit}>초</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
              <Text style={styles.arrowText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.calendarMonthText}>{currentYear}년 {currentMonth + 1}월</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
              <Text style={styles.arrowText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {weekDays.map((day, index) => (
              <Text key={index} style={[styles.weekDayText, index === 0 && { color: '#FF6B6B' }]}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isToday =
                day !== null &&
                today.getDate() === day &&
                today.getMonth() === currentMonth &&
                today.getFullYear() === currentYear;
              const isSelected =
                selectedFullDate !== null &&
                day !== null &&
                selectedFullDate.getDate() === day &&
                selectedFullDate.getMonth() === currentMonth &&
                selectedFullDate.getFullYear() === currentYear;
              const isAttended = day !== null && attendedDates.includes(day);

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.dayCell}
                  disabled={!day}
                  onPress={() => day && onDateClick(day)}
                >
                  {day ? (
                    <View style={[
                      styles.dayCircle,
                      isToday && styles.todayCircle,
                      isSelected && !isToday && styles.selectedCircle,
                      isAttended && !isToday && !isSelected && styles.attendedCircle
                    ]}>
                      <Text style={[
                        styles.dayText,
                        isToday && styles.todayText,
                        isSelected && !isToday && styles.selectedText,
                        isAttended && !isToday && !isSelected && styles.attendedText,
                        index % 7 === 0 && !isToday && !isSelected && !isAttended && styles.sundayText
                      ]}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ─── 커스텀 알림 결과 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 하단 팝업 모달 ─── */}
      <Modal
        visible={activeModal !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={closeModal}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {activeModal === 'QR' ? 'QR 체크인' : (hasMembership ? membership.membershipType : '이용권')}
                </Text>
                <TouchableOpacity onPress={closeModal}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {activeModal === 'QR' ? (
                <>
                  <View style={{ marginBottom: 20, alignItems: 'center', justifyContent: 'center', height: 200, width: 200 }}>
                    {qrToken ? (
                      <View style={{ padding: 10, backgroundColor: '#ffffff', borderRadius: 10 }}>
                        <QRCode value={qrToken} size={180} color="black" backgroundColor="white" />
                      </View>
                    ) : (
                      <Text style={{ color: '#999999' }}>QR 코드를 불러오는 중...</Text>
                    )}
                  </View>
                  <Text style={styles.qrDesc}>QR 코드를 출입기계 카메라에 맞춰주세요</Text>
                  <Text style={{ color: '#FF6B6B', fontSize: 14, marginTop: 10 }}>
                    ※ 발급된 QR 코드는 3분 뒤 만료됩니다.
                  </Text>
                </>
              ) : (
                <View style={styles.membershipContainer}>
                  <View style={styles.memCard}>
                    <View style={styles.memCardHeader}>
                      <Text style={styles.memCardTitle}>
                        {isCountType ? '잔여 횟수' : '남은 이용 기간'}
                      </Text>
                    </View>
                    {!isCountType && (
                      <View style={styles.progressBarBg}>
                        <View style={[
                          styles.progressBarFill,
                          { width: `${Math.min((membership.remainingDays / 30) * 100, 100)}%` },
                          !hasMembership && { backgroundColor: 'transparent' }
                        ]} />
                      </View>
                    )}
                    <View style={[styles.memCardDates, !hasMembership && { justifyContent: 'center' }]}>
                      {hasMembership ? (
                        isCountType ? (
                          // 💡 크기 확대
                          <Text style={[styles.memDateText, { fontSize: 18, color: '#A1BE44' }]}>
                            {membership.remainingCount}회 남음
                          </Text>
                        ) : (
                          <>
                            <Text style={styles.memDateText}>{membership.startDate}</Text>
                            <Text style={styles.memDateText}>{membership.endDate}</Text>
                          </>
                        )
                      ) : (
                        <Text style={styles.memDateText}>구매 필요</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.memRow}>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>
                        {isCountType ? '잔여 횟수' : '남은 기간'}
                      </Text>
                      <Text style={[
                        styles.memHalfValueGreen,
                        // 💡 크기 확대
                        !hasMembership && { color: '#999999', fontSize: 18 }
                      ]} numberOfLines={1} adjustsFontSizeToFit>
                        {hasMembership
                          ? isCountType
                            ? `${membership.remainingCount}회`
                            : `${membership.remainingDays}일`
                          : '구매 필요'}
                      </Text>
                    </View>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>상태</Text>
                      <Text style={[
                        styles.memHalfValueWhite,
                        // 💡 크기 확대
                        !hasMembership && { fontSize: 18, color: '#FF6B6B' }
                      ]} numberOfLines={1} adjustsFontSizeToFit>
                        {hasMembership ? displayStatus : '구매 필요'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// 💡 전체적으로 fontSize +2~3씩 확대
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 60 },

  noticeCard: { width: '100%', backgroundColor: '#2A2A2A', paddingVertical: 18, paddingHorizontal: 20, borderRadius: 12, marginBottom: 20 },
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' },
  noticeHeadline: { color: '#ffffff', fontSize: 18, fontWeight: '600', flex: 1 },
  noticeBody: { color: '#999999', fontSize: 15, fontWeight: '400' },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  QRCardCentered: { width: '60%', backgroundColor: '#2A2A2A', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  UserCardCentered: { width: '38%', backgroundColor: '#2A2A2A', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  largeIcon: { width: 45, height: 45, marginBottom: 10, resizeMode: 'contain', tintColor: '#A1BE44' },
  circleGraphDummy: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, borderColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  circleGraphText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  cardTitleCentered: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  
  unifiedDataFrame: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  innerTouchableMicro: { flex: 1, paddingVertical: 18, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  verticalDivider: { width: 1, backgroundColor: '#3D3D3D', marginVertical: 15 },
  microSubTitle: { color: '#999999', fontSize: 12, fontWeight: '500', marginBottom: 10, textAlign: 'center' },
  microValue: { color: '#ffffff', fontSize: 21, fontWeight: 'bold', textAlign: 'center' },
  microValuecolor: { color: '#ffffff', fontSize: 21, fontWeight: 'bold', textAlign: 'center' },
  microUnit: { fontSize: 13, color: '#999999' },
  
  calendarCard: { width: '100%', backgroundColor: '#2A2A2A', borderRadius: 16, padding: 20, marginBottom: 20 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  monthArrow: { padding: 10 },
  arrowText: { color: '#A1BE44', fontSize: 22, fontWeight: 'bold' },
  calendarMonthText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { color: '#999999', fontSize: 15, width: '14.28%', textAlign: 'center', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  sundayText: { color: '#FF6B6B' },
  todayCircle: { backgroundColor: '#A1BE44' },
  todayText: { color: '#1A1A1A', fontWeight: 'bold' },
  selectedCircle: { backgroundColor: '#5DADE2' },
  selectedText: { color: '#000000', fontWeight: 'bold' },
  attendedCircle: { backgroundColor: '#3A3A3A', borderWidth: 1.5, borderColor: '#A1BE44' },
  attendedText: { color: '#A1BE44', fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold', marginLeft: 10 },
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  qrDesc: { color: '#999999', fontSize: 16 },
  
  membershipContainer: { width: '100%' },
  memCard: { backgroundColor: '#2A2A2A', borderRadius: 16, padding: 22, marginBottom: 15, width: '100%' },
  memCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  memCardTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: '#444444', borderRadius: 4, marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#A1BE44', borderRadius: 4 },
  memCardDates: { flexDirection: 'row', justifyContent: 'space-between' },
  memDateText: { color: '#999999', fontSize: 15 },
  memRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  memHalfCard: { backgroundColor: '#2A2A2A', borderRadius: 16, paddingVertical: 25, width: '48%', alignItems: 'center', justifyContent: 'center' },
  memHalfTitle: { color: '#ffffff', fontSize: 17, fontWeight: '600', marginBottom: 12 },
  memHalfValueGreen: { color: '#A1BE44', fontSize: 28, fontWeight: 'bold' },
  memHalfValueWhite: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 15, marginBottom: 25, textAlign: 'center', lineHeight: 20 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
});

export default HomeScreen;