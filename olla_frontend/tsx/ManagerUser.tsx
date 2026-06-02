import React from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, RefreshControl, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useManagerUser, resolveMembershipType, getFullImageUrl } from '../ts/ManagerUser';

const ManagerUser = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  
  // 훅에서 모든 로직과 상태를 가져옵니다.
  const {
    loading, refreshing, onRefresh,
    searchQuery, setSearchQuery, filteredAndSortedUsers,
    
    resultModalVisible, setResultModalVisible, resultModalConfig,
    confirmModalVisible, setConfirmModalVisible, confirmModalConfig, confirmDelete,
    
    isAddModalVisible, openAddModal, closeAddModal,
    newName, setNewName, newGender, setNewGender, newBirth, formatBirth, newPhone, formatPhone,
    isFormValid, handleRegister,
    
    isDetailVisible, selectedUser, openDetailModal, closeDetailModal, detailHeightAnim, detailPanResponder,
    
    isSendAlertModalVisible, openAlertModal, closeAlertModal, alertHeightAnim, alertPanResponder,
    alertTitle, setAlertTitle, alertContent, setAlertContent, isProcessing, handleSendAlert,
    addHeightAnim, addPanResponder
  } = useManagerUser(navigation);

  if (loading) return <View style={styles.background}><ActivityIndicator size="large" color="#A1BE44" /></View>;

  return (
    <SafeAreaView style={styles.background} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />} contentContainerStyle={{ paddingBottom: 150 }}>
        
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔎</Text>
            <TextInput style={styles.searchInput} placeholder="회원 검색" placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colName, { textAlign: 'center' }]}>회원 정보</Text>
          <Text style={[styles.headerText, styles.colPhone, { textAlign: 'center' }]}>연락처</Text>
          <Text style={[styles.headerText, styles.colStatus, { textAlign: 'center' }]}>상태</Text>
          <Text style={[styles.headerText, styles.colAction, { textAlign: 'center' }]}>관리</Text>
        </View>
        <View style={styles.headerDivider} />

        {filteredAndSortedUsers.length === 0 ? (
          <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', marginTop: 40 }}>검색 결과가 없습니다.</Text>
        ) : (
          filteredAndSortedUsers.map((user, index) => {
            const { memberId, memberInfo, targetName, targetPhone, memberships } = user;
            let displayType = '없음';
            let badgeStyle = styles.badgeInactive;
            let badgeTextColor = '#999';

            if (memberships && memberships.length > 0) {
              const types = memberships.map((m: any) => resolveMembershipType(m.membershipType, m.startDate, m.endDate, m.remainingCount));
              const validTypes = types.filter((t: string) => t !== '없음' && t !== '이용권');

              if (validTypes.includes('회원권') && validTypes.includes('일일권')) {
                displayType = '회원/일일'; badgeStyle = styles.badgePeriod; badgeTextColor = '#A1BE44';
              } else if (validTypes.includes('회원권')) {
                displayType = '회원권'; badgeStyle = styles.badgePeriod; badgeTextColor = '#A1BE44';
              } else if (validTypes.includes('일일권')) {
                displayType = '일일권'; badgeStyle = styles.badgeCount; badgeTextColor = '#009DFF';
              }
            } else {
              const memType = user.membershipType || memberInfo.membershipType || '';
              const resolved = resolveMembershipType(memType, user.startDate, user.endDate, user.remainingCount);
              if (resolved === '회원권') { 
                displayType = '회원권'; badgeStyle = styles.badgePeriod; badgeTextColor = '#A1BE44'; 
              } else if (resolved === '일일권') { 
                displayType = '일일권'; badgeStyle = styles.badgeCount; badgeTextColor = '#009DFF'; 
              }
            }

            // 💡 프로필 이미지 경로 변환 적용
            const avatarSource = memberInfo.profileImageUrl 
              ? { uri: getFullImageUrl(memberInfo.profileImageUrl) } 
              : require('../assets/profile.png');

            return (
              <View key={`u-${memberId || index}`} style={styles.tableRow}>
                <TouchableOpacity style={[styles.colName, styles.profileNameContainer]} onPress={() => openDetailModal(memberId, targetName, targetPhone)}>
                  <Image source={avatarSource} style={styles.listProfileImg} />
                  <Text style={styles.rowTextBold} numberOfLines={1}>{targetName}</Text>
                </TouchableOpacity>
                
                <Text style={[styles.rowText, styles.colPhone, { textAlign: 'center' }]}>{targetPhone || '-'}</Text>
                
                <View style={[styles.colStatus, styles.centerAlign]}>
                  <View style={[styles.badge, badgeStyle]}>
                    <Text style={[styles.badgeText, { color: badgeTextColor }]}>{displayType}</Text>
                  </View>
                </View>

                <View style={[styles.colAction, styles.centerAlign]}>
                  <TouchableOpacity onPress={() => confirmDelete(memberId)}>
                    <Image source={require('../assets/trash.png')} style={styles.trashIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom, 20) }]} onPress={openAddModal}>
        <Text style={styles.fabText}>+ 회원 등록</Text>
      </TouchableOpacity>

      {/* 🌟 1. 회원 상세 정보 모달 */}
      <Modal visible={isDetailVisible} transparent animationType="fade" onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeDetailModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: detailHeightAnim }]}>
            <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.sheetTitle}>회원 상세 정보</Text>
                <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: '#999', fontSize: 24 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* [수정 포인트] flex: 1 추가 및 paddingBottom 늘림 */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              {selectedUser && (
                <View style={styles.infoBox}>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>이름</Text><Text style={styles.detailValue}>{selectedUser.name}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>성별</Text><Text style={styles.detailValue}>{selectedUser.gender}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>연락처</Text><Text style={styles.detailValue}>{selectedUser.phone}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>키/몸무게</Text><Text style={styles.detailValue}>{selectedUser.height}cm / {selectedUser.weight}kg</Text></View>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.closeFullBtn, { backgroundColor: '#4A90D9', marginBottom: 10 }]} 
                onPress={() => {
                  closeDetailModal();
                  setTimeout(() => openAlertModal(), 300);
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

      {/* 🌟 2. 회원 등록 모달 */}
      <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={() => closeAddModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => closeAddModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[styles.bottomSheet, { height: addHeightAnim, paddingBottom: 20 }]}>
              <View {...addPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={styles.sheetTitle}>신규 회원 등록</Text>
                  <TouchableOpacity onPress={() => closeAddModal()} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={{ color: '#999', fontSize: 24 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* [수정 포인트] flex: 1 추가 및 paddingBottom 늘림 */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>이름</Text>
                  <TextInput style={styles.inputField} placeholder="이름 입력" placeholderTextColor="#666" value={newName} onChangeText={setNewName} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>성별</Text>
                  <View style={styles.genderRow}>
                    <TouchableOpacity style={[styles.genderBtn, newGender === '남자' && styles.genderBtnActive]} onPress={() => setNewGender('남자')}>
                      <Text style={[styles.genderText, newGender === '남자' && styles.genderTextActive]}>남자</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.genderBtn, newGender === '여자' && styles.genderBtnActive]} onPress={() => setNewGender('여자')}>
                      <Text style={[styles.genderText, newGender === '여자' && styles.genderTextActive]}>여자</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>생년월일</Text>
                  <TextInput style={styles.inputField} placeholder="YYYY-MM-DD" placeholderTextColor="#666" value={newBirth} onChangeText={formatBirth} keyboardType="numeric" maxLength={10} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>연락처</Text>
                  <TextInput style={styles.inputField} placeholder="010-0000-0000" placeholderTextColor="#666" value={newPhone} onChangeText={formatPhone} keyboardType="numeric" maxLength={13} />
                </View>
                <TouchableOpacity style={[styles.closeFullBtn, !isFormValid && { backgroundColor: '#444' }]} disabled={!isFormValid} onPress={handleRegister}>
                  <Text style={[styles.closeFullBtnText, !isFormValid && { color: '#888' }]}>등록하기</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 🌟 3. 회원 삭제 모달 */}
      <Modal visible={confirmModalVisible} animationType="fade" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>{confirmModalConfig.message}</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity 
                style={[styles.btnYes, confirmModalConfig.isDestructive ? { backgroundColor: '#FF4D4D' } : { backgroundColor: '#A1BE44' }]} 
                onPress={confirmModalConfig.onConfirm}
              >
                <Text style={[styles.btnTextBlack, confirmModalConfig.isDestructive && { color: '#ffffff' }]}>{confirmModalConfig.confirmText}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.btnTextWhite}>{confirmModalConfig.cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 💡 4. 알림 보내기 모달 */}
      <Modal visible={isSendAlertModalVisible} transparent animationType="fade" onRequestClose={() => closeAlertModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => closeAlertModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[styles.bottomSheet, { height: alertHeightAnim, paddingBottom: 20 }]}>
              <View {...alertPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={styles.sheetTitle}>{selectedUser?.name}님 알림 발송</Text>
                  <TouchableOpacity onPress={() => closeAlertModal()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ color: '#999', fontSize: 24 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* [수정 포인트] flex: 1 추가 및 paddingBottom 늘림 */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>제목</Text>
                  <TextInput style={styles.inputField} placeholder="제목 입력" placeholderTextColor="#666" value={alertTitle} onChangeText={setAlertTitle} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>내용</Text>
                  <TextInput style={[styles.inputField, { height: 120, textAlignVertical: 'top' }]} placeholder="내용 입력" placeholderTextColor="#666" value={alertContent} onChangeText={setAlertContent} multiline />
                </View>
                <TouchableOpacity
                  style={[styles.closeFullBtn, { backgroundColor: '#4A90D9' }, (!alertTitle.trim() || !alertContent.trim()) && { backgroundColor: '#444' }]}
                  disabled={isProcessing || !alertTitle.trim() || !alertContent.trim()}
                  onPress={handleSendAlert}
                >
                  {isProcessing
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={[styles.closeFullBtnText, { color: '#fff' }, (!alertTitle.trim() || !alertContent.trim()) && { color: '#888' }]}>발송하기</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 🌟 5. 공통 알림 모달 */}
      <Modal visible={resultModalVisible} transparent animationType="fade">
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: resultModalConfig.type === 'error' ? '#FF4D4D' : '#A1BE44' }]}>{resultModalConfig.title}</Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => { setResultModalVisible(false); resultModalConfig.onConfirm(); }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  searchContainer: { paddingHorizontal: 20, marginVertical: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 15, height: 55 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10 },
  headerText: { color: '#999', fontSize: 13, fontWeight: 'bold' },
  headerDivider: { height: 1, backgroundColor: '#333', marginHorizontal: 20, marginBottom: 10 },
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 15, marginBottom: 10, marginHorizontal: 15 },
  colName: { flex: 3 },
  colPhone: { flex: 4 },
  colStatus: { flex: 2 },
  colAction: { flex: 1 },
  centerAlign: { alignItems: 'center', justifyContent: 'center' },
  profileNameContainer: { flexDirection: 'row', alignItems: 'center' },
  listProfileImg: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10, backgroundColor: '#444' },
  rowTextBold: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  rowText: { color: '#ccc', fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePeriod: { backgroundColor: 'rgba(161, 190, 68, 0.2)' },
  badgeCount: { backgroundColor: 'rgba(0, 157, 255, 0.2)' },
  badgeInactive: { backgroundColor: '#333' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#A1BE44' },
  trashIcon: { width: 20, height: 20, tintColor: '#FF4D4D' },
  fab: { position: 'absolute', right: 20, backgroundColor: '#A1BE44', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  fabText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 25, paddingTop: 10, overflow: 'hidden', width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  inputField: { backgroundColor: '#000', color: '#fff', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 15, fontSize: 16 },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genderBtn: { flex: 1, backgroundColor: '#000', borderWidth: 1, borderColor: '#444', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginHorizontal: 5 },
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
  genderTextActive: { color: '#A1BE44' },
  infoBox: { backgroundColor: '#262626', borderRadius: 15, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  detailLabel: { color: '#999', fontSize: 15, marginBottom: 8, marginTop: 10 },
  detailValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  closeFullBtn: { backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  closeFullBtnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },

  // ─────────────────────────── 💡 OLLA 모달창 표준 디자인 스타일 통일 적용 ───────────────────────────
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25, 
    paddingVertical: 45, 
    paddingHorizontal: 35, 
    alignItems: 'center' 
  },
  resultModalTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  resultModalMessage: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 24 
  },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  deleteModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25, 
    paddingVertical: 45, 
    paddingHorizontal: 35, 
    alignItems: 'center' 
  },
  deleteModalText: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 24 
  },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});

export default ManagerUser;