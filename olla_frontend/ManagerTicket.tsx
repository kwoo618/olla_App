import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API 주소 세팅
const API_BASE_URL = 'http://172.29.145.90:8080/api/v1';
const MEMBER_LIST_API = `${API_BASE_URL}/admin/memberships/members`; 
const MEMBERSHIP_GRANT_API = `${API_BASE_URL}/admin/memberships/grant`; 
const MEMBERSHIP_BASE_API = `${API_BASE_URL}/admin/memberships`; 

// 달력 한글 패치
LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'kr';

const ManagerTicket = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 달력 모달 상태
  const [isStartCalendarVisible, setStartCalendarVisible] = useState(false);
  
  // 부여할 이용권 상태
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
        Alert.alert("권한 오류", "관리자만 접근할 수 있는 페이지입니다.");
        navigation.goBack();
        return;
      }
      await fetchUsers(token);
    } catch (error) {
      console.error("인증 에러:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      const response = await axios.get(MEMBER_LIST_API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 1000, sort: 'id,desc' } 
      });
      const memberList = response.data?.data?.content || response.data?.data || [];
      setUsers(memberList);
    } catch (error) {
      Alert.alert("오류", "회원 목록을 불러오는데 실패했습니다.");
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
    today.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
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
    if (!addValue || isNaN(Number(addValue))) {
      Alert.alert("알림", "정확한 숫자(개월 수 또는 횟수)를 입력해주세요.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      // ID를 보다 확실하게 추출
      const memberId = selectedUser.memberId || selectedUser.id || selectedUser.member?.id;
      
      const requestBody = {
        memberId: memberId,
        type: editType,
        addMonths: editType === 'PERIOD' ? Number(addValue) : 0,
        addCount: editType === 'COUNT' ? Number(addValue) : 0,
        startDate: editStart || getToday()
      };

      await axios.post(MEMBERSHIP_GRANT_API, requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("성공", "이용권이 성공적으로 부여되었습니다.");
      closeEditModal();
      fetchUsers(token!);
    } catch (error: any) {
      console.error("이용권 부여 실패:", error);
      Alert.alert("오류", "이용권 부여에 실패했습니다. 백엔드 설정을 확인해주세요.");
    }
  };

  const togglePauseStatus = (membershipId: number, currentStatus: string) => {
    if (!membershipId) {
      Alert.alert("오류", "이용권 ID를 확인할 수 없습니다.");
      return;
    }
    const isCurrentlyHolding = currentStatus === 'HOLDING';
    const actionText = isCurrentlyHolding ? '정지 해제' : '일시정지';
    const endpoint = isCurrentlyHolding ? 'unpause' : 'pause';

    Alert.alert(
      `${actionText} 확인`,
      `해당 이용권을 ${actionText} 하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        { 
          text: "확인", 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.patch(`${MEMBERSHIP_BASE_API}/${membershipId}/${endpoint}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert("성공", `이용권이 ${actionText} 되었습니다.`);
              fetchUsers(token!);
            } catch (error) {
              Alert.alert("오류", "상태 변경에 실패했습니다.");
            }
          } 
        }
      ]
    );
  };

  // 💡 알림(Alert)창으로 변경된 이용권 삭제 처리 함수
  const executeDeleteTicket = async (membershipId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${MEMBERSHIP_BASE_API}/${membershipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("성공", "이용권이 삭제되었습니다.");
      fetchUsers(token!);
    } catch (error: any) {
      console.error(error);
      Alert.alert("오류", "이용권 삭제에 실패했습니다.");
    }
  };

  const confirmDeleteTicket = (membershipId: number) => {
    if (!membershipId) {
      Alert.alert("오류", "이용권 ID를 확인할 수 없습니다.");
      return;
    }
    // 모달 대신 Alert 사용
    Alert.alert(
      "이용권 삭제 확인",
      "해당 이용권을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        { text: "삭제", onPress: () => executeDeleteTicket(membershipId), style: "destructive" }
      ]
    );
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedUser(null);
    setModalSearch('');
    setAddValue('');
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
    <SafeAreaView style={styles.background} edges={[]}>
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

      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colInfo]}>회원/이용권</Text>
        <Text style={[styles.headerText, styles.colDate]}>시작일/종료일</Text>
        <Text style={[styles.headerText, styles.colDday]}>잔여</Text>
        <Text style={[styles.headerText, styles.colStatus]}>상태</Text>
        <Text style={[styles.headerText, styles.colAction]}>관리</Text>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {ticketHolders.length === 0 ? (
          <Text style={styles.emptyText}>보유 중인 이용권이 없습니다.</Text>
        ) : (
          ticketHolders.map((item: any) => {
            const isPeriod = item.membershipType === 'PERIOD';
            const displayType = isPeriod ? '기간권' : '횟수권';
            const isHolding = item.membershipStatus === 'HOLDING';

            return (
              <View key={item.memberId} style={styles.tableRow}>
                <View style={styles.colInfo}>
                  <Text style={styles.rowTextName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.rowTextSub}>{displayType}</Text>
                </View>
                
                <View style={styles.colDate}>
                  <Text style={styles.rowTextDate}>{item.startDate || '-'}</Text>
                  <Text style={styles.rowTextDate}>{item.endDate || '-'}</Text>
                </View>
                
                <View style={styles.colDday}>
                  <Text style={styles.rowTextDday}>
                    {isPeriod ? calculateDDay(item.endDate) : `${item.remainingCount || 0}회`}
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
                  <TouchableOpacity 
                    style={[styles.actionBtn, isHolding ? styles.actionBtnUnpause : styles.actionBtnPause]} 
                    onPress={() => togglePauseStatus(item.membershipId, item.membershipStatus)}
                  >
                    <Text style={isHolding ? styles.actionTextUnpause : styles.actionTextPause}>
                      {isHolding ? '해제' : '정지'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDeleteTicket(item.membershipId)}>
                    <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => setEditModalVisible(true)}>
        <Text style={styles.fabText}>+ 부여</Text>
      </TouchableOpacity>

      {/* 이용권 부여 모달 */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>이용권 부여</Text>
              <TouchableOpacity onPress={closeEditModal}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
            </View>

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
              <ScrollView style={styles.searchResultTable}>
                {searchResults.length === 0 ? (
                  <Text style={styles.modalEmptyText}>검색된 회원이 없습니다.</Text>
                ) : (
                  searchResults.map((u: any) => {
                    const isSelected = selectedUser && selectedUser.memberId === u.memberId;
                    const ticketTypeStr = u.membershipType === 'PERIOD' ? '기간권' : (u.membershipType === 'COUNT' ? '횟수권' : '없음');

                    return (
                      <TouchableOpacity 
                        key={u.memberId} 
                        style={[styles.searchResultRow, isSelected && styles.selectedRow]} 
                        onPress={() => handleSelectUser(u)}
                      >
                        <Text style={[styles.resultTextName, { flex: 1.5 }]} numberOfLines={1}>{u.name}</Text>
                        <Text style={[styles.resultTextSub, { flex: 2, textAlign: 'center' }]}>{u.phone}</Text>
                        <Text style={[styles.resultTextType, { flex: 1.5, textAlign: 'center' }]}>
                          {ticketTypeStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {selectedUser && (
              <View style={styles.editForm}>
                <View style={styles.typeToggleRow}>
                  <TouchableOpacity style={[styles.typeBtn, editType === 'PERIOD' && styles.typeBtnActive]} onPress={() => setEditType('PERIOD')}>
                    <Text style={[styles.typeBtnText, editType === 'PERIOD' && styles.typeBtnTextActive]}>기간권 (월권)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, editType === 'COUNT' && styles.typeBtnActive]} onPress={() => setEditType('COUNT')}>
                    <Text style={[styles.typeBtnText, editType === 'COUNT' && styles.typeBtnTextActive]}>횟수권 (일일권)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.horizontalDateRow}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.inputLabel}>시작일</Text>
                    <TouchableOpacity style={styles.dateInputBox} onPress={() => setStartCalendarVisible(true)}>
                      <Text style={[styles.dateText, !editStart && { color: '#666' }]}>{editStart || getToday()}</Text>
                      <Image source={require('./assets/DATE.png')} style={styles.dateIcon} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateSpacer} />
                  
                  <View style={styles.dateBlock}>
                    <Text style={styles.inputLabel}>{editType === 'PERIOD' ? '추가 개월 수 (개월)' : '추가 횟수 (회)'}</Text>
                    <TextInput 
                      style={styles.amountInput}
                      placeholder="숫자 입력"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={addValue}
                      onChangeText={setAddValue}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleGrantTicket}>
                  <Text style={styles.saveBtnText}>이용권 부여하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 커스텀 달력 모달 */}
      <Modal visible={isStartCalendarVisible} animationType="fade" transparent={true}>
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarBox}>
            <Calendar
              current={editStart || getToday()}
              onDayPress={(day: any) => {
                setEditStart(day.dateString);
                setStartCalendarVisible(false);
              }}
              theme={calendarTheme}
              markedDates={{ [editStart || getToday()]: { selected: true, selectedColor: '#A1BE44' } }}
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

// 💡 Flex 값을 전체 10.0 기준으로 화면에 조화롭게 들어가도록 재조정
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 15, paddingTop: 15 },
  searchContainer: { marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 15, height: 50 },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5 },
  headerText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  headerDivider: { height: 1, backgroundColor: '#333333', marginBottom: 10 },
  listContainer: { paddingBottom: 100 },
  
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 5, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  
  // 가로 정렬 및 공간 최적화
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

  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  fabText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  editModalBox: { width: '95%', backgroundColor: '#212121', borderRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeIcon: { color: '#666', fontSize: 22 },
  
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 15, height: 45, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  modalSearchInput: { flex: 1, color: '#fff' },
  
  modalTableHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 5 },
  modalHeaderText: { color: '#999', fontSize: 11, fontWeight: 'bold' },
  
  searchResultTable: { backgroundColor: '#1A1A1A', borderRadius: 10 },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  selectedRow: { backgroundColor: 'rgba(161, 190, 68, 0.15)', borderColor: '#A1BE44', borderWidth: 1, borderRadius: 8 },
  resultTextName: { color: '#fff', fontSize: 13, fontWeight: 'bold', paddingLeft: 5 },
  resultTextSub: { color: '#aaa', fontSize: 12 },
  resultTextType: { color: '#A1BE44', fontSize: 12, fontWeight: 'bold' },
  modalEmptyText: { color: '#666', textAlign: 'center', paddingVertical: 20 },

  editForm: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15 },
  typeToggleRow: { flexDirection: 'row', marginBottom: 20 },
  typeBtn: { flex: 1, height: 45, backgroundColor: '#1A1A1A', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#333' },
  typeBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  typeBtnText: { color: '#666', fontWeight: 'bold' },
  typeBtnTextActive: { color: '#A1BE44' },

  horizontalDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateBlock: { flex: 1 },
  dateSpacer: { width: 15 },
  inputLabel: { color: '#fff', fontSize: 12, marginBottom: 8, marginLeft: 2 },
  dateInputBox: { height: 45, backgroundColor: '#1A1A1A', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderWidth: 1, borderColor: '#444' },
  dateText: { color: '#fff', fontSize: 13 },
  dateIcon: { width: 18, height: 18, tintColor: '#A1BE44' },
  amountInput: { height: 45, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#444', color: '#fff' },
  
  saveBtn: { backgroundColor: '#A1BE44', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  calendarBox: { width: '90%', backgroundColor: '#212121', borderRadius: 16, padding: 15 },
  calendarCloseBtn: { marginTop: 15, paddingVertical: 12, backgroundColor: '#333333', borderRadius: 10, alignItems: 'center' },
  calendarCloseText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
});

export default ManagerTicket;