import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

const MAX_HOLDS: { [key: string]: number } = { 
  "흰색": 26, "노랑": 33, "초록": 28, "파랑": 26, "빨강": 26, "보라": 25, "주황": 28, "검정": 30
};

const colorOrder = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];
const reverseColorMap: { [key: string]: string } = {
  "WHITE": "흰색", "YELLOW": "노랑", "ORANGE": "주황", "GREEN": "초록",
  "BLUE": "파랑", "RED": "빨강", "PURPLE": "보라", "BLACK": "검정"
};

const getTodayDate = () => { 
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const isStarted = (startDate: string): boolean => {
  if (!startDate) return true;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return start <= getTodayDate();
};

const isPeriodTicket = (typeStr: string) => {
  const s = String(typeStr || '').toUpperCase();
  return s === 'PERIOD' || s.includes('회원권') || s.includes('기간');
};

// ─── 개별 이용권 타입 ─────────────────────────────────────────────────────────
export type MembershipItem = {
  membershipType: '회원권' | '일일권' | '시작 예정';
  remainingDays: number;
  remainingCount: number;
  startDate: string;
  endDate: string;
  status: string;
};

export type MembershipState = {
  items: MembershipItem[];          // 보유 중인 이용권 목록 (복수)
  hasFuture: boolean;
  futureStartDate: string;
  isLoading: boolean;
  // 하위 호환용 — 홈 카드 원형 그래프에서 "대표" 이용권으로 사용
  membershipType: string;
  remainingDays: number;
  remainingCount: number;
  startDate: string;
  endDate: string;
  status: string;
};

export const HomeData = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

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

  const [membership, setMembership] = useState<MembershipState>({
    items: [],
    hasFuture: false,
    futureStartDate: '',
    isLoading: true,
    membershipType: '-',
    remainingDays: 0,
    remainingCount: 0,
    startDate: '',
    endDate: '',
    status: '',
  });

  const [attendedDates, setAttendedDates] = useState<number[]>([]);
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedFullDate, setSelectedFullDate] = useState<Date | null>(null);

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    if (newDate.getFullYear() >= 2020 && newDate.getFullYear() <= 2120) setViewDate(newDate);
  };

  const onDateClick = (day: number) => {
    setSelectedFullDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  };

  const fetchQrToken = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      const response = await axios.get(`${API_BASE_URL}/visit/qr`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const qrData = response.data.data; 
      if (qrData) setQrToken(qrData);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'QR 코드 발급에 실패했습니다.';
      showResultModal('오류', errorMessage, 'error');
    }
  };

  const isMyRecord = (item: any, myId: number | null, nickname: string): boolean => {
    if (myId !== null && item.memberId !== null && item.memberId !== undefined) {
      return Number(item.memberId) === myId;
    }
    return item.name === nickname || item.nickname === nickname;
  };

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
      
      try {
        const profileRes = await axios.get(`${API_BASE_URL}/members/me`, config);
        const pData = profileRes.data.data;
        if (pData) {
          nickname = pData.nickname || pData.name || '';
          memberId = pData.memberId ?? pData.id ?? null;
          setMyNickname(nickname);
          setMyMemberId(memberId !== null ? Number(memberId) : null);
        }
      } catch (error) { console.error('프로필 로드 실패'); }

      try {
        const noticeResponse = await axios.get(`${API_BASE_URL}/notices`, config);
        const responseData = noticeResponse.data.data;
        const noticeList = Array.isArray(responseData) ? responseData : (responseData?.content || []);

        if (noticeList.length > 0) {
          const importantNotices = noticeList
            .filter((n: any) => n.important)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const normalNotices = noticeList
            .filter((n: any) => !n.important)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const target = importantNotices.length > 0 ? importantNotices[0] : normalNotices[0];
          if (target) {
            setNotice({ title: target.title, content: target.content, important: target.important === true });
          }
        } else {
          setNotice({ title: '현재 등록된 공지가 없습니다.', content: '', important: false });
        }
      } catch (error) { 
        console.error('공지사항 로드 실패:', error);
        setNotice({ title: '공지사항을 불러올 수 없습니다.', content: '', important: false }); 
      }

      try {
        const memResponse = await axios.get(`${API_BASE_URL}/memberships/me`, config);
        const rawData = memResponse.data.data || [];
        const dataList: any[] = Array.isArray(rawData) ? rawData : (rawData?.content || []);

        if (dataList.length > 0) {
          const activeList = dataList.filter((m: any) => m.status === 'ACTIVE' && isStarted(m.startDate));
          const futureList = dataList.filter((m: any) => m.status === 'ACTIVE' && !isStarted(m.startDate));

          if (activeList.length > 0) {
            // ─── 회원권(기간) 목록 ───────────────────────────────────────────
            const periodList = activeList.filter((m: any) => isPeriodTicket(m.membershipType));
            // ─── 일일권(횟수) 목록 ───────────────────────────────────────────
            const countList = activeList.filter((m: any) => !isPeriodTicket(m.membershipType));

            const builtItems: MembershipItem[] = [];

            // 회원권: 각 항목별로 remainingDays 계산 후 추가
            periodList.forEach((m: any) => {
              let remainingDays = 0;
              if (m.endDate) {
                const end = new Date(m.endDate);
                end.setHours(0, 0, 0, 0);
                const diff = Math.round((end.getTime() - getTodayDate().getTime()) / (1000 * 60 * 60 * 24));
                remainingDays = diff > 0 ? diff : 0;
              }
              builtItems.push({
                membershipType: '회원권',
                remainingDays,
                remainingCount: 0,
                startDate: m.startDate || '',
                endDate: m.endDate || '',
                status: '이용중',
              });
            });

            // 일일권: 잔여 횟수 합산해서 하나로 표시
            if (countList.length > 0) {
              const totalCount = countList.reduce((sum: number, m: any) => sum + (m.remainingCount ?? 0), 0);
              builtItems.push({
                membershipType: '일일권',
                remainingDays: 0,
                remainingCount: totalCount,
                startDate: '',
                endDate: '',
                status: '이용중',
              });
            }

            // 대표 이용권 (원형 그래프용): 회원권 우선, 없으면 일일권
            const rep = builtItems[0];

            setMembership({
              items: builtItems,
              hasFuture: futureList.length > 0,
              futureStartDate: futureList.length > 0 ? (futureList.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]?.startDate || '') : '',
              isLoading: false,
              membershipType: rep.membershipType,
              remainingDays: rep.remainingDays,
              remainingCount: rep.remainingCount,
              startDate: rep.startDate,
              endDate: rep.endDate,
              status: rep.status,
            });

          } else if (futureList.length > 0) {
            futureList.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            const topMem = futureList[0];
            setMembership({
              items: [],
              hasFuture: true,
              futureStartDate: topMem.startDate || '',
              isLoading: false,
              membershipType: '시작 예정',
              remainingDays: 0,
              remainingCount: 0,
              startDate: '',
              endDate: '',
              status: '시작 예정',
            });
          } else {
            setMembership(prev => ({ ...prev, items: [], status: '만료', isLoading: false }));
          }
        } else {
          setMembership(prev => ({ ...prev, items: [], hasFuture: false, futureStartDate: '', isLoading: false }));
        }
      } catch (error) { setMembership(prev => ({ ...prev, isLoading: false })); }

      if (nickname || memberId !== null) {
        try {
          const endRes = await axios.get(`${API_BASE_URL}/rankings/endurance/distance`, config);
          const endList = endRes.data.data || [];
          
          let myEndRank = 0, myEndMin = 0, myEndSec = 0;
          const myEndRecord = endList.find((item: any) => isMyRecord(item, memberId, nickname));
          if (myEndRecord) {
            myEndRank = endList.findIndex((item: any) => isMyRecord(item, memberId, nickname)) + 1;
            const totalSec = myEndRecord.timeSeconds || 0;
            myEndMin = Math.floor(totalSec / 60);
            myEndSec = totalSec % 60;
          }

          const [bestRes, historyRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/records/beginner/best`, config).catch(() => null),
            axios.get(`${API_BASE_URL}/records/beginner/history`, config).catch(() => null),
          ]);
          
          let myRealBestRecords: any[] = [];
          [bestRes, historyRes].forEach(res => {
            if (res) {
              const data = res.data.data.content || res.data.data || [];
              if (Array.isArray(data)) myRealBestRecords = [...myRealBestRecords, ...data];
            }
          });

          let bestColor = '없음', bestType = '', bestStatus = '', highestScore = -1;
          myRealBestRecords.forEach((r: any) => {
            const krColor = reverseColorMap[r.difficulty] || r.color;
            if (!krColor) return;
            const colorIdx = colorOrder.indexOf(krColor);
            const maxHoldForColor = MAX_HOLDS[krColor] || 0;
            const isRoundTrip = String(r.attemptType || r.type).toUpperCase().includes('ROUND') || r.isRoundTrip;
            
            let holdCount = r.maxHoldNo ?? r.score ?? 0;
            const isSuccess = r.success === true || r.isSuccess === true; 
            if (isSuccess || holdCount === 0) holdCount = maxHoldForColor;
            
            const score = (colorIdx * 100000) + (isRoundTrip ? 50000 : 0) + Number(holdCount);
            if (score > highestScore) {
              highestScore = score; bestColor = krColor;
              bestType = isRoundTrip ? '왕복' : '편도';
              bestStatus = isSuccess ? '완료' : '진행중';
            }
          });

          setUserStats(prev => ({
            ...prev, difficultyColor: bestColor, difficultyType: bestType, difficultyStatus: bestStatus,
            enduranceRank: myEndRank, enduranceMinutes: myEndMin, enduranceSeconds: myEndSec
          }));
        } catch (error) {}
      }
    } catch (error) { console.error('메인 데이터 로드 에러:', error); }
  };

  const fetchVisitHistory = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      const yearMonth = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
      
      const response = await axios.get(`${API_BASE_URL}/visit/my-history?yearMonth=${yearMonth}`, { 
        headers: { Authorization: `Bearer ${userToken}` } 
      });
      
      const rawData = response.data.data || [];
      const daysAttended = rawData.map((item: any) => parseInt(item.split('-')[2], 10)).filter((d: number) => !isNaN(d));
      
      setAttendedDates(daysAttended);
      if (viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth()) {
        setUserStats(prev => ({ ...prev, monthlyVisits: daysAttended.length }));
      }
    } catch (error) { setAttendedDates([]); }
  };

  useEffect(() => { fetchMainData(); }, []);
  useEffect(() => { fetchVisitHistory(); }, [viewDate.getFullYear(), viewDate.getMonth()]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMainData(), fetchVisitHistory()]);
    setRefreshing(false);
  }, [viewDate]);

  return {
    refreshing, resultModalVisible, resultModalConfig, qrToken, userStats, notice,
    membership, attendedDates, viewDate, selectedFullDate, today,
    setQrToken, fetchQrToken, showResultModal, closeResultModal, changeMonth, onDateClick, onRefresh
  };
};