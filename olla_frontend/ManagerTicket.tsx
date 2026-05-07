import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// 달력 한글 패치
LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'kr';

const ManagerTicket = ({ users = [], setUsers }: any) => {
  const insets = useSafeAreaInsets(); 

  const [searchQuery, setSearchQuery] = useState('');
  
  // 💡 삭제 모달 상태
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToClearTicket, setUserToClearTicket] = useState<number | null>(null);

  // 💡 일시정지 모달 상태
  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const [userToTogglePause, setUserToTogglePause] = useState<any>(null);
  
  // 💡 수정/등록 모달 상태
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 💡 달력 모달 상태
  const [isStartCalendarVisible, setStartCalendarVisible] = useState(false);
  const [isEndCalendarVisible, setEndCalendarVisible] = useState(false);
  
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editType, setEditType] = useState<'회원권' | '일일권'>('회원권');

  const getToday = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const calculateDDay = (targetDate: string) => {
    if (!targetDate) return '-';
    const end = new Date(targetDate);
    const diff = end.getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 ? `${days}일` : '만료';
  };

  // 💡 이용권 보유 유저 필터링
  const ticketHolders = useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    return users
      .filter((u: any) => u?.ticket && u?.name?.includes(searchQuery))
      .map((u: any) => ({
        ...u,
        status: u.status === '일시정지' ? '일시정지' : '정지해제' 
      }))
      .sort((a: any, b: any) => (a?.name || '').localeCompare(b?.name || ''));
  }, [users, searchQuery]);

  const searchResults = useMemo(() => {
    if (!modalSearch || !Array.isArray(users)) return [];
    return users.filter((u: any) => u?.name?.includes(modalSearch) || u?.phone?.includes(modalSearch));
  }, [users, modalSearch]);

  const handleSelectUser = (u: any) => {
    setSelectedUser(u);
    if (u?.ticket) {
      setEditType(u.ticket.type);
      setEditStart(u.ticket.start);
      setEditEnd(u.ticket.end);
    } else {
      setEditType('회원권');
      setEditStart('');
      setEditEnd('');
    }
  };

  const handleSaveTicket = () => {
    if (!selectedUser) return;

    const finalStart = editStart || getToday();
    const finalEnd = editType === '회원권' ? editEnd : '';

    const updatedUsers = users.map((u: any) => {
      if (u.id === selectedUser.id) {
        return {
          ...u,
          status: '정지해제', 
          ticket: { type: editType, start: finalStart, end: finalEnd }
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    closeEditModal();
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedUser(null);
    setModalSearch('');
  };

  // 💡 일시정지/해제 토글 실행 함수
  const executeTogglePause = () => {
    if (!userToTogglePause) return;
    
    const newStatus = userToTogglePause.status === '정지해제' ? '일시정지' : '정지해제';
    
    const updatedUsers = users.map((u: any) => {
      if (u.id === userToTogglePause.id) {
        return { ...u, status: newStatus };
      }
      return u;
    });

    setUsers(updatedUsers);
    setPauseModalVisible(false);
    setUserToTogglePause(null);
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
    textDayFontSize: 15,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14
  };

  const renderCalendarArrow = (direction: string) => (
    <View style={styles.calendarArrowBtn}>
      <Text style={styles.calendarArrowText}>
        {direction === 'left' ? '◀' : '▶'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.background} edges={['top', 'left', 'right']}>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="회원 이름으로 검색"
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* 💡 요청하신 정확한 5등분 헤더 이름 적용 */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colInfo]} numberOfLines={1} adjustsFontSizeToFit>회원정보/종류</Text>
        <Text style={[styles.headerText, styles.colDate]} numberOfLines={1} adjustsFontSizeToFit>시작일/종료일</Text>
        <Text style={[styles.headerText, styles.colDday]} numberOfLines={1} adjustsFontSizeToFit>남은 일수</Text>
        <Text style={[styles.headerText, styles.colStatus]} numberOfLines={1} adjustsFontSizeToFit>상태/일시정지</Text>
        <Text style={[styles.headerText, styles.colAction]} numberOfLines={1} adjustsFontSizeToFit>삭제</Text>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(insets.bottom + 100, 100) }]}
      >
        {ticketHolders.length === 0 ? (
          <Text style={styles.emptyText}>보유 중인 이용권이 없습니다.</Text>
        ) : (
          ticketHolders.map((item: any) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.colInfo}>
                <Text style={styles.rowTextName} numberOfLines={1}>{item?.name}</Text>
                <Text style={styles.rowTextSub}>{item?.ticket?.type}</Text>
              </View>
              
              <View style={styles.colDate}>
                <Text style={styles.rowTextDate}>{item?.ticket?.start}</Text>
                <Text style={styles.rowTextDate}>{item?.ticket?.end || '-'}</Text>
              </View>
              
              <View style={styles.colDday}>
                <Text style={styles.rowTextDday}>{item?.ticket?.type === '회원권' ? calculateDDay(item?.ticket?.end) : '-'}</Text>
              </View>
              
              <View style={[styles.colStatus, styles.statusColWrapper]}>
                <Text style={item.status === '정지해제' ? styles.statusActiveText : styles.statusPausedText}>
                  {item.status}
                </Text>
                {/* 💡 모달창 연결 확실하게 세팅 */}
                <TouchableOpacity 
                  style={styles.actionBtn}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  onPress={() => {
                    setUserToTogglePause(item);
                    setPauseModalVisible(true);
                  }}
                >
                  <Image 
                    source={item.status === '정지해제' ? require('./assets/stop.png') : require('./assets/Play.png')} 
                    style={[styles.actionIcon, item.status === '일시정지' && { tintColor: '#8E8E8E' }]} 
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.colAction, styles.center]}>
                <TouchableOpacity 
                  style={styles.trashBtn}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  onPress={() => { 
                    setUserToClearTicket(item.id); 
                    setDeleteModalVisible(true); 
                  }}
                >
                  <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                </TouchableOpacity>
              </View>

            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(insets.bottom + 30, 30) }]} 
        activeOpacity={0.8} 
        onPress={() => setEditModalVisible(true)}
      >
        <Text style={styles.fabText}>+ 등록</Text>
      </TouchableOpacity>

      {/* ================================================================= */}
      {/* 💡 1. 일시정지/해제 모달 (이제 무조건 뜹니다!) */}
      {/* ================================================================= */}
      <Modal visible={isPauseModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>
              {userToTogglePause?.status === '정지해제' 
                ? '이용권을 일시정지 하시겠습니까?' 
                : '이용권을 정지 해제 하시겠습니까?'}
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnYes} onPress={executeTogglePause}>
                <Text style={styles.btnTextBlack}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setPauseModalVisible(false)}>
                <Text style={styles.btnTextWhite}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* 💡 2. 삭제 확인 모달 */}
      {/* ================================================================= */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>이용권을 삭제하시겠습니까?</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={styles.btnYes} 
                onPress={() => { 
                  setUsers(users.map((u: any) => u.id === userToClearTicket ? { ...u, ticket: null, status: '비활중' } : u)); 
                  setDeleteModalVisible(false); 
                }}
              >
                <Text style={styles.btnTextBlack}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.btnTextWhite}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* 💡 3. 이용권 등록/수정 모달 */}
      {/* ================================================================= */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>이용권 등록/수정</Text>
              <TouchableOpacity onPress={closeEditModal}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Text style={styles.searchIcon}>🔎</Text>
              <TextInput style={styles.modalSearchInput} placeholder="등록/수정할 회원을 검색하세요" placeholderTextColor="#666" value={modalSearch} onChangeText={setModalSearch} />
            </View>
            <View style={styles.modalTableHeader}>
              <Text style={[styles.modalHeaderText, { flex: 1.5 }]}>회원정보</Text>
              <Text style={[styles.modalHeaderText, { flex: 2, textAlign: 'center' }]}>연락처</Text>
              <Text style={[styles.modalHeaderText, { flex: 1.5, textAlign: 'center' }]}>현재 이용권</Text>
              <Text style={[styles.modalHeaderText, { flex: 1.5, textAlign: 'center' }]}>종료일</Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={{ height: 140, marginBottom: 20 }}>
              <ScrollView style={styles.searchResultTable}>
                {searchResults.length === 0 ? (
                  <Text style={styles.modalEmptyText}>검색된 회원이 없습니다.</Text>
                ) : (
                  searchResults.map((u: any) => (
                    <TouchableOpacity key={u.id} style={[styles.searchResultRow, selectedUser?.id === u.id && styles.selectedRow]} onPress={() => handleSelectUser(u)}>
                      <Text style={[styles.resultTextName, { flex: 1.5 }]} numberOfLines={1}>{u?.name}</Text>
                      <Text style={[styles.resultTextSub, { flex: 2, textAlign: 'center' }]}>{u?.phone}</Text>
                      <Text style={[styles.resultTextType, { flex: 1.5, textAlign: 'center' }]}>{u?.ticket ? u.ticket.type : '없음'}</Text>
                      <Text style={[styles.resultTextSub, { flex: 1.5, textAlign: 'center' }]}>{u?.ticket?.end ? u.ticket.end : '-'}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
            {selectedUser && (
              <View style={styles.editForm}>
                {!selectedUser?.ticket && (
                  <View style={styles.typeToggleRow}>
                    <TouchableOpacity style={[styles.typeBtn, editType === '회원권' && styles.typeBtnActive]} onPress={() => setEditType('회원권')}><Text style={[styles.typeBtnText, editType === '회원권' && styles.typeBtnTextActive]}>회원권</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.typeBtn, editType === '일일권' && styles.typeBtnActive]} onPress={() => setEditType('일일권')}><Text style={[styles.typeBtnText, editType === '일일권' && styles.typeBtnTextActive]}>일일권</Text></TouchableOpacity>
                  </View>
                )}
                <View style={styles.horizontalDateRow}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.inputLabel}>{editType === '회원권' ? '시작일' : '방문일'}</Text>
                    <TouchableOpacity style={styles.dateInputBox} onPress={() => setStartCalendarVisible(true)}>
                      <Text style={[styles.dateText, !editStart && { color: '#666' }]}>{editStart || getToday()}</Text>
                      <Image source={require('./assets/DATE.png')} style={styles.dateIcon} />
                    </TouchableOpacity>
                  </View>
                  {editType === '회원권' && (
                    <>
                      <View style={styles.dateSpacer} />
                      <View style={styles.dateBlock}>
                        <Text style={styles.inputLabel}>종료일</Text>
                        <TouchableOpacity style={styles.dateInputBox} onPress={() => setEndCalendarVisible(true)}>
                          <Text style={[styles.dateText, !editEnd && { color: '#666' }]}>{editEnd || getToday()}</Text>
                          <Image source={require('./assets/DATE.png')} style={styles.dateIcon} />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTicket}>
                  <Text style={styles.saveBtnText}>저장하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 달력 모달들 */}
      <Modal visible={isStartCalendarVisible} animationType="fade" transparent={true}>
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarBox}>
            <Calendar current={editStart || getToday()} onDayPress={(day: any) => { setEditStart(day.dateString); setStartCalendarVisible(false); }} theme={calendarTheme} markedDates={{ [editStart || getToday()]: { selected: true, selectedColor: '#A1BE44' } }} renderArrow={renderCalendarArrow} />
            <TouchableOpacity style={styles.calendarCloseBtn} onPress={() => setStartCalendarVisible(false)}><Text style={styles.calendarCloseText}>닫기</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isEndCalendarVisible} animationType="fade" transparent={true}>
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarBox}>
            <Calendar current={editEnd || getToday()} onDayPress={(day: any) => { setEditEnd(day.dateString); setEndCalendarVisible(false); }} theme={calendarTheme} markedDates={{ [editEnd || getToday()]: { selected: true, selectedColor: '#A1BE44' } }} renderArrow={renderCalendarArrow} />
            <TouchableOpacity style={styles.calendarCloseBtn} onPress={() => setEndCalendarVisible(false)}><Text style={styles.calendarCloseText}>닫기</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 15, paddingTop: 15 },
  searchContainer: { marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 15, height: 50 },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5 },
  headerText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }, // 💡 글자 크기를 살짝 줄여서 한 줄에 딱 맞게 배치
  headerDivider: { height: 1, backgroundColor: '#333333', marginBottom: 10 },
  
  listContainer: { flexGrow: 1 }, 
  
  // 💡 5개의 열(Column)이 한 줄에 꽉 차고 예쁘게 배치되도록 비율 재수정
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A' },
  colInfo: { flex: 2.2, paddingLeft: 10 },
  colDate: { flex: 2.5 },
  colDday: { flex: 1.4 },
  colStatus: { flex: 1.9 }, 
  colAction: { flex: 1.0 }, 
  
  rowTextName: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  rowTextSub: { color: '#999', fontSize: 11 },
  rowTextDate: { color: '#ccc', fontSize: 11, textAlign: 'center' },
  rowTextDday: { color: '#A1BE44', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center', marginTop: 40 },
  center: { alignItems: 'center', justifyContent: 'center' },

  statusColWrapper: { alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
  statusActiveText: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  statusPausedText: { color: '#8E8E8E', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  actionBtn: { padding: 4 },
  actionIcon: { width: 22, height: 22, tintColor: '#A1BE44', resizeMode: 'contain' },
  
  trashBtn: { padding: 8 },
  trashIcon: { width: 18, height: 18, tintColor: '#FF4D4D', resizeMode: 'contain' },
  
  fab: { position: 'absolute', right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30, elevation: 5 },
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
  
  saveBtn: { backgroundColor: '#A1BE44', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  calendarBox: { width: '90%', backgroundColor: '#212121', borderRadius: 16, padding: 15 },
  
  calendarArrowBtn: { backgroundColor: '#333333', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  calendarArrowText: { color: '#A1BE44', fontSize: 14, fontWeight: '900' },

  calendarCloseBtn: { marginTop: 15, paddingVertical: 12, backgroundColor: '#333333', borderRadius: 10, alignItems: 'center' },
  calendarCloseText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000', fontWeight: 'bold' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
});

export default ManagerTicket;