import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';

const RankingScreen = ({ myProfile, difficultyData, enduranceData, consecutiveData }: any) => {
  const [mainTab, setMainTab] = useState('초보벽');
  const mainTabs = ['초보벽', '지구력', '연속'];
  const [colorTab, setColorTab] = useState('전체');

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

  // 💡 색상별 점수 계산기
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

  // ==========================================
  // [데이터 연동] 초보벽, 지구력, 연속 최고 기록
  // ==========================================
  const myBestBeginner = useMemo(() => {
    return difficultyData?.length ? [...difficultyData].sort((a: any, b: any) => b.score - a.score)[0] : null;
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

  // ==========================================
  // 랭킹 리스트 생성
  // ==========================================
  const beginnerList = useMemo(() => {
    const difficultyLevels = [
      { name: '검정', hex: '#000000', type: '왕복', maxHold: 30, count: 2, baseScore: 1000 },
      { name: '검정', hex: '#000000', type: '편도', maxHold: 30, count: 3, baseScore: 900 },
      { name: '주황', hex: '#F0B27A', type: '왕복', maxHold: 28, count: 4, baseScore: 800 },
      { name: '주황', hex: '#F0B27A', type: '편도', maxHold: 28, count: 5, baseScore: 700 },
      { name: '보라', hex: '#AF7AC5', type: '왕복', maxHold: 25, count: 6, baseScore: 600 },
      { name: '보라', hex: '#AF7AC5', type: '편도', maxHold: 25, count: 8, baseScore: 500 },
      { name: '빨강', hex: '#EC7063', type: '왕복', maxHold: 26, count: 10, baseScore: 400 },
      { name: '빨강', hex: '#EC7063', type: '편도', maxHold: 26, count: 12, baseScore: 300 },
      { name: '파랑', hex: '#5DADE2', type: '왕복', maxHold: 26, count: 15, baseScore: 200 },
      { name: '파랑', hex: '#5DADE2', type: '편도', maxHold: 26, count: 15, baseScore: 100 },
      { name: '초록', hex: '#58D68D', type: '왕복', maxHold: 28, count: 10, baseScore: 50 },
      { name: '초록', hex: '#58D68D', type: '편도', maxHold: 28, count: 10, baseScore: 10 },
    ];

    let list: any[] = [];
    let idCounter = 1;

    for (let level of difficultyLevels) {
      for (let j = 0; j < level.count; j++) {
        if (list.length >= 99) break;
        list.push({
          id: idCounter++, name: `클라이머${idCounter}`, colorName: level.name, colorHex: level.hex,
          type: level.type, hold: level.maxHold - (j % 3), isMe: false, sortScore: level.baseScore + (level.maxHold - (j % 3))
        });
      }
    }

    if (myBestBeginner) {
      const myBaseScore = difficultyLevels.find(d => d.name === myBestBeginner.color && d.type === myBestBeginner.type)?.baseScore || 0;
      list.push({
        id: 999, name: myProfile?.name || '권클라이밍', colorName: myBestBeginner.color, colorHex: myBestBeginner.hex,
        type: myBestBeginner.type, hold: myBestBeginner.current, isMe: true, sortScore: myBaseScore + myBestBeginner.current
      });
    }

    list.sort((a: any, b: any) => b.sortScore - a.sortScore);
    list.forEach((item, index) => { item.rank = index + 1; });
    return list;
  }, [myBestBeginner, myProfile]);

  const enduranceList = useMemo(() => {
    let list: any[] = [];
    let laps = 5;
    const oddSections = [...sectionOrder].reverse(); 
    const evenSections = [...sectionOrder];
    let sIdx = 0;
    let min = 10, sec = 15;

    for (let i = 1; i <= 99; i++) {
      let currentSections = laps % 2 !== 0 ? oddSections : evenSections;
      list.push({
        id: i, name: `지구력달인${i}`, laps: laps, section: currentSections[sIdx],
        time: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, isMe: false
      });
      sec += 25;
      if (sec >= 60) { sec -= 60; min += 1; }
      if (i % 3 === 0) {
        sIdx++;
        if (sIdx >= currentSections.length) { sIdx = 0; laps--; if (laps < 1) laps = 1; }
      }
    }

    if (myBestEndurance) {
      list.push({
        id: 999, name: myProfile?.name || '권클라이밍', laps: parseInt(myBestEndurance.laps, 10),
        section: myBestEndurance.section, time: myBestEndurance.time, isMe: true
      });
    }

    list.sort((a: any, b: any) => {
      if (a.laps !== b.laps) return b.laps - a.laps;
      const idxA = sectionOrder.indexOf(a.section), idxB = sectionOrder.indexOf(b.section);
      return a.laps % 2 !== 0 ? idxB - idxA : idxA - idxB;
    });
    list.forEach((item, index) => { item.rank = index + 1; });
    return list;
  }, [myBestEndurance, myProfile]);

  // 💡 [개선된 연속 랭킹 더미 데이터] (내 기록이 무조건 11등이 되며, 현실적인 점수 분배)
  const consecutiveList = useMemo(() => {
    let list: any[] = [];
    const userScore = myBestConsecutive ? myBestConsecutive.score : 100;
    const colorOpts = [...colors].reverse(); // 검정(80) -> 흰색(10)

    for (let i = 1; i <= 99; i++) {
      let targetScore = 0;
      
      // 1위 ~ 10위: 내 점수보다 딱 10점 단위로만 높게 설정 (과도한 점수 방지)
      if (i <= 10) {
        targetScore = userScore + (11 - i) * 10;
      } else {
        // 12위 이하: 내 점수보다 서서히 낮아지도록 설정
        const decrease = Math.floor((i - 10) / 3) * 10;
        targetScore = Math.max(10, userScore - decrease - 10);
      }

      let remaining = targetScore;
      let cList = [];

      // 💡 무작위 길이가 아닌, 점수에 딱 맞는 최소한의 동그라미만 생성 (가장 큰 색상부터 채우기)
      while (remaining > 0 && cList.length < 8) {
        const possible = colorOpts.filter(c => getColorScore(c.hex) <= remaining);
        if (possible.length > 0) {
          const pick = possible[0]; // 무조건 채울 수 있는 가장 큰 점수의 색상을 먼저 선택
          cList.push(pick.hex);
          remaining -= getColorScore(pick.hex);
        } else {
          cList.push(colorOpts[colorOpts.length - 1].hex); // 최소점(흰색)
          remaining -= 10;
        }
      }

      const actualScore = calculateTotalScore(cList);
      list.push({ id: i, name: `연속달인${i}`, colors: cList, score: actualScore, isMe: false });
    }

    if (myBestConsecutive) {
      list.push({
        id: 999, name: myProfile?.name || '권클라이밍',
        colors: myBestConsecutive.colors, score: myBestConsecutive.score, isMe: true
      });
    }

    // 최종 정렬 및 등수 매기기
    list.sort((a: any, b: any) => b.score - a.score);
    list.forEach((item, index) => { item.rank = index + 1; });
    return list;
  }, [myBestConsecutive, myProfile]);

  const filteredList: any[] = mainTab === '지구력' 
    ? enduranceList 
    : mainTab === '연속'
      ? consecutiveList
      : beginnerList.filter((r: any) => colorTab === '전체' || r.colorName === colorTab);

  const myCurrentRank = (mainTab === '지구력' ? enduranceList : mainTab === '연속' ? consecutiveList : beginnerList).find(r => r.isMe)?.rank || '-';

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