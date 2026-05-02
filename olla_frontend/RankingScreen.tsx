import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';

// 💡 1. props에 route를 추가하여 홈에서 보낸 파라미터를 받을 수 있게 합니다.
const RankingScreen = ({ route, myProfile, difficultyData, enduranceData, consecutiveData }: any) => {
  
  // 💡 2. 홈에서 넘어온 targetTab이 있으면 그걸로, 없으면 '초보벽'으로 탭을 초기화합니다.
  const [mainTab, setMainTab] = useState(route?.params?.targetTab || '초보벽');
  const mainTabs = ['초보벽', '지구력', '연속'];
  const [colorTab, setColorTab] = useState('전체');

  // 💡 3. 화면이 켜져 있는 상태에서 홈의 버튼을 다시 눌렀을 때도 탭이 바뀌도록 감지합니다.
  useEffect(() => {
    if (route?.params?.targetTab) {
      setMainTab(route.params.targetTab);
    }
  }, [route?.params?.targetTab]);

  const colors = [
    { name: '흰색', hex: '#EAEAEA' },
    { name: '노랑', hex: '#F4D03F' },
    { name: '초록', hex: '#58D68D' },
    { name: '파랑', hex: '#5DADE2' },
    { name: '빨강', hex: '#EC7063' },
    { name: '보라', hex: '#AF7AC5' },
    { name: '주황', hex: '#F0B27A' },
    { name: '검정', hex: '#000000' }
  ];

  const sectionOrder = ['1-0', '1-2', '1-6', '2-4', '2-8', '2-12', '3-1', '3-2', '3-4', '3-6', '4-1', '4-2'];

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

  const getColorScore = (hex: string) => {
    switch (hex.toUpperCase()) {
      case '#EAEAEA': return 10;
      case '#F4D03F': return 20;
      case '#58D68D': return 30;
      case '#5DADE2': return 40;
      case '#EC7063': return 50;
      case '#AF7AC5': return 60;
      case '#F0B27A': return 70;
      case '#000000': return 80;
      default: return 0;
    }
  };
  const calculateTotalScore = (colorArr: string[]) => colorArr.reduce((sum, hex) => sum + getColorScore(hex), 0);

  const getBeginnerScore = (colorName: string, type: string, current: number) => {
    const colorOrder = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];
    const colorIdx = colorOrder.indexOf(colorName);
    
    if (colorIdx === -1) return 0;
    
    const colorBase = colorIdx * 1000;
    const typeBase = type === '왕복' ? 500 : 0;
    return colorBase + typeBase + current;
  };

  const myBestBeginner = useMemo(() => {
    if (!difficultyData || difficultyData.length === 0) return null;
    const sorted = [...difficultyData].sort((a: any, b: any) => {
      const scoreA = getBeginnerScore(a.color, a.type, a.current || 0);
      const scoreB = getBeginnerScore(b.color, b.type, b.current || 0);
      return scoreB - scoreA;
    });
    return sorted[0];
  }, [difficultyData]);

  const myBestEndurance = useMemo(() => {
    if (!enduranceData?.length) return null;
    return [...enduranceData].sort((a: any, b: any) => {
      const lapA = parseInt(a.laps, 10), lapB = parseInt(b.laps, 10);
      if (lapA !== lapB) return lapB - lapA;
      const idxA = sectionOrder.indexOf(a.section), idxB = sectionOrder.indexOf(b.section);
      return lapA % 2 !== 0 ? idxB - idxA : idxA - idxB;
    })[0];
  }, [enduranceData]);

  const myBestConsecutive = useMemo(() => {
    if (!consecutiveData?.length) return null;
    return [...consecutiveData].map((d: any) => ({
      ...d,
      score: calculateTotalScore(d.colors)
    })).sort((a: any, b: any) => b.score - a.score)[0];
  }, [consecutiveData]);

  const baseBeginnerData = useMemo(() => {
    return [
      { id: 2, name: '최강우', colorName: '검정', colorHex: '#000000', type: '왕복', hold: 30, isMe: false, achievedAt: 1600000000000 },
      { id: 3, name: '김정산', colorName: '검정', colorHex: '#000000', type: '편도', hold: 28, isMe: false, achievedAt: 1600000001000 },
      { id: 4, name: '박지구력', colorName: '주황', colorHex: '#F0B27A', type: '왕복', hold: 28, isMe: false, achievedAt: 1600000002000 },
      { id: 5, name: '이초보', colorName: '주황', colorHex: '#F0B27A', type: '편도', hold: 25, isMe: false, achievedAt: 1600000003000 },
      { id: 6, name: '홍길동', colorName: '보라', colorHex: '#AF7AC5', type: '왕복', hold: 25, isMe: false, achievedAt: 1600000004000 },
      { id: 7, name: '고수', colorName: '보라', colorHex: '#AF7AC5', type: '편도', hold: 20, isMe: false, achievedAt: 1600000005000 },
      { id: 8, name: '초보자', colorName: '빨강', colorHex: '#EC7063', type: '왕복', hold: 26, isMe: false, achievedAt: 1600000006000 },
      { id: 9, name: '중수', colorName: '빨강', colorHex: '#EC7063', type: '편도', hold: 20, isMe: false, achievedAt: 1600000007000 },
      { id: 10, name: '클라이머', colorName: '파랑', colorHex: '#5DADE2', type: '왕복', hold: 26, isMe: false, achievedAt: 1600000008000 },
      { id: 11, name: '스파이더', colorName: '파랑', colorHex: '#5DADE2', type: '편도', hold: 15, isMe: false, achievedAt: 1600000009000 },
      { id: 12, name: '홀드잡이', colorName: '초록', colorHex: '#58D68D', type: '왕복', hold: 28, isMe: false, achievedAt: 1600000010000 },
      { id: 13, name: '다이노', colorName: '초록', colorHex: '#58D68D', type: '편도', hold: 10, isMe: false, achievedAt: 1600000011000 },
      { id: 14, name: '병아리', colorName: '노랑', colorHex: '#F4D03F', type: '왕복', hold: 30, isMe: false, achievedAt: 1600000012000 },
      { id: 15, name: '입문자', colorName: '노랑', colorHex: '#F4D03F', type: '편도', hold: 15, isMe: false, achievedAt: 1600000013000 },
      { id: 16, name: '클린이', colorName: '흰색', colorHex: '#EAEAEA', type: '왕복', hold: 26, isMe: false, achievedAt: 1600000014000 },
      { id: 17, name: '첫경험', colorName: '흰색', colorHex: '#EAEAEA', type: '편도', hold: 10, isMe: false, achievedAt: 1600000015000 },
    ].map(u => ({ ...u, sortScore: getBeginnerScore(u.colorName, u.type, u.hold) }));
  }, []);

  const enduranceList = useMemo(() => {
    const others = [
      { id: 2, name: '최강우', laps: 10, section: '4-2', time: '20:15', isMe: false },
      { id: 3, name: '김정산', laps: 8, section: '2-12', time: '18:30', isMe: false },
      { id: 4, name: '박지구력', laps: 7, section: '1-0', time: '16:45', isMe: false },
      { id: 5, name: '이초보', laps: 6, section: '3-6', time: '14:20', isMe: false },
      { id: 6, name: '홍길동', laps: 5, section: '2-8', time: '12:10', isMe: false },
      { id: 7, name: '고수', laps: 4, section: '1-6', time: '10:05', isMe: false },
      { id: 8, name: '초보자', laps: 3, section: '4-1', time: '08:30', isMe: false },
      { id: 9, name: '중수', laps: 3, section: '2-4', time: '07:15', isMe: false },
      { id: 10, name: '클라이머', laps: 2, section: '3-4', time: '05:50', isMe: false },
      { id: 11, name: '스파이더', laps: 2, section: '1-2', time: '04:40', isMe: false },
      { id: 12, name: '홀드잡이', laps: 1, section: '3-2', time: '03:20', isMe: false },
      { id: 13, name: '다이노', laps: 1, section: '1-0', time: '02:10', isMe: false },
    ];

    let list: any[] = [...others];

    if (myBestEndurance) {
      list.push({
        id: 999, 
        name: myProfile?.name || '권클라이밍', 
        laps: parseInt(myBestEndurance.laps, 10),
        section: myBestEndurance.section, 
        time: myBestEndurance.time, 
        isMe: true
      });
    }

    list.sort((a: any, b: any) => {
      if (a.laps !== b.laps) return b.laps - a.laps;
      const idxA = sectionOrder.indexOf(a.section), idxB = sectionOrder.indexOf(b.section);
      return a.laps % 2 !== 0 ? idxB - idxA : idxA - idxB;
    });
    
    return list.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [myBestEndurance, myProfile]);

  const consecutiveList = useMemo(() => {
    const others = [
      { id: 2, name: '최강우', colors: ['#000000', '#F0B27A', '#AF7AC5', '#EC7063'], score: 260, isMe: false },
      { id: 3, name: '김정산', colors: ['#000000', '#F0B27A', '#AF7AC5'], score: 210, isMe: false },
      { id: 4, name: '박지구력', colors: ['#F0B27A', '#AF7AC5', '#EC7063'], score: 180, isMe: false },
      { id: 5, name: '이초보', colors: ['#AF7AC5', '#EC7063', '#5DADE2'], score: 150, isMe: false },
      { id: 6, name: '홍길동', colors: ['#EC7063', '#5DADE2', '#58D68D'], score: 120, isMe: false },
      { id: 7, name: '고수', colors: ['#5DADE2', '#58D68D', '#F4D03F'], score: 90, isMe: false },
      { id: 8, name: '초보자', colors: ['#58D68D', '#F4D03F', '#EAEAEA'], score: 60, isMe: false },
      { id: 9, name: '중수', colors: ['#F4D03F', '#EAEAEA'], score: 30, isMe: false },
      { id: 10, name: '클라이머', colors: ['#58D68D'], score: 30, isMe: false },
      { id: 11, name: '스파이더', colors: ['#F4D03F'], score: 20, isMe: false },
      { id: 12, name: '홀드잡이', colors: ['#EAEAEA'], score: 10, isMe: false },
      { id: 13, name: '다이노', colors: [], score: 0, isMe: false },
    ];

    let list: any[] = [...others];

    if (myBestConsecutive) {
      list.push({
        id: 999, 
        name: myProfile?.name || '권클라이밍',
        colors: myBestConsecutive.colors, 
        score: myBestConsecutive.score, 
        isMe: true
      });
    } else {
      list.push({ id: 999, name: myProfile?.name || '권클라이밍', colors: [], score: 0, isMe: true });
    }

    list.sort((a: any, b: any) => b.score - a.score);
    return list.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [myBestConsecutive, myProfile]);

  const filteredList = useMemo(() => {
    if (mainTab === '지구력') return enduranceList;
    if (mainTab === '연속') return consecutiveList;
    
    let currentList = [];
    let myBest: any = null;
    
    if (difficultyData && difficultyData.length > 0) {
      let myData = difficultyData;
      if (colorTab !== '전체') {
        myData = difficultyData.filter((d: any) => d.color === colorTab);
      }
      if (myData.length > 0) {
        const sortedMyData = [...myData].sort((a: any, b: any) => {
          const scoreA = getBeginnerScore(a.color, a.type, a.current || 0);
          const scoreB = getBeginnerScore(b.color, b.type, b.current || 0);
          return scoreB - scoreA;
        });
        myBest = sortedMyData[0];
      }
    }

    let list = [...baseBeginnerData];
    if (colorTab !== '전체') {
      list = list.filter(r => r.colorName === colorTab);
    }

    if (myBest && myBest.current > 0) {
      list.push({
        id: 999,
        name: myProfile?.name || '권클라이밍',
        colorName: myBest.color,
        colorHex: myBest.hex,
        type: myBest.type,
        hold: myBest.current,
        isMe: true,
        sortScore: getBeginnerScore(myBest.color, myBest.type, myBest.current),
        achievedAt: myBest.id || Date.now() 
      });
    }

    list.sort((a: any, b: any) => {
      if (b.sortScore !== a.sortScore) {
        return b.sortScore - a.sortScore; 
      }
      return a.achievedAt - b.achievedAt; 
    });

    currentList = list.map((item, index) => ({ ...item, rank: index + 1 }));
    return currentList;

  }, [mainTab, colorTab, baseBeginnerData, enduranceList, consecutiveList, difficultyData, myProfile]);

  const myCurrentRank = filteredList.find(r => r.isMe)?.rank || '-';

  return (
    <View style={styles.background}>
      
      <View style={styles.myRankingWrapper}>
        <View style={styles.myRankingCard}>
          <View style={styles.myRankingContent}>
            <View style={styles.myRankingLeft}>
              <Image source={require('./assets/profile.png')} style={styles.myProfileImg} defaultSource={undefined} />
              <View>
                <Text style={styles.myNameText}>{myProfile?.name || '권클라이밍'}</Text>
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
          {filteredList.map((item: any) => (
            <View key={item.id} style={[styles.rankItemCard, item.isMe && styles.myRankItemHighlight]}>
              
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
                        <View key={idx} style={[styles.miniColorCircle, { backgroundColor: colorHex }]} />
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