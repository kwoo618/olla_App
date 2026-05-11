import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, RefreshControl 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

const MEMBER_LIST_API = `${API_BASE_URL}/admin/memberships/members`; 
const MEMBERSHIP_GRANT_API = `${API_BASE_URL}/admin/memberships/grant`; 
const MEMBERSHIP_BASE_API = `${API_BASE_URL}/admin/memberships`; 

LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'kr';

const resolveMembershipType = (
  typeStr: string,
  startDate: string,
  endDate: string,
  remainingCount: number | null
): string => {
  const upper = String(typeStr || '').toUpperCase();

  if (upper === 'COUNT' || upper.includes('횟수') || upper.includes('COUNT')) {
    return '일일권';
  }

  if (upper === 'PERIOD' || upper.includes('기간') || upper.includes('PERIOD') || upper.includes('MONTH')) {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return totalDays <= 1 ? '일일권' : '회원권';
    }
    return '회원권';
  }

  if (remainingCount !== null && remainingCount !== undefined) {
    return '일일권';
  }
  if (endDate) {
    return '회원권';
  }

  return '-';
};

const ManagerTicket = ({ navigation }: any) => {
  // 새로고침 상태 추가
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ─── 단일 버튼 커스텀 결과 알림 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // ─── 투 버튼 커스텀 확인(Confirm) 모달 상태 ───
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '', message: '', confirmText: '확인', cancelText: '취소', onConfirm: () => {}, isDestructive: false
  });

  const showConfirmModal = (title: string, message: string, onConfirm: () => void, isDestructive: boolean = false, confirmText: string = '확인') => {
    setConfirmModalConfig({ title, message, confirmText, cancelText: '취소', onConfirm, isDestructive });
    setConfirmModalVisible(true);
  };

  // 💡 애니메이션 설정
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const editSlideAnim = useRef(new Animated.Value(800)).current;

  const [modalSearch, setModalSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [isStartCalendarVisible, setStartCalendarVisible] = useState(false);
  
  const [editStart, setEditStart] = useState('');
  const [editType, setEditType] = useState<'PERIOD' | 'COUNT'>('PERIOD');
  const [addValue, setAddValue] = useState('');

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');

      if (!token || role !== 'ADMIN') {
        showResultModal('권한 오류', '관리자만 접근할 수 있는 페이지입니다.', 'error', () => navigation.goBack());
        return;
      }
      await fetchUsers(token);
    } catch (error) {
      console.error("인증 에러:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // onRefresh 작성
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchUsers();
    setRefreshing(false);
  }, []);

  const fetchUsers = async (token: string) => {
    try {
      const response = await axios.get(MEMBER_LIST_API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 1000, sort: 'id,desc' }
      });
      const memberList = response.data?.data?.content || response.data?.data || [];
      setUsers(memberList);
    } catch (error) {
      showResultModal('오류', '회원 목록을 불러오는데 실패했습니다.', 'error');
    }
  };

  const getToday = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const calculateDDay = (targetDate: string) => {
    if (!targetDate) return '-';
    const end = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 ? `${days}일` : '만료';
  };

  const ticketHolders = useMemo(() => {
    return users.filter((u: any) => {
      const isTicketActive = u.membershipStatus === 'ACTIVE' || u.membershipStatus === 'HOLDING';
      if (!isTicketActive) return false;
      return u.name?.includes(searchQuery) || u.phone?.includes(searchQuery);
    });
  }, [users, searchQuery]);

  const searchResults = useMemo(() => {
    if (!modalSearch) return users;
    return users.filter((u: any) => {
      const name = u.name || '';
      const phone = u.phone || '';
      return name.includes(modalSearch) || phone.includes(modalSearch);
    });
  }, [users, modalSearch]);

  const handleSelectUser = (u: any) => {
    setSelectedUser(u);
    setEditType('PERIOD');
    setAddValue('');
    setEditStart('');
  };

  const handleGrantTicket = async () => {
    if (!selectedUser) return;

    if (editType === 'PERIOD' && (!addValue || isNaN(Number(addValue)) || Number(addValue) <= 0)) {
      showResultModal('알림', '추가할 개월 수를 입력해주세요.', 'info');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const memberId = selectedUser.memberId || selectedUser.id || selectedUser.member?.id;
      const startDate = editStart || getToday();

      const requestBody = editType === 'PERIOD'
        ? {
            memberId,
            addMonths: Number(addValue),
            addCount: 0,
            startDate,
          }
        : {
            memberId,
            addMonths: 0,
            addCount: addValue && !isNaN(Number(addValue)) && Number(addValue) > 0
              ? Number(addValue)
              : 1,
            startDate,
          };

      await axios.post(MEMBERSHIP_GRANT_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showResultModal('성공', '이용권이 성공적으로 등록되었습니다.', 'success');
      closeEditModal();
      fetchUsers(token!);
    } catch (error: any) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error || JSON.stringify(error?.response?.data);
      console.error('[이용권 등록 실패]', `status: ${status}`, serverMessage);

      if (serverMessage?.includes("is_deleted") || serverMessage?.includes("default value")) {
        showResultModal(
          '서버 설정 오류',
          'Membership 엔티티의 is_deleted 필드에 기본값이 없습니다.\n백엔드 서버를 수정해주세요.',
          'error'
        );
        return;
      }
      showResultModal('오류', `이용권 등록에 실패했습니다.\n\n${serverMessage || '서버 오류가 발생했습니다.'}`, 'error');
    }
  };

  const togglePauseStatus = (membershipId: number, currentStatus: string) => {
    if (!membershipId) {
      showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error');
      return;
    }
    const isCurrentlyHolding = currentStatus === 'HOLDING';
    const actionText = isCurrentlyHolding ? '정지 해제' : '일시정지';
    const endpoint = isCurrentlyHolding ? 'unpause' : 'pause';

    showConfirmModal(
      `${actionText} 확인`,
      `해당 이용권을 ${actionText} 하시겠습니까?`,
      async () => {
        setConfirmModalVisible(false);
        try {
          const token = await AsyncStorage.getItem('userToken');
          await axios.patch(`${MEMBERSHIP_BASE_API}/${membershipId}/${endpoint}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          showResultModal('성공', `이용권이 ${actionText} 되었습니다.`, 'success');
          fetchUsers(token!);
        } catch (error) {
          showResultModal('오류', '상태 변경에 실패했습니다.', 'error');
        }
      }
    );
  };

  const executeDeleteTicket = async (membershipId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${MEMBERSHIP_BASE_API}/${membershipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showResultModal('성공', '이용권이 삭제되었습니다.', 'success');
      fetchUsers(token!);
    } catch (error: any) {
      console.error(error);
      showResultModal('오류', '이용권 삭제에 실패했습니다.', 'error');
    }
  };

  const confirmDeleteTicket = (membershipId: number) => {
    if (!membershipId) {
      showResultModal('오류', '이용권 ID를 확인할 수 없습니다.', 'error');
      return;
    }
    showConfirmModal(
      '이용권 삭제 확인',
      '해당 이용권을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      () => {
        setConfirmModalVisible(false);
        executeDeleteTicket(membershipId);
      },
      true, // isDestructive = true (빨간색 버튼)
      '삭제'
    );
  };

  // 💡 모달 제어 함수 (애니메이션 포함)
  const openEditModal = () => {
    setEditModalVisible(true);
    Animated.timing(editSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closeEditModal = () => {
    Animated.timing(editSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setEditModalVisible(false);
      setSelectedUser(null);
      setModalSearch('');
      setAddValue('');
      setEditStart('');
    });
  };

  const calendarTheme = {
    backgroundColor: '#212121',
    calendarBackground: '#212121',
    textSectionTitleColor: '#999999',
    selectedDayBackgroundColor: '#A1BE44',
    selectedDayTextColor: '#000000',
    todayTextColor: '#A1BE44',
    dayTextColor: '#ffffff',
    textDisabledColor: '#444444',
    monthTextColor: '#ffffff',
    textDayFontWeight: '500' as const,
    textMonthFontWeight: 'bold' as const,
    textDayHeaderFontWeight: '500' as const,
  };

  if (loading) {
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
        // RefreshControl 추가
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
      >
        
      {/* 상단 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="회원 이름 또는 연락처로 검색"
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* 리스트 헤더 */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colInfo]}>회원/이용권</Text>
        <Text style={[styles.headerText, styles.colDate]}>시작일/종료일</Text>
        <Text style={[styles.headerText, styles.colDday]}>잔여</Text>
        <Text style={[styles.headerText, styles.colStatus]}>상태</Text>
        <Text style={[styles.headerText, styles.colAction]}>관리</Text>
      </View>
      <View style={styles.headerDivider} />

      

        {ticketHolders.length === 0 ? (
          <Text style={styles.emptyText}>보유 중인 이용권이 없습니다.</Text>
        ) : (
          ticketHolders.map((item: any) => {
            const displayType = resolveMembershipType(
              item.membershipType,
              item.startDate || '',
              item.endDate || '',
              item.remainingCount ?? null
            );
            const isCountType = displayType === '일일권';
            const isHolding = item.membershipStatus === 'HOLDING';

            return (
              <View key={item.memberId} style={styles.tableRow}>
                <View style={styles.colInfo}>
                  <Text style={styles.rowTextName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.rowTextSub}>{displayType}</Text>
                </View>

                <View style={styles.colDate}>
                  <Text style={styles.rowTextDate}>{item.startDate || '-'}</Text>
                  <Text style={styles.rowTextDate}>
                    {isCountType ? `잔여 ${item.remainingCount ?? 0}회` : (item.endDate || '-')}
                  </Text>
                </View>

                <View style={styles.colDday}>
                  <Text style={styles.rowTextDday}>
                    {isCountType
                      ? `${item.remainingCount ?? 0}회`
                      : calculateDDay(item.endDate)}
                  </Text>
                </View>

                <View style={[styles.colStatus, styles.center]}>
                  <View style={[styles.badge, isHolding ? styles.badgeHolding : styles.badgeActive]}>
                    <Text style={isHolding ? styles.badgeTextHolding : styles.badgeTextActive}>
                      {isHolding ? '정지' : '이용중'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.colAction, styles.rowCenter]}>
                  {displayType !== '일일권' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, isHolding ? styles.actionBtnUnpause : styles.actionBtnPause]}
                      onPress={() => togglePauseStatus(item.membershipId, item.membershipStatus)}
                    >
                      <Text style={isHolding ? styles.actionTextUnpause : styles.actionTextPause}>
                        {isHolding ? '해제' : '정지'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 34 }} /> 
                  )}

                  <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDeleteTicket(item.membershipId)}>
                    <Image source={require('../assets/trash.png')} style={styles.trashIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 💡 등록 플로팅 버튼 */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(insets.bottom + -30, 10) }]} 
        activeOpacity={0.8} 
        onPress={openEditModal}
      >
        <Text style={styles.fabText}>+ 이용권 등록</Text>
      </TouchableOpacity>

      {/* ─── 커스텀 알림 결과 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => {
              setResultModalVisible(false);
              if (typeof resultModalConfig.onConfirm === 'function') {
                resultModalConfig.onConfirm();
              }
            }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 투 버튼 확인(Confirm) 모달 ─── */}
      <Modal visible={confirmModalVisible} animationType="fade" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>{confirmModalConfig.title}</Text>
            <Text style={[styles.resultModalMessage, { marginBottom: 25 }]}>{confirmModalConfig.message}</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity 
                style={[styles.btnYes, confirmModalConfig.isDestructive && { backgroundColor: '#FF4D4D' }]} 
                onPress={confirmModalConfig.onConfirm}
              >
                <Text style={styles.btnTextBlack}>{confirmModalConfig.confirmText}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.btnTextWhite}>{confirmModalConfig.cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 💡 이용권 등록 바텀 시트 모달 */}
      <Modal visible={isEditModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeEditModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: editSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>이용권 등록</Text>
                <TouchableOpacity onPress={closeEditModal}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />

              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                  
                  {/* 검색 영역 */}
                  <View style={styles.modalSearchBox}>
                    <Text style={styles.searchIcon}>🔎</Text>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="부여할 회원을 검색하세요"
                      placeholderTextColor="#666"
                      value={modalSearch}
                      onChangeText={setModalSearch}
                    />
                  </View>

                  <View style={styles.modalTableHeader}>
                    <Text style={[styles.modalHeaderText, { flex: 1.5 }]}>회원정보</Text>
                    <Text style={[styles.modalHeaderText, { flex: 2, textAlign: 'center' }]}>연락처</Text>
                    <Text style={[styles.modalHeaderText, { flex: 1.5, textAlign: 'center' }]}>현재 이용권</Text>
                  </View>
                  <View style={styles.headerDivider} />

                  <View style={{ height: 140, marginBottom: 20 }}>
                    <ScrollView style={styles.searchResultTable} nestedScrollEnabled={true}>
                      {searchResults.length === 0 ? (
                        <Text style={styles.modalEmptyText}>검색된 회원이 없습니다.</Text>
                      ) : (
                        searchResults.map((u: any) => {
                          const isSelected = selectedUser && selectedUser.memberId === u.memberId;
                          const ticketTypeStr = resolveMembershipType(
                            u.membershipType || '',
                            u.startDate || '',
                            u.endDate || '',
                            u.remainingCount ?? null
                          );
                          const displayTicket = ticketTypeStr === '-' ? '없음' : ticketTypeStr;

                          return (
                            <TouchableOpacity
                              key={u.memberId}
                              style={[styles.searchResultRow, isSelected && styles.selectedRow]}
                              onPress={() => handleSelectUser(u)}
                            >
                              <Text style={[styles.resultTextName, { flex: 1.5 }]} numberOfLines={1}>{u.name}</Text>
                              <Text style={[styles.resultTextSub, { flex: 2, textAlign: 'center' }]}>{u.phone}</Text>
                              <Text style={[styles.resultTextType, { flex: 1.5, textAlign: 'center' }]}>
                                {displayTicket}
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>

                  {/* 입력 폼 영역 */}
                  {selectedUser && (
                    <View style={styles.formContainer}>
                      <Text style={styles.inputLabel}>이용권 종류</Text>
                      <View style={styles.typeToggleRow}>
                        <TouchableOpacity
                          style={[styles.typeBtn, editType === 'PERIOD' && styles.typeBtnActive]}
                          onPress={() => { setEditType('PERIOD'); setAddValue(''); }}
                        >
                          <Text style={[styles.typeBtnText, editType === 'PERIOD' && styles.typeBtnTextActive]}>기간권 (월권)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.typeBtn, editType === 'COUNT' && styles.typeBtnActive]}
                          onPress={() => { setEditType('COUNT'); setAddValue(''); }}
                        >
                          <Text style={[styles.typeBtnText, editType === 'COUNT' && styles.typeBtnTextActive]}>횟수권 (일일권)</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.horizontalDateRow}>
                        <View style={styles.dateBlock}>
                          <Text style={styles.inputLabel}>시작일</Text>
                          <TouchableOpacity style={styles.dateInputBox} onPress={() => setStartCalendarVisible(true)}>
                            <Text style={styles.dateText}>{editStart || getToday()}</Text>
                            <Image source={require('../assets/DATE.png')} style={styles.dateIcon} />
                          </TouchableOpacity>
                          {editStart && editStart !== getToday() && (
                            <TouchableOpacity onPress={() => setEditStart('')} style={styles.resetDateBtn}>
                              <Text style={styles.resetDateText}>오늘로 초기화</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.dateSpacer} />

                        <View style={styles.dateBlock}>
                          <Text style={styles.inputLabel}>
                            {editType === 'PERIOD' ? '개월 수' : '횟수 (비우면 1회)'}
                          </Text>
                          <TextInput
                            style={styles.amountInput}
                            placeholder={editType === 'PERIOD' ? '개월 수 입력' : '기본 1회'}
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={addValue}
                            onChangeText={setAddValue}
                          />
                        </View>
                      </View>

                      <TouchableOpacity style={styles.submitBtn} onPress={handleGrantTicket}>
                        <Text style={styles.submitBtnText}>등록 완료</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </KeyboardAvoidingView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 시작일 달력 모달 */}
      <Modal visible={isStartCalendarVisible} animationType="fade" transparent={true}>
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarBox}>
            <Text style={styles.calendarTitle}>시작일 선택</Text>
            <Calendar
              current={editStart || getToday()}
              onDayPress={(day: any) => {
                setEditStart(day.dateString);
                setStartCalendarVisible(false);
              }}
              theme={calendarTheme}
              markedDates={{
                [editStart || getToday()]: { selected: true, selectedColor: '#A1BE44' }
              }}
            />
            <TouchableOpacity style={styles.calendarCloseBtn} onPress={() => setStartCalendarVisible(false)}>
              <Text style={styles.calendarCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  searchContainer: { paddingHorizontal: 20, marginTop: 15, marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 15, height: 50 },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  headerText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  headerDivider: { height: 1, backgroundColor: '#333333', marginHorizontal: 20, marginBottom: 10 },

  listContainer: { paddingHorizontal: 20 },

  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 5, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A2A' },

  colInfo: { flex: 2.2, paddingLeft: 5 },
  colDate: { flex: 2.8 },
  colDday: { flex: 1.4 },
  colStatus: { flex: 1.6 },
  colAction: { flex: 2.0 },

  rowTextName: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  rowTextSub: { color: '#999', fontSize: 10 },
  rowTextDate: { color: '#ccc', fontSize: 10, textAlign: 'center' },
  rowTextDday: { color: '#A1BE44', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center', marginTop: 40 },

  center: { alignItems: 'center', justifyContent: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },

  badge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeHolding: { backgroundColor: 'rgba(255, 153, 0, 0.2)' },
  badgeTextActive: { color: '#A1BE44', fontSize: 10, fontWeight: 'bold' },
  badgeTextHolding: { color: '#FF9900', fontSize: 10, fontWeight: 'bold' },

  actionBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  actionBtnPause: { borderColor: '#FF4D4D', backgroundColor: 'rgba(255, 77, 77, 0.1)' },
  actionBtnUnpause: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  actionTextPause: { color: '#FF4D4D', fontSize: 10, fontWeight: 'bold' },
  actionTextUnpause: { color: '#A1BE44', fontSize: 10, fontWeight: 'bold' },

  trashBtn: { padding: 4 },
  trashIcon: { width: 16, height: 16, tintColor: '#FF4D4D', resizeMode: 'contain' },

  fab: { position: 'absolute', right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  fabText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  // 💡 바텀 시트 스타일
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxHeight: '90%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeIcon: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 15, height: 45, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  modalSearchInput: { flex: 1, color: '#fff' },

  modalTableHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 5 },
  modalHeaderText: { color: '#999', fontSize: 11, fontWeight: 'bold' },

  searchResultTable: { backgroundColor: '#000', borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  selectedRow: { backgroundColor: 'rgba(161, 190, 68, 0.15)', borderColor: '#A1BE44', borderWidth: 1, borderRadius: 8 },
  resultTextName: { color: '#fff', fontSize: 13, fontWeight: 'bold', paddingLeft: 10 },
  resultTextSub: { color: '#aaa', fontSize: 12 },
  resultTextType: { color: '#A1BE44', fontSize: 12, fontWeight: 'bold' },
  modalEmptyText: { color: '#666', textAlign: 'center', paddingVertical: 20 },

  // 💡 입력 폼 스타일
  formContainer: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginTop: 10 },
  typeToggleRow: { flexDirection: 'row', marginBottom: 20 },
  typeBtn: { flex: 1, height: 45, backgroundColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#333' },
  typeBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  typeBtnText: { color: '#999', fontWeight: 'bold' },
  typeBtnTextActive: { color: '#A1BE44' },

  horizontalDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateBlock: { flex: 1 },
  dateSpacer: { width: 15 },
  inputLabel: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginLeft: 2 },
  dateInputBox: { height: 45, backgroundColor: '#000', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderWidth: 1, borderColor: '#333' },
  dateText: { color: '#fff', fontSize: 14 },
  dateIcon: { width: 18, height: 18, tintColor: '#A1BE44' },
  resetDateBtn: { marginTop: 6, alignSelf: 'flex-start' },
  resetDateText: { color: '#A1BE44', fontSize: 11 },
  amountInput: { height: 45, backgroundColor: '#000', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#333', color: '#fff', fontSize: 14 },

  submitBtn: { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  calendarBox: { width: '90%', backgroundColor: '#212121', borderRadius: 16, padding: 15 },
  calendarTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  calendarCloseBtn: { marginTop: 15, paddingVertical: 12, backgroundColor: '#333333', borderRadius: 10, alignItems: 'center' },
  calendarCloseText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  // ─── 커스텀 알림 모달 전용 스타일 ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 15, marginBottom: 25, textAlign: 'center', lineHeight: 20 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  // 투 버튼 확인 모달 관련 스타일 추가
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default ManagerTicket;