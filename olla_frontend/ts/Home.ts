// ============================================================
// HomeData.ts
// 홈 화면에서 사용하는 커스텀 훅
// - 이용권(회원권/일일권) 상태 조회
// - QR 코드 발급
// - 공지사항 조회
// - 출석 기록 조회 및 달력 표시
// - 난이도/지구력 랭킹 기록 조회
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getQrToken, getMyProfile, getNotices, getMyMemberships, getMyVisitHistory,
} from '../src/constants/api/member';
import { getEnduranceDistanceRanking } from '../src/constants/api/ranking'
import { getBeginnerBestRecords, getBeginnerHistory } from '../src/constants/api/record'

// 색상별 최대 홀드 수 (난이도 기록 계산에 사용)
const MAX_HOLDS: { [key: string]: number } = { 
  "흰색": 26, "노랑": 33, "초록": 28, "파랑": 26, "빨강": 26, "보라": 25, "주황": 28, "검정": 30
};

// 난이도 색상 정렬 순서 (낮음 → 높음)
const colorOrder = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];

// 서버 영문 색상 코드 → 한글 변환 맵
const reverseColorMap: { [key: string]: string } = {
  "WHITE": "흰색", "YELLOW": "노랑", "ORANGE": "주황", "GREEN": "초록",
  "BLUE": "파랑", "RED": "빨강", "PURPLE": "보라", "BLACK": "검정"
};

