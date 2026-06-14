// ============================================================
// useRanking.ts
// 랭킹 화면에서 사용하는 커스텀 훅
// - 초보벽 / 지구력 / 연속 완등 3가지 탭 랭킹 조회
// - 내 프로필 정보 로드 (닉네임, memberId, 프로필 이미지)
// - 기간권 보유 여부 확인 (일일권/횟수권은 랭킹 접근 불가)
// - 사용자 프로필 상세 모달 (드래그로 닫기 가능)
// - 색상별 탭 필터링 및 점수 계산/정렬
// - pull-to-refresh
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// ── API 엔드포인트 상수 ──
const RANKING_BEGINNER_URL  = `${API_BASE_URL}/rankings/beginner`;       // 초보벽 랭킹
const RANKING_ENDURANCE_URL = `${API_BASE_URL}/rankings/endurance/distance`; // 지구력 랭킹 (거리 기준)
const RANKING_SERIES_URL    = `${API_BASE_URL}/rankings/series`;          // 연속 완등 랭킹
const MY_PROFILE_URL        = `${API_BASE_URL}/members/me`;              // 내 프로필
const MY_BEGINNER_BEST_URL  = `${API_BASE_URL}/records/beginner/best`;   // 내 초보벽 최고 기록
const PROFILE_API_URL       = `${API_BASE_URL}/members`;                 // 다른 사용자 프로필
const MEMBERSHIP_URL        = `${API_BASE_URL}/memberships/me`;          // 내 회원권 목록

