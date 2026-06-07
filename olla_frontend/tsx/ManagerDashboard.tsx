import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Modal, Platform, PermissionsAndroid,
  RefreshControl, Animated, Dimensions, PanResponder,
  TouchableWithoutFeedback, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { useIsFocused } from '@react-navigation/native';
import {
  useManagerDashboard,
  DAY_LABELS, DAY_SELECT_OPTIONS, getHourRange,
  isValidImageUrl,
} from '../ts/ManagerDashboard';
import FastImage from 'react-native-fast-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_INNER_W   = SCREEN_WIDTH - 40;
const DETAIL_MODAL_H = SCREEN_HEIGHT * 0.78;

const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: '카메라 권한 필요',
      message: 'QR 코드 스캔을 위해 카메라 권한이 필요합니다.',
      buttonNeutral: '나중에', buttonNegative: '거절', buttonPositive: '허용',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch { return false; }
};

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────
const ManagerDashboard = ({ navigation }: any) => {
  const dash = useManagerDashboard(navigation);
  const isFocused = useIsFocused(); 

  // ─── 상세 모달 애니메이션 ────────────────────────────────────────────────
  const detailHeightAnim = useRef(new Animated.Value(0)).current;
  const currentSnap      = useRef(DETAIL_MODAL_H);

  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        detailHeightAnim.setOffset(currentSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        detailHeightAnim.setValue(gs.dy < 0 ? -gs.dy * 0.1 : -gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        detailHeightAnim.flattenOffset();
        if (currentSnap.current - gs.dy < currentSnap.current * 0.75) {
          closeDetailModal();
        } else {
          Animated.spring(detailHeightAnim, { toValue: currentSnap.current, friction: 7, tension: 40, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  const openDetailModal = async (memberId: number, name: string, phone: string) => {
    const ok = await dash.loadUserDetail(memberId, name, phone);
    if (!ok) return;
    dash.setDetailVisible(true);
    detailHeightAnim.setValue(0);
    Animated.spring(detailHeightAnim, { toValue: DETAIL_MODAL_H, friction: 8, tension: 45, useNativeDriver: false }).start();
  };

  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      dash.setDetailVisible(false);
      dash.setSelectedUser(null);
    });
  };

  const openScannerWithPermission = async () => {
    const ok = await requestCameraPermission();
    if (!ok) { dash.showResultModal('권한 오류', '카메라 접근 권한을 허용해주세요.', 'error'); return; }
    dash.openScanner();
  };

  useEffect(() => {
    dash.checkAdminAndFetchData();
  }, [dash.checkAdminAndFetchData]);

  useEffect(() => {
    if (isFocused) {
      const today = new Date().getDay();
      const mappedDay = today === 0 ? 1 : today; 
      dash.handleDaySelect(mappedDay);
    }
  }, [isFocused]);

  const handleRefreshData = () => {
    dash.refreshDashboardData();
  };

  const handlePullToRefresh = () => {
    dash.onRefresh();
  };

  // ─── 차트: 요일별 막대 ──────────────────────────────────────────────────
  const renderWeeklyBar = () => {
    const CHART_H  = 150;
    const barWidth = Math.floor((CARD_INNER_W - 40) / 6);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>요일별 전체 혼잡도</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H + 24, marginTop: 15 }}>
          <View style={{ width: 30, height: CHART_H, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 }}>
            {['100', '50', '0'].map(l => <Text key={l} style={styles.yAxisText}>{l}</Text>)}
          </View>
          <View style={{ flex: 1, height: CHART_H + 24 }}>
            {[0, 0.5, 1].map((r, i) => (
              <View key={i} style={{ position: 'absolute', top: CHART_H * (1 - r), left: 0, right: 0, height: 1, backgroundColor: '#383838' }} />
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, paddingHorizontal: 5 }}>
              {dash.weeklyCongestionRate.map((val, idx) => {
                const dayOfWeek = idx + 1;
                const barH      = Math.max((val / 100) * CHART_H, 4);
                const selected  = dash.dashboardStats.selectedDay === dayOfWeek;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: CHART_H }}
                    activeOpacity={0.7}
                    onPress={() => dash.handleDaySelect(dayOfWeek)}
                  >
                    <Text style={[styles.barValText, selected && { color: '#A1BE44' }]}>{val}%</Text>
                    <View style={[styles.bar, { height: barH, width: barWidth - 10, backgroundColor: selected ? '#A1BE44' : '#444444' }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 5, marginTop: 8 }}>
              {dash.weeklyCongestionRate.map((_, idx) => {
                const dayOfWeek = idx + 1;
                const selected  = dash.dashboardStats.selectedDay === dayOfWeek;
                return (
                  <Text key={idx} style={[styles.barDayLabel, { flex: 1 }, selected && { color: '#A1BE44', fontWeight: 'bold' }]}>
                    {DAY_LABELS[dayOfWeek]}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── 차트: 시간대별 꺾은선 ─────────────────────────────────────────────
  // 🔧 수정: lineW 기준 통일 + 포인트 컨테이너 left:0 고정 + x축 라벨 컨테이너 height 명시
  const renderHourlyLine = () => {
    const selectedDay = dash.dashboardStats.selectedDay;
    const hourRange   = getHourRange(selectedDay);
    const CHART_H     = 150;
    const displayData = dash.hourlyData.slice(0, hourRange.length);
    const maxVal      = Math.max(...displayData, 1);
    const count       = displayData.length;

    // y축(30px) + paddingRight(10px) 제외한 실제 선 그리는 너비
    const lineW = CARD_INNER_W - 40 - 30 - 10; // card padding(20*2) - yAxis(30) - paddingRight(10)

    const points = displayData.map((val, i) => ({
      x: count > 1 ? (i / (count - 1)) * lineW : lineW / 2,
      y: CHART_H - (val / maxVal) * CHART_H,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{DAY_LABELS[selectedDay]}요일 시간대별 상세 분포</Text>
        <Text style={styles.chartSubTitle}>운영시간: {selectedDay === 6 ? '13:00 ~ 19:00' : '13:00 ~ 22:00'}</Text>
        <View style={{ flexDirection: 'row', height: CHART_H + 32, marginTop: 15 }}>
          {/* Y축 레이블 */}
          <View style={{ width: 30, height: CHART_H, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6 }}>
            {['Max', 'Mid', '0'].map(l => <Text key={l} style={styles.yAxisText}>{l}</Text>)}
          </View>

          {/* 차트 본체 */}
          <View style={{ flex: 1, height: CHART_H + 32, position: 'relative' }}>
            {/* 수평 가이드라인 */}
            {[0, 0.5, 1].map((r, i) => (
              <View key={i} style={{ position: 'absolute', top: CHART_H * (1 - r), left: 0, right: 0, height: 1, backgroundColor: '#383838' }} />
            ))}

            {/* 선 + 점: left:0 기준으로 그림 */}
            <View style={{ position: 'absolute', top: 0, left: 0, width: lineW, height: CHART_H }}>
              {/* 선분 */}
              {points.slice(0, -1).map((p, i) => {
                const next  = points[i + 1];
                const dx    = next.x - p.x;
                const dy    = next.y - p.y;
                const len   = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <View key={i} style={{
                    position: 'absolute',
                    width: len,
                    height: 2,
                    backgroundColor: '#A1BE44',
                    left: p.x + dx / 2 - len / 2,
                    top:  p.y + dy / 2 - 1,
                    transform: [{ rotate: `${angle}deg` }],
                  }} />
                );
              })}
              {/* 점 */}
              {points.map((p, i) => (
                <View key={i} style={{
                  position: 'absolute',
                  left: p.x - 4,
                  top:  p.y - 4,
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: '#A1BE44',
                  borderWidth: 2, borderColor: '#2C2C2C',
                }} />
              ))}
            </View>

            {/* X축 레이블: position relative + height 명시해서 잘리지 않게 */}
            <View style={{ position: 'absolute', top: CHART_H + 8, left: 0, width: lineW, height: 24 }}>
              {hourRange.map((hour, i) => {
                const pointX = count > 1 ? (i / (count - 1)) * lineW : lineW / 2;
                return (
                  <Text
                    key={i}
                    style={[
                      styles.xAxisText,
                      { position: 'absolute', left: pointX - 15, width: 30, textAlign: 'center' },
                    ]}
                  >
                    {hour}시
                  </Text>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── 만료 임박 회원 ─────────────────────────────────────────────────────
  const renderExpiringMembers = () => {
    const list = dash.dashboardStats.expiringMembers;
    return (
      <View style={styles.card}>
        <Text style={styles.expiringTitle}>만료 임박 회원 (1주 이내)</Text>
        <View style={styles.divider} />
        {list.length === 0 ? (
          <Text style={styles.emptyText}>만료 임박 회원이 없습니다.</Text>
        ) : (
          <>
            <View style={styles.expiringHeader}>
              <Text style={[styles.expiringCol, { flex: 1.2 }]}>이름</Text>
              <Text style={[styles.expiringCol, { flex: 2 }]}>연락처</Text>
              <Text style={[styles.expiringCol, { flex: 1.5 }]}>만료일</Text>
              <Text style={[styles.expiringCol, { width: 50, textAlign: 'center' }]}>상태</Text>
            </View>
            {list.map((m, idx) => {
              const dDayNum     = Number(m.dDay); 
              const ddayColor   = dDayNum <= 3 ? '#FF4D4D' : dDayNum <= 7 ? '#FF9800' : '#A1BE44';
              const maskedPhone = m.phone ? m.phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3') : '-';
              return (
                <View key={m.id} style={[styles.expiringRow, idx % 2 === 1 && { backgroundColor: '#222222' }]}>
                  <Text style={[styles.expiringValue, { flex: 1.2 }]}>{m.name}</Text>
                  <Text style={[styles.expiringValue, { flex: 2 }]}>{maskedPhone}</Text>
                  <Text style={[styles.expiringValue, { flex: 1.5, fontSize: 12 }]}>{m.endDate}</Text>
                  <View style={{ width: 50, alignItems: 'center' }}>
                    <View style={[styles.ddayBadge, { backgroundColor: `${ddayColor}33` }]}>
                      <Text style={[styles.ddayText, { color: ddayColor }]}>D-{m.dDay}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  };

  // ─── 요일 선택 + 데이터 새로고침 ────────────────────────────────────────
  const renderBottomControls = () => {
    const selectedLabel = DAY_SELECT_OPTIONS.find(o => o.value === dash.dashboardStats.selectedDay)?.label ?? '토요일';
    return (
      <View style={styles.controlCard}>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>상세 조회 요일</Text>
          <View style={{ flex: 1, marginLeft: 10, position: 'relative', zIndex: 100 }}>
            <TouchableOpacity
              style={styles.dropdownBtn}
              activeOpacity={0.8}
              onPress={() => dash.setDashboardStats(prev => ({ ...prev, dayDropdownOpen: !prev.dayDropdownOpen }))}
            >
              <Text style={styles.dropdownBtnText}>{selectedLabel}</Text>
              <Text style={styles.dropdownArrow}>{dash.dashboardStats.dayDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {dash.dashboardStats.dayDropdownOpen && (
              <View style={styles.dropdownList}>
                {DAY_SELECT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dropdownItem, dash.dashboardStats.selectedDay === opt.value && styles.dropdownItemActive]}
                    onPress={() => dash.handleDaySelect(opt.value)}
                  >
                    <Text style={[styles.dropdownItemText, dash.dashboardStats.selectedDay === opt.value && { color: '#A1BE44' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} activeOpacity={0.8} onPress={handleRefreshData}>
          <Text style={styles.refreshBtnText}>데이터 새로고침</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── 로딩 ──────────────────────────────────────────────────────────────
  if (dash.loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  // ─── 메인 렌더 ─────────────────────────────────────────────────────────
  return (
    <View style={styles.background}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={handlePullToRefresh} tintColor="#A1BE44" />}
      >
        {/* 헤더 카드 */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <Text style={styles.dashboardTitleBig}>관리자{'\n'}대시보드</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.metricGridRow}>
              <View style={styles.metricGridBox}>
                <Text style={styles.headerMetricLabel}>총 회원수</Text>
                <Text style={styles.headerMetricValue}>{dash.metrics.totalMembers}명</Text>
              </View>
              <View style={styles.metricGridBox}>
                <Text style={styles.headerMetricLabel}>금일 신규</Text>
                <Text style={[styles.headerMetricValue, { color: '#A1BE44' }]}>{dash.dashboardStats.newMembersToday}명</Text>
              </View>
            </View>
            <View style={styles.metricGridRow}>
              <View style={styles.metricGridBox}>
                <Text style={styles.headerMetricLabel}>활성 이용권</Text>
                <Text style={[styles.headerMetricValue, dash.metrics.activeMemberships === 0 && { color: '#666' }]}>
                  {dash.metrics.activeMemberships}개
                </Text>
              </View>
              <View style={styles.metricGridBox}>
                <Text style={styles.headerMetricLabel}>업데이트</Text>
                <Text style={[styles.headerMetricValue, { fontSize: 13, color: '#999999' }]}>
                  {dash.dashboardStats.lastUpdated}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 요약 행 */}
        <View style={styles.summaryRow}>
          {[
            { label: '오늘 방문자', value: `${dash.dashboardSummary.totalVisitsToday}명`, color: '#A1BE44' },
            { label: '주간 신규',   value: `${dash.dashboardSummary.newMembersThisWeek}명`, color: '#4A90D9' },
            { label: '3일내 만료',  value: `${dash.dashboardSummary.expiringIn3Days}명`,   color: '#FF4D4D' },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{label}</Text>
              <Text style={[styles.summaryValue, { color }]}>{value}</Text>
            </View>
          ))}
        </View>

        {/* 차트 */}
        <View style={styles.graphsWrapper}>
          {renderWeeklyBar()}
          {renderHourlyLine()}
        </View>

        {renderBottomControls()}
        {renderExpiringMembers()}

        {/* 최근 가입회원 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 가입회원</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ManagerUser')}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          {dash.recentMembers.length > 0 ? (
            dash.recentMembers.map((memberResponse, index) => {
              const member    = memberResponse.member ?? memberResponse;
              const memberId  = member.memberId ?? member.id;
              const userName  = member.name  ?? '이름 없음';
              const userPhone = member.phone ?? '전화번호 없음';
              const isVisited = dash.visitedMemberNames.has(userName);
              return (
                <TouchableOpacity
                  key={member.id ?? index}
                  style={[styles.rowItem, index > 0 && { marginTop: 15 }]}
                  activeOpacity={0.7}
                  onPress={() => openDetailModal(memberId, userName, userPhone)}
                >
                  {isValidImageUrl(member.profileImageUrl)
                    ? <FastImage source={{ uri: member.profileImageUrl!, priority: FastImage.priority.normal }} style={styles.profileImg} />
                    : <Image source={require('../assets/profile.png')} style={styles.profileImg} />
                  }
                  <View style={styles.infoCol}>
                    <Text style={styles.nameText}>{userName}</Text>
                    <Text style={styles.subText}>{userPhone}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: isVisited ? 'rgba(161,190,68,0.2)' : 'rgba(142,142,142,0.2)' }]}>
                    <Text style={[styles.badgeText, { color: isVisited ? '#A1BE44' : '#8E8E8E' }]}>
                      {isVisited ? '출석함' : '미출석'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyText}>가입 회원이 없습니다.</Text>
          )}
        </View>

        {/* 최근 공지사항 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 공지사항</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ManagerNotice')}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          {dash.notices.length > 0 ? (
            dash.notices.map((notice, index) => (
              <View key={notice.id} style={[styles.noticeListItem, index > 0 && { marginTop: 20 }]}>
                <View style={styles.noticeTextContent}>
                  <View style={styles.noticeHeaderRow}>
                    {notice.important && (
                      <View style={styles.noticeBadge}><Text style={styles.noticeBadgeText}>중요</Text></View>
                    )}
                    <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                  </View>
                  <Text style={styles.subText}>{(notice.createdAt ?? '').split('T')[0]}</Text>
                </View>
                <View style={styles.noticeActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ManagerNotice', { editNoticeId: notice.id })}>
                    <Image source={require('../assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => dash.confirmDelete('notice', notice.id)}>
                    <Image source={require('../assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>등록된 공지가 없습니다.</Text>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openScannerWithPermission}>
        <Image source={require('../assets/Camera.png')} style={styles.fabIcon} />
      </TouchableOpacity>

      {/* ─── 결과 모달 ─────────────────────────────────────────────────────── */}
      <Modal visible={dash.resultModalVisible} animationType="fade" transparent onRequestClose={dash.closeResultModal}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: dash.resultModalConfig.type === 'error' ? '#FF4D4D' : '#A1BE44' }]}>
              {dash.resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{dash.resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={dash.closeResultModal}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 삭제 확인 모달 ─────────────────────────────────────────────────── */}
      <Modal visible={dash.isDeleteModalVisible} animationType="fade" transparent onRequestClose={() => dash.setDeleteModalVisible(false)}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={[styles.deleteModalTitle, { color: '#FF4D4D' }]}>
              해당 {dash.itemToDelete?.type === 'notice' ? '공지사항' : '게시글'} 삭제!
            </Text>
            <Text style={styles.deleteModalMessage}>정말 삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={dash.executeDelete}>
                <Text style={styles.deleteBtnYesText}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={() => dash.setDeleteModalVisible(false)}>
                <Text style={styles.deleteBtnNoText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 회원 상세 바텀시트 ───────────────────────────────────────────── */}
      <Modal visible={dash.isDetailVisible} transparent animationType="fade" onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeDetailModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: detailHeightAnim }]}>
            <View {...detailPanResponder.panHandlers} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.sheetTitle}>회원 상세 정보</Text>
                <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                  <Text style={{ color: '#999', fontSize: 24 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              {dash.selectedUser && (
                <View style={styles.detailContainer}>
                  <View style={styles.detailProfileWrapper}>
                    {isValidImageUrl(dash.selectedUser.profileImageUrl)
                      ? <FastImage source={{ uri: dash.selectedUser.profileImageUrl!, priority: FastImage.priority.normal }} style={styles.profileBig} />
                      : <Image source={require('../assets/profile.png')} style={styles.profileBig} />
                    }
                    <Text style={styles.profileName}>{dash.selectedUser.name}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    {[
                      { label: '이름',          value: dash.selectedUser.name },
                      { label: '성별',          value: dash.selectedUser.gender },
                      { label: '연락처',        value: dash.selectedUser.phone },
                      { label: '나이',          value: dash.selectedUser.age    !== '-' ? `${dash.selectedUser.age}세`  : '-' },
                      { label: '키',            value: dash.selectedUser.height !== '-' ? `${dash.selectedUser.height}cm` : '-' },
                      { label: '몸무게',        value: dash.selectedUser.weight !== '-' ? `${dash.selectedUser.weight}kg` : '-' },
                      { label: '팔길이',        value: dash.selectedUser.arm   !== '-' ? `${dash.selectedUser.arm}cm`  : '-' },
                      { label: '암벽화 사이즈', value: dash.selectedUser.shoe  !== '-' ? `${dash.selectedUser.shoe}mm` : '-' },
                    ].map(({ label, value }) => (
                      <View key={label} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={[styles.closeFullBtn, { backgroundColor: '#4A90D9', marginBottom: 10 }]}
                onPress={() => {
                  Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
                    dash.setDetailVisible(false);
                    setTimeout(() => dash.setSendAlertModalVisible(true), 300);
                  });
                }}
              >
                <Text style={[styles.closeFullBtnText, { color: '#fff' }]}>알림 보내기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}>
                <Text style={styles.closeFullBtnText}>닫기</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── QR 스캐너 모달 ───────────────────────────────────────────────── */}
      <Modal visible={dash.isScannerVisible} animationType="slide" transparent={false} onRequestClose={dash.closeScanner}>
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>QR 코드 스캔</Text>
            <TouchableOpacity onPress={dash.closeScanner}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scannerContainer}>
            {dash.isScannerVisible && dash.cameraReady ? (
              <View style={StyleSheet.absoluteFill}>
                <Camera
                  style={StyleSheet.absoluteFill}
                  scanBarcode={true}
                  onReadCode={(event: any) => dash.handleBarCodeScanned(event.nativeEvent.codeStringValue)}
                  showFrame={false}
                />
                <View style={styles.customFrameOverlay}>
                  <View style={styles.customSquareGuide} />
                </View>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#A1BE44" style={{ position: 'absolute' }} />
            )}
            {dash.isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#A1BE44" />
                <Text style={styles.processingText}>처리 중...</Text>
              </View>
            )}
          </View>
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerDesc}>회원의 휴대폰에 있는 QR 코드를</Text>
            <Text style={styles.scannerDesc}>가이드 사각형 안으로 비춰주세요.</Text>
          </View>
        </View>
      </Modal>

      {/* ─── 알림 발송 모달 ─────────────────────────────────────────────────── */}
      <Modal visible={dash.isSendAlertModalVisible} animationType="fade" transparent onRequestClose={() => dash.setSendAlertModalVisible(false)}>
        <View style={styles.alertModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
            <View style={styles.alertModalBox}>
              <View style={styles.alertModalHeader}>
                <Text style={styles.alertModalTitle}>{dash.selectedUser?.name}님에게 알림 보내기</Text>
                <TouchableOpacity onPress={() => dash.setSendAlertModalVisible(false)}>
                  <Text style={styles.alertCloseBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.alertInputField}
                placeholder="알림 제목을 입력하세요"
                placeholderTextColor="#999"
                value={dash.alertTitle}
                onChangeText={dash.setAlertTitle}
              />
              <TextInput
                style={[styles.alertInputField, { height: 100, textAlignVertical: 'top' }]}
                placeholder="알림 내용을 입력하세요"
                placeholderTextColor="#999"
                value={dash.alertContent}
                onChangeText={dash.setAlertContent}
                multiline
              />
              <TouchableOpacity style={styles.alertSubmitBtn} onPress={dash.handleSendAlert} disabled={dash.isProcessing}>
                {dash.isProcessing
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.alertSubmitBtnText}>발송하기</Text>
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

// ─── 스타일 ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  background:    { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingBottom: 80 },

  headerCard:        { backgroundColor: '#2C2C2C', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft:        { flex: 1, borderRightWidth: 1, borderRightColor: '#444', paddingRight: 10, justifyContent: 'center' },
  dashboardTitleBig: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
  headerRight:       { flex: 2, paddingLeft: 15 },
  metricGridRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metricGridBox:     { flex: 1, alignItems: 'flex-start', marginLeft: 5 },
  headerMetricLabel: { color: '#999999', fontSize: 11, marginBottom: 4 },
  headerMetricValue: { color: '#ffffff', fontSize: 16, fontWeight: '900' },

  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  summaryBox:   { flex: 1, backgroundColor: '#2C2C2C', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  summaryLabel: { color: '#999999', fontSize: 11, marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: '900' },

  graphsWrapper:  { marginBottom: 16 },
  chartContainer: { backgroundColor: '#2C2C2C', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20, marginBottom: 16 },
  chartTitle:     { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  chartSubTitle:  { color: '#A1BE44', fontSize: 12, marginBottom: 5 },
  yAxisText:      { color: '#888888', fontSize: 10 },
  xAxisText:      { color: '#888888', fontSize: 9 },
  bar:            { borderRadius: 6 },
  barValText:     { color: '#cccccc', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  barDayLabel:    { color: '#999999', fontSize: 11, textAlign: 'center' },

  expiringTitle:  { color: '#F5C842', fontSize: 17, fontWeight: 'bold' },
  expiringHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#444' },
  expiringCol:    { color: '#999999', fontSize: 13, fontWeight: 'bold' },
  expiringRow:    { flexDirection: 'row', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  expiringValue:  { color: '#ffffff', fontSize: 14 },
  ddayBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ddayText:       { fontSize: 12, fontWeight: 'bold' },

  controlCard:        { backgroundColor: '#2C2C2C', borderRadius: 16, padding: 20, marginBottom: 16 },
  controlRow:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 15 },
  controlLabel:       { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  dropdownBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#3A3A3A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownBtnText:    { color: '#ffffff', fontSize: 14 },
  dropdownArrow:      { color: '#999999', fontSize: 10, marginLeft: 6 },
  dropdownList:       { position: 'absolute', top: 45, left: 0, right: 0, zIndex: 99, backgroundColor: '#2C2C2C', borderRadius: 8, borderWidth: 1, borderColor: '#444' },
  dropdownItem:       { paddingHorizontal: 12, paddingVertical: 12 },
  dropdownItemActive: { backgroundColor: '#3A3A3A' },
  dropdownItemText:   { color: '#cccccc', fontSize: 14 },
  refreshBtn:         { backgroundColor: '#3A3A3A', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  refreshBtnText:     { color: '#A1BE44', fontSize: 16, fontWeight: 'bold' },

  card:           { backgroundColor: '#2C2C2C', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:      { color: '#ffffff', fontSize: 19, fontWeight: 'bold' },
  viewAllBtn:     { borderWidth: 1, borderColor: '#A1BE44', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  viewAllBtnText: { color: '#999999', fontSize: 14, fontWeight: 'bold' },
  divider:        { height: 1, backgroundColor: '#444444', marginVertical: 15 },
  emptyText:      { color: '#999', textAlign: 'center', marginVertical: 10, fontSize: 16 },

  rowItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#444444', marginRight: 15 },
  infoCol:    { flex: 1 },
  nameText:   { color: '#ffffff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  subText:    { color: '#999999', fontSize: 15 },
  badge:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeText:  { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },

  noticeListItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeTextContent: { flex: 1, paddingRight: 10 },
  noticeHeaderRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noticeBadge:       { backgroundColor: '#A1BE44', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
  noticeBadgeText:   { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' },
  noticeTitle:       { color: '#ffffff', fontSize: 17, fontWeight: 'bold', flex: 1 },
  noticeActions:     { flexDirection: 'row', alignItems: 'center' },
  actionBtn:         { padding: 6, marginLeft: 6 },
  deleteBtn:         { borderRadius: 8, padding: 8 },
  actionIcon:        { width: 24, height: 24, resizeMode: 'contain' },

  fab:     { position: 'absolute', bottom: 15, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
  fabIcon: { width: 35, height: 35, tintColor: '#1A1A1A', resizeMode: 'contain' },

  scannerModalOverlay: { flex: 1, backgroundColor: '#1A1A1A' },
  scannerHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1A1A1A' },
  scannerTitle:        { color: '#ffffff', fontSize: 23, fontWeight: 'bold' },
  closeIcon:           { color: '#999999', fontSize: 32 },
  scannerContainer:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  customFrameOverlay:  { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  customSquareGuide:   { width: '65%', aspectRatio: 1, borderWidth: 3, borderColor: '#A1BE44', backgroundColor: 'transparent', borderRadius: 16 },
  processingOverlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  processingText:      { color: '#ffffff', fontSize: 18, marginTop: 12, fontWeight: 'bold' },
  scannerFooter:       { padding: 40, alignItems: 'center', backgroundColor: '#1A1A1A' },
  scannerDesc:         { color: '#ffffff', fontSize: 18, marginTop: 5 },

  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet:          { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 25, paddingTop: 10, overflow: 'hidden', width: '100%' },
  dragHandle:           { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  sheetTitle:           { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  detailContainer:      { width: '100%' },
  detailProfileWrapper: { alignSelf: 'center', alignItems: 'center', marginBottom: 25 },
  profileBig:           { width: 80, height: 80, borderRadius: 40, backgroundColor: '#444' },
  profileName:          { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  infoBox:              { backgroundColor: '#262626', borderRadius: 15, padding: 20, marginBottom: 20 },
  detailRow:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  detailLabel:          { color: '#999', fontSize: 15 },
  detailValue:          { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  closeFullBtn:         { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  closeFullBtnText:     { color: '#000', fontWeight: 'bold', fontSize: 18 },

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox:     { width: '90%', backgroundColor: '#212121', borderRadius: 25, paddingVertical: 45, paddingHorizontal: 35, alignItems: 'center' },
  resultModalTitle:   { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  resultModalMessage: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', lineHeight: 24 },
  resultModalBtn:     { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox:     { width: '90%', backgroundColor: '#212121', borderRadius: 25, paddingVertical: 45, paddingHorizontal: 35, alignItems: 'center' },
  deleteModalTitle:   { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  deleteModalMessage: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', lineHeight: 24 },
  deleteBtnRow:       { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes:       { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginRight: 5 },
  deleteBtnYesText:   { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  deleteBtnNo:        { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginLeft: 5 },
  deleteBtnNoText:    { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },

  alertModalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  alertModalBox:      { width: '90%', backgroundColor: '#212121', borderRadius: 25, paddingVertical: 45, paddingHorizontal: 35 },
  alertModalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  alertModalTitle:    { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  alertCloseBtn:      { color: '#999999', fontSize: 24, paddingHorizontal: 5, marginBottom: 8 },
  alertInputField:    { width: '100%', backgroundColor: '#1A1A1A', color: '#FFF', borderRadius: 12, padding: 15, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#444444' },
  alertSubmitBtn:     { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  alertSubmitBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default ManagerDashboard;