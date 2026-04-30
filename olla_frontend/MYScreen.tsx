import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, Modal, Animated, TextInput } from 'react-native';

// 💡 App.tsx에서 전달받은 props 사용
const MYScreen = ({ navigation, profileData, setProfileData, profileToggles, setProfileToggles }: any) => {
  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [isActivityEnabled, setIsActivityEnabled] = useState(true);
  const [isNoticeEnabled, setIsNoticeEnabled] = useState(true);
  const [isExpireEnabled, setIsExpireEnabled] = useState(true);

  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const executeLogout = () => {
    setLogoutModalVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };
  const cancelLogout = () => setLogoutModalVisible(false);

  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const pauseSlideAnim = useRef(new Animated.Value(800)).current;
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const contactSlideAnim = useRef(new Animated.Value(800)).current;

  const openPauseModal = () => {
    setPauseModalVisible(true);
    setTimeout(() => { Animated.timing(pauseSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
  };
  const closePauseModal = () => {
    Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { setPauseModalVisible(false); });
  };
  const handleInquireClick = () => {
    setContactModalVisible(true);
    setTimeout(() => { Animated.timing(contactSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
    setTimeout(() => { setPauseModalVisible(false); pauseSlideAnim.setValue(800); }, 350);
  };
  const closeContactModal = () => {
    Animated.timing(contactSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { setContactModalVisible(false); });
  };

  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const profileSlideAnim = useRef(new Animated.Value(800)).current;

  const openProfileModal = () => {
    setProfileModalVisible(true);
    setTimeout(() => { Animated.timing(profileSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
  };
  const closeProfileModal = () => {
    Animated.timing(profileSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { setProfileModalVisible(false); });
  };

  const renderEditField = (title: string, fieldKey: string, unit: string) => (
    <View style={styles.editFieldWrapper}>
      <View style={styles.editFieldHeader}>
        <Text style={styles.editFieldTitle}>{title}</Text>
        <View style={styles.toggleWrapper}>
          <Text style={styles.toggleLabel}>{profileToggles[`show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`] ? '공개' : '비공개'}</Text>
          <Switch
            trackColor={{ false: '#333333', true: '#A1BE44' }}
            thumbColor={profileToggles[`show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`] ? '#ffffff' : '#f4f3f4'}
            onValueChange={() => setProfileToggles({ ...profileToggles, [`show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`]: !profileToggles[`show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`] })}
            value={profileToggles[`show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`]}
          />
        </View>
      </View>
      <View style={styles.editInputBox}>
        <TextInput
          style={styles.editInput}
          value={profileData[fieldKey]}
          onChangeText={(txt) => setProfileData({ ...profileData, [fieldKey]: txt })}
          placeholder={`${title} 입력`}
          placeholderTextColor="#666666"
          keyboardType={unit ? 'numeric' : 'default'}
        />
        {unit ? <Text style={styles.editUnit}>{unit}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={openProfileModal}>
          <View style={styles.profileLeft}>
            <View style={styles.profileImagePlaceholder}><Image source={require('./assets/profile.png')} style={styles.profileImage} /></View>
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>{profileData.name}</Text>
              <Text style={styles.profileEmail}>{profileData.phone === '010-1234-5678' ? 'io8272@naver.com' : profileData.phone}</Text>
            </View>
          </View>
          <Text style={styles.chevronIcon}>＞</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardHeader}><Image source={require('./assets/membership.png')} style={styles.cardHeaderIcon} /><Text style={styles.cardHeaderTitle}>멤버십 정보</Text></View>
          <View style={styles.memInfoContainer}>
            <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>회원권</Text><Text style={styles.memInfoValue}>2개월</Text></View>
            <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>기간</Text><Text style={styles.memInfoValue}>2026-02-01 ~ 2026-04-01</Text></View>
            <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>상태</Text><View style={styles.activeBadge}><Text style={styles.activeBadgeText}>활성</Text></View></View>
          </View>
          <TouchableOpacity style={styles.pauseButton} activeOpacity={0.7} onPress={openPauseModal}><Text style={styles.pauseButtonText}>멤버십 일시정지</Text></TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}><Image source={require('./assets/Vector.png')} style={styles.cardHeaderIcon} /><Text style={styles.cardHeaderTitle}>알림설정</Text></View>
          <View style={styles.settingRow}><View style={styles.settingTextContainer}><Text style={styles.settingTitle}>푸시 알림</Text><Text style={styles.settingSub}>모든 알림 수신</Text></View><Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={isPushEnabled ? '#ffffff' : '#f4f3f4'} onValueChange={() => setIsPushEnabled(!isPushEnabled)} value={isPushEnabled} /></View>
          <View style={styles.divider} /><View style={styles.settingRow}><View style={styles.settingTextContainer}><Text style={styles.settingTitle}>활동 알림</Text><Text style={styles.settingSub}>랭킹 변동, 주간 리포트, 모임 관련 알림, 미활동 알림</Text></View><Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={isActivityEnabled ? '#ffffff' : '#f4f3f4'} onValueChange={() => setIsActivityEnabled(!isActivityEnabled)} value={isActivityEnabled} /></View>
          <View style={styles.settingRow}><View style={styles.settingTextContainer}><Text style={styles.settingTitle}>센터 공지</Text><Text style={styles.settingSub}>센터 소식 및 이벤트</Text></View><Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={isNoticeEnabled ? '#ffffff' : '#f4f3f4'} onValueChange={() => setIsNoticeEnabled(!isNoticeEnabled)} value={isNoticeEnabled} /></View>
          <View style={styles.settingRow}><View style={styles.settingTextContainer}><Text style={styles.settingTitle}>멤버십 만료 알림</Text><Text style={styles.settingSub}>만료 일주일, 1일 전, 당일 알림</Text></View><Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={isExpireEnabled ? '#ffffff' : '#f4f3f4'} onValueChange={() => setIsExpireEnabled(!isExpireEnabled)} value={isExpireEnabled} /></View>
        </View>

        <TouchableOpacity style={styles.adminCard} activeOpacity={0.8}><Text style={styles.adminText}>관리자 모드</Text></TouchableOpacity>
        <TouchableOpacity style={styles.logoutCard} activeOpacity={0.8} onPress={() => setLogoutModalVisible(true)}><Image source={require('./assets/EXIT.png')} style={styles.logoutIcon} /><Text style={styles.logoutText}>로그아웃</Text></TouchableOpacity>
      </ScrollView>

      <Modal visible={isLogoutModalVisible} transparent={true} animationType="fade"><View style={styles.centerModalOverlay}><View style={styles.centerModalBox}><Text style={styles.centerModalText}>로그아웃 하시겠습니까?</Text><View style={styles.centerBtnRow}><TouchableOpacity style={styles.centerBtnYes} onPress={executeLogout}><Text style={styles.centerBtnYesText}>예</Text></TouchableOpacity><TouchableOpacity style={styles.centerBtnNo} onPress={cancelLogout}><Text style={styles.centerBtnNoText}>아니오</Text></TouchableOpacity></View></View></View></Modal>

      <Modal visible={isPauseModalVisible} transparent={true} animationType="fade"><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closePauseModal}><Animated.View style={[styles.bottomSheet, { transform: [{ translateY: pauseSlideAnim }] }]}><TouchableOpacity activeOpacity={1} style={{ width: '100%' }}><View style={styles.dragHandle} /><Text style={styles.sheetTitleCenter}>멤버십 일시정지</Text><View style={styles.horizontalDivider} /><View style={styles.pauseInfoBox}><Text style={styles.pauseInfoText}>멤버십 일시정지는 관리자 승인이 필요합니다.{"\n"}프론트 데스크에 문의하시겠습니까?</Text></View><View style={styles.modalBtnRow}><TouchableOpacity style={styles.modalBtnCancel} onPress={closePauseModal}><Text style={styles.modalBtnCancelText}>취소</Text></TouchableOpacity><TouchableOpacity style={styles.modalBtnSubmit} onPress={handleInquireClick}><Text style={styles.modalBtnSubmitText}>문의하기</Text></TouchableOpacity></View></TouchableOpacity></Animated.View></TouchableOpacity></Modal>

      <Modal visible={isContactModalVisible} transparent={true} animationType="fade"><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeContactModal}><Animated.View style={[styles.bottomSheet, { transform: [{ translateY: contactSlideAnim }] }]}><TouchableOpacity activeOpacity={1} style={{ width: '100%', alignItems: 'center' }}><View style={styles.dragHandle} /><Text style={styles.sheetTitleCenter}>프론트 데스크 문의</Text><View style={styles.horizontalDivider} /><View style={styles.contactContentBox}><Image source={require('./assets/PhoneCall.png')} style={styles.phoneIcon} /><Text style={styles.contactLabel}>연락처</Text><Text style={styles.contactNumber}>053-1234-5678</Text><Text style={styles.contactTime}>프론트 운영시간: 10:00 ~ 22:00</Text></View><View style={styles.modalBtnRow}><TouchableOpacity style={styles.modalBtnCancel} onPress={closeContactModal}><Text style={styles.modalBtnCancelText}>닫기</Text></TouchableOpacity><TouchableOpacity style={styles.modalBtnSubmit} onPress={closeContactModal}><Text style={styles.modalBtnSubmitText}>전화하기</Text></TouchableOpacity></View></TouchableOpacity></Animated.View></TouchableOpacity></Modal>

      <Modal visible={isProfileModalVisible} transparent={true} animationType="fade"><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeProfileModal}><Animated.View style={[styles.bottomSheet, { transform: [{ translateY: profileSlideAnim }], maxHeight: '90%' }]}><TouchableOpacity activeOpacity={1} style={{ width: '100%' }}><View style={styles.dragHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>프로필 수정</Text><TouchableOpacity onPress={closeProfileModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity></View><View style={styles.horizontalDivider} /><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}><View style={styles.profileEditContainer}><TouchableOpacity style={styles.profileImageEditWrapper} activeOpacity={0.7}><Image source={require('./assets/profile.png')} style={styles.profileImageLarge} /><View style={styles.profileImageEditOverlay}><Text style={styles.profileImageEditText}>수정</Text></View></TouchableOpacity>
        {renderEditField('이름', 'name', '')}
        {renderEditField('전화번호', 'phone', '')}
        {renderEditField('나이', 'age', '세')}
        {renderEditField('키', 'height', 'cm')}
        {renderEditField('몸무게', 'weight', 'kg')}
        {renderEditField('팔길이', 'arm', 'cm')}
        {renderEditField('암벽화 사이즈', 'shoe', 'mm')}
        <TouchableOpacity style={styles.saveProfileButton} onPress={closeProfileModal}><Text style={styles.saveProfileButtonText}>저장하기</Text></TouchableOpacity>
      </View></ScrollView></TouchableOpacity></Animated.View></TouchableOpacity></Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  card: { backgroundColor: '#212121', borderRadius: 16, padding: 20, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardHeaderIcon: { width: 22, height: 22, tintColor: '#A1BE44', marginRight: 10, resizeMode: 'contain' },
  cardHeaderTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  profileCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 15 },
  profileLeft: { flexDirection: 'row', alignItems: 'center' },
  profileImagePlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#444444', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 15 },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  profileTextContainer: { flexDirection: 'column' },
  profileName: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  profileEmail: { color: '#999999', fontSize: 13 },
  chevronIcon: { color: '#999999', fontSize: 18, fontWeight: 'bold' },
  memInfoContainer: { marginBottom: 5 },
  memInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  memInfoLabel: { color: '#ffffff', fontSize: 15, fontWeight: '500' },
  memInfoValue: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  activeBadge: { backgroundColor: '#C2FF00', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: '#000000', fontSize: 13, fontWeight: 'bold' },
  pauseButton: { backgroundColor: '#2C2C2C', borderWidth: 1, borderColor: '#555555', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  pauseButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  settingTextContainer: { flex: 1, paddingRight: 10 },
  settingTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  settingSub: { color: '#999999', fontSize: 12, lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#333333', marginVertical: 8 },
  adminCard: { backgroundColor: '#212121', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 15 },
  adminText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  logoutCard: { flexDirection: 'row', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  logoutIcon: { width: 20, height: 20, tintColor: '#FF4D4D', marginRight: 8, resizeMode: 'contain' },
  logoutText: { color: '#FF4D4D', fontSize: 16, fontWeight: 'bold' },
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  centerModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  centerModalText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 25 },
  centerBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  centerBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  centerBtnYesText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  centerBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  centerBtnNoText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  sheetTitleCenter: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  closeBtn: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },
  pauseInfoBox: { backgroundColor: '#2C2C2C', borderWidth: 1, borderColor: '#555555', borderRadius: 12, padding: 18, marginBottom: 25, width: '100%' },
  pauseInfoText: { color: '#ffffff', fontSize: 15, lineHeight: 24, fontWeight: '500' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalBtnCancel: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555555', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginRight: 6 },
  modalBtnCancelText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  modalBtnSubmit: { flex: 1, backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginLeft: 6 },
  modalBtnSubmitText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  contactContentBox: { alignItems: 'center', marginBottom: 30, width: '100%' },
  phoneIcon: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 20 },
  contactLabel: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  contactNumber: { color: '#A1BE44', fontSize: 32, fontWeight: '900', marginBottom: 12 },
  contactTime: { color: '#999999', fontSize: 14, fontWeight: '500' },
  profileEditContainer: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginTop: 5 },
  profileImageEditWrapper: { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: '#444444', marginBottom: 25, overflow: 'hidden' },
  profileImageLarge: { width: '100%', height: '100%', resizeMode: 'cover' },
  profileImageEditOverlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, alignItems: 'center' },
  profileImageEditText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  editFieldWrapper: { marginBottom: 20 },
  editFieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editFieldTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  toggleWrapper: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { color: '#999999', fontSize: 12, marginRight: 6, fontWeight: '500' },
  editInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000000', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 14 },
  editInput: { flex: 1, color: '#ffffff', fontSize: 16, padding: 0 },
  editUnit: { color: '#999999', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  saveProfileButton: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 15 },
  saveProfileButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
});

export default MYScreen;