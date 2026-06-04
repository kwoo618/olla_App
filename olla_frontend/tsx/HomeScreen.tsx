import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, RefreshControl, Dimensions, PanResponder, TouchableWithoutFeedback } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import { HomeData } from '../ts/Home';

const HomeScreen = ({ navigation }: any) => {
  const {
    refreshing, resultModalVisible, resultModalConfig, qrToken, userStats, notice,
    membership, attendedDates, viewDate, selectedFullDate, today,
    setQrToken, fetchQrToken, showResultModal, closeResultModal, changeMonth, onDateClick, onRefresh
  } = HomeData();

  const scrollViewRef = useRef<ScrollView>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const QR_MODAL_HEIGHT = SCREEN_HEIGHT * 0.55;
  const MEMBERSHIP_MODAL_HEIGHT = SCREEN_HEIGHT * 0.53;

  const modalHeightAnim = useRef(new Animated.Value(0)).current;
  const currentSnap = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        modalHeightAnim.setOffset(currentSnap.current);
        modalHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        modalHeightAnim.setValue(Math.min(0, -gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        modalHeightAnim.flattenOffset();
        const finalHeight = currentSnap.current - gestureState.dy;
        const CLOSE_THRESHOLD = currentSnap.current * 0.7;
        if (finalHeight < CLOSE_THRESHOLD) closeModal();
        else Animated.spring(modalHeightAnim, { toValue: currentSnap.current, useNativeDriver: false }).start();
      }
    })
  ).current;

  const openModal = (type: string) => {
    setActiveModal(type);
    if (type === 'QR') {
      setQrToken(null);
      fetchQrToken();
    }
    const targetHeight = type === 'QR' ? QR_MODAL_HEIGHT : MEMBERSHIP_MODAL_HEIGHT;
    currentSnap.current = targetHeight;
    modalHeightAnim.setValue(0);
    Animated.timing(modalHeightAnim, { toValue: targetHeight, duration: 300, useNativeDriver: false }).start();
  };

  const closeModal = () => {
    Animated.timing(modalHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setActiveModal(null);
    });
  };

  const isCountType = membership.membershipType === '일일권';
  const hasMembership = isCountType ? membership.remainingCount > 0 : !!(membership.startDate && membership.endDate);
  const isTodayAttended = viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth() && attendedDates.includes(today.getDate());

  let displayStatus = membership.status;
  if (isCountType && membership.status === '이용중') displayStatus = isTodayAttended ? '이용중' : '미사용';

  const handlePopupPress = (title: string) => {
    if (title === '공지사항') navigation.navigate('Notice');
    else if (title === 'QR') {
      if (!hasMembership) {
        if (membership.hasFuture) showResultModal('입장 불가!', `${membership.futureStartDate}부터 이용 가능합니다.`, 'info');
        else showResultModal('입장 불가!', '현재 활성화된 이용권이 없습니다. 이용권을 먼저 구매해주세요.', 'info');
        return;
      }
      openModal('QR');
    }
    else if (title === '회원권') openModal('Membership');
    else if (title === '이번달 방문') scrollViewRef.current?.scrollToEnd({ animated: true });
    else if (title === '지구력 랭킹') navigation.navigate('Ranking', { targetTab: '지구력' });
  };

  // 💡 원형 그래프용: 형광색 = 남은 비율 (줄어들수록 다 써감)
  // 💡 가로 바용: 형광색 = 사용한 비율 (늘어날수록 다 써감)
  let circleRemainPercentage = 0; // 원형: 남은 비율 → 형광색
  let barUsedPercentage = 0;      // 가로 바: 사용한 비율 → 형광색

  if (!isCountType && hasMembership && membership.startDate && membership.endDate) {
    const s = new Date(membership.startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(membership.endDate); e.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const remainDays = Math.max(0, membership.remainingDays);
    const usedDays = totalDays - remainDays;

    circleRemainPercentage = Math.min((remainDays / totalDays) * 100, 100); // 남은 비율
    barUsedPercentage = Math.min((usedDays / totalDays) * 100, 100);        // 사용한 비율
  } else if (isCountType && hasMembership) {
    circleRemainPercentage = 100;
    barUsedPercentage = 0;
  }

  const circleText = membership.isLoading ? '' : hasMembership ? (isCountType ? `${membership.remainingCount}회` : `D-${membership.remainingDays}`) : membership.hasFuture ? '예정' : '없음';
  const membershipCardTitle = hasMembership ? membership.membershipType : membership.hasFuture ? '시작 예정' : '이용권';

  // 달력 렌더링용 변수들
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days: (number | null)[] = [...Array(firstDayOfMonth).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  // 💡 원형 프로그레스 바: 형광색이 남은 비율만큼 표시
  const circleRadius = 21;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - circleRemainPercentage / 100);

  return (
    <View style={styles.background}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}
      >
        <TouchableOpacity style={styles.noticeCard} onPress={() => handlePopupPress('공지사항')}>
          <View style={styles.noticeHeaderRow}>
            {notice.important && <View style={styles.noticeBadge}><Text style={styles.noticeBadgeText}>중요</Text></View>}
            <Text style={styles.noticeHeadline} numberOfLines={1}>{notice.title}</Text>
          </View>
          <Text style={styles.noticeBody} numberOfLines={1}>{notice.content}</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity style={styles.QRCardCentered} onPress={() => handlePopupPress('QR')}>
            <Image source={require('../assets/QR.png')} style={styles.largeIcon} />
            <Text style={styles.cardTitleCentered} numberOfLines={1} adjustsFontSizeToFit>QR 입장</Text>
            <Text style={styles.microSubTitle}>탭하여 입장</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.UserCardCentered} onPress={() => handlePopupPress('회원권')}>
            <View style={styles.circleGraphContainer}>
              {hasMembership && circleRemainPercentage > 0 ? (
                <Svg width="50" height="50" viewBox="0 0 50 50">
                  {/* 회색 배경 원 (사용한 만큼 회색으로 보임) */}
                  <Circle cx="25" cy="25" r="21" stroke="#444444" strokeWidth="4" fill="none" />
                  {/* 형광색 = 남은 비율 */}
                  <Circle
                    cx="25" cy="25" r="21"
                    stroke="#A1BE44"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${circleCircumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin="25, 25"
                  />
                </Svg>
              ) : (
                <View style={[styles.circleGraphDummy, !hasMembership && !membership.hasFuture && { borderColor: '#444444' }]} />
              )}
              <View style={styles.circleTextWrapper}>
                <Text style={[
                  styles.circleGraphText,
                  !hasMembership && { color: '#999999', fontSize: 13 },
                  !hasMembership && membership.hasFuture && { color: '#A1BE44', fontSize: 13 }
                ]}>
                  {circleText}
                </Text>
              </View>
            </View>

            <Text style={styles.cardTitleCentered}>{membershipCardTitle}</Text>
            {!hasMembership && membership.hasFuture && <Text style={styles.futureStartDateText}>{membership.futureStartDate}</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.unifiedDataFrame}>
          <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('이번달 방문')}>
            <Text style={styles.microSubTitle}>이번달 방문</Text>
            <Text style={styles.microValue} numberOfLines={1} adjustsFontSizeToFit>{userStats.monthlyVisits}<Text style={styles.microUnit}>회</Text></Text>
          </TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => navigation.navigate('Recode', { openSection: 'difficulty' })}>
            <Text style={styles.microSubTitle}>초보벽 {'\n'}최고 난이도</Text>
            {userStats.difficultyColor === '없음' ? (
              <Text style={styles.microValuecolor} numberOfLines={1} adjustsFontSizeToFit>미기록</Text>
            ) : (
              <>
                <Text style={styles.microValuecolor} numberOfLines={1} adjustsFontSizeToFit>{userStats.difficultyColor}</Text>
                <Text style={styles.microUnit}>{userStats.difficultyType} <Text style={{ color: '#999999' }}>{userStats.difficultyStatus}</Text></Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => handlePopupPress('지구력 랭킹')}>
            <Text style={styles.microSubTitle}>지구력 랭킹</Text>
            <Text style={styles.microValue} numberOfLines={1} adjustsFontSizeToFit>{userStats.enduranceRank === 0 ? '-' : userStats.enduranceRank}<Text style={styles.microUnit}>위</Text></Text>
          </TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity style={styles.innerTouchableMicro} onPress={() => navigation.navigate('Recode', { openSection: 'endurance' })}>
            <Text style={styles.microSubTitle}>지구력 {'\n'}최고 기록</Text>
            <Text style={styles.microValue} numberOfLines={1} adjustsFontSizeToFit>{userStats.enduranceMinutes}<Text style={styles.microUnit}>분 </Text>{userStats.enduranceSeconds}<Text style={styles.microUnit}>초</Text></Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}><Text style={styles.arrowText}>{'<'}</Text></TouchableOpacity>
            <Text style={styles.calendarMonthText}>{currentYear}년 {currentMonth + 1}월</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}><Text style={styles.arrowText}>{'>'}</Text></TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {weekDays.map((day, index) => <Text key={index} style={[styles.weekDayText, index === 0 && { color: '#FF6B6B' }]}>{day}</Text>)}
          </View>
          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isToday = day !== null && today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
              const isSelected = selectedFullDate !== null && day !== null && selectedFullDate.getDate() === day && selectedFullDate.getMonth() === currentMonth && selectedFullDate.getFullYear() === currentYear;
              const isAttended = day !== null && attendedDates.includes(day);

              return (
                <TouchableOpacity key={index} style={styles.dayCell} disabled={!day} onPress={() => day && onDateClick(day)}>
                  {day ? (
                    <View style={[styles.dayCircle, isToday && styles.todayCircle, isSelected && !isToday && styles.selectedCircle, isAttended && !isToday && !isSelected && styles.attendedCircle]}>
                      <Text style={[styles.dayText, isToday && styles.todayText, isSelected && !isToday && styles.selectedText, isAttended && !isToday && !isSelected && styles.attendedText, index % 7 === 0 && !isToday && !isSelected && !isAttended && styles.sundayText]}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={closeResultModal}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={closeResultModal}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal !== null} animationType="fade" transparent={true} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: modalHeightAnim }]}>
            <View {...panResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{activeModal === 'QR' ? 'QR 체크인' : (hasMembership ? membership.membershipType : (membership.hasFuture ? '시작 예정' : '이용권'))}</Text>
                <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
              {activeModal === 'QR' ? (
                <>
                  <View style={{ marginBottom: 20, alignItems: 'center', justifyContent: 'center', height: 200, width: 200 }}>
                    {qrToken ? (
                      <View style={{ padding: 10, backgroundColor: '#ffffff', borderRadius: 10 }}>
                        <QRCode value={qrToken} size={180} color="black" backgroundColor="white" />
                      </View>
                    ) : <Text style={{ color: '#999999' }}>QR 코드를 불러오는 중...</Text>}
                  </View>
                  <Text style={styles.qrDesc}>QR 코드를 출입기계 카메라에 맞춰주세요</Text>
                  <Text style={{ color: '#FF6B6B', fontSize: 14, marginTop: 10 }}>※ 발급된 QR 코드는 3분 뒤 만료됩니다.</Text>
                </>
              ) : (
                <View style={styles.membershipContainer}>
                  <View style={styles.memCard}>
                    <View style={styles.memCardHeader}>
                      <Text style={styles.memCardTitle}>{isCountType ? '잔여 횟수' : (membership.hasFuture && !hasMembership ? '시작 예정' : '남은 이용 기간')}</Text>
                    </View>
                    {/* 💡 가로 프로그레스 바: 형광색 = 사용한 만큼 */}
                    {!isCountType && hasMembership && (
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${barUsedPercentage}%` }]} />
                      </View>
                    )}
                    <View style={[styles.memCardDates, (!hasMembership) && { justifyContent: 'center' }]}>
                      {hasMembership ? (
                        isCountType ? <Text style={[styles.memDateText, { fontSize: 18, color: '#A1BE44' }]}>{membership.remainingCount}회 남음</Text>
                        : <><Text style={styles.memDateText}>{membership.startDate}</Text><Text style={styles.memDateText}>{membership.endDate}</Text></>
                      ) : membership.hasFuture ? (
                        <Text style={[styles.memDateText, { color: '#A1BE44', fontSize: 16 }]}>{membership.futureStartDate} 시작 예정</Text>
                      ) : <Text style={styles.memDateText}>구매 필요</Text>}
                    </View>
                  </View>
                  <View style={styles.memRow}>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>{isCountType ? '잔여 횟수' : '남은 기간'}</Text>
                      <Text style={[styles.memHalfValueGreen, !hasMembership && !membership.hasFuture && { color: '#999999', fontSize: 18 }, !hasMembership && membership.hasFuture && { color: '#A1BE44', fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>
                        {hasMembership ? (isCountType ? `${membership.remainingCount}회` : `${membership.remainingDays}일`) : (membership.hasFuture ? '시작 예정' : '구매 필요')}
                      </Text>
                    </View>
                    <View style={styles.memHalfCard}>
                      <Text style={styles.memHalfTitle}>상태</Text>
                      <Text style={[styles.memHalfValueWhite, !hasMembership && !membership.hasFuture && { fontSize: 18, color: '#FF6B6B' }, !hasMembership && membership.hasFuture && { fontSize: 18, color: '#A1BE44' }]} numberOfLines={1} adjustsFontSizeToFit>
                        {displayStatus || (hasMembership ? '이용중' : '구매 필요')}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 60 },

  noticeCard: { width: '100%', backgroundColor: '#2A2A2A', paddingVertical: 18, paddingHorizontal: 20, borderRadius: 12, marginBottom: 20 },
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' },
  noticeHeadline: { color: '#ffffff', fontSize: 18, fontWeight: '600', flex: 1 },
  noticeBody: { color: '#999999', fontSize: 15, fontWeight: '400' },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  QRCardCentered: { width: '60%', backgroundColor: '#2A2A2A', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  UserCardCentered: { width: '38%', backgroundColor: '#2A2A2A', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  largeIcon: { width: 45, height: 45, marginBottom: 10, resizeMode: 'contain', tintColor: '#A1BE44' },

  circleGraphContainer: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  circleTextWrapper: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  circleGraphDummy: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, borderColor: '#A1BE44', justifyContent: 'center', alignItems: 'center' },
  circleGraphText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },

  cardTitleCentered: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  futureStartDateText: { color: '#A1BE44', fontSize: 11, marginTop: 4, textAlign: 'center', paddingVertical: 18 },

  unifiedDataFrame: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  innerTouchableMicro: { flex: 1, paddingVertical: 18, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  verticalDivider: { width: 1, backgroundColor: '#3D3D3D', marginVertical: 15 },
  microSubTitle: { color: '#999999', fontSize: 12, fontWeight: '500', marginBottom: 10, textAlign: 'center' },
  microValue: { color: '#ffffff', fontSize: 21, fontWeight: 'bold', textAlign: 'center' },
  microValuecolor: { color: '#ffffff', fontSize: 21, fontWeight: 'bold', textAlign: 'center' },
  microUnit: { fontSize: 13, color: '#999999' },

  calendarCard: { width: '100%', backgroundColor: '#2A2A2A', borderRadius: 16, padding: 20, marginBottom: 20 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  monthArrow: { padding: 10 },
  arrowText: { color: '#A1BE44', fontSize: 22, fontWeight: 'bold' },
  calendarMonthText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { color: '#999999', fontSize: 15, width: '14.28%', textAlign: 'center', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  sundayText: { color: '#FF6B6B' },
  todayCircle: { backgroundColor: '#A1BE44' },
  todayText: { color: '#1A1A1A', fontWeight: 'bold' },
  selectedCircle: { backgroundColor: '#5DADE2' },
  selectedText: { color: '#000000', fontWeight: 'bold' },
  attendedCircle: { backgroundColor: '#3A3A3A', borderWidth: 1.5, borderColor: '#A1BE44' },
  attendedText: { color: '#A1BE44', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center', width: '100%', overflow: 'hidden' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold', marginLeft: 10 },
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  qrDesc: { color: '#999999', fontSize: 16 },

  membershipContainer: { width: '100%' },
  memCard: { backgroundColor: '#2A2A2A', borderRadius: 16, padding: 22, marginBottom: 15, width: '100%' },
  memCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  memCardTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: '#444444', borderRadius: 4, marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#A1BE44', borderRadius: 4 },
  memCardDates: { flexDirection: 'row', justifyContent: 'space-between' },
  memDateText: { color: '#999999', fontSize: 15 },
  memRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  memHalfCard: { backgroundColor: '#2A2A2A', borderRadius: 16, paddingVertical: 25, width: '48%', alignItems: 'center', justifyContent: 'center' },
  memHalfTitle: { color: '#ffffff', fontSize: 17, fontWeight: '600', marginBottom: 12 },
  memHalfValueGreen: { color: '#A1BE44', fontSize: 28, fontWeight: 'bold' },
  memHalfValueWhite: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: '90%', backgroundColor: '#212121', borderRadius: 25, paddingVertical: 45, paddingHorizontal: 35, alignItems: 'center' },
  resultModalTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  resultModalMessage: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', lineHeight: 24 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default HomeScreen;