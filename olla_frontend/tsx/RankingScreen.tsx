import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// 난이도 enum → 한글 색 이름
const ENUM_TO_KR: Record<string, string> = {
  WHITE: '흰색', YELLOW: '노랑', GREEN: '초록', BLUE: '파랑',
  RED: '빨강', PURPLE: '보라', ORANGE: '주황', BLACK: '검정',
};

// 각 색상 최대 홀드 수 (완등 시 사용)
const MAX_HOLDS: Record<string, number> = {
  '흰색': 26, '노랑': 33, '초록': 28, '파랑': 26,
  '빨강': 26, '보라': 25, '주황': 28, '검정': 30,
};

// 색 이름 → 색 인덱스 (점수 계산용)
const COLOR_ORDER = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];

// 지구력 구간 순서 (additionalBlocks 값 → 구간명)
const BOX_SEQUENCE = [
  '1-1','1-2','1-3','1-4','1-5','1-6',
  '2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10','2-11','2-12',
  '3-1','3-2','3-3','3-4','3-5','3-6',
  '4-1','4-2',
];

// ─────────────────────────── 타입 ───────────────────────────
interface BeginnerRecord {
  id: number;
  difficulty: string;       // WHITE | YELLOW | ...
  attemptType: string;      // ONE_WAY | ROUND_TRIP
  maxHoldNo: number;
  recordDate: string;
  success: boolean;
}

interface EnduranceRankItem {
  id: number;
  memberId?: number;
  name?: string;
  nickname?: string;
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
  sequenceLog: string[];
  totalScore: number;
  recordDate: string;
}

// ─────────────────────────── 헬퍼 ───────────────────────────
/** 응답에서 배열 추출 */
const extractList = (serverData: any): any[] => {
  if (!serverData) return [];
  if (Array.isArray(serverData)) return serverData;
  if (Array.isArray(serverData.list)) return serverData.list;
  if (Array.isArray(serverData.data)) return serverData.data;
  if (serverData.masters || serverData.challengers)
    return [...(serverData.masters ?? []), ...(serverData.challengers ?? [])];
  return [];
};

/** 초보벽 rawScore 계산 */
const calcBeginnerScore = (colorName: string, isRoundTrip: boolean, holdCount: number): number => {
  const colorIdx = COLOR_ORDER.indexOf(colorName);
  return colorIdx * 100_000 + (isRoundTrip ? 50_000 : 0) + holdCount;
};

/** 지구력 구간 문자열 */
const getSectionLabel = (oneWayCount: number, additionalBlocks: number): string => {
  if (oneWayCount === 0 && additionalBlocks === 0) return '0';
  if (additionalBlocks > 0 && additionalBlocks <= BOX_SEQUENCE.length)
    return BOX_SEQUENCE[additionalBlocks - 1];
  return '완주';
};

/** 지구력 구간 색상 */
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

/** 순위 원 색상 */
const getRankColor = (rank: number): string => {
  if (rank === 1) return '#FFCC00';
  if (rank === 2) return '#C2C2C2';
  if (rank === 3) return '#C0580E';
  return '#666666';
};

