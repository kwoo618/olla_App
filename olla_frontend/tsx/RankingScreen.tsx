import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const RANKING_BEGINNER_URL = 'http://10.0.2.2:8080/api/v1/rankings/beginner';
const RANKING_ENDURANCE_DISTANCE_URL = 'http://10.0.2.2:8080/api/v1/rankings/endurance/distance';
const RANKING_SERIES_URL = 'http://10.0.2.2:8080/api/v1/rankings/series';
const MY_PROFILE_URL = 'http://10.0.2.2:8080/api/v1/members/me'; 

axios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken'); 
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("토큰 가져오기 실패:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const colors = [
  { name: '흰색', hex: '#EAEAEA', enum: 'WHITE' },
  { name: '노랑', hex: '#F4D03F', enum: 'YELLOW' },
  { name: '초록', hex: '#58D68D', enum: 'GREEN' },
  { name: '파랑', hex: '#5DADE2', enum: 'BLUE' },
  { name: '빨강', hex: '#EC7063', enum: 'RED' },
  { name: '보라', hex: '#AF7AC5', enum: 'PURPLE' },
  { name: '주황', hex: '#F0B27A', enum: 'ORANGE' },
  { name: '검정', hex: '#000000', enum: 'BLACK' }
];

const reverseColorMap: { [key: string]: string } = {
  "WHITE": "흰색", "YELLOW": "노랑", "ORANGE": "주황", "GREEN": "초록",
  "BLUE": "파랑", "RED": "빨강", "PURPLE": "보라", "BLACK": "검정"
};

