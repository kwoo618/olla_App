import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = ({ navigation }: any) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // 1️⃣ 공지사항 및 회원권 상태 관리
  const [notice, setNotice] = useState({ title: '공지사항을 불러오는 중...', content: '' });
  const [membership, setMembership] = useState({
    membershipType: '-',
    remainingDays: 0,
    startDate: '',
    endDate: '',
    status: '',
    isLoading: true
  });

  // 2️⃣ 데이터 로드 통합 API 호출 (토큰 기반)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        
        // 📢 공지사항 로드
        const noticeResponse = await axios.get('http://172.30.1.54:8080/api/v1/admin/notices');
        const noticeList = noticeResponse.data?.data?.content;

        if (noticeList && noticeList.length > 0) {
          const latestNotice = noticeList[noticeList.length - 1]; 
          setNotice({ title: latestNotice.title, content: latestNotice.content });
        } else {
          setNotice({ title: '현재 등록된 공지가 없습니다.', content: '' });
        }

        // 🎫 회원권 정보 로드
        if (userToken) {
          const memResponse = await axios.get('http://172.30.1.54:8080/api/v1/memberships/me', {
            headers: { Authorization: `Bearer ${userToken}` }
          });

          // 백엔드 응답 구조에 맞춰 데이터 추출
          const data = memResponse.data?.data || memResponse.data;

          if (data && data.endDate) {
            // 🔥 D-Day 계산 로직
            const today = new Date();
            today.setHours(0, 0, 0, 0); // 시간차 제외 일자만 계산
            const end = new Date(data.endDate);
            end.setHours(0, 0, 0, 0);
            
            const diffTime = end.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            setMembership({
              // PERIOD -> "기간권", 그 외 -> "횟수권"
              membershipType: data.membershipType === 'PERIOD' ? '기간권' : '횟수권',
              remainingDays: diffDays >= 0 ? diffDays : 0, 
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              status: data.status === 'ACTIVE' ? '이용중' : '만료',
              isLoading: false
            });
          }
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        setMembership(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchData();
  }, []);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;

  const openModal = (type: string) => {
    setActiveModal(type); 
    setTimeout(() => {
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 50);
  };

  const closeModal = () => {
    Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }).start(() => {
      setActiveModal(null);
    });
  };

  const handlePopupPress = (title: string) => {
    if (title === '공지사항') navigation.navigate('Notice'); 
    else if (title === 'QR') openModal('QR');
    else if (title === '회원권') openModal('Membership');
    else if (title === '이번달 방문') scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // 달력 관련 로직
  const today = new Date();

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedFullDate, setSelectedFullDate] = useState<Date | null>(null);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    if (newDate.getFullYear() >= 2020 && newDate.getFullYear() <= 2120) setViewDate(newDate);
  };
  const onDateClick = (day: number) => {
    const newSelected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedFullDate(newSelected);
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <SafeAreaView style={styles.background}>
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          <TouchableOpacity style={styles.noticeCard} onPress={() => handlePopupPress('공지사항')}>
            <View style={styles.noticeHeaderRow}>
               <View style={styles.noticeBadge}><Text style={styles.noticeBadgeText}>중요</Text></View>
               <Text style={styles.noticeHeadline} numberOfLines={1}>{notice.title}</Text>
            </View>
            <Text style={styles.noticeBody} numberOfLines={1}>{notice.content}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity style={styles.QRCardCentered} onPress={() => handlePopupPress('QR')}>
              <Image source={require('./assets/QR.png')} style={styles.largeIcon} />
              <Text style={styles.cardTitleCentered}>QR 입장</Text>
              <Text style={styles.microSubTitle}>탭하여 입장</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.UserCardCentered} onPress={() => handlePopupPress('회원권')}>
              <View style={styles.circleGraphDummy}>
                <Text style={styles.circleGraphText}>
                  {membership.isLoading ? '...' : `D-${membership.remainingDays}`}
                </Text>
              </View>
              <Text style={styles.cardTitleCentered}>내 회원권</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.unifiedDataFrame}>
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('이번달 방문')}>
              <Text style={styles.microSubTitle}>이번달 방문</Text>
              <Text style={styles.microValue}>12<Text style={styles.microUnit}>회</Text></Text>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => navigation.navigate('Recode', { openSection: 'difficulty' })}>
              <Text style={styles.microSubTitle}>초보벽 난이도</Text>
              <Text style={styles.microValuecolor}>검정</Text>
              <Text style={styles.microUnit}>편도  <Text style={{color: '#999999'}}>진행중</Text></Text>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('지구력 랭킹')}>
              <Text style={styles.microSubTitle}>지구력 랭킹</Text>
              <Text style={styles.microValue}>15<Text style={styles.microUnit}>위</Text></Text>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => navigation.navigate('Recode', { openSection: 'endurance' })}>
              <Text style={styles.microSubTitle}>지구력 기록</Text>
              <Text style={styles.microValue}>8<Text style={styles.microUnit}>분</Text>30<Text style={styles.microUnit}>초</Text></Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}><Text style={styles.arrowText}>{"<"}</Text></TouchableOpacity>
              <Text style={styles.calendarMonthText}>{currentYear}년 {currentMonth + 1}월</Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}><Text style={styles.arrowText}>{">"}</Text></TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {weekDays.map((day, index) => (<Text key={index} style={[styles.weekDayText, index === 0 && { color: '#FF6B6B' }]}>{day}</Text>))}
            </View>
            <View style={styles.daysGrid}>
              {days.map((day, index) => {
                // 💡 오늘 날짜인지 확인
                const isToday = day !== null && today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
                // 💡 사용자가 탭한 선택된 날짜인지 확인
                const isSelected = selectedFullDate !== null && day !== null && selectedFullDate.getDate() === day && selectedFullDate.getMonth() === currentMonth && selectedFullDate.getFullYear() === currentYear;
                
                return (
                  <TouchableOpacity key={index} style={styles.dayCell} disabled={!day} onPress={() => day && onDateClick(day)}>
                    {day ? (
                      <View style={[
                        styles.dayCircle, 
                        isToday && styles.todayCircle, 
                        isSelected && !isToday && styles.selectedCircle // 💡 오늘이 아닌데 클릭했을 땐 선택된 색상 적용
                      ]}>
                        <Text style={[
                          styles.dayText, 
                          isToday && styles.todayText, 
                          isSelected && !isToday && styles.selectedText, // 💡 텍스트 색상 변경
                          index % 7 === 0 && !isToday && !isSelected && styles.sundayText
                        ]}>
                          {day}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={activeModal !== null} animationType="fade" transparent={true} onRequestClose={closeModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{activeModal === 'QR' ? 'QR 체크인' : '회원권'}</Text>
                <TouchableOpacity onPress={closeModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
              {activeModal === 'QR' ? (
                <>
                  <Image source={require('./assets/QR.png')} style={styles.largeQRImage} />
                  <Text style={styles.qrDesc}>QR 코드를 카메라에 맞춰주세요</Text>
                </>
              ) : (
                <View style={styles.membershipContainer}>
                  <View style={styles.memCard}>
                    <View style={styles.memCardHeader}>
                      <Text style={styles.memCardTitle}>남은 이용 기간</Text>
                      <Text style={styles.memCardBadge}>{membership.membershipType}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      {/* 30일 기준 프로그레스 바 계산 */}
                      <View style={[styles.progressBarFill, { width: `${Math.min((membership.remainingDays / 30) * 100, 100)}%` }]} />
                    </View>
                    <View style={styles.memCardDates}>
                      <Text style={styles.memDateText}>{membership.startDate || '-'}</Text>
                      <Text style={styles.memDateText}>{membership.endDate || '-'}</Text>
                    </View>
                  </View>
                  <View style={styles.memRow}>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>남은 기간</Text>
                      <Text style={styles.memHalfValueGreen}>{membership.remainingDays}일</Text>
                    </View>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>상태</Text>
                      <Text style={styles.memHalfValueWhite}>{membership.status || '확인불가'}</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#A1BE44' },
  topIcon: { width: 24, height: 24, resizeMode: 'contain' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  noticeCard: { width: '100%', backgroundColor: '#2A2A2A', paddingVertical: 18, paddingHorizontal: 20, borderRadius: 12, marginBottom: 20 },
  noticeHeadline: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  noticeBody: { color: '#999999', fontSize: 13, fontWeight: '400' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  QRCardCentered: { width: '60%', backgroundColor: '#2A2A2A', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
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
  microValuecolor: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  microUnit: { fontSize: 11, color: '#999999' },
  calendarCard: { width: '100%', backgroundColor: '#2A2A2A', borderRadius: 16, padding: 20, marginBottom: 20 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  monthArrow: { padding: 10 },
  arrowText: { color: '#A1BE44', fontSize: 20, fontWeight: 'bold' },
  calendarMonthText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { color: '#999999', fontSize: 13, width: '14.28%', textAlign: 'center', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  sundayText: { color: '#FF6B6B' },
  todayCircle: { backgroundColor: '#A1BE44' },
  todayText: { color: '#1A1A1A', fontWeight: 'bold' },
  
  // 💡 선택된 날짜에 들어가는 스타일 (파란색 계열)
  selectedCircle: { backgroundColor: '#5DADE2' }, 
  selectedText: { color: '#000000', fontWeight: 'bold' },

  noticeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeBadge: {
    backgroundColor: '#A1BE44',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  noticeBadgeText: {
    color: '#1A1A1A',
    fontSize: 10,
    fontWeight: 'bold',
  },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#111111', paddingTop: 12, paddingBottom: 25, borderTopWidth: 1, borderTopColor: '#222222' },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  bottomNavText: { color: '#666666', fontSize: 11, fontWeight: '500' },
  bottomNavTextActive: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  closeBtn: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
  largeQRImage: { width: 200, height: 200, resizeMode: 'contain', marginBottom: 20 },
  qrDesc: { color: '#999999', fontSize: 14 },
  membershipContainer: { width: '100%' },
  memCard: { backgroundColor: '#2A2A2A', borderRadius: 16, padding: 22, marginBottom: 15, width: '100%' },
  memCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  memCardTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  memCardBadge: { color: '#999999', fontSize: 14, fontWeight: '500' },
  progressBarBg: { height: 8, backgroundColor: '#444444', borderRadius: 4, marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#A1BE44', borderRadius: 4 },
  memCardDates: { flexDirection: 'row', justifyContent: 'space-between' },
  memDateText: { color: '#999999', fontSize: 13 },
  memRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  memHalfCard: { backgroundColor: '#2A2A2A', borderRadius: 16, paddingVertical: 25, width: '48%', alignItems: 'center', justifyContent: 'center' },
  memHalfTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600', marginBottom: 12 },
  memHalfValueGreen: { color: '#A1BE44', fontSize: 24, fontWeight: 'bold' },
  memHalfValueWhite: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
});

export default HomeScreen;