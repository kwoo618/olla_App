import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// ─────────────────────────── API URLs ───────────────────────────
const RANKING_BEGINNER_URL  = `${API_BASE_URL}/rankings/beginner`;
const RANKING_ENDURANCE_URL = `${API_BASE_URL}/rankings/endurance/distance`;
const RANKING_SERIES_URL    = `${API_BASE_URL}/rankings/series`;
const MY_PROFILE_URL        = `${API_BASE_URL}/members/me`;
const MY_BEGINNER_BEST_URL  = `${API_BASE_URL}/records/beginner/best`;
const PROFILE_API_URL       = `${API_BASE_URL}/members`;

// ─────────────────────────── 헬퍼 / 상수 ───────────────────────────
export const getFullImageUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  return `${domain}${path}`;
};

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

const ENUM_TO_KR: Record<string, string> = {
  WHITE: '흰색', YELLOW: '노랑', GREEN: '초록', BLUE: '파랑',
  RED: '빨강', PURPLE: '보라', ORANGE: '주황', BLACK: '검정',
};

const MAX_HOLDS: Record<string, number> = {
  '흰색': 26, '노랑': 33, '초록': 28, '파랑': 26,
  '빨강': 26, '보라': 25, '주황': 28, '검정': 30,
};

const BASE_SCORES: Record<string, number> = {
  '흰색': 10, '노랑': 20, '주황': 30, '초록': 40,
  '파랑': 50, '빨강': 60, '보라': 70, '검정': 80,
};

const COLOR_ORDER = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];
const BOX_SEQUENCE = [
  '1-1','1-2','1-3','1-4','1-5','1-6',
  '2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10','2-11','2-12',
  '3-1','3-2','3-3','3-4','3-5','3-6',
  '4-1','4-2',
];

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

