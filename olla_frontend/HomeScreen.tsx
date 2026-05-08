import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  Alert,
  Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = 'http://172.29.145.90:8080/api/v1';

const HomeScreen = ({ navigation }: any) => {
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;

  const [qrToken, setQrToken] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState('');
  const [userStats, setUserStats] = useState({
    monthlyVisits: 0,        
    difficultyColor: '없음', 
    difficultyType: '',
    enduranceRank: 0,        
    enduranceMinutes: 0,     
    enduranceSeconds: 0,     
  });

  const [notice, setNotice] = useState({ title: '공지사항을 불러오는 중...', content: '' });
  const [membership, setMembership] = useState({
    membershipType: '-',
    remainingDays: 0,
    startDate: '',
    endDate: '',
    status: '',
    isLoading: true
  });

  const [attendedDates, setAttendedDates] = useState<number[]>([]);

  const fetchQrToken = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;

      const response = await axios.get(`${API_BASE_URL}/visit/qr`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (response.data && response.data.data) {
        setQrToken(response.data.data);
      }
    } catch (error) {
      console.error("QR 토큰 발급 실패:", error);
    }
  };

  const openModal = (type: string) => {
    setActiveModal(type); 
    if (type === 'QR') {
      setQrToken(null);
      fetchQrToken();
    }
    setTimeout(() => {
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 50);
  };

  const closeModal = () => {
    Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }).start(() => {
      setActiveModal(null);
    });
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) {
          setMembership(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const storedRole = await AsyncStorage.getItem('userRole');
        setUserRole(storedRole);

        const config = { headers: { Authorization: `Bearer ${userToken}` } };

        // [1] 내 프로필
        let nickname = '';
        try {
          const profileRes = await axios.get(`${API_BASE_URL}/members/me`, config);
          const pData = profileRes.data?.data || profileRes.data;
          nickname = pData.nickname || pData.name || '';
          setMyNickname(nickname);
        } catch (e) { console.error("프로필 로드 실패"); }

        // [2] 공지사항
        try {
          const noticeResponse = await axios.get(`${API_BASE_URL}/admin/notices`);
          const noticeList = noticeResponse.data?.data?.content;
          if (noticeList && noticeList.length > 0) {
            const latestNotice = noticeList[noticeList.length - 1]; 
            setNotice({ title: latestNotice.title, content: latestNotice.content });
          } else {
            setNotice({ title: '현재 등록된 공지가 없습니다.', content: '' });
          }
        } catch (e) { console.log("공지사항 실패"); }

        // [3] 회원권
        try {
          const memResponse = await axios.get(`${API_BASE_URL}/memberships/me`, config);
          const data = memResponse.data?.data || memResponse.data;

          if (data && data.endDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            
            const start = new Date(data.startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(data.endDate);
            end.setHours(0, 0, 0, 0);
            
            const diffTime = end.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            // 💡 기간 차이 계산을 통해 일일권 여부 판별 로직 추가
            const durationDiff = end.getTime() - start.getTime();
            const totalDurationDays = Math.round(durationDiff / (1000 * 60 * 60 * 24));

            let displayType = data.membershipType === 'PERIOD' ? '기간권' : '횟수권';
            // 시작일과 종료일 차이가 1일 이하라면 '일일권'으로 표시
            if (data.membershipType === 'PERIOD' && totalDurationDays <= 1) {
              displayType = '일일권';
            }

            setMembership({
              membershipType: displayType,
              remainingDays: diffDays >= 0 ? diffDays : 0, 
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              status: data.status === 'ACTIVE' ? '이용중' : '만료',
              isLoading: false
            });
          } else {
            setMembership(prev => ({ ...prev, isLoading: false }));
          }
        } catch (e) { setMembership(prev => ({ ...prev, isLoading: false })); }

        // [4] 기록
        if (nickname) {
          let bestColor = '없음';
          let bestType = '';
          let myEndRank = 0;
          let myEndMin = 0;
          let myEndSec = 0;

          try {
            const endRes = await axios.get(`${API_BASE_URL}/rankings/endurance/distance`, config);
            const endList = extractList(endRes.data?.data || endRes.data);
            const myEndRecord = endList.find((item: any) => (item.name === nickname || item.nickname === nickname));
            
            if (myEndRecord) {
              endList.sort((a: any, b: any) => {
                 if(a.ranking && b.ranking) return a.ranking - b.ranking;
                 return (b.oneWayCount || 0) - (a.oneWayCount || 0); 
              });
              const myRankIndex = endList.findIndex((item: any) => (item.name === nickname || item.nickname === nickname));
              myEndRank = myRankIndex !== -1 ? myRankIndex + 1 : 0;
              const totalSec = myEndRecord.timeSeconds || 0;
              myEndMin = Math.floor(totalSec / 60);
              myEndSec = totalSec % 60;
            }
          } catch (e) { console.log("지구력 기록 로드 실패", e); }

          try {
            const reverseColors = [
              { name: '검정', enum: 'BLACK' }, { name: '주황', enum: 'ORANGE' }, { name: '보라', enum: 'PURPLE' },
              { name: '빨강', enum: 'RED' }, { name: '파랑', enum: 'BLUE' }, { name: '초록', enum: 'GREEN' },
              { name: '노랑', enum: 'YELLOW' }, { name: '흰색', enum: 'WHITE' }
            ];

            for (const c of reverseColors) {
              const bRes = await axios.get(`${API_BASE_URL}/rankings/beginner?difficulty=${c.enum}`, config);
              const bList = extractList(bRes.data?.data || bRes.data);
              const myBRecord = bList.find((item: any) => (item.name === nickname || item.nickname === nickname));
              
              if (myBRecord) {
                bestColor = c.name;
                const attemptType = myBRecord.attemptType || myBRecord.attempt_type || myBRecord.type || '';
                const isRoundTrip = String(attemptType).toUpperCase() === 'ROUND_TRIP' || attemptType === '왕복';
                bestType = isRoundTrip ? '왕복' : '편도';
                break;
              }
            }
          } catch (e) { console.log("초보벽 기록 로드 실패", e); }

          setUserStats(prev => ({
            ...prev,
            difficultyColor: bestColor,
            difficultyType: bestType,
            enduranceRank: myEndRank,
            enduranceMinutes: myEndMin,
            enduranceSeconds: myEndSec
          }));
        }

      } catch (error) {
        console.error("데이터 전체 로드 중 오류:", error);
      }
    };

    fetchData();
  }, []);

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedFullDate, setSelectedFullDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchVisitHistory = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) return;

        const year = viewDate.getFullYear();
        const month = String(viewDate.getMonth() + 1).padStart(2, '0');
        const yearMonth = `${year}-${month}`; 

        const response = await axios.get(`${API_BASE_URL}/visit/my-history?yearMonth=${yearMonth}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        
        let rawData = response.data?.data;
        if (rawData && !Array.isArray(rawData) && rawData.data) {
          rawData = rawData.data;
        }

        let daysAttended: number[] = [];

        if (Array.isArray(rawData)) {
          daysAttended = rawData.map((item: any) => {
            if (typeof item === 'string') {
              const parts = item.split('-');
              if (parts.length >= 3) return parseInt(parts[2], 10);
            } 
            else if (Array.isArray(item) && item.length >= 3) {
              return parseInt(item[2], 10);
            }
            return -1; 
          }).filter((day: number) => day > 0 && !isNaN(day)); 
        }

        setAttendedDates(daysAttended || []);

        if (year === today.getFullYear() && viewDate.getMonth() === today.getMonth()) {
          setUserStats(prev => ({
            ...prev,
            monthlyVisits: daysAttended.length
          }));
        }

      } catch (error) {
        console.error("출석 내역 로드 실패:", error);
        setAttendedDates([]);
      }
    };

    fetchVisitHistory();
  }, [viewDate.getFullYear(), viewDate.getMonth()]);

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

  const hasMembership = !!membership.startDate && !!membership.endDate;

  const handlePopupPress = (title: string) => {
    if (title === '공지사항') {
      navigation.navigate('Notice');
    } else if (title === 'QR') {
      if (!hasMembership) {
        Alert.alert(
          "입장 불가",
          "현재 활성화된 회원권이 없습니다. 이용권을 먼저 구매해주세요.",
          [{ text: "확인" }]
        );
        return;
      }
      openModal('QR');
    } else if (title === '회원권') {
      openModal('Membership');
    } else if (title === '이번달 방문') {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } else if (title === '지구력 랭킹') {
      navigation.navigate('Ranking', { targetTab: '지구력' });
    }
  };

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
              <View style={[
                styles.circleGraphDummy, 
                !hasMembership && { borderColor: '#444444' }
              ]}>
                <Text style={[
                  styles.circleGraphText,
                  !hasMembership && { color: '#999999', fontSize: 13 }
                ]}>
                  {membership.isLoading ? '' : (hasMembership ? `D-${membership.remainingDays}` : '없음')}
                </Text>
              </View>
              {/* 💡 회원권 종류가 일일권이면 '일일권', 아니면 해당 텍스트 출력되게 수정 */}
              <Text style={styles.cardTitleCentered}>
                {hasMembership ? membership.membershipType : '회원권'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.unifiedDataFrame}>
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('이번달 방문')}>
              <Text style={styles.microSubTitle}>이번달 방문</Text>
              <Text style={styles.microValue}>{userStats.monthlyVisits}<Text style={styles.microUnit}>회</Text></Text>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => navigation.navigate('Recode', { openSection: 'difficulty' })}>
              <Text style={styles.microSubTitle}>초보벽 {'\n'}최고 난이도</Text>
              {userStats.difficultyColor === '없음' ? (
                <Text style={styles.microValuecolor}>미기록</Text>
              ) : (
                <>
                  <Text style={styles.microValuecolor}>{userStats.difficultyColor}</Text>
                  <Text style={styles.microUnit}>{userStats.difficultyType} <Text style={{color: '#999999'}}>완료</Text></Text>
                </>
              )}
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('지구력 랭킹')}>
              <Text style={styles.microSubTitle}>지구력 랭킹</Text>
              <Text style={styles.microValue}>{userStats.enduranceRank === 0 ? '-' : userStats.enduranceRank}<Text style={styles.microUnit}>위</Text></Text>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => navigation.navigate('Recode', { openSection: 'endurance' })}>
              <Text style={styles.microSubTitle}>지구력 {'\n'}최고 기록</Text>
              <Text style={styles.microValue}>{userStats.enduranceMinutes}<Text style={styles.microUnit}>분 </Text>{userStats.enduranceSeconds}<Text style={styles.microUnit}>초</Text></Text>
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
                const isToday = day !== null && today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
                const isSelected = selectedFullDate !== null && day !== null && selectedFullDate.getDate() === day && selectedFullDate.getMonth() === currentMonth && selectedFullDate.getFullYear() === currentYear;
                
                const isAttended = day !== null && (attendedDates || []).includes(day);
                
                return (
                  <TouchableOpacity key={index} style={styles.dayCell} disabled={!day} onPress={() => day && onDateClick(day)}>
                    {day ? (
                      <View style={[
                        styles.dayCircle, 
                        isToday && styles.todayCircle, 
                        isSelected && !isToday && styles.selectedCircle,
                        isAttended && !isToday && !isSelected && styles.attendedCircle
                      ]}>
                        <Text style={[
                          styles.dayText, 
                          isToday && styles.todayText, 
                          isSelected && !isToday && styles.selectedText,
                          isAttended && !isToday && !isSelected && styles.attendedText, 
                          index % 7 === 0 && !isToday && !isSelected && !isAttended && styles.sundayText
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
                {/* 💡 모달 타이틀에도 일일권 여부 반영 */}
                <Text style={styles.sheetTitle}>
                  {activeModal === 'QR' ? 'QR 체크인' : (hasMembership ? membership.membershipType : '회원권')}
                </Text>
                <TouchableOpacity onPress={closeModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
              
              {activeModal === 'QR' ? (
                <>
                  <View style={{ marginBottom: 20, alignItems: 'center', justifyContent: 'center', height: 200, width: 200 }}>
                    {qrToken ? (
                      <View style={{ padding: 10, backgroundColor: '#ffffff', borderRadius: 10 }}>
                        <QRCode 
                          value={qrToken} 
                          size={180} 
                          color="black"
                          backgroundColor="white"
                        />
                      </View>
                    ) : (
                      <Text style={{ color: '#999999' }}>QR 코드를 불러오는 중...</Text>
                    )}
                  </View>
                  <Text style={styles.qrDesc}>QR 코드를 출입기계 카메라에 맞춰주세요</Text>
                  <Text style={{ color: '#FF6B6B', fontSize: 12, marginTop: 10 }}>※ 발급된 QR 코드는 3분 뒤 만료됩니다.</Text>
                </>
              ) : (
                <View style={styles.membershipContainer}>
                  <View style={styles.memCard}>
                    <View style={styles.memCardHeader}>
                      <Text style={styles.memCardTitle}>남은 이용 기간</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[
                        styles.progressBarFill, 
                        { width: `${Math.min((membership.remainingDays / 30) * 100, 100)}%` },
                        !hasMembership && { backgroundColor: 'transparent' }
                      ]} />
                    </View>
                    <View style={[styles.memCardDates, !hasMembership && { justifyContent: 'center' }]}>
                      {hasMembership ? (
                        <>
                          <Text style={styles.memDateText}>{membership.startDate}</Text>
                          <Text style={styles.memDateText}>{membership.endDate}</Text>
                        </>
                      ) : (
                        <Text style={styles.memDateText}>구매 필요</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.memRow}>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>남은 기간</Text>
                      <Text style={[
                        styles.memHalfValueGreen,
                        !hasMembership && { color: '#999999', fontSize: 16 }
                      ]}>
                        {hasMembership ? `${membership.remainingDays}일` : '구매 필요'}
                      </Text>
                    </View>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>상태</Text>
                      <Text style={[
                        styles.memHalfValueWhite, 
                        !hasMembership && { fontSize: 16, color: '#FF6B6B' }
                      ]}>
                        {hasMembership ? membership.status : '구매 필요'}
                      </Text>
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
  selectedCircle: { backgroundColor: '#5DADE2' }, 
  selectedText: { color: '#000000', fontWeight: 'bold' },
  
  attendedCircle: { backgroundColor: '#3A3A3A', borderWidth: 1.5, borderColor: '#A1BE44' },
  attendedText: { color: '#A1BE44', fontWeight: 'bold' },

  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  closeBtn: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
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