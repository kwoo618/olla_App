import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Switch, Modal, Animated, TextInput, Alert, ActivityIndicator
} from 'react-native';

const MYScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);

  // 1️⃣ 상태 관리
  const [memInfo, setMemInfo] = useState({ type: '-', period: '-', status: '확인 중', remainingDays: 0 });

  // 유저 정보 통합 관리
  const [profileData, setProfileData] = useState<any>({
    name: '', phone: '', age: '', height: '', weight: '', arm: '', shoe: ''
  });

  // 공개 설정 통합 관리
  const [profileToggles, setProfileToggles] = useState<any>({
    showName: true, showPhone: true, showAge: true, showHeight: true, showWeight: true, showArm: true, showShoe: true,
  });

  // 알림 스위치 상태
  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [isActivityEnabled, setIsActivityEnabled] = useState(true);
  const [isNoticeEnabled, setIsNoticeEnabled] = useState(true);
  const [isExpireEnabled, setIsExpireEnabled] = useState(true);

  // 2️⃣ 데이터 불러오기 (API 연동 및 D-Day 계산)
  const fetchMyInfo = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert("인증 오류", "로그인이 필요합니다.");
        navigation.replace('Login');
        return;
      }
      const headers = { Authorization: `Bearer ${userToken}` };

      // [GET] 내 정보 조회
      const userRes = await axios.get('http://172.30.1.54:8080/api/v1/members/me', { headers });
      const data = userRes.data.data || userRes.data;

      // 데이터 매핑
      setProfileData({
        name: data.name || '',
        phone: data.phone || '',
        age: data.detail?.age?.toString() || '',
        height: data.detail?.height?.toString() || '',
        weight: data.detail?.weight?.toString() || '',
        arm: data.detail?.armSpan?.toString() || '',
        shoe: data.detail?.footSize?.toString() || '',
      });

      if (data.privacy) {
        setProfileToggles({
          showName: true,
          showPhone: data.privacy.phonePublic,
          showAge: true,
          showHeight: data.privacy.heightPublic,
          showWeight: data.privacy.weightPublic,
          showArm: data.privacy.armSpanPublic,
          showShoe: data.privacy.footSizePublic,
        });
      }

      // [GET] 회원권 정보 조회
      try {
        const memRes = await axios.get('http://172.30.1.54:8080/api/v1/memberships/me', { headers });
        const memData = memRes.data.data || memRes.data;
        if (memData && memData.endDate) {
          const today = new Date();
          const end = new Date(memData.endDate);
          const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          setMemInfo({
            type: memData.membershipType === 'PERIOD' ? '기간권' : '횟수권',
            period: `${memData.startDate} ~ ${memData.endDate}`,
            status: memData.status === 'ACTIVE' ? '이용중' : '만료',
            remainingDays: diffDays >= 0 ? diffDays : 0
          });
        }
      } catch (e) { console.log("이용권 정보 로드 실패"); }

    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyInfo(); }, [isFocused]);

  // 3️⃣ 정보 수정 저장
  const handleSaveProfile = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${userToken}` };

      const requestBody = {
        name: profileData.name,
        phone: profileData.phone,
        profileImageUrl: "",
        age: parseInt(profileData.age) || 0,
        height: parseFloat(profileData.height) || 0,
        weight: parseFloat(profileData.weight) || 0,
        armSpan: parseFloat(profileData.arm) || 0,
        footSize: parseFloat(profileData.shoe) || 0,
        isPublicPhone: profileToggles.showPhone,
        isHeightPublic: profileToggles.showHeight,
        isWeightPublic: profileToggles.showWeight,
        isArmSpanPublic: profileToggles.showArm,
        isFootSizePublic: profileToggles.showShoe
      };

      await axios.patch('http://172.30.1.54:8080/api/v1/members/me', requestBody, { headers });
      Alert.alert("알림", "정보가 저장되었습니다.");
      fetchMyInfo();
      closeProfileModal();
    } catch (error) {
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  // 4️⃣ 로그아웃 
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const executeLogout = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('userToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (accessToken && refreshToken) {
        await axios.post('http://172.30.1.54:8080/api/v1/auth/logout', { refreshToken }, {
          headers: { Authorization: `Bearer ${accessToken}` }, timeout: 3000
        });
      }
    } catch (error) {
      console.log("서버 로그아웃 실패:", error);
    } finally {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
      setLogoutModalVisible(false);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const cancelLogout = () => setLogoutModalVisible(false);

  // 애니메이션 제어
  const pauseSlideAnim = useRef(new Animated.Value(800)).current;
  const contactSlideAnim = useRef(new Animated.Value(800)).current;
  const profileSlideAnim = useRef(new Animated.Value(800)).current;

  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);

  const openPauseModal = () => { setPauseModalVisible(true); Animated.timing(pauseSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closePauseModal = () => { Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setPauseModalVisible(false)); };
  
  const openProfileModal = () => { setProfileModalVisible(true); Animated.timing(profileSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeProfileModal = () => { Animated.timing(profileSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setProfileModalVisible(false)); };

  const handleInquireClick = () => {
    setContactModalVisible(true);
    setTimeout(() => { Animated.timing(contactSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
    setPauseModalVisible(false);
  };
  const closeContactModal = () => { Animated.timing(contactSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setContactModalVisible(false)); };

  // 필드 렌더링 함수
  const renderEditField = (title: string, fieldKey: string, unit: string) => {
    const toggleKey = `show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
    return (
      <View style={styles.editFieldWrapper}>
        <View style={styles.editFieldHeader}>
          <Text style={styles.editFieldTitle}>{title}</Text>
          <View style={styles.toggleWrapper}>
            <Text style={styles.toggleLabel}>{profileToggles[toggleKey] ? '공개' : '비공개'}</Text>
            <Switch
              trackColor={{ false: '#333333', true: '#A1BE44' }}
              thumbColor={profileToggles[toggleKey] ? '#ffffff' : '#f4f3f4'}
              onValueChange={() => setProfileToggles({ ...profileToggles, [toggleKey]: !profileToggles[toggleKey] })}
              value={profileToggles[toggleKey]}
            />
          </View>
        </View>
        <View style={styles.editInputBox}>
          <TextInput
            style={styles.editInput}
            value={profileData[fieldKey]}
            onChangeText={(txt) => setProfileData({ ...profileData, [fieldKey]: txt })}
            placeholderTextColor="#666666"
            keyboardType={unit ? 'numeric' : 'default'}
          />
          {unit ? <Text style={styles.editUnit}>{unit}</Text> : null}
        </View>
      </View>
    );
  };

  if (loading) return <View style={[styles.background, { justifyContent: 'center' }]}><ActivityIndicator size="large" color="#A1BE44" /></View>;

  return (
    <View style={styles.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 상단 프로필 */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={openProfileModal}>
          <View style={styles.profileLeft}>
            <View style={styles.profileImagePlaceholder}><Image source={require('./assets/profile.png')} style={styles.profileImage} /></View>
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>{profileData.name || '사용자'}</Text>
              <Text style={styles.profileEmail}>{profileData.phone || '번호 없음'}</Text>
            </View>
          </View>
          <Text style={styles.chevronIcon}>＞</Text>
        </TouchableOpacity>

        {/* 멤버십 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}><Image source={require('./assets/membership.png')} style={styles.cardHeaderIcon} /><Text style={styles.cardHeaderTitle}>멤버십 정보</Text></View>
          <View style={styles.memInfoContainer}>
            <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>회원권</Text><Text style={styles.memInfoValue}>{memInfo.type} (D-{memInfo.remainingDays})</Text></View>
            <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>기간</Text><Text style={styles.memInfoValue}>{memInfo.period}</Text></View>
            <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>상태</Text><View style={styles.activeBadge}><Text style={styles.activeBadgeText}>{memInfo.status}</Text></View></View>
          </View>
          <TouchableOpacity style={styles.pauseButton} onPress={openPauseModal}><Text style={styles.pauseButtonText}>멤버십 일시정지</Text></TouchableOpacity>
        </View>

        {/* 알림 설정 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}><Image source={require('./assets/Vector.png')} style={styles.cardHeaderIcon} /><Text style={styles.cardHeaderTitle}>알림설정</Text></View>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}><Text style={styles.settingTitle}>푸시 알림</Text><Text style={styles.settingSub}>모든 알림 수신</Text></View>
            <Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={isPushEnabled ? '#ffffff' : '#f4f3f4'} onValueChange={() => setIsPushEnabled(!isPushEnabled)} value={isPushEnabled} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}><Text style={styles.settingTitle}>활동 알림</Text><Text style={styles.settingSub}>랭킹 변동 등 활동 관련 알림</Text></View>
            <Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={isActivityEnabled ? '#ffffff' : '#f4f3f4'} onValueChange={() => setIsActivityEnabled(!isActivityEnabled)} value={isActivityEnabled} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutCard} activeOpacity={0.8} onPress={() => setLogoutModalVisible(true)}><Image source={require('./assets/EXIT.png')} style={styles.logoutIcon} /><Text style={styles.logoutText}>로그아웃</Text></TouchableOpacity>
      </ScrollView>

      {/* 모달창들 (기존 모달 구조 유지) */}
      <Modal visible={isLogoutModalVisible} transparent={true} animationType="fade">
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={styles.centerModalText}>로그아웃 하시겠습니까?</Text>
            <View style={styles.centerBtnRow}>
              <TouchableOpacity style={styles.centerBtnYes} onPress={executeLogout}><Text style={styles.centerBtnYesText}>예</Text></TouchableOpacity>
              <TouchableOpacity style={styles.centerBtnNo} onPress={cancelLogout}><Text style={styles.centerBtnNoText}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 프로필 수정 모달 */}
      <Modal visible={isProfileModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeProfileModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: profileSlideAnim }], maxHeight: '90%' }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>프로필 수정</Text><TouchableOpacity onPress={closeProfileModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity></View>
              <View style={styles.horizontalDivider} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.profileEditContainer}>
                  <TouchableOpacity style={styles.profileImageEditWrapper} activeOpacity={0.7}><Image source={require('./assets/profile.png')} style={styles.profileImageLarge} /><View style={styles.profileImageEditOverlay}><Text style={styles.profileImageEditText}>수정</Text></View></TouchableOpacity>
                  {renderEditField('이름', 'name', '')}
                  {renderEditField('전화번호', 'phone', '')}
                  {renderEditField('나이', 'age', '세')}
                  {renderEditField('키', 'height', 'cm')}
                  {renderEditField('몸무게', 'weight', 'kg')}
                  {renderEditField('팔길이', 'arm', 'cm')}
                  {renderEditField('암벽화 사이즈', 'shoe', 'mm')}
                  <TouchableOpacity style={styles.saveProfileButton} onPress={handleSaveProfile}><Text style={styles.saveProfileButtonText}>저장하기</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 일시정지 및 문의 모달은 생략/기존과 동일 */}
    </View>
  );
};

// 스타일 (App.tsx의 여백을 고려하여 background 유지)
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
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
  pauseInfoBox: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 18, marginBottom: 25, width: '100%' },
  pauseInfoText: { color: '#ffffff', fontSize: 15, lineHeight: 24, fontWeight: '500' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalBtnCancel: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555555', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginRight: 6 },
  modalBtnCancelText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  modalBtnSubmit: { flex: 1, backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginLeft: 6 },
  modalBtnSubmitText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
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