import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, RefreshControl, Dimensions, PanResponder, TouchableWithoutFeedback } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import { HomeData, MembershipItem } from '../ts/Home';

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
  // 이용권 개수에 따라 모달 높이 조정 (항목당 약 110pt 추가)
  const itemCount = membership.items.length;
  const MEMBERSHIP_MODAL_HEIGHT = Math.min(
    SCREEN_HEIGHT * 0.9,
    SCREEN_HEIGHT * 0.53 + Math.max(0, itemCount - 1) * 110
  );

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

  // ─── 대표 이용권 기준 (원형 그래프용) ──────────────────────────────────────
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

  // ─── 원형 그래프 (대표 이용권 기준) ───────────────────────────────────────
  let circleRemainPercentage = 0;
  let barUsedPercentage = 0;

  if (!isCountType && hasMembership && membership.startDate && membership.endDate) {
    const s = new Date(membership.startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(membership.endDate); e.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const remainDays = Math.max(0, membership.remainingDays);
    const usedDays = totalDays - remainDays;
    circleRemainPercentage = Math.min((remainDays / totalDays) * 100, 100);
    barUsedPercentage = Math.min((usedDays / totalDays) * 100, 100);
  } else if (isCountType && hasMembership) {
    circleRemainPercentage = 100;
    barUsedPercentage = 0;
  }

  // 카드 상단 원형 텍스트: 둘 다 있으면 두 줄로 표시
  const hasPeriod = membership.items.some(i => i.membershipType === '회원권');
  const hasCount = membership.items.some(i => i.membershipType === '일일권');
  const periodItem = membership.items.find(i => i.membershipType === '회원권');
  const countItem = membership.items.find(i => i.membershipType === '일일권');

  const circleText = membership.isLoading ? '' : hasMembership
    ? (hasPeriod && hasCount
        ? `D-${periodItem?.remainingDays}`   // 둘 다 있으면 회원권 기준
        : isCountType ? `${membership.remainingCount}회` : `D-${membership.remainingDays}`)
    : membership.hasFuture ? '예정' : '없음';

  // 홈 카드 타이틀: 보유 이용권 조합 표시
  const membershipCardTitle = (() => {
    if (!hasMembership) return membership.hasFuture ? '시작 예정' : '이용권';
    if (hasPeriod && hasCount) return '회원권/일일권';
    return membership.membershipType;
  })();

  // 달력 렌더링용 변수들
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days: (number | null)[] = [...Array(firstDayOfMonth).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const circleRadius = 21;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - circleRemainPercentage / 100);

  // ─── 이용권 모달 개별 카드 렌더링 ─────────────────────────────────────────
  const renderMembershipItem = (item: MembershipItem, index: number) => {
    const isPeriod = item.membershipType === '회원권';
    let itemBarUsed = 0;

    if (isPeriod && item.startDate && item.endDate) {
      const s = new Date(item.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(item.endDate); e.setHours(0, 0, 0, 0);
      const totalDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const usedDays = totalDays - Math.max(0, item.remainingDays);
      itemBarUsed = Math.min((usedDays / totalDays) * 100, 100);
    }

    return (
      <View key={index} style={styles.memCard}>
        <View style={styles.memCardHeader}>
          <View style={styles.memCardTitleRow}>
            <View style={[styles.memTypeBadge, isPeriod ? styles.memTypeBadgePeriod : styles.memTypeBadgeCount]}>
              <Text style={[styles.memTypeBadgeText, isPeriod ? styles.memTypeBadgeTextPeriod : styles.memTypeBadgeTextCount]}>
                {item.membershipType}
              </Text>
            </View>
            <Text style={styles.memCardTitle}>
              {isPeriod ? `남은 기간` : `잔여 횟수`}
            </Text>
          </View>
          <Text style={[styles.memCardValueBig, isPeriod ? styles.colorGreen : styles.colorWhite]}>
            {isPeriod ? `D-${item.remainingDays}` : `${item.remainingCount}회`}
          </Text>
        </View>

        {isPeriod && (
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${itemBarUsed}%` }]} />
          </View>
        )}

        <View style={[styles.memCardDates, !isPeriod && { justifyContent: 'center' }]}>
          {isPeriod ? (
            <><Text style={styles.memDateText}>{item.startDate}</Text><Text style={styles.memDateText}>{item.endDate}</Text></>
          ) : (
            <Text style={[styles.memDateText, { color: '#A1BE44', textAlign: 'center', fontSize: 30 }]}>
              {item.remainingCount}회 남음
            </Text>
          )}
        </View>
      </View>
    );
  };

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
                  <Circle cx="25" cy="25" r="21" stroke="#444444" strokeWidth="4" fill="none" />
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

            <Text style={[styles.cardTitleCentered, (hasPeriod && hasCount) && { fontSize: 14 }]}>
              {membershipCardTitle}
            </Text>
            {/* 둘 다 있으면 서브 텍스트로 일일권 잔여횟수 표시 */}
            {hasPeriod && hasCount && countItem && (
              <Text style={styles.subBadgeText}>일일권 {countItem.remainingCount}회</Text>
            )}
            {!hasMembership && membership.hasFuture && (
              <Text style={styles.futureStartDateText}>{membership.futureStartDate}</Text>
            )}
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
                <TouchableOpacity key={index} style={styles.dayCell} disabled={!day} onPress={() => day && onDateClick(day)} activeOpacity={0.6}>
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

      {/* 결과 모달 */}
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

      {/* QR / 이용권 바텀시트 */}
      <Modal visible={activeModal !== null} animationType="fade" transparent={true} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: modalHeightAnim }]}>
            <View {...panResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {activeModal === 'QR' ? 'QR 체크인' : (
                    hasMembership
                      ? (hasPeriod && hasCount ? '보유 이용권' : membership.membershipType)
                      : (membership.hasFuture ? '시작 예정' : '이용권')
                  )}
                </Text>
                <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, width: '100%' }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}>
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
                  {/* ── 보유 이용권이 있을 때: 각 카드 렌더링 ── */}
                  {membership.items.length > 0 ? (
                    membership.items.map((item, index) => renderMembershipItem(item, index))
                  ) : (
                    /* ── 이용권 없음 / 시작 예정 ── */
                    <View style={styles.memCard}>
                      <View style={styles.memCardHeader}>
                        <Text style={styles.memCardTitle}>
                          {membership.hasFuture ? '시작 예정' : '이용권'}
                        </Text>
                      </View>
                      <View style={[styles.memCardDates, { justifyContent: 'center' }]}>
                        {membership.hasFuture ? (
                          <Text style={[styles.memDateText, { color: '#A1BE44', fontSize: 16, textAlign: 'center' }]}>
                            {membership.futureStartDate} 시작 예정
                          </Text>
                        ) : (
                          <Text style={[styles.memDateText, { textAlign: 'center' }]}>구매 필요</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* ── 시작 예정 이용권이 있으면 하단에 추가 안내 ── */}
                  {membership.hasFuture && membership.items.length > 0 && (
                    <View style={[styles.memCard, { backgroundColor: '#1E2A1E', borderWidth: 1, borderColor: '#3A5A3A' }]}>
                      <View style={styles.memCardHeader}>
                        <View style={styles.memCardTitleRow}>
                          <View style={[styles.memTypeBadge, { backgroundColor: '#1A3A1A', borderColor: '#4A7A4A' }]}>
                            <Text style={[styles.memTypeBadgeText, { color: '#7ABF7A' }]}>예정</Text>
                          </View>
                          <Text style={styles.memCardTitle}>시작 예정 이용권</Text>
                        </View>
                      </View>
                      <Text style={[styles.memDateText, { color: '#7ABF7A', textAlign: 'center', marginTop: 4 }]}>
                        {membership.futureStartDate} 부터 이용 가능
                      </Text>
                    </View>
                  )}
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
  subBadgeText: { color: '#A1BE44', fontSize: 11, marginTop: 4, textAlign: 'center' },
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
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dayText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  sundayText: { color: '#FF6B6B' },
  todayCircle: { backgroundColor: '#A1BE44', borderRadius: 17, overflow: 'hidden' },
  todayText: { color: '#1A1A1A', fontWeight: 'bold' },
  selectedCircle: { backgroundColor: '#5DADE2', borderRadius: 17, overflow: 'hidden' },
  selectedText: { color: '#000000', fontWeight: 'bold' },
  attendedCircle: { backgroundColor: '#3A3A3A', borderWidth: 1.5, borderColor: '#A1BE44', borderRadius: 17, overflow: 'hidden' },
  attendedText: { color: '#A1BE44', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center', width: '100%', overflow: 'hidden' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold', marginLeft: 10 },
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  qrDesc: { color: '#999999', fontSize: 16 },

  membershipContainer: { width: '100%' },

  // ─── 이용권 카드 (복수 지원) ───────────────────────────────────────────────
  memCard: { backgroundColor: '#2A2A2A', borderRadius: 16, padding: 22, marginBottom: 14, width: '100%' },
  memCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  memCardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  memTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8, borderWidth: 1 },
  memTypeBadgePeriod: { backgroundColor: '#1A2A0A', borderColor: '#A1BE44' },
  memTypeBadgeCount: { backgroundColor: '#0A1A2A', borderColor: '#5DADE2' },
  memTypeBadgeText: { fontSize: 12, fontWeight: 'bold' },
  memTypeBadgeTextPeriod: { color: '#A1BE44' },
  memTypeBadgeTextCount: { color: '#5DADE2' },
  memCardTitle: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  memCardValueBig: { fontSize: 24, fontWeight: 'bold' },
  colorGreen: { color: '#A1BE44' },
  colorWhite: { color: '#ffffff' },

  progressBarBg: { height: 8, backgroundColor: '#444444', borderRadius: 4, marginBottom: 14 },
  progressBarFill: { height: '100%', backgroundColor: '#A1BE44', borderRadius: 4 },
  memCardDates: { flexDirection: 'row', justifyContent: 'space-between' },
  memDateText: { color: '#999999', fontSize: 15 },

  // 하위 호환용 (이전 스타일 유지)
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