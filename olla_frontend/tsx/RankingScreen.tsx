import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// ─────────────────────────── API URLs ───────────────────────────
const RANKING_BEGINNER_URL      = `${API_BASE_URL}/rankings/beginner`;
const RANKING_ENDURANCE_URL     = `${API_BASE_URL}/rankings/endurance/distance`;
const RANKING_SERIES_URL        = `${API_BASE_URL}/rankings/series`;
const MY_PROFILE_URL            = `${API_BASE_URL}/members/me`;
const MY_BEGINNER_BEST_URL      = `${API_BASE_URL}/records/beginner/best`;

// ─────────────────────────── Axios 인터셉터 ───────────────────────────
axios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error('토큰 가져오기 실패:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────── 상수 ───────────────────────────
const colors = [
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

// ─────────────────────────── 타입 ───────────────────────────
interface BeginnerRecord {
  id: number;
  difficulty: string;
  attemptType: string;
  maxHoldNo?: number;
  score?: number;
  recordDate: string;
  success: boolean;
}

interface EnduranceRankItem {
  id: number;
  memberId?: number;
  name?: string;
  nickname?: string;
  profileImageUrl?: string;
  oneWayCount: number;
  additionalBlocks: number;
  timeSeconds: number;
  totalScore?: number;
  recordDate: string;
  ranking?: number;
}

interface SeriesRankItem {
  id: number;
  memberId?: number;
  name?: string;
  nickname?: string;
  profileImageUrl?: string;
  sequenceLog: string[];
  totalScore?: number;
  score?: number;
  recordDate: string;
}

// ─────────────────────────── 헬퍼 ───────────────────────────
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

const getSectionColor = (section: string): string => {
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

const getRankColor = (rank: number): string => {
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

// ─────────────────────────── 프로필 이미지 컴포넌트 ───────────────────────────
const ProfileImage = ({ uri, style }: { uri?: string | null; style: any }) => {
  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }
  return <Image source={require('../assets/profile.png')} style={style} />;
};

// ─────────────────────────── 컴포넌트 ───────────────────────────
const RankingScreen = ({ route }: any) => {
  const [refreshing, setRefreshing] = useState(false);

  const loadAllData = async () => {
    const userData = await fetchMyProfile();
    await Promise.all([
      fetchBeginnerRankings(userData),
      fetchEnduranceRankings(),
      fetchConsecutiveRankings()
    ]);
  };

  const [mainTab, setMainTab]   = useState<string>(route?.params?.targetTab ?? '초보벽');
  const [colorTab, setColorTab] = useState<string>('전체');

  const [beginnerRankings,    setBeginnerRankings]    = useState<any[]>([]);
  const [enduranceRankings,   setEnduranceRankings]   = useState<any[]>([]);
  const [consecutiveRankings, setConsecutiveRankings] = useState<any[]>([]);

  const [myNickname,        setMyNickname]        = useState<string>('알 수 없음');
  const [myMemberId,        setMyMemberId]        = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null);

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

  // ── 내 프로필 ──
  const fetchMyProfile = async (): Promise<{ id: number | null; nickname: string; profileImageUrl: string | null }> => {
    try {
      const res = await axios.get(MY_PROFILE_URL);
      const data = res.data?.data?.data;

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

  // ── 초보벽 랭킹 ──
  const fetchBeginnerRankings = async (userData: { id: number | null; nickname: string; profileImageUrl: string | null }) => {
    try {
      const rankResponses = await Promise.all(
        colors.map(c =>
          axios.get(`${RANKING_BEGINNER_URL}?difficulty=${c.enum}`)
               .catch(() => ({ data: { data: [] } }))
        )
      );

      let myBestList: BeginnerRecord[] = [];
      try {
        const res = await axios.get(MY_BEGINNER_BEST_URL);
        const raw = res.data?.data?.data;
        myBestList = Array.isArray(raw) ? raw : (Array.isArray(raw?.list) ? raw.list : []);
      } catch (error: any) {
        console.log('내 초보벽 베스트 기록 로드 실패:', error.response?.data?.message || error.message);
      }

      let allData: any[] = [];

      rankResponses.forEach((response, colorIdx) => {
        const currentColor = colors[colorIdx];
        const maxHold      = MAX_HOLDS[currentColor.name] ?? 0;

        const rawList = extractList(response.data?.data?.data);

        const mappedList = rawList.map((item: any, i: number) => {
          const hasDecimal  = item.score !== undefined && item.score !== null && item.score % 1 !== 0;
          const attemptStr  = String(item.attemptType ?? '').toUpperCase();
          const isRoundTrip = attemptStr === 'ROUND_TRIP' || hasDecimal;

          const rawHold   = item.maxHoldNo !== undefined ? item.maxHoldNo : (item.score !== undefined ? Math.floor(item.score) : undefined);
          const holdCount = (item.success === true || rawHold === undefined || rawHold === null)
            ? maxHold
            : Number(rawHold);

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
          .filter(r => r.difficulty === currentColor.enum)
          .reduce<{ score: number; entry: any } | null>((best, r) => {
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
          const r      = myRecord.entry as BeginnerRecord;
          const hasDec = r.score !== undefined && r.score !== null && r.score % 1 !== 0;
          const isRT   = String(r.attemptType ?? '').toUpperCase() === 'ROUND_TRIP' || hasDec;
          const rawH   = r.maxHoldNo !== undefined ? r.maxHoldNo : (r.score !== undefined ? Math.floor(r.score) : undefined);
          const hold   = (r.success === true || rawH === undefined || rawH === null) ? maxHold : Number(rawH);
          const score  = calcBeginnerScore(currentColor.name, isRT, hold);

          finalList = finalList.filter(item =>
            userData.id
              ? Number(item.memberId) !== userData.id
              : item.name !== userData.nickname
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
      console.error('초보벽 랭킹 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  // ── 지구력 랭킹 ──
  const fetchEnduranceRankings = async () => {
    try {
      const res     = await axios.get(RANKING_ENDURANCE_URL);
      const rawList = extractList(res.data?.data?.data);

      const mapped = rawList.map((item: EnduranceRankItem, i: number) => ({
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
      console.error('지구력 랭킹 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  // ── 연속 완등 랭킹 ──
  const fetchConsecutiveRankings = async () => {
    try {
      const res     = await axios.get(RANKING_SERIES_URL);
      const rawList = extractList(res.data?.data?.data);

      const mapped = rawList.map((item: SeriesRankItem, i: number) => {
        const colorHexList = (item.sequenceLog ?? []).map(diffEnum => {
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
      console.error('연속 완등 랭킹 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  // ── 내 항목 여부 판별 ──
  const checkIsMe = (item: any): boolean => {
    if (myMemberId !== null && item.memberId != null)
      return Number(item.memberId) === myMemberId;
    return item.name === myNickname;
  };

  // ── 필터링 & 정렬 ──
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

      list.sort((a, b) =>
        b.rawScore !== a.rawScore
          ? b.rawScore - a.rawScore
          : a.achievedAt - b.achievedAt
      );

    } else if (mainTab === '지구력') {
      list = [...enduranceRankings];
      list.sort((a, b) =>
        a.rawRank !== b.rawRank ? a.rawRank - b.rawRank : b.totalScore - a.totalScore
      );

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

  // ─────────────────────────── 렌더 ───────────────────────────
  return (
    <View style={styles.background}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
      >

        {/* 내 랭킹 카드 */}
        <View style={styles.myRankingWrapper}>
          <View style={styles.myRankingCard}>
            <View style={styles.myRankingContent}>
              <View style={styles.myRankingLeft}>
                <ProfileImage uri={myProfileImageUrl} style={styles.myProfileImg} />
                <View>
                  <Text style={styles.myNameText}>{myNickname}</Text>
                  <Text style={styles.myRankSubText}>{mainTab} 나의 순위</Text>
                </View>
              </View>
              <View style={styles.myRankingRight}>
                <Text style={styles.myRankNumText}>{myCurrentRank}</Text>
                <Text style={styles.myRankUnitText}>위</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 메인 탭 */}
        <View style={styles.mainTabContainer}>
          {(['초보벽', '지구력', '연속'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.mainTabButton, mainTab === tab && styles.activeMainTab]}
              onPress={() => setMainTab(tab)}
            >
              <Text style={[styles.mainTabText, mainTab === tab && styles.activeMainTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 색상 탭 (초보벽 전용) */}
        {mainTab === '초보벽' && (
          <View style={styles.colorTabRow}>
            <TouchableOpacity
              style={[
                styles.colorBtn,
                { borderColor: '#A1BE44' },
                colorTab === '전체' && { backgroundColor: '#A1BE44', borderWidth: 1.5 }
              ]}
              onPress={() => setColorTab('전체')}
            >
              <Text style={[
                styles.colorBtnTextGray,
                colorTab === '전체' && {
                  color: '#ffffff',
                  textShadowColor: 'rgba(0, 0, 0, 0.7)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2
                }
              ]}>
                전체
              </Text>
            </TouchableOpacity>

            {colors.map(c => {
              const isSelected = colorTab === c.name;
              return (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    styles.colorBtn,
                    { borderColor: c.hex },
                    isSelected && { backgroundColor: c.hex, borderWidth: 1.5 }
                  ]}
                  onPress={() => setColorTab(c.name)}
                >
                  <Text style={[
                    styles.colorBtnText,
                    { color: c.name === '검정' ? '#ffffff' : c.hex },
                    isSelected && {
                      color: '#ffffff',
                      textShadowColor: 'rgba(0, 0, 0, 0.7)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2
                    }
                  ]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 랭킹 목록 */}
        <View style={styles.rankingListContainer}>
          {filteredList.length === 0 ? (
            <Text style={styles.emptyText}>랭킹 데이터가 없습니다.</Text>
          ) : (
            filteredList.map((item, index) => (
              <View
                key={`rank-${mainTab}-${item.id}-${index}`}
                style={[styles.rankItemCard, item.isMe && styles.myRankItemHighlight]}
              >
                {/* 순위 원 */}
                <View style={[styles.rankCircle, { borderColor: getRankColor(item.rank) }]}>
                  <Text style={[styles.rankNumberText, { color: getRankColor(item.rank) }]}>{item.rank}</Text>
                </View>

                {/* 프로필 + 이름 */}
                <View style={styles.rankCenter}>
                  <ProfileImage uri={item.profileImageUrl} style={styles.rankProfileImg} />
                  <Text style={styles.rankNameText}>{item.name}</Text>
                </View>

                {/* 우측 정보 */}
                <View style={styles.rankRight}>
                  {mainTab === '연속' && (
                    <>
                      <View style={styles.consecutiveColorsRow}>
                        {item.colors.map((hex: string, idx: number) => (
                          <View key={idx} style={[styles.miniColorCircle, { backgroundColor: hex }]} />
                        ))}
                      </View>
                      <Text style={styles.consecutiveScoreText}>{item.score}점</Text>
                    </>
                  )}

                  {mainTab === '지구력' && (
                    <>
                      <Text style={styles.enduranceLapsText}>편도 {item.laps}회</Text>
                      <Text style={styles.enduranceTimeText}>{item.time}</Text>
                      <View style={styles.enduranceSectionRow}>
                        {item.laps % 2 !== 0 && (
                          <Text style={[styles.enduranceSectionArrow, { color: getSectionColor(item.section) }]}>← </Text>
                        )}
                        <Text style={[styles.enduranceSectionText, { color: getSectionColor(item.section) }]}>{item.section}</Text>
                        {item.laps % 2 === 0 && (
                          <Text style={[styles.enduranceSectionArrow, { color: getSectionColor(item.section) }]}> →</Text>
                        )}
                      </View>
                    </>
                  )}

                  {mainTab === '초보벽' && (
                    <>
                      <Text style={[styles.rankTypeText, { color: item.type === '왕복' ? '#0058CC' : '#FF2528' }]}>
                        {item.type}
                      </Text>
                      <View style={styles.rankInfoBottomRow}>
                        <Text style={[styles.rankColorText, { color: item.colorHex === '#000000' ? '#FFFFFF' : item.colorHex }]}>
                          {item.colorName}
                        </Text>
                        <Text style={styles.rankHoldText}>{item.hold}번</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
};

// ─────────────────────────── 스타일 (글씨 크기 확대) ───────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },

  myRankingWrapper: { marginBottom: 20, marginTop: 10 },
  myRankingCard: { height: 110, borderRadius: 16, borderWidth: 1, borderColor: '#718A26', backgroundColor: '#5E731F', justifyContent: 'center' },
  myRankingContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25 },
  myRankingLeft: { flexDirection: 'row', alignItems: 'center' },
  myProfileImg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#444444', marginRight: 15 },
  myNameText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  myRankSubText: { color: '#EBEBEB', fontSize: 15, fontWeight: '500' },
  myRankingRight: { flexDirection: 'row', alignItems: 'baseline' },
  myRankNumText: { color: '#A1BE44', fontSize: 48, fontWeight: '900', marginRight: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
  myRankUnitText: { color: '#EBEBEB', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },

  mainTabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  mainTabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 },
  activeMainTab: { backgroundColor: '#1D1D1D' },
  mainTabText: { color: '#999999', fontSize: 17, fontWeight: 'bold' },
  activeMainTabText: { color: '#ffffff' },

  scrollContent: { paddingBottom: 50 },

  colorTabRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  colorBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center', marginHorizontal: 2 },
  colorBtnText: { fontSize: 13, fontWeight: 'bold' },
  colorBtnTextActive: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  colorBtnTextGray: { color: '#999999', fontSize: 13, fontWeight: 'bold' },

  rankingListContainer: { paddingBottom: 20 },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 30, fontSize: 16 },
  rankItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderWidth: 1, borderColor: '#333333', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 15, marginBottom: 12 },
  myRankItemHighlight: { borderColor: '#A1BE44', backgroundColor: '#2A2F1D' },

  rankCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  rankNumberText: { fontSize: 16, fontWeight: '900' },

  rankCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rankProfileImg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#444444', marginRight: 12 },
  rankNameText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },

  rankRight: { alignItems: 'center', justifyContent: 'center', minWidth: 95 },

  rankTypeText: { fontSize: 16, fontWeight: '900', marginBottom: 4, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  rankInfoBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rankColorText: { fontSize: 17, fontWeight: 'bold', marginRight: 6, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  rankHoldText: { color: '#ffffff', fontSize: 17, fontWeight: '600', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

  enduranceLapsText: { color: '#A1BE44', fontSize: 17, fontWeight: 'bold', marginBottom: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceTimeText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  enduranceSectionText: { fontSize: 17, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceSectionArrow: { fontSize: 17, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

  consecutiveColorsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 90, marginBottom: 5 },
  miniColorCircle: { width: 16, height: 16, borderRadius: 8, margin: 2, borderWidth: 0.5, borderColor: '#555555' },
  consecutiveScoreText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
});

export default RankingScreen;