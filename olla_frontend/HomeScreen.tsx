import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = ({ navigation }: any) => {
  // 💡 1. 달력으로 스크롤하기 위한 Ref (조종기 역할)
  const scrollViewRef = useRef<ScrollView>(null);

  // 💡 어떤 팝업을 띄울지 기억하는 State (null = 닫힘, 'QR' = QR팝업, 'Membership' = 회원권팝업)
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;

  // 💡 공통 팝업 열기 함수
  const openModal = (type: string) => {
    setActiveModal(type); 
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 50);
  };

  // 💡 공통 팝업 닫기 함수
  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 500, 
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveModal(null); // 애니메이션이 끝나면 어떤 팝업이든 완전히 닫음
    });
  };

  const handlePopupPress = (title: string) => {
    if (title === '공지사항') {
      navigation.navigate('Notice'); 
    } else if (title === 'QR') {
      openModal('QR'); // QR 팝업 열기
    } else if (title === '회원권') {
      openModal('Membership'); // 💡 회원권 팝업 열기 추가!
    } else if (title === '이번달 방문') {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } else {
      console.log(`${title} 클릭됨!`);
    }
  };

  // 💡 달력 구현을 위한 날짜 계산 (오늘 날짜 기준)
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0~11로 나옴 (0이 1월)
  const currentDate = today.getDate();

  // 이번 달의 총 일수와 1일의 요일 구하기
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // 달력 배열 만들기 (빈 칸 + 날짜)
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null); // 1일 시작 전 빈 칸
  for (let i = 1; i <= daysInMonth; i++) days.push(i); // 1일부터 말일까지

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <SafeAreaView style={styles.background}>
      
      {/* 1. 상단 네비게이션 바 */}
      <View style={styles.topNav}>
        <Text style={styles.logoText}>olla</Text>
        <TouchableOpacity onPress={() => handlePopupPress('알림')}>
          <Image source={require('./assets/Vector.png')} style={styles.topIcon} />
        </TouchableOpacity>
      </View>

      {/* 💡 여기에 ref={scrollViewRef} 를 달아주어 조종할 수 있게 합니다. */}
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          
          {/* 공지창 */}
          <TouchableOpacity style={styles.noticeCard} onPress={() => handlePopupPress('공지사항')}>
            <Text style={styles.noticeHeadline}>5월 OLLA 클라이밍장 세팅 일정 안내</Text>
            <Text style={styles.noticeBody}>오늘은 초보벽 ~ 월 금요일 세팅입니다.</Text>
          </TouchableOpacity>

          {/* QR & 회원권 */}
          <View style={styles.row}>
            <TouchableOpacity style={styles.QRCardCentered} onPress={() => handlePopupPress('QR')}>
              <Image source={require('./assets/QR.png')} style={styles.largeIcon} />
              <Text style={styles.cardTitleCentered}>QR 입장</Text>
              <Text style={styles.microSubTitle}>탭하여 입장</Text>
            </TouchableOpacity>
            
            {/* 💡 회원권 카드: aspectRatio: 1 속성이 제거되어 세로 길이가 QR 카드에 맞춰짐 */}
            <TouchableOpacity style={styles.UserCardCentered} onPress={() => handlePopupPress('회원권')}>
              <View style={styles.circleGraphDummy}>
                <Text style={styles.circleGraphText}>D-15</Text>
              </View>
              <Text style={styles.cardTitleCentered}>내 회원권</Text>
            </TouchableOpacity>
          </View>

          {/* 4개 데이터 프레임 */}
          <View style={styles.unifiedDataFrame}>
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('이번달 방문')}>
              <Text style={styles.microSubTitle}>이번달 방문</Text>
              <Text style={styles.microValue}>12<Text style={styles.microUnit}>회</Text></Text>
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('초보벽 최고 난이도')}>
              <Text style={styles.microSubTitle}>초보벽 난이도</Text>
              <Text style={[styles.microValuecolor, { color: '#000000' }]}>검정</Text>
              <Text style={[styles.microUnit, { color: '#ff0404' }]}>편도  <Text style={[styles.microUnit, { color: '#999999' }]}>  진행중</Text></Text>
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('지구력 랭킹')}>
              <Text style={styles.microSubTitle}>지구력 랭킹</Text>
              <Text style={styles.microValue}>15<Text style={styles.microUnit}>위</Text></Text>
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('지구력 최고기록')}>
              <Text style={styles.microSubTitle}>지구력 기록</Text>
              <Text style={styles.microValue}>8<Text style={styles.microUnit}>분</Text><Text style={styles.microValue}>30</Text><Text style={styles.microUnit}>초</Text></Text>
            </TouchableOpacity>
          </View>

          {/* 💡 추가된 베이직 달력 영역 */}
          <View style={styles.calendarCard}>
            {/* 년/월 헤더 */}
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarMonthText}>{currentYear}년 {currentMonth + 1}월</Text>
            </View>

            {/* 요일 표시 */}
            <View style={styles.weekRow}>
              {weekDays.map((day, index) => (
                <Text key={index} style={[styles.weekDayText, index === 0 && { color: '#FF6B6B' }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* 날짜 그리드 */}
            <View style={styles.daysGrid}>
              {days.map((day, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.dayCell} 
                  disabled={!day} 
                  onPress={() => day && handlePopupPress(`${day}일`)}
                >
                  {day ? (
                    <View style={[styles.dayCircle, day === currentDate && styles.todayCircle]}>
                      <Text style={[
                        styles.dayText, 
                        day === currentDate && styles.todayText, 
                        index % 7 === 0 && styles.sundayText // 일요일은 빨간색
                      ]}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
        </View>
      </ScrollView>

      {/* 3. 하단 네비게이션 바 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/Home.png')} style={styles.navIcon} /><Text style={styles.bottomNavTextActive}>홈</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('Recode')}><Image source={require('./assets/recode.png')} style={styles.navIcon} /><Text style={styles.bottomNavText}>기록</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/ranking.png')} style={styles.navIcon} /><Text style={styles.bottomNavText}>랭킹</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/community.png')} style={styles.navIcon} /><Text style={styles.bottomNavText}>커뮤니티</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/mypage.png')} style={styles.navIcon} /><Text style={styles.bottomNavText}>마이페이지</Text></TouchableOpacity>
      </View>

    {/* 💡 QR 하단 팝업 (Modal) 구현 */}
      {/* 💡 공통 하단 팝업 (Modal) */}
      <Modal 
        visible={activeModal !== null} 
        animationType="fade" 
        transparent={true} 
        onRequestClose={closeModal}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.dragHandle} />
            
            {/* 팝업 헤더 (제목 변경) */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {activeModal === 'QR' ? 'QR 체크인' : '회원권'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 💡 어떤 버튼을 눌렀느냐에 따라 내용이 바뀝니다 */}
            {activeModal === 'QR' ? (
              <>
                {/* QR 팝업 내용 */}
                <Image source={require('./assets/QR.png')} style={styles.largeQRImage} />
                <Text style={styles.qrDesc}>QR 코드를 카메라에 맞춰주세요</Text>
              </>
            ) : (
              <>
                {/* 💡 새로 추가된 회원권 팝업 내용 */}
                <View style={styles.membershipContainer}>
                  
                  {/* 상단: 남은 이용 기간 카드 */}
                  <View style={styles.memCard}>
                    <View style={styles.memCardHeader}>
                      <Text style={styles.memCardTitle}>남은 이용 기간</Text>
                      <Text style={styles.memCardBadge}>1개월권</Text>
                    </View>
                    
                    {/* 프로그레스 바 */}
                    <View style={styles.progressBarBg}>
                      <View style={styles.progressBarFill} />
                    </View>
                    
                    {/* 기간 텍스트 */}
                    <View style={styles.memCardDates}>
                      <Text style={styles.memDateText}>2026-02-01</Text>
                      <Text style={styles.memDateText}>2026-04-01</Text>
                    </View>
                  </View>

                  {/* 하단: 반반 나뉜 카드들 */}
                  <View style={styles.memRow}>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>남은 기간</Text>
                      <Text style={styles.memHalfValueGreen}>15일</Text>
                    </View>
                    
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>최근 이용</Text>
                      <Text style={styles.memHalfValueWhite}>3월 17일</Text>
                    </View>
                  </View>
                  
                </View>
              </>
            )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

// --- 스타일링 ---
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#A1BE44' },
  topIcon: { width: 24, height: 24, resizeMode: 'contain' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  
  noticeCard: { width: '100%', backgroundColor: '#2A2A2A', paddingVertical: 18, paddingHorizontal: 20, borderRadius: 12, marginBottom: 20 },
  noticeHeadline: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  noticeBody: { color: '#999999', fontSize: 13, fontWeight: '400' },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  QRCardCentered: { width: '60%', backgroundColor: '#2A2A2A', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', aspectRatio: 1 },
  // 💡 수정된 부분: aspectRatio: 1 제거됨
  UserCardCentered: { width: '38%', backgroundColor: '#2A2A2A', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  largeIcon: { width: 45, height: 45, marginBottom: 12, resizeMode: 'contain' },
  
  circleGraphDummy: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, borderColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  circleGraphText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  cardTitleCentered: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  unifiedDataFrame: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  innerTouchableMicro: { flex: 1, paddingVertical: 18, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  verticalDivider: { width: 1, backgroundColor: '#3D3D3D', marginVertical: 15 },
  microSubTitle: { color: '#999999', fontSize: 10, fontWeight: '500', marginBottom: 10, textAlign: 'center' },
  microValue: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  microValuecolor: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', 
    textShadowColor: '#ffffff', // 2. 테두리로 쓸 색상 (예: OLLA 초록색)
    textShadowOffset: { width: 1, height: 1 }, // 3. 그림자가 치우치는 방향
    textShadowRadius: 15, // 4. 그림자의 번짐 정도 (1~2로 낮게 주면 테두리처럼 보입니다)
  },
  microUnit: { fontSize: 11, color: '#999999' },

  // 💡 달력 스타일
  calendarCard: {
    width: '100%',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  calendarMonthText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayText: {
    color: '#999999',
    fontSize: 13,
    width: '14.28%', // 100%를 7개로 나눈 비율
    textAlign: 'center',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%', 
    aspectRatio: 1, // 정사각형 유지
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  sundayText: {
    color: '#FF6B6B', // 일요일은 빨간색으로 표시
  },
  todayCircle: {
    backgroundColor: '#A1BE44', // 오늘 날짜 동그라미 배경 (초록색)
  },
  todayText: {
    color: '#1A1A1A', // 오늘 날짜 글씨 색상 (어둡게)
    fontWeight: 'bold',
  },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#111111', paddingTop: 12, paddingBottom: 25, borderTopWidth: 1, borderTopColor: '#222222' },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  bottomNavText: { color: '#666666', fontSize: 11, fontWeight: '500' },
  bottomNavTextActive: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // 반투명 검은 배경
    justifyContent: 'flex-end', // 내용을 화면 맨 아래로 밀어냄
  },
  bottomSheet: {
    backgroundColor: '#1E1E1E', // 팝업창 배경색
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 50,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 20,
    alignSelf: 'center',
  },
  sheetHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeBtn: {
    color: '#999999',
    fontSize: 24,
    paddingHorizontal: 10,
  },
  qrDummyContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#D4FF00', // 네온 초록 임시 배경
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrDummyText: {
    color: '#1A1A1A',
    fontWeight: 'bold',
    fontSize: 18,
  },
  largeQRImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain', // 이미지 비율 유지
    marginBottom: 20, // 아래 텍스트와의 간격
  },
  qrDesc: {
    color: '#999999',
    fontSize: 14,
  },
  // 💡 회원권 팝업 전용 스타일
  membershipContainer: { width: '100%' },
  memCard: { backgroundColor: '#2A2A2A', borderRadius: 16, padding: 22, marginBottom: 15, width: '100%' },
  memCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  memCardTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  memCardBadge: { color: '#999999', fontSize: 14, fontWeight: '500' },
  progressBarBg: { height: 8, backgroundColor: '#444444', borderRadius: 4, marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#A1BE44', borderRadius: 4, width: '77%' }, // 💡 77% 만큼 채워짐
  memCardDates: { flexDirection: 'row', justifyContent: 'space-between' },
  memDateText: { color: '#999999', fontSize: 13 },
  
  memRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  memHalfCard: { backgroundColor: '#2A2A2A', borderRadius: 16, paddingVertical: 25, width: '48%', alignItems: 'center', justifyContent: 'center' },
  memHalfTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600', marginBottom: 12 },
  memHalfValueGreen: { color: '#A1BE44', fontSize: 24, fontWeight: 'bold' },
  memHalfValueWhite: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
});

export default HomeScreen;