export const getRankColor = (rank: number): string => {
  if (rank === 1) return '#FFCC00';
  if (rank === 2) return '#C2C2C2';
  if (rank === 3) return '#C0580E';
  return '#666666';
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const translateGender = (gender: string) => {
  if (!gender || gender === '-') return '-';
  const g = String(gender).toUpperCase();
  if (g === 'MALE' || g === 'M') return '남자';
  if (g === 'FEMALE' || g === 'F') return '여자';
  return gender;
};

const extractList = (serverData: any): any[] => {
  if (!serverData) return [];
  if (Array.isArray(serverData)) return serverData;
  if (Array.isArray(serverData.list)) return serverData.list;
  if (Array.isArray(serverData.data)) return serverData.data;
  if (serverData.masters || serverData.challengers)
    return [...(serverData.masters ?? []), ...(serverData.challengers ?? [])];
  return [];
};

const calcBeginnerScore = (colorName: string, isRoundTrip: boolean, holdCount: number): number => {
  const colorIdx = COLOR_ORDER.indexOf(colorName);
  return colorIdx * 100_000 + (isRoundTrip ? 50_000 : 0) + holdCount;
};

const getSectionLabel = (oneWayCount: number, additionalBlocks: number): string => {
  if (oneWayCount === 0 && additionalBlocks === 0) return '0';
  if (additionalBlocks > 0 && additionalBlocks <= BOX_SEQUENCE.length)
    return BOX_SEQUENCE[additionalBlocks - 1];
  return '완주';
};

export const useRanking = (route: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab]   = useState<string>(route?.params?.targetTab ?? '초보벽');
  const [colorTab, setColorTab] = useState<string>('전체');

  const [beginnerRankings,    setBeginnerRankings]    = useState<any[]>([]);
  const [enduranceRankings,   setEnduranceRankings]   = useState<any[]>([]);
  const [consecutiveRankings, setConsecutiveRankings] = useState<any[]>([]);

  const [myNickname,        setMyNickname]        = useState<string>('알 수 없음');
  const [myMemberId,        setMyMemberId]        = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null);

  // 모달 State
  const [isDetailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.70;
  const detailHeightAnim = useRef(new Animated.Value(0)).current;
  const currentDetailSnap = useRef(DETAIL_MODAL_HEIGHT);

  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        detailHeightAnim.setOffset(currentDetailSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
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

  const showAlert = (title: string, message: string) => {
    setAlertConfig({ visible: true, title, message });
  };

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const openDetailModal = async (memberId: number, fallbackName: string) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${PROFILE_API_URL}/${memberId}/profile`, { headers });
      const d = response.data?.data?.data || response.data?.data;
      
      if (!d) { 
        showAlert('프로필 조회 불가', '정보를 불러올 수 없습니다.'); 
        return; 
      }
      
      const detail = d.detail || {};
      
      setSelectedUser({
        name: d.name || fallbackName,
        profileImageUrl: d.profileImageUrl || d.profileImage || null,
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
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    } catch (error: any) {
      showAlert('프로필 조회 오류', error.response?.data?.message || '정보를 불러올 수 없습니다.');
    }
  };

  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => { 
      setDetailVisible(false); 
      setSelectedUser(null); 
    });
  };

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

  const fetchBeginnerRankings = async (userData: any) => {
    try {
      const headers = await getAuthHeader();
      const rankResponses = await Promise.all(
        colors.map(c =>
          axios.get(`${RANKING_BEGINNER_URL}?difficulty=${c.enum}`, { headers })
               .catch(() => ({ data: { data: [] } }))
        )
      );

      let myBestList: any[] = [];
      try {
        const res = await axios.get(MY_BEGINNER_BEST_URL, { headers });
        const raw = res.data?.data?.data || res.data?.data;
        myBestList = Array.isArray(raw) ? raw : (Array.isArray(raw?.list) ? raw.list : []);
      } catch (error: any) {
        console.log('내 초보벽 기록 로드 실패');
      }

      let allData: any[] = [];

      rankResponses.forEach((response, colorIdx) => {
        const currentColor = colors[colorIdx];
        const maxHold      = MAX_HOLDS[currentColor.name] ?? 0;
        const rawList = extractList(response.data?.data?.data || response.data?.data);

        const mappedList = rawList.map((item: any, i: number) => {
          const hasDecimal  = item.score !== undefined && item.score !== null && item.score % 1 !== 0;
          const attemptStr  = String(item.attemptType ?? '').toUpperCase();
          const isRoundTrip = attemptStr === 'ROUND_TRIP' || hasDecimal;

          const rawHold   = item.maxHoldNo !== undefined ? item.maxHoldNo : (item.score !== undefined ? Math.floor(item.score) : undefined);
          const holdCount = (item.success === true || rawHold === undefined || rawHold === null) ? maxHold : Number(rawHold);
          const recordTimeStr = item.recordDate || item.achievedAt;
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
            rawScore:        calcBeginnerScore(currentColor.name, isRoundTrip, holdCount),
            achievedAt:      recordTime,
          };
        });

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

          finalList = finalList.filter(item =>
            userData.id ? Number(item.memberId) !== userData.id : item.name !== userData.nickname
          );

          finalList.push({
            id:              userData.id ?? `my-beginner-${colorIdx}`,
            memberId:        userData.id ?? null,
            name:            userData.nickname,
            profileImageUrl: userData.profileImageUrl,
            colorName:       currentColor.name,
            colorHex:        currentColor.hex,
            type:            isRT ? '왕복' : '편도',
            hold,
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

  const fetchEnduranceRankings = async () => {
    try {
      const headers = await getAuthHeader();
      const res     = await axios.get(RANKING_ENDURANCE_URL, { headers });
      const rawList = extractList(res.data?.data?.data || res.data?.data);

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
        rawRank:         item.ranking      ?? i + 1,
        recordDate:      item.recordDate,
      }));

      setEnduranceRankings(mapped);
    } catch (error: any) {
      console.error('지구력 랭킹 실패');
    }
  };

  const fetchConsecutiveRankings = async () => {
    try {
      const headers = await getAuthHeader();
      const res     = await axios.get(RANKING_SERIES_URL, { headers });
      const rawList = extractList(res.data?.data?.data || res.data?.data);

      const mapped = rawList.map((item: any, i: number) => {
        const colorHexList = (item.sequenceLog ?? []).map((diffEnum: string) => {
          const krName = ENUM_TO_KR[diffEnum] ?? '흰색';
          return colors.find(c => c.name === krName)?.hex ?? '#999999';
        });

        const calculatedScore = (item.sequenceLog ?? []).reduce((acc: number, diffEnum: string, idx: number) => {
          const krName    = ENUM_TO_KR[diffEnum] ?? '흰색';
          const baseScore = BASE_SCORES[krName] ?? 10;
          const multiplier = 1.0 + (idx * 0.1);
          return acc + (baseScore * multiplier);
        }, 0);

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

  const loadAllData = async () => {
    const userData = await fetchMyProfile();
    await Promise.all([
      fetchBeginnerRankings(userData),
      fetchEnduranceRankings(),
      fetchConsecutiveRankings()
    ]);
  };

  useEffect(() => {
    if (route?.params?.targetTab) setMainTab(route.params.targetTab);
  }, [route?.params?.targetTab]);

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  const checkIsMe = (item: any): boolean => {
    if (myMemberId !== null && item.memberId != null) return Number(item.memberId) === myMemberId;
    return item.name === myNickname;
  };

  const filteredList = useMemo(() => {
    let list: any[] = [];

    if (mainTab === '초보벽') {
      list = [...beginnerRankings];
      if (colorTab !== '전체') list = list.filter(r => r.colorName === colorTab);

      const userMap = new Map<string, any>();
      list.forEach(item => {
        const key  = item.memberId != null ? `id_${item.memberId}` : `name_${item.name}`;
        const prev = userMap.get(key);
        if (!prev) {
          userMap.set(key, item);
        } else if (item.rawScore > prev.rawScore) {
          userMap.set(key, item);
        } else if (item.rawScore === prev.rawScore && item.achievedAt < prev.achievedAt) {
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

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      isMe: checkIsMe(item),
    }));
  }, [mainTab, colorTab, beginnerRankings, enduranceRankings, consecutiveRankings, myNickname, myMemberId]);

  const myCurrentRank = filteredList.find(r => r.isMe)?.rank ?? '-';

  return {
    refreshing, onRefresh,
    mainTab, setMainTab,
    colorTab, setColorTab,
    myNickname, myCurrentRank, myProfileImageUrl,
    filteredList,
    isDetailVisible, selectedUser, openDetailModal, closeDetailModal, detailHeightAnim, detailPanResponder,
    alertConfig, setAlertConfig
  };
};