// 서버 이미지 상대경로를 절대 URL로 변환
export const getFullImageUrl = (path?: string | null): string | null => {
  if (!path || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

// 난이도 색상 목록 (화면 표시용 한글명 + hex 코드 + 서버 enum 값)
export const colors = [
  { name: '흰색',  hex: '#EAEAEA', enum: 'WHITE'  },
  { name: '노랑',  hex: '#F4D03F', enum: 'YELLOW' },
  { name: '초록',  hex: '#58D68D', enum: 'GREEN'  },
  { name: '파랑',  hex: '#5DADE2', enum: 'BLUE'   },
  { name: '빨강',  hex: '#EC7063', enum: 'RED'    },
  { name: '보라',  hex: '#AF7AC5', enum: 'PURPLE' },
  { name: '주황',  hex: '#F0B27A', enum: 'ORANGE' },
  { name: '검정',  hex: '#000000', enum: 'BLACK'  },
];

// 서버 enum → 한글 색상명 변환 맵
const ENUM_TO_KR: Record<string, string> = {
  WHITE: '흰색', YELLOW: '노랑', GREEN: '초록', BLUE: '파랑',
  RED: '빨강', PURPLE: '보라', ORANGE: '주황', BLACK: '검정',
};

// 색상별 최대 홀드 수 (완등 판정 기준)
const MAX_HOLDS: Record<string, number> = {
  '흰색': 26, '노랑': 33, '초록': 28, '파랑': 26,
  '빨강': 26, '보라': 25, '주황': 28, '검정': 30,
};

// 색상별 연속 완등 기본 점수 (연속 완등 점수 계산에 사용)
const BASE_SCORES: Record<string, number> = {
  '흰색': 10, '노랑': 20, '주황': 30, '초록': 40,
  '파랑': 50, '빨강': 60, '보라': 70, '검정': 80,
};

// 초보벽 점수 계산 시 색상 우선순위 (낮음 → 높음)
const COLOR_ORDER = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];

// 지구력 지도 구간 순서 (추가 블록 수 → 구간 레이블 변환에 사용)
const BOX_SEQUENCE = [
  '1-1','1-2','1-3','1-4','1-5','1-6',
  '2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10','2-11','2-12',
  '3-1','3-2','3-3','3-4','3-5','3-6',
  '4-1','4-2',
];

// 지구력 지도 구간 레이블에 따른 배경 색상 반환
export const getSectionColor = (section: string): string => {
  if (!section || section === '0') return '#FFFFFF';
  if (section.startsWith('1-')) return section === '1-6' ? '#B96BC6' : '#FFFFFF';
  if (section.startsWith('2-')) {
    const n = parseInt(section.split('-')[1], 10);
    if (n <= 4) return '#58CCFF';
    if (n <= 8) return '#3A4CA8';
    return '#692498';
  }
  if (section.startsWith('3-')) return '#666666';
  if (section.startsWith('4-')) return '#343434';
  return '#FFFFFF';
};

// 랭킹 순위에 따른 색상 (1위 금, 2위 은, 3위 동, 나머지 회색)
export const getRankColor = (rank: number): string => {
  if (rank === 1) return '#FFCC00';
  if (rank === 2) return '#C2C2C2';
  if (rank === 3) return '#C0580E';
  return '#666666';
};

// 초 단위를 "MM:SS" 형식 문자열로 변환
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// 서버 성별 enum → 한글 변환 (MALE/M → 남자, FEMALE/F → 여자)
const translateGender = (gender: string) => {
  if (!gender || gender === '-') return '-';
  const g = String(gender).toUpperCase();
  if (g === 'MALE' || g === 'M') return '남자';
  if (g === 'FEMALE' || g === 'F') return '여자';
  return gender;
};

// 서버 응답에서 배열 형태의 랭킹 데이터를 추출하는 유틸
// masters/challengers 필드가 있는 경우 합쳐서 반환
const extractList = (serverData: any): any[] => {
  if (!serverData) return [];
  if (Array.isArray(serverData)) return serverData;
  if (Array.isArray(serverData.list)) return serverData.list;
  if (Array.isArray(serverData.data)) return serverData.data;
  if (serverData.masters || serverData.challengers)
    return [...(serverData.masters ?? []), ...(serverData.challengers ?? [])];
  return [];
};

// 초보벽 점수 계산
// 색상 순서(높을수록 고득점) * 100,000 + 왕복 보너스(50,000) + 홀드 번호
const calcBeginnerScore = (colorName: string, isRoundTrip: boolean, holdCount: number): number => {
  const colorIdx = COLOR_ORDER.indexOf(colorName);
  return colorIdx * 100_000 + (isRoundTrip ? 50_000 : 0) + holdCount;
};

// 지구력 편도 수 + 추가 블록 수 → 구간 레이블 변환
// 완주한 경우 '완주', 추가 블록이 있으면 BOX_SEQUENCE에서 레이블 조회
const getSectionLabel = (oneWayCount: number, additionalBlocks: number): string => {
  if (oneWayCount === 0 && additionalBlocks === 0) return '0';
  if (additionalBlocks > 0 && additionalBlocks <= BOX_SEQUENCE.length)
    return BOX_SEQUENCE[additionalBlocks - 1];
  return '완주';
};

export const useRanking = (route: any) => {
  // null = 아직 확인 중, true/false = 기간권 보유 여부
  const [hasValidMembership, setHasValidMembership] = useState<boolean | null>(null);
  // pull-to-refresh 진행 여부
  const [refreshing, setRefreshing] = useState(false);
  // 현재 선택된 메인 탭 (초보벽 / 지구력 / 연속)
  const [mainTab, setMainTab]   = useState<string>(route?.params?.targetTab ?? '초보벽');
  // 초보벽 탭에서 선택된 색상 필터 (전체 또는 특정 색상)
  const [colorTab, setColorTab] = useState<string>('전체');

  // 각 탭별 원시 랭킹 데이터 (정렬 전)
  const [beginnerRankings,    setBeginnerRankings]    = useState<any[]>([]);
  const [enduranceRankings,   setEnduranceRankings]   = useState<any[]>([]);
  const [consecutiveRankings, setConsecutiveRankings] = useState<any[]>([]);

  // 내 프로필 정보 (랭킹 목록에서 "나" 여부 판별에 사용)
  const [myNickname,        setMyNickname]        = useState<string>('알 수 없음');
  const [myMemberId,        setMyMemberId]        = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null);

  // 사용자 프로필 상세 모달 표시 여부 및 선택된 사용자 데이터
  const [isDetailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  // 일반 알림 다이얼로그 상태 (프로필 조회 실패 등)
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

  // 프로필 상세 모달 높이 (화면 높이의 70%)
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.70;
  // 모달 현재 높이 애니메이션 값
  const detailHeightAnim = useRef(new Animated.Value(0)).current;
  // 현재 스냅 포인트 높이 저장 (드래그 시 기준점으로 사용)
  const currentDetailSnap = useRef(DETAIL_MODAL_HEIGHT);

  // 프로필 모달 드래그 제스처 처리
  // - 위로 드래그: 현재 높이 70% 미만이 되면 모달 닫기
  // - 그 외: 스프링 애니메이션으로 원위치 복귀
  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        // 드래그 시작 시 현재 높이를 offset으로 설정해 연속 드래그 지원
        detailHeightAnim.setOffset(currentDetailSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // 아래로 드래그(양수 dy)만 허용, 위로는 최대 0까지만
        detailHeightAnim.setValue(Math.min(0, -gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        detailHeightAnim.flattenOffset();
        const finalHeight = currentDetailSnap.current - gestureState.dy;
        if (finalHeight < currentDetailSnap.current * 0.7) {
          closeDetailModal();
        } else {
          Animated.spring(detailHeightAnim, { toValue: currentDetailSnap.current, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // 일반 알림 다이얼로그 표시
  const showAlert = (title: string, message: string) => {
    setAlertConfig({ visible: true, title, message });
  };

  // AsyncStorage에서 JWT 토큰을 읽어 Authorization 헤더 객체로 반환
  // 토큰 없으면 빈 객체 반환 (비로그인 허용)
  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 랭킹 접근 가능한 기간권 보유 여부 확인
  // - 일일권(COUNT/횟수/일일 타입)은 제외
  // - 기간권(PERIOD/기간 타입 또는 endDate 있는 것) 중 만료일이 현재 이후인 것이 있으면 true
  const checkRankingMembership = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(MEMBERSHIP_URL, { headers });
      const rawData = res.data.data;
      const memberships: any[] = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);

      let isValid = false;
      for (const m of memberships) {
        if (!m) continue;
        const status = String(m.membershipStatus || m.status || '').toUpperCase();
        // 삭제/비활성 상태 제외
        if (status === 'DELETED' || status === 'INACTIVE') continue;
        if (status !== 'ACTIVE' && status !== '') continue;

        const typeStr = String(m.membershipType ?? '').toUpperCase();

        // 일일권/횟수권은 랭킹 접근 불가 → 건너뜀
        const isCountType =
        typeStr.includes('COUNT') || typeStr.includes('횟수') || typeStr.includes('일일');
        if (isCountType) continue;

        // 기간권이고 만료일이 현재 이후면 유효한 기간권으로 판단
        if (typeStr.includes('PERIOD') || typeStr.includes('기간') || m.endDate) {
          if (m.endDate) {
            const end = new Date(m.endDate);
            end.setHours(23, 59, 59, 999);
            if (end.getTime() >= Date.now()) {
              isValid = true;
              break;
            }
          }
        }
      }
      setHasValidMembership(isValid);
    } catch {
      // 회원권 조회 실패 시 접근 불가로 처리
      setHasValidMembership(false);
    }
  };

  // 다른 사용자의 프로필 상세 조회 후 하단 모달로 표시
  // - API 실패 시 알림 다이얼로그 표시
  // - 성공 시 애니메이션으로 모달 슬라이드 업
  const openDetailModal = async (memberId: number, fallbackName: string) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${PROFILE_API_URL}/${memberId}/profile`, { headers });
      const d = response.data.data;

      if (!d) {
        showAlert('프로필 조회 불가', '정보를 불러올 수 없습니다.');
        return;
      }

      const detail = d.detail || {};

      // 성별 한글 변환, 비공개 항목은 '-'로 표시
      setSelectedUser({
        name: d.name || fallbackName,
        profileImageUrl: d.profileImageUrl || d.profileImage || null,
        gender: translateGender(detail.gender || d.gender || '-'),
        age:    detail.age    || d.age    || '-',
        height: detail.height || d.height || '-',
        weight: detail.weight || d.weight || '-',
        arm:    detail.armSpan  || d.armSpan  || '-',
        shoe:   detail.footSize || d.footSize || '-',
      });

      setDetailVisible(true);
      currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
      detailHeightAnim.setValue(0);
      // 300ms 동안 모달이 아래에서 슬라이드 업
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    } catch (error: any) {
      showAlert('프로필 조회 오류', error.response?.data?.message || '정보를 불러올 수 없습니다.');
    }
  };

  // 프로필 상세 모달 닫기 (슬라이드 다운 후 상태 초기화)
  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setDetailVisible(false);
      setSelectedUser(null);
    });
  };

  // 내 프로필 정보 조회 (닉네임, memberId, 프로필 이미지)
  // 반환값을 초보벽 랭킹 조회 시 "내 기록" 병합에 활용
  const fetchMyProfile = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(MY_PROFILE_URL, { headers });
      const data = res.data.data;

      if (data) {
        const nickname        = data.nickname ?? data.name ?? '알 수 없음';
        const id              = data.memberId ?? data.id ?? null;
        const profileImageUrl = data.profileImageUrl ?? null;
        setMyNickname(nickname);
        setMyProfileImageUrl(profileImageUrl);
        if (id !== null) setMyMemberId(Number(id));
        return { id: id !== null ? Number(id) : null, nickname, profileImageUrl };
      }
    } catch (error: any) {
      console.log('내 프로필 로드 실패:', error.response?.data?.message || error.message);
    }
    return { id: null, nickname: '알 수 없음', profileImageUrl: null };
  };

  // 색상별 초보벽 랭킹 조회 및 내 기록 병합
  // - 8가지 색상 랭킹을 병렬로 요청
  // - 내 최고 기록(MY_BEGINNER_BEST_URL)을 별도 조회 후
  //   서버 랭킹에서 내 항목을 제거하고 최신 내 기록으로 교체 (이중 집계 방지)
  // - 최종 데이터는 setBeginnerRankings로 저장 (색상 모두 합친 배열)
  const fetchBeginnerRankings = async (userData: any) => {
    try {
      const headers = await getAuthHeader();
      // 8가지 색상 랭킹 병렬 요청 (실패해도 빈 배열로 처리)
      const rankResponses = await Promise.all(
        colors.map(c =>
          axios.get(`${RANKING_BEGINNER_URL}?difficulty=${c.enum}`, { headers })
               .catch(() => ({ data: { data: [] } }))
        )
      );

      // 내 최고 기록 별도 조회
      let myBestList: any[] = [];
      try {
        const res = await axios.get(MY_BEGINNER_BEST_URL, { headers });
        const raw = res.data.data;
        myBestList = Array.isArray(raw) ? raw : (Array.isArray(raw?.list) ? raw.list : []);
      } catch (error: any) {
        console.log('내 초보벽 기록 로드 실패');
      }

      let allData: any[] = [];

      rankResponses.forEach((response, colorIdx) => {
        const currentColor = colors[colorIdx];
        const maxHold      = MAX_HOLDS[currentColor.name] ?? 0;
        const rawList = extractList(response.data.data);

        // 서버 랭킹 데이터를 화면 표시용 형태로 변환
        const mappedList = rawList.map((item: any, i: number) => {
          // 소수점이 있으면 왕복(ROUND_TRIP) 기록으로 판단
          const hasDecimal  = item.score !== undefined && item.score !== null && item.score % 1 !== 0;
          const attemptStr  = String(item.attemptType ?? '').toUpperCase();
          const isRoundTrip = attemptStr === 'ROUND_TRIP' || hasDecimal;

          // 완등 시 또는 홀드 정보 없는 경우 최대 홀드 수로 처리
          const rawHold   = item.maxHoldNo !== undefined ? item.maxHoldNo : (item.score !== undefined ? Math.floor(item.score) : undefined);
          const holdCount = (item.success === true || rawHold === undefined || rawHold === null) ? maxHold : Number(rawHold);
          const recordTimeStr = item.recordDate || item.achievedAt;
          // 날짜 없으면 최댓값(정렬 시 후순위)
          const recordTime    = recordTimeStr ? new Date(recordTimeStr).getTime() : 9_999_999_999_999;

          return {
            id:              item.memberId ?? `rank-beginner-${colorIdx}-${i}`,
            memberId:        item.memberId ?? null,
            name:            item.name ?? item.nickname ?? '알 수 없음',
            profileImageUrl: item.profileImageUrl ?? null,
            colorName:       currentColor.name,
            colorHex:        currentColor.hex,
            type:            isRoundTrip ? '왕복' : '편도',
            hold:            holdCount,
            isClear:         holdCount >= maxHold, // MAX_HOLDS 도달 시 완등 처리
            rawScore:        calcBeginnerScore(currentColor.name, isRoundTrip, holdCount),
            achievedAt:      recordTime,
          };
        });

        // 내 최고 기록 중 이 색상에 해당하는 것을 점수 기준으로 선택
        const myRecord = myBestList
          .filter((r: any) => r.difficulty === currentColor.enum)
          .reduce<any>((best, r: any) => {
            const hasDec = r.score !== undefined && r.score !== null && r.score % 1 !== 0;
            const isRT   = String(r.attemptType ?? '').toUpperCase() === 'ROUND_TRIP' || hasDec;
            const rawH   = r.maxHoldNo !== undefined ? r.maxHoldNo : (r.score !== undefined ? Math.floor(r.score) : undefined);
            const hold   = (r.success === true || rawH === undefined || rawH === null) ? maxHold : Number(rawH);
            const score  = calcBeginnerScore(currentColor.name, isRT, hold);
            if (!best || score > best.score) return { score, entry: r };
            return best;
          }, null);

        let finalList = [...mappedList];

        if (myRecord) {
          const r      = myRecord.entry;
          const hasDec = r.score !== undefined && r.score !== null && r.score % 1 !== 0;
          const isRT   = String(r.attemptType ?? '').toUpperCase() === 'ROUND_TRIP' || hasDec;
          const rawH   = r.maxHoldNo !== undefined ? r.maxHoldNo : (r.score !== undefined ? Math.floor(r.score) : undefined);
          const hold   = (r.success === true || rawH === undefined || rawH === null) ? maxHold : Number(rawH);
          const score  = calcBeginnerScore(currentColor.name, isRT, hold);

          // 서버 랭킹에서 내 항목 제거 (id 또는 이름으로 식별)
          finalList = finalList.filter(item =>
            userData.id ? Number(item.memberId) !== userData.id : item.name !== userData.nickname
          );

          // 내 최고 기록을 정확한 정보로 직접 추가
          finalList.push({
            id:              userData.id ?? `my-beginner-${colorIdx}`,
            memberId:        userData.id ?? null,
            name:            userData.nickname,
            profileImageUrl: userData.profileImageUrl,
            colorName:       currentColor.name,
            colorHex:        currentColor.hex,
            type:            isRT ? '왕복' : '편도',
            hold,
            isClear:         hold >= maxHold,
            rawScore:        score,
            achievedAt:      r.recordDate ? new Date(r.recordDate).getTime() : Date.now(),
          });
        }

        allData = [...allData, ...finalList];
      });

      setBeginnerRankings(allData);
    } catch (error: any) {
      console.error('초보벽 랭킹 실패');
    }
  };

  // 지구력 랭킹 조회 (거리 기준, 서버에서 이미 정렬된 상태)
  // - 편도 수(laps), 시간(time), 구간 레이블(section), 총점(totalScore) 변환
  const fetchEnduranceRankings = async () => {
    try {
      const headers = await getAuthHeader();
      const res     = await axios.get(RANKING_ENDURANCE_URL, { headers });
      const rawList = extractList(res.data.data);

      const mapped = rawList.map((item: any, i: number) => ({
        id:              item.memberId ?? `rank-endurance-${i}`,
        memberId:        item.memberId ?? null,
        name:            item.name ?? item.nickname ?? '알 수 없음',
        profileImageUrl: item.profileImageUrl ?? null,
        laps:            item.oneWayCount  ?? 0,
        timeSeconds:     item.timeSeconds  ?? 0,
        time:            formatTime(item.timeSeconds ?? 0),
        section:         getSectionLabel(item.oneWayCount ?? 0, item.additionalBlocks ?? 0),
        totalScore:      item.totalScore   ?? 0,
        rawRank:         item.ranking      ?? i + 1, // 서버 순위 우선, 없으면 배열 순서
        recordDate:      item.recordDate,
      }));

      setEnduranceRankings(mapped);
    } catch (error: any) {
      console.error('지구력 랭킹 실패');
    }
  };

  // 연속 완등 랭킹 조회
  // - sequenceLog(완등 색상 순서 배열)를 hex 색상 배열로 변환
  // - 점수 = Σ (색상 기본점수 * (1.0 + 인덱스 * 0.1)) → 연속할수록 점수 증가
  const fetchConsecutiveRankings = async () => {
    try {
      const headers = await getAuthHeader();
      const res     = await axios.get(RANKING_SERIES_URL, { headers });
      const rawList = extractList(res.data.data);

      const mapped = rawList.map((item: any, i: number) => {
        // sequenceLog의 enum 값을 hex 색상으로 변환 (화면에 색상 칩으로 표시)
        const colorHexList = (item.sequenceLog ?? []).map((diffEnum: string) => {
          const krName = ENUM_TO_KR[diffEnum] ?? '흰색';
          return colors.find(c => c.name === krName)?.hex ?? '#999999';
        });

        // 연속 완등 점수 계산: 뒤에 이을수록 10% 씩 배수 증가
        const calculatedScore = (item.sequenceLog ?? []).reduce((acc: number, diffEnum: string, idx: number) => {
          const krName    = ENUM_TO_KR[diffEnum] ?? '흰색';
          const baseScore = BASE_SCORES[krName] ?? 10;
          const multiplier = 1.0 + (idx * 0.1);
          return acc + (baseScore * multiplier);
        }, 0);

        // 소수점 첫째 자리까지 반올림, 서버 점수가 있으면 보완용으로 활용
        const displayScore = Math.round(calculatedScore * 10) / 10;
        const finalScore   = displayScore > 0 ? displayScore : (item.score ?? item.totalScore ?? 0);

        return {
          id:              item.memberId ?? item.id ?? `rank-series-${i}`,
          memberId:        item.memberId ?? null,
          name:            item.name ?? item.nickname ?? '알 수 없음',
          profileImageUrl: item.profileImageUrl ?? null,
          colors:          colorHexList,
          score:           finalScore,
          recordDate:      item.recordDate,
        };
      });

      setConsecutiveRankings(mapped);
    } catch (error: any) {
      console.error('연속 랭킹 실패');
    }
  };

  // 모든 데이터 한꺼번에 로드 (내 프로필 → 나머지 병렬)
  // 내 프로필을 먼저 받아야 초보벽 랭킹에서 "내 기록" 병합이 가능
  const loadAllData = async () => {
    const userData = await fetchMyProfile();
    await Promise.all([
      checkRankingMembership(),
      fetchBeginnerRankings(userData),
      fetchEnduranceRankings(),
      fetchConsecutiveRankings(),
    ]);
  };

  // 외부에서 targetTab 파라미터를 받으면 해당 탭으로 전환 (딥링크 등)
  useEffect(() => {
    if (route?.params?.targetTab) setMainTab(route.params.targetTab);
  }, [route?.params?.targetTab]);

  // 컴포넌트 마운트 시 전체 데이터 최초 로드
  useEffect(() => {
    loadAllData();
  }, []);

  // pull-to-refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  // 랭킹 항목이 "나"인지 판별
  // - memberId 있으면 id 비교 우선, 없으면 닉네임 비교
  const checkIsMe = (item: any): boolean => {
    if (myMemberId !== null && item.memberId != null) return Number(item.memberId) === myMemberId;
    return item.name === myNickname;
  };

  // 현재 탭/필터 조건에 맞게 랭킹 목록을 가공하는 메모이즈된 값
  // - 초보벽: 색상 필터 → 사용자별 최고 기록만 남기기 → 점수/날짜 정렬
  // - 지구력: 서버 rawRank 순 → 총점 보조 정렬
  // - 연속: 점수 내림차순
  // 최종 결과에 rank(1부터), isMe 필드 추가
  const filteredList = useMemo(() => {
    let list: any[] = [];

    if (mainTab === '초보벽') {
      list = [...beginnerRankings];
      // 색상 필터 적용 (전체일 경우 생략)
      if (colorTab !== '전체') list = list.filter(r => r.colorName === colorTab);

      // 사용자별 최고 기록만 남기기 (동일 사용자의 여러 색상 기록 중 점수 최고)
      const userMap = new Map<string, any>();
      list.forEach(item => {
        const key  = item.memberId != null ? `id_${item.memberId}` : `name_${item.name}`;
        const prev = userMap.get(key);
        if (!prev) {
          userMap.set(key, item);
        } else if (item.rawScore > prev.rawScore) {
          // 더 높은 점수면 교체
          userMap.set(key, item);
        } else if (item.rawScore === prev.rawScore && item.achievedAt < prev.achievedAt) {
          // 같은 점수면 더 먼저 달성한 기록을 우선
          userMap.set(key, item);
        }
      });
      list = Array.from(userMap.values());
      list.sort((a, b) => b.rawScore !== a.rawScore ? b.rawScore - a.rawScore : a.achievedAt - b.achievedAt);

    } else if (mainTab === '지구력') {
      list = [...enduranceRankings];
      list.sort((a, b) => a.rawRank !== b.rawRank ? a.rawRank - b.rawRank : b.totalScore - a.totalScore);
    } else if (mainTab === '연속') {
      list = [...consecutiveRankings];
      list.sort((a, b) => b.score - a.score);
    }

    // 각 항목에 화면 표시용 순위(rank)와 "나"여부(isMe) 추가
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      isMe: checkIsMe(item),
    }));
  }, [mainTab, colorTab, beginnerRankings, enduranceRankings, consecutiveRankings, myNickname, myMemberId]);

  // 현재 필터 기준으로 내 순위 (없으면 '-' 표시)
  const myCurrentRank = filteredList.find(r => r.isMe)?.rank ?? '-';

  return {
    hasValidMembership,
    refreshing, onRefresh,
    mainTab, setMainTab,
    colorTab, setColorTab,
    myNickname, myCurrentRank, myProfileImageUrl,
    filteredList,
    isDetailVisible, selectedUser, openDetailModal, closeDetailModal, detailHeightAnim, detailPanResponder,
    alertConfig, setAlertConfig,
  };
};