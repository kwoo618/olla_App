import React from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, RefreshControl,
  TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import {
  useManagerTicket,
  resolveMembershipType,
  formatShortDate,
  calculateDDay,
  getToday,
} from '../ts/ManagerTicket';

LocaleConfig.locales['kr'] = {
  monthNames:      ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames:        ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort:   ['일','월','화','수','목','금','토'],
  today:           '오늘',
};
LocaleConfig.defaultLocale = 'kr';

const calendarTheme = {
  backgroundColor:            '#212121',
  calendarBackground:         '#212121',
  textSectionTitleColor:      '#999999',
  selectedDayBackgroundColor: '#A1BE44',
  selectedDayTextColor:       '#000000',
  todayTextColor:             '#A1BE44',
  dayTextColor:               '#ffffff',
  textDisabledColor:          '#444444',
  monthTextColor:             '#ffffff',
  textDayFontWeight:          '500' as const,
  textMonthFontWeight:        'bold' as const,
  textDayHeaderFontWeight:    '500' as const,
  textDayFontSize:            16,
  textMonthFontSize:          18,
  textDayHeaderFontSize:      14,
};

const ManagerTicket = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const t      = useManagerTicket(navigation);

  if (t.loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.background} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 150 }]}
        refreshControl={<RefreshControl refreshing={t.refreshing} onRefresh={t.onRefresh} tintColor="#A1BE44" />}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔎</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="회원 이름 또는 연락처로 검색"
              placeholderTextColor="#666666"
              value={t.searchQuery}
              onChangeText={t.setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colInfo]}>회원/이용권</Text>
          <Text style={[styles.headerText, styles.colDate]}>시작일/종료일</Text>
          <Text style={[styles.headerText, styles.colDday]}>잔여</Text>
          <Text style={[styles.headerText, styles.colStatus]}>상태</Text>
        </View>
        <View style={styles.headerDivider} />

        {t.groupedHolders.length === 0 ? (
          <Text style={styles.emptyText}>보유 중인 이용권이 없습니다.</Text>
        ) : (
          t.groupedHolders.map((group: any) => {
            const { memberId, name, displayMemberships, memberships } = group;
            const subText      = displayMemberships.map((m: any) => m._type).join(' / ');
            const activeCount  = memberships.filter((m: any) => String(m.membershipStatus).toUpperCase() === 'ACTIVE').length;
            const holdingCount = memberships.filter((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING').length;

            let badgeText      = '이용중';
            let badgeStyle     = styles.badgeActive;
            let badgeTextStyle = styles.badgeTextActive;
            if (holdingCount > 0 && activeCount === 0) {
              badgeText = '정지'; badgeStyle = styles.badgeHolding; badgeTextStyle = styles.badgeTextHolding;
            } else if (holdingCount > 0 && activeCount > 0) {
              badgeText = '일부 정지'; badgeStyle = styles.badgePartial; badgeTextStyle = styles.badgeTextPartial;
            }

            return (
              <TouchableOpacity key={memberId} style={styles.tableRow} activeOpacity={0.7} onPress={() => t.openManageModal(group)}>
                <View style={styles.colInfo}>
                  <Text style={styles.rowTextName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.rowTextSub}>{subText}</Text>
                </View>

                <View style={styles.colDate}>
                  {displayMemberships.map((m: any, idx: number) => (
                    <Text key={`date-${m._type}-${idx}`} style={[styles.rowTextDate, idx > 0 && { marginTop: 6 }]} numberOfLines={1}>
                      {m._type === '일일권'
                        ? formatShortDate(m.startDate)
                        : `${formatShortDate(m.startDate)} ~ ${formatShortDate(m.endDate)}`
                      }
                    </Text>
                  ))}
                </View>

                <View style={styles.colDday}>
                  {displayMemberships.map((m: any, idx: number) => (
                    <Text key={`dday-${m._type}-${idx}`} style={[styles.rowTextDday, idx > 0 && { marginTop: 6 }]} numberOfLines={1}>
                      {m._type === '일일권'
                        ? `${m.remainingCount ?? 0}회`
                        : (m._totalRemainingDays !== undefined 
                            ? (m._totalRemainingDays === 0 ? 'D-Day' : `${m._totalRemainingDays}일`) 
                            : calculateDDay(m.endDate))
                      }
                    </Text>
                  ))}
                </View>

                <View style={[styles.colStatus, styles.center]}>
                  <View style={[styles.badge, badgeStyle]}>
                    <Text style={badgeTextStyle}>{badgeText}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom + 5, 20) }]} activeOpacity={0.8} onPress={t.openEditModal}>
        <Text style={styles.fabText}>+ 이용권 등록</Text>
      </TouchableOpacity>

      {/* ─── 💡 삭제 확인 모달 (OLLA 표준 규격 적용) ─────────────────────────────────────────────────────── */}
      <Modal visible={t.confirmModalVisible} animationType="fade" transparent onRequestClose={() => t.setConfirmModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>{t.confirmModalConfig.message}</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity
                style={[styles.btnYes, t.confirmModalConfig.isDestructive ? { backgroundColor: '#FF4D4D' } : { backgroundColor: '#A1BE44' }]}
                onPress={t.confirmModalConfig.onConfirm}
              >
                <Text style={[styles.btnTextBlack, t.confirmModalConfig.isDestructive && { color: '#ffffff' }]}>
                  {t.confirmModalConfig.confirmText}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => t.setConfirmModalVisible(false)}>
                <Text style={styles.btnTextWhite}>{t.confirmModalConfig.cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 💡 결과 모달 (메인 - OLLA 표준 규격 적용) ─────────────────────────────────────────────────────── */}
      <Modal visible={t.resultModalVisible} animationType="fade" transparent onRequestClose={() => t.setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, t.resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {t.resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{t.resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => {
              t.setResultModalVisible(false);
              if (typeof t.resultModalConfig.onConfirm === 'function') t.resultModalConfig.onConfirm();
            }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 이용권 관리 바텀시트 ──────────────────────────────────────────── */}
      <Modal visible={t.isManageVisible} transparent animationType="fade" onRequestClose={() => t.closeManageModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => t.closeManageModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: t.manageHeightAnim, overflow: 'hidden' }]}>

            <View {...t.managePanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>이용권 관리</Text>
                <TouchableOpacity onPress={() => t.closeManageModal()} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
            </View>

            {t.selectedManageItem && (() => {
              const { name, memberships, displayMemberships } = t.selectedManageItem;
              const displayTypes  = memberships.map((m: any) => resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount));
              const uniqueTypes   = [...new Set(displayTypes)];
              const activeCount   = memberships.filter((m: any) => String(m.membershipStatus).toUpperCase() === 'ACTIVE').length;
              const holdingCount  = memberships.filter((m: any) => String(m.membershipStatus).toUpperCase() === 'HOLDING').length;
              let statusText      = '이용중';
              if (holdingCount > 0 && activeCount === 0)  statusText = '전체 정지중';
              else if (holdingCount > 0 && activeCount > 0) statusText = '일부 정지중';

              return (
                <View style={{ flex: 1 }}>
                  <View style={styles.manageInfoBox}>
                    <Text style={styles.manageItemName}>{name}</Text>
                    <Text style={styles.manageItemSub}>{`${uniqueTypes.join(' / ')} ${statusText}`}</Text>
                    <View style={styles.manageDetailContainer}>
                      {displayMemberships.map((m: any, idx: number) => (
                        <Text key={`merged-detail-${idx}`} style={styles.manageDetailText}>
                          • {m._type === '일일권'
                            ? `[일일권] 총 잔여 ${m.remainingCount ?? 0}회`
                            : `[회원권] 총 잔여 ${m._totalRemainingDays === 0 ? 'D-Day' : `${m._totalRemainingDays}일`} (${m.startDate || '-'} ~ ${m.endDate || '-'})`
                          }
                        </Text>
                      ))}
                    </View>
                  </View>

                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {displayMemberships.map((m: any, idx: number) => (
                      <View key={`manage-action-${m._type}-${idx}`} style={styles.manageActionGroup}>
                        <Text style={styles.manageActionGroupTitle}>{m._type} 상세 내역</Text>
                        {m._originals.map((orig: any, oIdx: number) => {
                          const origId        = orig.membershipId || orig.id;
                          const origIsHolding = String(orig.membershipStatus).toUpperCase() === 'HOLDING';
                          const isCountType   = m._type === '일일권';
                          const description   = isCountType
                            ? `잔여 ${orig.remainingCount ?? 0}회`
                            : `${formatShortDate(orig.startDate)} ~ ${formatShortDate(orig.endDate)}`;

                          return (
                            <View key={`orig-${origId}-${oIdx}`} style={styles.originalItemRow}>
                              <View style={styles.originalItemInfo}>
                                <Text style={styles.originalItemTitle}>{description}</Text>
                                <Text style={[styles.originalItemStatus, origIsHolding && styles.originalItemStatusHolding]}>
                                  {origIsHolding ? '정지중' : '이용중'}
                                </Text>
                              </View>
                              <View style={styles.originalItemActions}>
                                {!isCountType && (
                                  <TouchableOpacity style={styles.actionIconBtn} onPress={() => t.togglePauseStatus(origId, orig.membershipStatus)}>
                                    <Text style={styles.actionIconText}>{origIsHolding ? '재개' : '정지'}</Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={styles.actionIconBtnDanger}
                                  onPress={() => t.confirmDeleteSpecificTicket(origId, `[${m._type}] ${description}`)}
                                >
                                  <Text style={styles.actionIconDangerText}>삭제</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </ScrollView>

                  <TouchableOpacity style={[styles.closeFullBtn, { marginTop: 10, marginBottom: 20 }]} onPress={() => t.closeManageModal()}>
                    <Text style={styles.closeFullBtnText}>닫기</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </Animated.View>
        </View>
      </Modal>

      {/* ─── 이용권 등록 바텀시트 ──────────────────────────────────────────── */}
      <Modal visible={t.isEditModalVisible} transparent animationType="fade" onRequestClose={() => t.closeEditModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => t.closeEditModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[styles.bottomSheet, { height: t.editHeightAnim, overflow: 'hidden' }]}>

              <View {...t.editPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>이용권 등록</Text>
                  <TouchableOpacity onPress={() => t.closeEditModal()} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horizontalDivider} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">

                <View style={styles.modalSearchBox}>
                  <Text style={styles.searchIcon}>🔎</Text>
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="부여할 회원을 검색하세요"
                    placeholderTextColor="#666"
                    value={t.modalSearch}
                    onChangeText={t.setModalSearch}
                  />
                </View>

                <View style={styles.modalTableHeader}>
                  <Text style={[styles.modalHeaderText, { flex: 1.5 }]}>회원정보</Text>
                  <Text style={[styles.modalHeaderText, { flex: 2, textAlign: 'center' }]}>연락처</Text>
                  <Text style={[styles.modalHeaderText, { flex: 1.5, textAlign: 'center' }]}>현재 이용권</Text>
                </View>
                <View style={styles.headerDivider} />

                <View style={{ height: 160, marginBottom: 20 }}>
                  <ScrollView style={styles.searchResultTable} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {t.groupedSearchResults.length === 0 ? (
                      <Text style={styles.modalEmptyText}>검색된 회원이 없습니다.</Text>
                    ) : (
                      t.groupedSearchResults.map((group: any) => {
                        const isSelected   = t.selectedUser && t.selectedUser.memberId === group.memberId;
                        const displayTicket = group.displayMemberships.length > 0
                          ? group.displayMemberships.map((m: any) => m._type).join(' / ')
                          : '없음';
                        return (
                          <TouchableOpacity
                            key={group.memberId}
                            style={[styles.searchResultRow, isSelected && styles.selectedRow]}
                            onPress={() => t.handleSelectUser(group)}
                          >
                            <Text style={[styles.resultTextName, { flex: 1.5 }]} numberOfLines={1}>{group.name}</Text>
                            <Text style={[styles.resultTextSub,  { flex: 2, textAlign: 'center' }]}>{group.phone}</Text>
                            <Text style={[styles.resultTextType, { flex: 1.5, textAlign: 'center' }]}>{displayTicket}</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>

                {t.selectedUser && (
                  <View style={styles.formContainer}>
                    <Text style={styles.inputLabel}>이용권 종류</Text>
                    <View style={styles.typeToggleRow}>
                      <TouchableOpacity
                        style={[styles.typeBtn, t.editType === 'PERIOD' && styles.typeBtnActive]}
                        onPress={() => { t.setEditType('PERIOD'); t.setAddValue(''); t.setEditEnd(''); }}
                      >
                        <Text style={[styles.typeBtnText, t.editType === 'PERIOD' && styles.typeBtnTextActive]}>회원권</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeBtn, t.editType === 'COUNT' && styles.typeBtnActive]}
                        onPress={() => { t.setEditType('COUNT'); t.setAddValue(''); }}
                      >
                        <Text style={[styles.typeBtnText, t.editType === 'COUNT' && styles.typeBtnTextActive]}>일일권</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.horizontalDateRow}>
                      {/* 시작일 */}
                      <View style={styles.dateBlock}>
                        <Text style={styles.inputLabel}>시작일</Text>
                        <View style={styles.dateInputBox}>
                          <Text style={t.editStart ? styles.pickerTextActive : styles.pickerTextPlaceholder}>
                            {t.editStart || '날짜 선택'}
                          </Text>
                          <TouchableOpacity onPress={t.openStartCalendar} style={styles.calendarIconBtn}>
                            <Image source={require('../assets/DATE.png')} style={styles.dateIcon} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.dateSpacer} />

                      {/* 개월 수 or 횟수 입력 */}
                      <View style={styles.dateBlock}>
                        <Text style={styles.inputLabel}>
                          {t.editType === 'PERIOD' ? '개월 수 (기본 1개월)' : '횟수 (기본 1회)'}
                        </Text>
                        <TextInput
                          style={styles.amountInput}
                          placeholder={t.editType === 'PERIOD' ? "기본 1개월" : "기본 1회"}
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={t.addValue}
                          onChangeText={t.setAddValue}
                        />
                      </View>
                    </View>

                    <View style={styles.dateHelperRow}>
                      {t.editStart && t.editStart !== getToday() ? (
                        <TouchableOpacity onPress={() => t.setEditStart('')}>
                          <Text style={styles.resetDateText}>↺ 오늘로 초기화</Text>
                        </TouchableOpacity>
                      ) : <View />}

                      {t.editType === 'PERIOD' && t.editEnd ? (
                        <Text style={styles.autoEndDateText}>※ 예상 종료일: {t.editEnd}</Text>
                      ) : <View />}
                    </View>

                    {/* 폼 내부에 에러 텍스트 직접 표시 */}
                    {t.formError ? <Text style={styles.formErrorText}>{t.formError}</Text> : null}

                    <TouchableOpacity style={styles.submitBtn} onPress={t.handleGrantTicket}>
                      <Text style={styles.submitBtnText}>등록 완료</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>

          {/* Calendar 오버레이 */}
          {t.isStartCalendarVisible && (
            <View style={[StyleSheet.absoluteFill, styles.calendarOverlay, { zIndex: 1000, elevation: 10 }]}>
              <View style={styles.calendarBox}>
                <Text style={styles.calendarTitle}>시작일 선택</Text>
                <Calendar
                  current={t.editStart || getToday()}
                  onDayPress={(day: any) => { 
                    t.setEditStart(day.dateString); 
                    t.closeStartCalendar(); 
                  }}
                  theme={calendarTheme}
                  markedDates={{ [t.editStart || getToday()]: { selected: true, selectedColor: '#A1BE44' } }}
                />
                <TouchableOpacity style={styles.calendarCloseBtn} onPress={t.closeStartCalendar}>
                  <Text style={styles.calendarCloseText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── 스타일 ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  background:       { flex: 1, backgroundColor: '#1A1A1A' },
  searchContainer:  { paddingHorizontal: 20, marginTop: 15, marginBottom: 20 },
  searchBox:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 20, height: 60 },
  searchIcon:       { fontSize: 20, marginRight: 10 },
  searchInput:      { flex: 1, color: '#fff', fontSize: 17 },

  tableHeader:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  headerText:   { color: '#ffffff', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  headerDivider:{ height: 1, backgroundColor: '#333333', marginHorizontal: 20, marginBottom: 10 },
  listContainer:{ paddingHorizontal: 20 },

  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 18, paddingHorizontal: 5, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A' },

  colInfo:   { flex: 2.2, paddingLeft: 5 },
  colDate:   { flex: 2.8, alignItems: 'center' },
  colDday:   { flex: 1.4, alignItems: 'center' },
  colStatus: { flex: 1.6 },

  rowTextName: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  rowTextSub:  { color: '#999', fontSize: 13 },
  rowTextDate: { color: '#ccc', fontSize: 13, textAlign: 'center' },
  rowTextDday: { color: '#A1BE44', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  emptyText:   { color: '#666', fontSize: 17, textAlign: 'center', marginTop: 40 },

  center: { alignItems: 'center', justifyContent: 'center' },

  badge:             { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeActive:       { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeHolding:      { backgroundColor: 'rgba(255, 153, 0, 0.2)' },
  badgePartial:      { backgroundColor: 'rgba(77, 166, 255, 0.2)' },
  badgeTextActive:   { color: '#A1BE44',  fontSize: 13, fontWeight: 'bold' },
  badgeTextHolding:  { color: '#FF9900',  fontSize: 13, fontWeight: 'bold' },
  badgeTextPartial:  { color: '#4DA6FF',  fontSize: 13, fontWeight: 'bold' },

  fab:     { position: 'absolute', right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 25, paddingVertical: 18, borderRadius: 30, elevation: 5 },
  fabText: { color: '#000', fontSize: 18, fontWeight: 'bold' },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet:       { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, width: '100%' },
  dragHandle:        { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sheetTitle:        { color: '#ffffff', fontSize: 23, fontWeight: 'bold' },
  closeIcon:         { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  modalSearchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 15, height: 55, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  modalSearchInput: { flex: 1, color: '#fff', fontSize: 17 },

  modalTableHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 5 },
  modalHeaderText:  { color: '#999', fontSize: 14, fontWeight: 'bold' },

  searchResultTable: { backgroundColor: '#000', borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  searchResultRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  selectedRow:       { backgroundColor: 'rgba(161, 190, 68, 0.15)', borderColor: '#A1BE44', borderWidth: 1, borderRadius: 8 },
  resultTextName:    { color: '#fff', fontSize: 16, fontWeight: 'bold', paddingLeft: 10 },
  resultTextSub:     { color: '#aaa', fontSize: 15 },
  resultTextType:    { color: '#A1BE44', fontSize: 15, fontWeight: 'bold' },
  modalEmptyText:    { color: '#666', textAlign: 'center', paddingVertical: 20, fontSize: 16 },

  formContainer:  { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginTop: 10 },
  typeToggleRow:  { flexDirection: 'row', marginBottom: 20 },
  typeBtn:        { flex: 1, height: 55, backgroundColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#333' },
  typeBtnActive:  { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  typeBtnText:    { color: '#999', fontWeight: 'bold', fontSize: 16 },
  typeBtnTextActive: { color: '#A1BE44' },

  horizontalDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateBlock:    { flex: 1 },
  dateSpacer:   { width: 15 },
  inputLabel:   { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 10, marginLeft: 2 },

  dateInputBox:          { height: 55, backgroundColor: '#000', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12, paddingRight: 5, borderWidth: 1, borderColor: '#333' },
  dateTextInput:         { flex: 1, color: '#fff', fontSize: 17, padding: 0 },
  pickerTextActive:      { color: '#fff', fontSize: 17 },
  pickerTextPlaceholder: { color: '#666', fontSize: 17 },
  calendarIconBtn:       { padding: 8 },
  dateIcon:              { width: 22, height: 22, tintColor: '#A1BE44' },

  amountInput:  { height: 55, backgroundColor: '#000', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#333', color: '#fff', fontSize: 17 },

  dateHelperRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  resetDateText:   { color: '#A1BE44', fontSize: 14, fontWeight: 'bold' },
  autoEndDateText: { color: '#A1BE44', fontSize: 14, fontWeight: 'bold' },

  formErrorText: { color: '#FF4D4D', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },

  submitBtn:     { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 5 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },

  calendarOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  calendarBox:      { width: '90%', backgroundColor: '#212121', borderRadius: 16, padding: 15 },
  calendarTitle:    { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  calendarCloseBtn: { marginTop: 15, paddingVertical: 16, backgroundColor: '#333333', borderRadius: 10, alignItems: 'center' },
  calendarCloseText:{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' },

  manageInfoBox:        { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginBottom: 16 },
  manageItemName:       { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  manageItemSub:        { color: '#999999', fontSize: 15 },
  manageDetailContainer:{ marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#333' },
  manageDetailText:     { color: '#E0E0E0', fontSize: 15, marginBottom: 8, lineHeight: 22 },

  manageActionGroup:      { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, marginBottom: 16 },
  manageActionGroupTitle: { color: '#A1BE44', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },

  originalItemRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2C2C2C', padding: 14, borderRadius: 10, marginBottom: 10 },
  originalItemInfo:          { flex: 1 },
  originalItemTitle:         { color: '#ffffff', fontSize: 15, marginBottom: 6, fontWeight: 'bold' },
  originalItemStatus:        { color: '#A1BE44', fontSize: 13, fontWeight: 'bold' },
  originalItemStatusHolding: { color: '#FF9900' },
  originalItemActions:       { flexDirection: 'row', alignItems: 'center' },
  actionIconBtn:             { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#3A3A3A', borderRadius: 8, marginLeft: 8 },
  actionIconBtnDanger:       { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255, 77, 77, 0.1)', borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: '#FF4D4D' },
  actionIconText:            { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  actionIconDangerText:      { color: '#FF4D4D', fontSize: 14, fontWeight: 'bold' },

  closeFullBtn:     { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  closeFullBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  // ─────────────────────────── 💡 OLLA 모달창 표준 디자인 스타일 통일 적용 ───────────────────────────
  
  // 1. 시스템 결과 알림 모달
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25,          // 💡 표준 모서리 곡률 적용
    paddingVertical: 45,       // 💡 상하 여백 확장 적용
    paddingHorizontal: 35,     // 💡 좌우 여백 적용
    alignItems: 'center' 
  },
  resultModalTitle: { 
    fontSize: 28,              // 💡 타이틀 크기 통일
    fontWeight: 'bold', 
    marginBottom: 8            // 💡 타이틀 하단 여백 통일
  },
  resultModalMessage: { 
    color: '#ffffff', 
    fontSize: 18,              // 💡 본문 크기 통일
    fontWeight: 'bold',        // 💡 굵기 적용
    marginBottom: 25,          // 💡 하단 여백 적용
    textAlign: 'center', 
    lineHeight: 24 
  },
  resultModalBtn: { 
    width: '100%', 
    backgroundColor: '#A1BE44', 
    paddingVertical: 16,       // 💡 버튼 여백 통일
    borderRadius: 12, 
    alignItems: 'center' 
  },
  resultModalBtnText: { 
    color: '#000000', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },

  // 2. 삭제 확인용 더블 버튼 모달 (deleteModalBox)
  deleteModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25,          // 💡 표준 모서리 곡률
    paddingVertical: 45,       // 💡 상하 패딩 통일
    paddingHorizontal: 35,     // 💡 좌우 패딩 통일
    alignItems: 'center' 
  },
  deleteModalText: { 
    color: '#ffffff', 
    fontSize: 18,              // 💡 본문 크기 통일
    fontWeight: 'bold',        // 💡 굵기 통일
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 26 
  },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginRight: 5 }, 
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginLeft: 5 }, 
  btnTextBlack: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});

export default ManagerTicket;