const RankingScreen = ({ route }: any) => {
  
  const [mainTab, setMainTab] = useState(route?.params?.targetTab || '초보벽');
  const mainTabs = ['초보벽', '지구력', '연속'];
  const [colorTab, setColorTab] = useState('전체');

  const [beginnerRankings, setBeginnerRankings] = useState<any[]>([]);
  const [enduranceRankings, setEnduranceRankings] = useState<any[]>([]);
  const [consecutiveRankings, setConsecutiveRankings] = useState<any[]>([]);
  
  const [myNickname, setMyNickname] = useState('알 수 없음');
  const [myMemberId, setMyMemberId] = useState<number | null>(null); // ✅ memberId 상태 추가

  useEffect(() => {
    if (route?.params?.targetTab) {
      setMainTab(route.params.targetTab);
    }
  }, [route?.params?.targetTab]);

  useEffect(() => {
    fetchMyProfile().then(() => {
      fetchAllRankings();
    });
  }, []);

  const fetchMyProfile = async () => {
    try {
      const response = await axios.get(MY_PROFILE_URL);
      const data = response.data?.data || response.data;
      if (data) {
        if (data.name || data.nickname) {
          setMyNickname(data.nickname || data.name);
        }
        // ✅ memberId(또는 id) 저장 - 백엔드 응답 필드명에 따라 둘 다 대응
        const myId = data.memberId ?? data.id ?? null;
        if (myId !== null) {
          setMyMemberId(Number(myId));
        }
      }
    } catch (error) {
      console.log("내 프로필 로드 실패", error);
    }
  };

  const fetchAllRankings = async () => {
    fetchBeginnerRankings();
    fetchEnduranceRankings();
    fetchConsecutiveRankings();
  };

  const extractList = (serverData: any) => {
    if (!serverData) return [];
    if (Array.isArray(serverData)) return serverData;
    if (Array.isArray(serverData.list)) return serverData.list;
    if (Array.isArray(serverData.data)) return serverData.data;
    if (serverData.masters || serverData.challengers) {
      const m = serverData.masters || [];
      const c = serverData.challengers || [];
      return [...m, ...c];
    }
    return [];
  };

  // 1. 초보벽 랭킹 조회
  const fetchBeginnerRankings = async () => {
    try {
      const requests = colors.map(c => axios.get(`${RANKING_BEGINNER_URL}?difficulty=${c.enum}`));
      const responses = await Promise.all(
        requests.map(p => p.catch(e => ({ data: { data: [] } })))
      );
      
      let allData: any[] = [];
      const colorOrder = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];
      
      responses.forEach((response, index) => {
        const rawList = extractList(response.data?.data || response.data);
        const currentColor = colors[index];
        const colorIdx = colorOrder.indexOf(currentColor.name);
        
        const mappedData = rawList.map((item: any, itemIndex: number) => {
          const attemptType = item.attemptType || item.attempt_type || item.type || '';
          const isRoundTrip = String(attemptType).toUpperCase() === 'ROUND_TRIP' || attemptType === '왕복';
          const typeStr = isRoundTrip ? '왕복' : '편도';
          
          const holdCount = item.maxHoldNo ?? item.total ?? item.score ?? 0;
          const colorWeight = colorIdx * 100000; 
          const typeWeight = isRoundTrip ? 50000 : 0; 
          const absoluteScore = colorWeight + typeWeight + Number(holdCount);

          return {
            id: item.memberId ?? item.id ?? `temp-beginner-${index}-${itemIndex}`,
            memberId: item.memberId ?? item.id ?? null, // ✅ memberId 명시적 보존
            name: item.name || item.nickname || '알 수 없음',
            colorName: currentColor.name,
            colorHex: currentColor.hex,
            type: typeStr,
            hold: holdCount, 
            rawScore: absoluteScore, 
            achievedAt: item.achievedAt || item.recordDate ? new Date(item.achievedAt || item.recordDate).getTime() : 9999999999999
          };
        });
        
        allData = [...allData, ...mappedData];
      });

      setBeginnerRankings(allData);
    } catch (error) {
      console.error("초보벽 랭킹 로드 실패:", error);
    }
  };

  // 2. 지구력 랭킹 조회
  const fetchEnduranceRankings = async () => {
    try {
      const response = await axios.get(RANKING_ENDURANCE_DISTANCE_URL);
      const rawList = extractList(response.data?.data || response.data);
      
      const boxSequence = ['1-1','1-2','1-3','1-4','1-5','1-6','2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10','2-11','2-12','3-1','3-2','3-3','3-4','3-5','3-6','4-1','4-2'];

      const mappedData = rawList.map((item: any, index: number) => {
        const min = Math.floor((item.timeSeconds || 0) / 60).toString().padStart(2, '0');
        const sec = ((item.timeSeconds || 0) % 60).toString().padStart(2, '0');
        
        let sectionStr = '완주';
        if (item.additionalBlocks > 0 && item.additionalBlocks <= 26) {
            sectionStr = boxSequence[item.additionalBlocks - 1];
        } else if (item.additionalBlocks === 0 && item.oneWayCount === 0) {
            sectionStr = '0';
        }

        return {
          id: item.memberId ?? `temp-endurance-${index}`,
          memberId: item.memberId ?? null, // ✅ memberId 명시적 보존
          name: item.name || item.nickname || '알 수 없음',
          laps: item.oneWayCount || 0,
          time: `${min}:${sec}`,
          section: sectionStr,
          rawRank: item.ranking || 0
        };
      });
      setEnduranceRankings(mappedData);
    } catch (error) {
      console.error("지구력 랭킹 로드 실패:", error);
    }
  };

  // 3. 연속 완등 랭킹 조회
  const fetchConsecutiveRankings = async () => {
    try {
      const response = await axios.get(RANKING_SERIES_URL);
      const rawData = response.data?.data || response.data;
      const rawList = extractList(rawData);
      
      const mappedData = rawList.map((item: any, index: number) => {
        const log = item.sequenceLog || [];
        const mappedColors = log.map((diffEnum: string) => {
          const krColor = reverseColorMap[diffEnum] || '흰색';
          return colors.find(c => c.name === krColor)?.hex || '#999999';
        });

        return {
          id: item.memberId ?? item.id ?? `temp-series-${index}`,
          memberId: item.memberId ?? item.id ?? null, // ✅ memberId 명시적 보존
          name: item.name || item.nickname || '알 수 없음',
          colors: mappedColors,
          score: item.totalScore ?? item.score ?? 0, 
        };
      });
      setConsecutiveRankings(mappedData);
    } catch (error) {
      console.error("연속 완등 랭킹 로드 실패:", error);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFCC00';
    if (rank === 2) return '#C2C2C2';
    if (rank === 3) return '#C0580E';
    return '#666666';
  };

  const getSectionColor = (section: string) => {
    if (!section) return '#FFFFFF';
    if (section.startsWith('1-')) return section === '1-6' ? '#B96BC6' : '#FFFFFF';
    if (section.startsWith('2-')) {
      const num = parseInt(section.split('-')[1], 10);
      if (num <= 4) return '#58CCFF';
      if (num <= 8) return '#3A4CA8';
      return '#692498';
    }
    if (section.startsWith('3-')) return '#666666';
    if (section.startsWith('4-')) return '#343434';
    return '#FFFFFF';
  };

  // ✅ isMe 판단: memberId가 있으면 ID로, 없으면 이름으로 fallback
  const checkIsMe = (item: any): boolean => {
    if (myMemberId !== null && item.memberId !== null && item.memberId !== undefined) {
      return Number(item.memberId) === myMemberId;
    }
    // memberId를 못 받아온 경우에만 이름으로 fallback
    return item.name === myNickname;
  };

  const filteredList = useMemo(() => {
    let list: any[] = [];

    if (mainTab === '초보벽') {
      list = [...beginnerRankings];

      if (colorTab !== '전체') {
        list = list.filter(r => r.colorName === colorTab);
      }

      // ✅ 유저별 최고기록 1개 추출 - memberId 기준으로 변경
      const userMap = new Map();
      list.forEach(item => {
        // memberId가 있으면 그걸로, 없으면 이름으로 키 설정
        const key = (item.memberId !== null && item.memberId !== undefined)
          ? `id_${item.memberId}`
          : `name_${item.name}`;
        const existing = userMap.get(key);
        if (!existing) {
          userMap.set(key, item);
        } else {
          if (item.rawScore > existing.rawScore) {
            userMap.set(key, item);
          } else if (item.rawScore === existing.rawScore && item.achievedAt < existing.achievedAt) {
            userMap.set(key, item);
          }
        }
      });
      list = Array.from(userMap.values());
      
      list.sort((a, b) => {
        if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore; 
        return a.achievedAt - b.achievedAt;
      });

    } else if (mainTab === '지구력') {
      list = [...enduranceRankings];
      list.sort((a, b) => {
         if(a.rawRank && b.rawRank) return a.rawRank - b.rawRank;
         return b.laps - a.laps; 
      });
    } else if (mainTab === '연속') {
      list = [...consecutiveRankings];
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return list.map((item, index) => ({ 
      ...item, 
      rank: index + 1,
      isMe: checkIsMe(item) // ✅ memberId 기반 본인 판별
    }));
  }, [mainTab, colorTab, beginnerRankings, enduranceRankings, consecutiveRankings, myNickname, myMemberId]);

  // ✅ 랭킹에 없으면 '-' 표시 (기록 없는 경우 정확히 처리)
  const myCurrentRank = filteredList.find(r => r.isMe)?.rank ?? '-';

  return (
    <View style={styles.background}>
      
      <View style={styles.myRankingWrapper}>
        <View style={styles.myRankingCard}>
          <View style={styles.myRankingContent}>
            <View style={styles.myRankingLeft}>
              <Image source={require('./assets/profile.png')} style={styles.myProfileImg} defaultSource={undefined} />
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

      <View style={styles.mainTabContainer}>
        {mainTabs.map((tab) => (
          <TouchableOpacity key={tab} style={[styles.mainTabButton, mainTab === tab && styles.activeMainTab]} onPress={() => setMainTab(tab)}>
            <Text style={[styles.mainTabText, mainTab === tab && styles.activeMainTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {mainTab === '초보벽' && (
          <View style={styles.colorTabRow}>
            <TouchableOpacity style={[styles.colorBtn, colorTab === '전체' ? { backgroundColor: '#A1BE44', borderWidth: 0 } : { borderColor: '#555555' }]} onPress={() => setColorTab('전체')}>
              <Text style={colorTab === '전체' ? styles.colorBtnTextWhite : styles.colorBtnTextGray}>전체</Text>
            </TouchableOpacity>
            {colors.map((c) => (
              <TouchableOpacity key={c.name} style={[styles.colorBtn, { borderColor: colorTab === c.name ? '#A1BE44' : c.hex }, colorTab === c.name && { backgroundColor: c.hex + '20' }]} onPress={() => setColorTab(c.name)}>
                <Text style={[styles.colorBtnText, { color: colorTab === c.name ? '#ffffff' : (c.name === '검정' ? '#ffffff' : c.hex) }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.rankingListContainer}>
          {filteredList.map((item: any, index: number) => (
            <View key={`rank-${mainTab}-${item.id}-${index}`} style={[styles.rankItemCard, item.isMe && styles.myRankItemHighlight]}>
              
              <View style={[styles.rankCircle, { borderColor: getRankColor(item.rank) }]}>
                <Text style={[styles.rankNumberText, { color: getRankColor(item.rank) }]}>{item.rank}</Text>
              </View>

              <View style={styles.rankCenter}>
                <Image source={require('./assets/profile.png')} style={styles.rankProfileImg} defaultSource={undefined} />
                <Text style={styles.rankNameText}>{item.name}</Text>
              </View>

              <View style={styles.rankRight}>
                {mainTab === '연속' ? (
                  <>
                    <View style={styles.consecutiveColorsRow}>
                      {item.colors.map((colorHex: string, idx: number) => (
                        <View key={`color-${item.id}-${idx}`} style={[styles.miniColorCircle, { backgroundColor: colorHex }]} />
                      ))}
                    </View>
                    <Text style={styles.consecutiveScoreText}>{item.score}점</Text>
                  </>
                ) : mainTab === '지구력' ? (
                  <>
                    <Text style={styles.enduranceLapsText}>편도 {item.laps}회</Text>
                    <Text style={styles.enduranceTimeText}>{item.time}</Text>
                    <View style={styles.enduranceSectionRow}>
                      {item.laps % 2 === 0 && <Text style={[styles.enduranceSectionArrow, { color: getSectionColor(item.section) }]}>← </Text>}
                      <Text style={[styles.enduranceSectionText, { color: getSectionColor(item.section) }]}>{item.section}</Text>
                      {item.laps % 2 !== 0 && <Text style={[styles.enduranceSectionArrow, { color: getSectionColor(item.section) }]}> →</Text>}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.rankTypeText, { color: item.type === '왕복' ? '#0058CC' : '#FF2528' }]}>{item.type}</Text>
                    <View style={styles.rankInfoBottomRow}>
                      <Text style={[styles.rankColorText, { color: item.colorHex === '#000000' ? '#FFFFFF' : item.colorHex }]}>{item.colorName}</Text>
                      <Text style={styles.rankHoldText}>{item.hold}번</Text>
                    </View>
                  </>
                )}
              </View>

            </View>
          ))}
          {filteredList.length === 0 && (
             <Text style={{color: '#999', textAlign: 'center', marginTop: 30}}>랭킹 데이터가 없습니다.</Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  
  myRankingWrapper: { marginBottom: 20, marginTop: 10 },
  myRankingCard: { height: 100, borderRadius: 16, borderWidth: 1, borderColor: '#718A26', backgroundColor: '#5E731F', justifyContent: 'center' },
  myRankingContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25 },
  myRankingLeft: { flexDirection: 'row', alignItems: 'center' },
  myProfileImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#444444', marginRight: 15 },
  myNameText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  myRankSubText: { color: '#EBEBEB', fontSize: 13, fontWeight: '500' },
  myRankingRight: { flexDirection: 'row', alignItems: 'baseline' },
  myRankNumText: { color: '#A1BE44', fontSize: 42, fontWeight: '900', marginRight: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
  myRankUnitText: { color: '#EBEBEB', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },

  mainTabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  mainTabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  activeMainTab: { backgroundColor: '#1D1D1D' },
  mainTabText: { color: '#999999', fontSize: 15, fontWeight: 'bold' },
  activeMainTabText: { color: '#ffffff' },

  scrollContent: { paddingBottom: 50 },

  colorTabRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  colorBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginHorizontal: 2 },
  colorBtnText: { fontSize: 11, fontWeight: 'bold' },
  colorBtnTextWhite: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  colorBtnTextGray: { color: '#999999', fontSize: 11, fontWeight: 'bold' },

  rankingListContainer: { paddingBottom: 20 },
  rankItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderWidth: 1, borderColor: '#333333', borderRadius: 16, paddingVertical: 15, paddingHorizontal: 15, marginBottom: 10 },
  myRankItemHighlight: { borderColor: '#A1BE44', backgroundColor: '#2A2F1D' }, 
  
  rankCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  rankNumberText: { fontSize: 14, fontWeight: '900' },

  rankCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rankProfileImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444444', marginRight: 12 },
  rankNameText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  rankRight: { alignItems: 'center', justifyContent: 'center', minWidth: 85 },
  
  rankTypeText: { fontSize: 14, fontWeight: '900', marginBottom: 4, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  rankInfoBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rankColorText: { fontSize: 15, fontWeight: 'bold', marginRight: 6, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  rankHoldText: { color: '#ffffff', fontSize: 15, fontWeight: '600', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  
  enduranceLapsText: { color: '#A1BE44', fontSize: 15, fontWeight: 'bold', marginBottom: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceTimeText: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  enduranceSectionText: { fontSize: 15, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceSectionArrow: { fontSize: 15, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

  consecutiveColorsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 90, marginBottom: 5 },
  miniColorCircle: { width: 14, height: 14, borderRadius: 7, margin: 2, borderWidth: 0.5, borderColor: '#555555' },
  consecutiveScoreText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
});

export default RankingScreen;