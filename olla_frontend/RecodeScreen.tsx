import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RecodeScreen = ({ navigation }: any) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // 1. 난이도별 데이터 
  const difficultyData = [
    { id: 1, color: '흰색', hex: '#EAEAEA', type: '왕복', current: 26, total: 26, status: '완료' },
    { id: 2, color: '노랑', hex: '#F4D03F', type: '왕복', current: 33, total: 33, status: '완료' },
    { id: 3, color: '초록', hex: '#58D68D', type: '왕복', current: 28, total: 28, status: '완료' },
    { id: 4, color: '파랑', hex: '#5DADE2', type: '왕복', current: 26, total: 26, status: '완료' },
    { id: 5, color: '빨강', hex: '#EC7063', type: '왕복', current: 26, total: 26, status: '완료' },
    { id: 6, color: '보라', hex: '#AF7AC5', type: '왕복', current: 25, total: 25, status: '완료' },
    { id: 7, color: '주황', hex: '#F0B27A', type: '왕복', current: 28, total: 28, status: '완료' },
    { id: 8, color: '검정', hex: '#8C8C8C', type: '편도', current: 15, total: 30, status: '진행중' },
  ];

  // 2. 오늘의 지구력 기록 데이터 (삭제 기능)
  const [enduranceData, setEnduranceData] = useState([
    { id: 1, type: '편도', arrow: '->', laps: '5', time: '12:30', section: '3-2' },
  ]);

  const deleteEnduranceRecord = (id: number) => {
    setEnduranceData(enduranceData.filter(item => item.id !== id));
  };

  // 💡 3. 오늘의 초보벽 연속 기록 데이터 (삭제 기능 및 색상 원 데이터)
  const [consecutiveData, setConsecutiveData] = useState([
    // 흰색, 노란색, 초록색, 파란색 코드를 배열로 넣습니다.
    { id: 1, colors: ['#EAEAEA', '#F4D03F', '#58D68D', '#5DADE2'] },
  ]);

  // 초보벽 연속 기록 삭제 함수
  const deleteConsecutiveRecord = (id: number) => {
    setConsecutiveData(consecutiveData.filter(item => item.id !== id));
  };

  return (
    <SafeAreaView style={styles.background}>
      <View style={styles.topNav}>
        <Text style={styles.logoText}>olla</Text>
        <TouchableOpacity>
          <Image source={require('./assets/Vector.png')} style={styles.topIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 상단 요약 리스트 */}
        <View style={styles.summaryContainer}>
          <TouchableOpacity style={styles.summaryItemVertical} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('./assets/ArrowUpRight.png')} style={styles.summaryIconVertical} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>초보벽</Text>
                <Text style={styles.summarySubLabelVertical}>난이도별 등반 기록</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryItemVertical} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('./assets/Timer.png')} style={styles.summaryIconVertical} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>지구력</Text>
                <Text style={styles.summarySubLabelVertical}>바퀴 수와 시간 기록</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryItemVertical} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('./assets/ArrowsClockwise.png')} style={styles.summaryIconVertical} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>초보벽 완등 연속</Text>
                <Text style={styles.summarySubLabelVertical}>바퀴 수와 시간 기록</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>
        </View>

        {/* 섹션 1: 난이도 별 최고기록 */}
        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('difficulty')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>난이도 별 최고기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'difficulty' ? '∨' : '＞'}</Text>
          </TouchableOpacity>

          {expandedSection === 'difficulty' && (
            <View style={styles.outerContainer}>
              {difficultyData.map((item) => (
                <View key={item.id} style={styles.recordItemCard}>
                  <Text style={styles.recordIdLarge}>{item.id}</Text>
                  
                  <View style={styles.colorAndTypeColumn}>
                    <Text style={[styles.colorNameText, { color: item.hex }]}>{item.color}</Text>
                    <View style={item.type === '왕복' ? styles.typeBadgeRoundTrip : styles.typeBadgeOneWay}>
                      <Text style={item.type === '왕복' ? styles.typeTextRoundTrip : styles.typeTextOneWay}>
                        {item.type}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.recordHoldsLeft}>{item.current} / {item.total}번</Text>
                  
                  <Text style={[styles.recordStatus, item.status === '완료' ? styles.statusSuccess : styles.statusIng]}>
                    {item.status}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 섹션 2: 오늘의 지구력 기록 */}
        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('endurance')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>오늘의 지구력 기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'endurance' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          
          {expandedSection === 'endurance' && (
            <View style={styles.outerContainer}>
              {enduranceData.length === 0 ? (
                <View style={styles.recordItemCard}>
                  <Text style={styles.emptyText}>오늘의 지구력 기록이 없습니다.</Text>
                </View>
              ) : (
                enduranceData.map((item) => (
                  <View key={item.id} style={styles.rowCardWithTrash}>
                    <View style={styles.enduranceCol}>
                      <Text style={styles.enduranceTopText}>{item.type}</Text>
                      <Text style={styles.enduranceBottomText}>{item.arrow}</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}>
                      <Text style={styles.enduranceTopText}>{item.laps}</Text>
                      <Text style={styles.enduranceBottomText}>바퀴</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}>
                      <Text style={styles.enduranceTopText}>{item.time}</Text>
                      <Text style={styles.enduranceBottomText}>시간</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}>
                      <Text style={styles.enduranceTopText}>{item.section}</Text>
                      <Text style={styles.enduranceBottomText}>구간</Text>
                    </View>

                    <TouchableOpacity style={styles.trashButton} onPress={() => deleteEnduranceRecord(item.id)} activeOpacity={0.6}>
                      <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* 💡 섹션 3: 오늘의 초보벽 연속 기록 (색상 원 + 삭제 기능 적용) */}
        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('consecutive')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>오늘의 초보벽 연속 기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'consecutive' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {expandedSection === 'consecutive' && (
            <View style={styles.outerContainer}>
              {consecutiveData.length === 0 ? (
                <View style={styles.recordItemCard}>
                  <Text style={styles.emptyText}>오늘의 초보벽 연속 기록이 없습니다.</Text>
                </View>
              ) : (
                consecutiveData.map((item) => (
                  <View key={item.id} style={styles.rowCardWithTrash}>
                    
                    {/* 4개의 색상 원 나열 영역 */}
                    <View style={styles.circleContainer}>
                      {item.colors.map((color, index) => (
                        <View key={index} style={[styles.colorCircle, { backgroundColor: color }]} />
                      ))}
                    </View>

                    {/* 휴지통 아이콘 */}
                    <TouchableOpacity style={styles.trashButton} onPress={() => deleteConsecutiveRecord(item.id)} activeOpacity={0.6}>
                      <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* 하단 네비게이션 바 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('Home')}>
          <Image source={require('./assets/Home.png')} style={[styles.navIcon, { opacity: 0.4 }]} />
          <Text style={styles.bottomNavText}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}>
          <Image source={require('./assets/recode.png')} style={styles.navIcon} />
          <Text style={styles.bottomNavTextActive}>기록</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}>
          <Image source={require('./assets/ranking.png')} style={[styles.navIcon, { opacity: 0.4 }]} />
          <Text style={styles.bottomNavText}>랭킹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}>
          <Image source={require('./assets/community.png')} style={[styles.navIcon, { opacity: 0.4 }]} />
          <Text style={styles.bottomNavText}>커뮤니티</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}>
          <Image source={require('./assets/mypage.png')} style={[styles.navIcon, { opacity: 0.4 }]} />
          <Text style={styles.bottomNavText}>마이페이지</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#A1BE44' },
  topIcon: { width: 24, height: 24, resizeMode: 'contain' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },

  summaryContainer: { marginBottom: 15 },
  summaryItemVertical: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 12 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center' },
  summaryIconVertical: { width: 32, height: 32, tintColor: '#A1BE44', marginRight: 15 },
  summaryTextColumn: { flexDirection: 'column', justifyContent: 'center' },
  summaryLabelVertical: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  summarySubLabelVertical: { color: '#999999', fontSize: 13, fontWeight: '500', marginTop: 4 },
  
  simpleAccordionWrapper: { marginBottom: 10 },
  simpleAccordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 5 },
  simpleAccordionTitle: { color: '#999999', fontSize: 15, fontWeight: '500' },
  chevronIcon: { color: '#999999', fontSize: 16, fontWeight: 'bold' },

  outerContainer: { paddingVertical: 5 },
  
  recordItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 16, marginBottom: 10 },
  recordIdLarge: { color: '#999999', fontSize: 22, fontWeight: 'bold', width: 35 },
  colorAndTypeColumn: { width: 60, flexDirection: 'column', justifyContent: 'center' },
  colorNameText: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  typeBadgeRoundTrip: { backgroundColor: '#1A5276', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  typeTextRoundTrip: { color: '#85C1E9', fontSize: 11, fontWeight: 'bold' },
  typeBadgeOneWay: { backgroundColor: '#7B241C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  typeTextOneWay: { color: '#CCCCCC', fontSize: 11, fontWeight: 'bold' },
  recordHoldsLeft: { flex: 1, color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },
  recordStatus: { fontSize: 14, fontWeight: 'bold', width: 45, textAlign: 'right' },
  statusSuccess: { color: '#A1BE44' },
  statusIng: { color: '#999999' },

  // 공통 삭제 가능 카드 (지구력, 연속기록 공용)
  rowCardWithTrash: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderRadius: 16,
    marginBottom: 10,
  },

  // 지구력 데이터 열
  enduranceCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  enduranceTopText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  enduranceBottomText: { color: '#999999', fontSize: 12 },
  verticalDivider: { width: 1, height: 30, backgroundColor: '#444444', marginHorizontal: 5 },
  
  // 💡 초보벽 연속 기록 전용: 원 컨테이너 및 모양
  circleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  colorCircle: { width: 30, height: 30, borderRadius: 15, marginRight: 15 },

  // 💡 사용자가 직접 수정한 OLLA 테마색 휴지통 아이콘 적용!
  trashButton: { padding: 10, marginLeft: 5 },
  trashIcon: { width: 22, height: 22, tintColor: '#A1BE44', resizeMode: 'contain' },
  
  emptyText: { color: '#999999', fontSize: 14, textAlign: 'center', width: '100%' },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#111111', paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#222222' },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  bottomNavText: { color: '#666666', fontSize: 11, fontWeight: '500' },
  bottomNavTextActive: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },
});

export default RecodeScreen;