/** 초 → mm:ss */
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ─────────────────────────── 컴포넌트 ───────────────────────────
const RankingScreen = ({ route }: any) => {
  const [mainTab, setMainTab]   = useState<string>(route?.params?.targetTab ?? '초보벽');
  const [colorTab, setColorTab] = useState<string>('전체');

  const [beginnerRankings,    setBeginnerRankings]    = useState<any[]>([]);
  const [enduranceRankings,   setEnduranceRankings]   = useState<any[]>([]);
  const [consecutiveRankings, setConsecutiveRankings] = useState<any[]>([]);

  const [myNickname, setMyNickname] = useState<string>('알 수 없음');
  const [myMemberId, setMyMemberId] = useState<number | null>(null);

  // targetTab 파라미터 변경 감지
  useEffect(() => {
    if (route?.params?.targetTab) setMainTab(route.params.targetTab);
  }, [route?.params?.targetTab]);

  // 최초 데이터 로드
  useEffect(() => {
    (async () => {
      const userData = await fetchMyProfile();
      fetchBeginnerRankings(userData);
      fetchEnduranceRankings();
      fetchConsecutiveRankings();
    })();
  }, []);

  // ── 내 프로필 ──
  const fetchMyProfile = async (): Promise<{ id: number | null; nickname: string }> => {
    try {
      const res  = await axios.get(MY_PROFILE_URL);
      const data = res.data?.data ?? res.data;
      if (data) {
        const nickname = data.nickname ?? data.name ?? '알 수 없음';
        const id       = data.memberId ?? data.id ?? null;
        setMyNickname(nickname);
        if (id !== null) setMyMemberId(Number(id));
        return { id: id !== null ? Number(id) : null, nickname };
      }
    } catch (e) {
      console.log('내 프로필 로드 실패', e);
    }
    return { id: null, nickname: '알 수 없음' };
  };

  // ── 초보벽 랭킹 ──
  const fetchBeginnerRankings = async (userData: { id: number | null; nickname: string }) => {
    try {
      // 색상별 랭킹 병렬 요청
      const rankResponses = await Promise.all(
        colors.map(c =>
          axios.get(`${RANKING_BEGINNER_URL}?difficulty=${c.enum}`)
               .catch(() => ({ data: { data: [] } }))
        )
      );

      // 내 베스트 기록 (명세: { id, difficulty, attemptType, maxHoldNo, recordDate, success })
      let myBestList: BeginnerRecord[] = [];
      try {
        const res = await axios.get(MY_BEGINNER_BEST_URL);
        const raw = res.data?.data ?? res.data;
        myBestList = Array.isArray(raw) ? raw : (Array.isArray(raw?.list) ? raw.list : []);
      } catch (e) {
        console.log('내 초보벽 베스트 기록 로드 실패', e);
      }

      let allData: any[] = [];

      rankResponses.forEach((response, colorIdx) => {
        const currentColor = colors[colorIdx];
        const maxHold      = MAX_HOLDS[currentColor.name] ?? 0;
        const rawList      = extractList(response.data?.data ?? response.data);

        // 랭킹 목록 파싱
        const mappedList = rawList.map((item: any, i: number) => {
          const isRoundTrip = String(item.attemptType ?? '').toUpperCase() === 'ROUND_TRIP';
          // success=true 이거나 maxHoldNo가 없으면 완등으로 처리
          const holdCount = (item.success === true || !item.maxHoldNo)
            ? maxHold
            : Number(item.maxHoldNo);

          return {
            id:        item.memberId ?? `rank-beginner-${colorIdx}-${i}`,
            memberId:  item.memberId ?? null,
            name:      item.name ?? item.nickname ?? '알 수 없음',
            colorName: currentColor.name,
            colorHex:  currentColor.hex,
            type:      isRoundTrip ? '왕복' : '편도',
            hold:      holdCount,
            rawScore:  calcBeginnerScore(currentColor.name, isRoundTrip, holdCount),
            achievedAt: item.recordDate ? new Date(item.recordDate).getTime() : 9_999_999_999_999,
          };
        });

        // 내 베스트 기록 중 이 색상에 해당하는 것 찾기
        const myRecord = myBestList
          .filter(r => r.difficulty === currentColor.enum)
          .reduce<{ score: number; entry: any } | null>((best, r) => {
            const isRT    = String(r.attemptType ?? '').toUpperCase() === 'ROUND_TRIP';
            const hold    = (r.success === true || !r.maxHoldNo) ? maxHold : Number(r.maxHoldNo);
            const score   = calcBeginnerScore(currentColor.name, isRT, hold);
            if (!best || score > best.score) return { score, entry: r };
            return best;
          }, null);

        let finalList = [...mappedList];

        if (myRecord) {
          const r     = myRecord.entry as BeginnerRecord;
          const isRT  = String(r.attemptType ?? '').toUpperCase() === 'ROUND_TRIP';
          const hold  = (r.success === true || !r.maxHoldNo) ? maxHold : Number(r.maxHoldNo);
          const score = calcBeginnerScore(currentColor.name, isRT, hold);

          // 기존 랭킹에 내 항목이 있으면 제거 후 내 기록으로 교체
          finalList = finalList.filter(item =>
            userData.id
              ? Number(item.memberId) !== userData.id
              : item.name !== userData.nickname
          );

          finalList.push({
            id:        userData.id ?? `my-beginner-${colorIdx}`,
            memberId:  userData.id ?? null,
            name:      userData.nickname,
            colorName: currentColor.name,
            colorHex:  currentColor.hex,
            type:      isRT ? '왕복' : '편도',
            hold,
            rawScore:  score,
            achievedAt: r.recordDate ? new Date(r.recordDate).getTime() : Date.now(),
          });
        }

        allData = [...allData, ...finalList];
      });

      setBeginnerRankings(allData);
    } catch (e) {
      console.error('초보벽 랭킹 로드 실패:', e);
    }
  };

  // ── 지구력 랭킹 ──
  // 명세: { id, memberId, name, oneWayCount, additionalBlocks, timeSeconds, totalScore, recordDate, ranking? }
  const fetchEnduranceRankings = async () => {
    try {
      const res     = await axios.get(RANKING_ENDURANCE_URL);
      const rawList = extractList(res.data?.data ?? res.data);

      const mapped = rawList.map((item: EnduranceRankItem, i: number) => ({
        id:               item.memberId ?? `rank-endurance-${i}`,
        memberId:         item.memberId ?? null,
        name:             item.name ?? item.nickname ?? '알 수 없음',
        laps:             item.oneWayCount  ?? 0,
        timeSeconds:      item.timeSeconds  ?? 0,
        time:             formatTime(item.timeSeconds ?? 0),
        section:          getSectionLabel(item.oneWayCount ?? 0, item.additionalBlocks ?? 0),
        totalScore:       item.totalScore   ?? 0,
        rawRank:          item.ranking      ?? i + 1,
        recordDate:       item.recordDate,
      }));

      setEnduranceRankings(mapped);
    } catch (e) {
      console.error('지구력 랭킹 로드 실패:', e);
    }
  };

  // ── 연속 완등 랭킹 ──
  // 명세: { id, memberId, name, sequenceLog: string[], totalScore, recordDate }
  const fetchConsecutiveRankings = async () => {
    try {
      const res     = await axios.get(RANKING_SERIES_URL);
      const rawList = extractList(res.data?.data ?? res.data);

      const mapped = rawList.map((item: SeriesRankItem, i: number) => {
        const colorHexList = (item.sequenceLog ?? []).map(diffEnum => {
          const krName = ENUM_TO_KR[diffEnum] ?? '흰색';
          return colors.find(c => c.name === krName)?.hex ?? '#999999';
        });

        return {
          id:         item.memberId ?? item.id ?? `rank-series-${i}`,
          memberId:   item.memberId ?? null,
          name:       item.name ?? item.nickname ?? '알 수 없음',
          colors:     colorHexList,
          score:      item.totalScore ?? 0,
          recordDate: item.recordDate,
        };
      });

      setConsecutiveRankings(mapped);
    } catch (e) {
      console.error('연속 완등 랭킹 로드 실패:', e);
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

      // 색상 필터
      if (colorTab !== '전체') list = list.filter(r => r.colorName === colorTab);

      // 유저별 베스트 1개만
      const userMap = new Map<string, any>();
      list.forEach(item => {
        const key = item.memberId != null ? `id_${item.memberId}` : `name_${item.name}`;
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

      // 점수 내림차순 → 달성일 오름차순
      list.sort((a, b) =>
        b.rawScore !== a.rawScore
          ? b.rawScore - a.rawScore
          : a.achievedAt - b.achievedAt
      );

    } else if (mainTab === '지구력') {
      list = [...enduranceRankings];
      // 서버가 준 ranking 값 우선, 없으면 totalScore 내림차순
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

      {/* 내 랭킹 카드 */}
      <View style={styles.myRankingWrapper}>
        <View style={styles.myRankingCard}>
          <View style={styles.myRankingContent}>
            <View style={styles.myRankingLeft}>
              <Image source={require('../assets/profile.png')} style={styles.myProfileImg} />
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 색상 탭 (초보벽 전용) */}
        {mainTab === '초보벽' && (
          <View style={styles.colorTabRow}>
            <TouchableOpacity
              style={[styles.colorBtn, colorTab === '전체' ? { backgroundColor: '#A1BE44', borderWidth: 0 } : { borderColor: '#555555' }]}
              onPress={() => setColorTab('전체')}
            >
              <Text style={colorTab === '전체' ? styles.colorBtnTextActive : styles.colorBtnTextGray}>전체</Text>
            </TouchableOpacity>
            {colors.map(c => (
              <TouchableOpacity
                key={c.name}
                style={[
                  styles.colorBtn,
                  { borderColor: colorTab === c.name ? '#A1BE44' : c.hex },
                  colorTab === c.name && { backgroundColor: c.hex + '20' },
                ]}
                onPress={() => setColorTab(c.name)}
              >
                <Text style={[styles.colorBtnText, { color: colorTab === c.name ? '#ffffff' : (c.name === '검정' ? '#ffffff' : c.hex) }]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
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
                  <Image source={require('../assets/profile.png')} style={styles.rankProfileImg} />
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
                        {item.laps % 2 === 0 && (
                          <Text style={[styles.enduranceSectionArrow, { color: getSectionColor(item.section) }]}>← </Text>
                        )}
                        <Text style={[styles.enduranceSectionText, { color: getSectionColor(item.section) }]}>{item.section}</Text>
                        {item.laps % 2 !== 0 && (
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

  // 내 랭킹 카드
  myRankingWrapper: { marginBottom: 20, marginTop: 10 },
  myRankingCard: { height: 110, borderRadius: 16, borderWidth: 1, borderColor: '#718A26', backgroundColor: '#5E731F', justifyContent: 'center' }, // 높이 100->110
  myRankingContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25 },
  myRankingLeft: { flexDirection: 'row', alignItems: 'center' },
  myProfileImg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#444444', marginRight: 15 }, // 프사 56->64
  myNameText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 }, // 18->20
  myRankSubText: { color: '#EBEBEB', fontSize: 15, fontWeight: '500' }, // 13->15
  myRankingRight: { flexDirection: 'row', alignItems: 'baseline' },
  myRankNumText: { color: '#A1BE44', fontSize: 48, fontWeight: '900', marginRight: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 }, // 42->48
  myRankUnitText: { color: '#EBEBEB', fontSize: 20, fontWeight: 'bold', marginBottom: 6 }, // 18->20

  // 메인 탭
  mainTabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  mainTabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 }, // 패딩 10->12
  activeMainTab: { backgroundColor: '#1D1D1D' },
  mainTabText: { color: '#999999', fontSize: 17, fontWeight: 'bold' }, // 15->17
  activeMainTabText: { color: '#ffffff' },

  scrollContent: { paddingBottom: 50 },

  // 색상 탭
  colorTabRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  colorBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginHorizontal: 2 }, // 패딩 8->10
  colorBtnText: { fontSize: 13, fontWeight: 'bold' }, // 11->13
  colorBtnTextActive: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' }, // 11->13
  colorBtnTextGray: { color: '#999999', fontSize: 13, fontWeight: 'bold' }, // 11->13

  // 랭킹 목록
  rankingListContainer: { paddingBottom: 20 },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 30, fontSize: 16 }, // 14->16
  rankItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderWidth: 1, borderColor: '#333333', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 15, marginBottom: 12 }, // 패딩 조절
  myRankItemHighlight: { borderColor: '#A1BE44', backgroundColor: '#2A2F1D' },

  // 순위 원
  rankCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 15 }, // 크기 36->40
  rankNumberText: { fontSize: 16, fontWeight: '900' }, // 14->16

  // 프로필 + 이름
  rankCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rankProfileImg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#444444', marginRight: 12 }, // 36->40
  rankNameText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' }, // 15->17

  // 우측 정보
  rankRight: { alignItems: 'center', justifyContent: 'center', minWidth: 95 }, // 85->95

  // 초보벽
  rankTypeText: { fontSize: 16, fontWeight: '900', marginBottom: 4, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }, // 14->16
  rankInfoBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rankColorText: { fontSize: 17, fontWeight: 'bold', marginRight: 6, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }, // 15->17
  rankHoldText: { color: '#ffffff', fontSize: 17, fontWeight: '600', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }, // 15->17

  // 지구력
  enduranceLapsText: { color: '#A1BE44', fontSize: 17, fontWeight: 'bold', marginBottom: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }, // 15->17
  enduranceTimeText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }, // 14->16
  enduranceSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  enduranceSectionText: { fontSize: 17, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }, // 15->17
  enduranceSectionArrow: { fontSize: 17, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }, // 15->17

  // 연속 완등
  consecutiveColorsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 90, marginBottom: 5 },
  miniColorCircle: { width: 16, height: 16, borderRadius: 8, margin: 2, borderWidth: 0.5, borderColor: '#555555' }, // 14->16
  consecutiveScoreText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }, // 16->18
});

export default RankingScreen;