// 오늘 날짜 00:00:00 기준의 Date 객체 반환
const getTodayDate = () => { 
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// 회원권의 시작일이 오늘 이전인지 확인 (시작일 없으면 시작된 것으로 간주)
const isStarted = (startDate: string): boolean => {
  if (!startDate) return true;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return start <= getTodayDate();
};

// 기간권 여부 판단 (PERIOD / 회원권 / 기간 키워드 포함 시 기간권)
const isPeriodTicket = (typeStr: string) => {
  const s = String(typeStr || '').toUpperCase();
  return s === 'PERIOD' || s.includes('회원권') || s.includes('기간');
};

// ─── 개별 이용권 타입 ─────────────────────────────────────────────────────────
export type MembershipItem = {
  membershipType: '회원권' | '일일권' | '시작 예정';
  remainingDays: number;   // 기간권: 남은 일수
  remainingCount: number;  // 일일권: 남은 횟수
  startDate: string;
  endDate: string;
  status: string;
};

// 홈 화면 이용권 전체 상태 타입
export type MembershipState = {
  items: MembershipItem[];          // 보유 중인 이용권 목록 (복수 보유 가능)
  hasFuture: boolean;               // 시작 예정인 이용권 존재 여부
  futureStartDate: string;          // 시작 예정 이용권의 시작일
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
  // pull-to-refresh 상태
  const [refreshing, setRefreshing] = useState(false);

  // QR 코드 토큰 (출석 체크용)
  const [qrToken, setQrToken] = useState<string | null>(null);

  // 결과 안내 모달 상태
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  // 로그인 사용자 권한 (ADMIN / USER 등)
  const [userRole, setUserRole] = useState<string | null>(null);
  // 로그인 사용자 닉네임
  const [myNickname, setMyNickname] = useState('');
  // 로그인 사용자 id
  const [myMemberId, setMyMemberId] = useState<number | null>(null);

  // 홈 화면에 표시되는 사용자 활동 통계
  const [userStats, setUserStats] = useState({
    monthlyVisits: 0,          // 이번 달 방문 횟수
    difficultyColor: '없음',    // 최고 도달 난이도 색상
    difficultyType: '',         // 왕복 / 편도
    difficultyStatus: '',       // 완료 / 진행중
    enduranceRank: 0,           // 지구력 랭킹 순위
    enduranceMinutes: 0,        // 지구력 기록 (분)
    enduranceSeconds: 0,        // 지구력 기록 (초)
  });

  // 홈에 표시할 공지사항 (중요 공지 우선, 최신순)
  const [notice, setNotice] = useState({
    title: '공지사항을 불러오는 중...',
    content: '',
    important: false,
  });

  // 이용권 상태 (초기값: 로딩 중)
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

  // 출석 체크한 날짜의 일(day) 숫자 배열 (달력 표시용)
  const [attendedDates, setAttendedDates] = useState<number[]>([]);
  const today = new Date();

  // 달력에서 현재 보고 있는 월 (기본: 오늘)
  const [viewDate, setViewDate] = useState(new Date());
  // 달력에서 클릭해서 선택한 날짜
  const [selectedFullDate, setSelectedFullDate] = useState<Date | null>(null);

  // 결과 모달 열기
  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // 결과 모달 닫기 + onConfirm 실행
  const closeResultModal = () => {
    setResultModalVisible(false);
    if (typeof resultModalConfig.onConfirm === 'function') {
      resultModalConfig.onConfirm();
    }
  };

  // 달력 월 이동 (offset: +1이면 다음 달, -1이면 이전 달)
  // 2020년~2120년 범위로 제한
  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    if (newDate.getFullYear() >= 2020 && newDate.getFullYear() <= 2120) setViewDate(newDate);
  };

  // 달력에서 날짜 클릭 시 selectedFullDate 업데이트
  const onDateClick = (day: number) => {
    setSelectedFullDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  };

  // 출석 체크용 QR 토큰 발급 API 호출
  const fetchQrToken = async () => {
    try {
      const response = await getQrToken();
      const qrData = response.data.data; 
      if (qrData) setQrToken(qrData);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'QR 코드 발급에 실패했습니다.';
      showResultModal('오류', errorMessage, 'error');
    }
  };

  // 랭킹/기록 목록에서 내 항목인지 확인
  // - id 비교 우선, id 없으면 이름/닉네임으로 대조
  const isMyRecord = (item: any, myId: number | null, nickname: string): boolean => {
    if (myId !== null && item.memberId !== null && item.memberId !== undefined) {
      return Number(item.memberId) === myId;
    }
    return item.name === nickname || item.nickname === nickname;
  };

  // 홈 화면 메인 데이터 로드 (프로필, 공지, 이용권, 랭킹, 난이도 기록)
  const fetchMainData = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        // 비로그인: 이용권 로딩 종료만 처리
        setMembership(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const storedRole = await AsyncStorage.getItem('userRole');
      setUserRole(storedRole);
      const config = { headers: { Authorization: `Bearer ${userToken}` } };

      let nickname = '';
      let memberId: number | null = null;
      
      // 내 프로필 조회
      try {
        const profileRes = await getMyProfile();
        const pData = profileRes.data.data;
        if (pData) {
          nickname = pData.nickname || pData.name || '';
          memberId = pData.memberId ?? pData.id ?? null;
          setMyNickname(nickname);
          setMyMemberId(memberId !== null ? Number(memberId) : null);
        }
      } catch (error) { console.error('프로필 로드 실패'); }

      // 공지사항 조회 (중요 공지 우선, 없으면 최신 공지 1건)
      try {
        const noticeResponse = await getNotices();
        const responseData = noticeResponse.data.data;
        const noticeList = Array.isArray(responseData) ? responseData : (responseData?.content || []);

        if (noticeList.length > 0) {
          // 중요 공지 최신순 / 일반 공지 최신순 정렬
          const importantNotices = noticeList
            .filter((n: any) => n.important)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const normalNotices = noticeList
            .filter((n: any) => !n.important)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          // 중요 공지가 있으면 최신 중요 공지, 없으면 최신 일반 공지
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

      // 이용권 상태 조회
      try {
        const memResponse = await getMyMemberships();
        const rawData = memResponse.data.data || [];
        const dataList: any[] = Array.isArray(rawData) ? rawData : (rawData?.content || []);

        if (dataList.length > 0) {
          // 이미 시작된 활성 이용권과 아직 시작 안 된 예정 이용권 분리
          const activeList = dataList.filter((m: any) => m.status === 'ACTIVE' && isStarted(m.startDate));
          const futureList = dataList.filter((m: any) => m.status === 'ACTIVE' && !isStarted(m.startDate));

          if (activeList.length > 0) {
            // 기간권(회원권)과 일일권(횟수권) 분리
            const periodList = activeList.filter((m: any) => isPeriodTicket(m.membershipType));
            const countList = activeList.filter((m: any) => !isPeriodTicket(m.membershipType));

            const builtItems: MembershipItem[] = [];

            // 기간권: 각 항목별 남은 일수 계산 후 MembershipItem으로 추가
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

            // 일일권: 여러 개를 하나로 합산해서 표시 (잔여 횟수 합계)
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

            // 대표 이용권: 목록의 첫 번째 (기간권 우선으로 push했으므로 자동으로 기간권 우선)
            const rep = builtItems[0];

            setMembership({
              items: builtItems,
              hasFuture: futureList.length > 0,
              // 시작 예정 이용권들 중 가장 빨리 시작하는 것의 시작일
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
            // 활성 이용권은 없지만 시작 예정 이용권이 있는 경우
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
            // 모든 이용권이 만료된 상태
            setMembership(prev => ({ ...prev, items: [], status: '만료', isLoading: false }));
          }
        } else {
          // 이용권 자체가 없는 상태
          setMembership(prev => ({ ...prev, items: [], hasFuture: false, futureStartDate: '', isLoading: false }));
        }
      } catch (error) { setMembership(prev => ({ ...prev, isLoading: false })); }

      // 랭킹 및 난이도 기록 조회 (프로필 로드 성공 시에만)
      if (nickname || memberId !== null) {
        try {
          // 지구력 랭킹 (거리 기준) 조회
          const endRes = await getEnduranceDistanceRanking();
          const endList = endRes.data.data || [];
          
          let myEndRank = 0, myEndMin = 0, myEndSec = 0;
          const myEndRecord = endList.find((item: any) => isMyRecord(item, memberId, nickname));
          if (myEndRecord) {
            // 랭킹 순위 = 배열 인덱스 + 1
            myEndRank = endList.findIndex((item: any) => isMyRecord(item, memberId, nickname)) + 1;
            const totalSec = myEndRecord.timeSeconds || 0;
            myEndMin = Math.floor(totalSec / 60);
            myEndSec = totalSec % 60;
          }

          // 4-2. 난이도 기록 조회 (최고 기록 + 히스토리 병렬 요청)
          const [bestRes, historyRes] = await Promise.all([
            getBeginnerBestRecords().catch(() => null),
            getBeginnerHistory().catch(() => null),
          ]);
          
          let myRealBestRecords: any[] = [];
          // 두 API 결과 합치기 (어느 쪽이든 있으면 사용)
          [bestRes, historyRes].forEach(res => {
            if (res) {
              const data = res.data.data.content || res.data.data || [];
              if (Array.isArray(data)) myRealBestRecords = [...myRealBestRecords, ...data];
            }
          });

          // 가장 높은 난이도 기록 산출
          // 점수 = (색상 순서 * 100000) + (왕복이면 +50000) + 홀드 번호
          // → 이 점수가 가장 높은 기록이 "최고 난이도"
          let bestColor = '없음', bestType = '', bestStatus = '', highestScore = -1;
          myRealBestRecords.forEach((r: any) => {
            const krColor = reverseColorMap[r.difficulty] || r.color;
            if (!krColor) return;
            const colorIdx = colorOrder.indexOf(krColor);
            const maxHoldForColor = MAX_HOLDS[krColor] || 0;
            const isRoundTrip = String(r.attemptType || r.type).toUpperCase().includes('ROUND') || r.isRoundTrip;
            
            let holdCount = r.maxHoldNo ?? r.score ?? 0;
            // 완료한 기록은 홀드 수를 최대치로 처리
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

  // 출석 기록 조회 (현재 보고 있는 월 기준)
  // - yearMonth 파라미터로 해당 월의 출석 날짜 목록을 받아옴
  // - 오늘이 속한 달이면 이번 달 방문 횟수도 업데이트
  const fetchVisitHistory = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      // "YYYY-MM" 형식으로 변환
      const yearMonth = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
      
      const response = await getMyVisitHistory(yearMonth);
      
      const rawData = response.data.data || [];
      // 날짜 문자열(YYYY-MM-DD)에서 일(day) 숫자만 추출
      const daysAttended = rawData.map((item: any) => parseInt(item.split('-')[2], 10)).filter((d: number) => !isNaN(d));
      
      setAttendedDates(daysAttended);
      // 보고 있는 달이 현재 달과 같으면 이번 달 방문 횟수 업데이트
      if (viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth()) {
        setUserStats(prev => ({ ...prev, monthlyVisits: daysAttended.length }));
      }
    } catch (error) { setAttendedDates([]); }
  };

  // 컴포넌트 마운트 시 메인 데이터 최초 로드
  useEffect(() => { fetchMainData(); }, []);

  // viewDate(달력 월)가 바뀔 때마다 해당 월의 출석 기록 재조회
  useEffect(() => { fetchVisitHistory(); }, [viewDate.getFullYear(), viewDate.getMonth()]);

  // pull-to-refresh: 메인 데이터 + 출석 기록 동시 재조회
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMainData(), fetchVisitHistory()]);
    setRefreshing(false);
  }, [viewDate]);

  // 훅 사용 컴포넌트에 노출할 상태와 함수들 반환
  return {
    refreshing, resultModalVisible, resultModalConfig, qrToken, userStats, notice,
    membership, attendedDates, viewDate, selectedFullDate, today,
    setQrToken, fetchQrToken, showResultModal, closeResultModal, changeMonth, onDateClick, onRefresh
  };
};