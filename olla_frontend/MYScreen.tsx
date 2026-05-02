import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { useIsFocused } from '@react-navigation/native';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, Switch, Modal, Animated, TextInput, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MyPageScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);

  // 1️⃣ 상태 관리
  const [memInfo, setMemInfo] = useState({ type: '-', period: '-', status: '확인 중', remainingDays: 0 });

  const [alerts, setAlerts] = useState({
    isGlobalAlertOn: true,
    isNoticeAlertOn: true,
    isMembershipWeekBeforeAlertOn: true,
    isMembershipDayBeforeAlertOn: true,
    isMembershipExpiredAlertOn: true,
    isRankingChangeAlertOn: true,
  });

  const [valName, setValName] = useState('');
  const [valPhone, setValPhone] = useState('');
  const [valAge, setValAge] = useState('');
  const [valHeight, setValHeight] = useState('');
  const [valWeight, setValWeight] = useState('');
  const [valArm, setValArm] = useState('');
  const [valShoe, setValShoe] = useState('');

  // 공개 설정 (백엔드 수정 규격: is...Public)
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showHeight, setShowHeight] = useState(true);
  const [showWeight, setShowWeight] = useState(true);
  const [showArm, setShowArm] = useState(true);
  const [showShoe, setShowShoe] = useState(true);

  // 2️⃣ 데이터 불러오기 (API 연동 및 D-Day 계산)
  const fetchMyInfo = async () => {
    try {
      // setLoading(true);
      const userToken = await AsyncStorage.getItem('userToken'); 
      if (!userToken) {
        Alert.alert("인증 오류", "로그인이 필요합니다.");
        navigation.replace('Login');
        return;
      }
      const headers = { Authorization: `Bearer ${userToken}` };

      // [GET] 내 정보 조회
      const userRes = await axios.get('http://172.30.1.54:8080/api/v1/members/me', { headers });
      const data = userRes.data.data; 
      

      // ✅ 1. Member 테이블 기본 정보 매핑 (최상단 data에서 추출)
      setValName(data.name || '');
      setValPhone(data.phone || '');

      // ✅ 2. DetailDto 매핑 (MemberDetail 테이블)
      if (data.detail) {
        setValAge(data.detail.age?.toString() || '');
        setValHeight(data.detail.height?.toString() || '');
        setValWeight(data.detail.weight?.toString() || '');
        setValArm(data.detail.armSpan?.toString() || '');
        setValShoe(data.detail.footSize?.toString() || '');
      }

      // ✅ 3. PrivacyDto 매핑 (MemberPrivacy 테이블 - 응답 필드명: isPhonePublic 등)
      if (data.privacy) {
        setShowPhone(data.privacy.phonePublic);
        setShowEmail(data.privacy.emailPublic);
        setShowHeight(data.privacy.heightPublic);
        setShowWeight(data.privacy.weightPublic);
        setShowArm(data.privacy.armSpanPublic);
        setShowShoe(data.privacy.footSizePublic);
      }

      // ✅ 4. AlertDto 매핑
      if (data.alert) {
        setAlerts({
          isGlobalAlertOn: data.alert.globalAlertOn,
          isNoticeAlertOn: data.alert.noticeAlertOn,
          isMembershipWeekBeforeAlertOn: data.alert.membershipWeekBeforeAlertOn,
          isMembershipDayBeforeAlertOn: data.alert.membershipDayBeforeAlertOn,
          isMembershipExpiredAlertOn: data.alert.membershipExpiredAlertOn,
          isRankingChangeAlertOn: data.alert.rankingChangeAlertOn,
      });
    }

      // [GET] 회원권 정보 조회
      try { // 192.168.45.12
        const memRes = await axios.get('http://172.30.1.54:8080/api/v1/memberships/me', { headers });
        const memData = memRes.data.data ? memRes.data.data : memRes.data;
        if (memData && memData.endDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const end = new Date(memData.endDate);
          end.setHours(0, 0, 0, 0);
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
      Alert.alert("오류", "정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyInfo(); }, []);

  // 3️⃣ 정보 수정 저장 (PATCH 규격: MemberUpdateRequest 단일 계층 평면 구조)
  const handleSaveProfile = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${userToken}` };

      // ✅ 백엔드 MemberUpdateRequest 규격에 100% 맞춤 (Flat 구조)
      const requestBody = {
        name: valName,          // Member 테이블
        phone: valPhone,        // Member 테이블
        profileImageUrl: "", 
        age: valAge ? parseInt(valAge) : 0,      // Detail 테이블
        height: valHeight ? parseFloat(valHeight) : 0,
        weight: valWeight ? parseFloat(valWeight) : 0,
        armSpan: valArm ? parseFloat(valArm) : 0,
        footSize: valShoe ? parseFloat(valShoe) : 0,
        isPublicPhone: showPhone, // Privacy 테이블 (DTO 명칭: isPublicPhone)
        isEmailPublic: showEmail,
        isHeightPublic: showHeight,
        isWeightPublic: showWeight,
        isArmSpanPublic: showArm,
        isFootSizePublic: showShoe
      };

      await axios.patch('http://172.30.1.54:8080/api/v1/members/me', requestBody, { headers });
      Alert.alert("알림", "정보가 저장되었습니다.");
      fetchMyInfo(); 
      closeProfileModal();
    } catch (error: any) {
      console.error("저장 실패:", error.response?.data);
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  // 4️⃣ 알림 수정 연동
  const updateAlert = async (updatedKey: string, value: boolean) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${userToken}` };
      
      const newAlerts = { ...alerts, [updatedKey]: value };
      setAlerts(newAlerts);

      await axios.patch('http://172.30.1.54:8080/api/v1/members/me/alert', newAlerts, { headers });
    } catch (error) {
      console.error("알림 수정 실패:", error);
    }
  };

  // --- 기존 UI 제어 로직 (Logout, Pause 등) ---
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);

  // 로그아웃 
  const executeLogout = async () => {
  try {
    // 1. 저장소에서 토큰들 가져오기
    const accessToken = await AsyncStorage.getItem('userToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken'); // 리프레시 토큰 키 확인 필요

    if (accessToken && refreshToken) {
      // 2. 백엔드 규격에 맞춰 로그아웃 API 호출
      // Body에는 refreshToken을 담고, Header에는 인증을 위한 AccessToken을 담습니다.
      await axios.post(
        'http://172.30.1.54:8080/api/v1/auth/logout', 
        { refreshToken: refreshToken }, // LogoutRequest 규격
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }
  } catch (error) {
    // 이미 만료된 토큰이거나 서버 에러일 경우에도 로그아웃 처리는 진행해야 하므로 
    // 에러를 출력만 하고 넘어갑니다.
    console.log("서버 로그아웃 처리 실패:", error);
  } finally {
    // 3. 클라이언트 저장소 비우기 및 화면 이동
    await AsyncStorage.multiRemove(['userToken', 'refreshToken']); 
    setLogoutModalVisible(false);
    
    // 네비게이션 초기화 및 로그인 페이지로 이동
    navigation.reset({ 
      index: 0, 
      routes: [{ name: 'Login' }] 
    });
  }
};


  const cancelLogout = () => setLogoutModalVisible(false);

  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const pauseSlideAnim = useRef(new Animated.Value(800)).current;
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const contactSlideAnim = useRef(new Animated.Value(800)).current;

  const openPauseModal = () => {
    setPauseModalVisible(true);
    Animated.timing(pauseSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
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
    Animated.timing(profileSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };
  const closeProfileModal = () => {
    Animated.timing(profileSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { setProfileModalVisible(false); });
  };

  const renderEditField = (title: string, isPublic: boolean, setPublic: any, value: string, setValue: any, unit: string) => (
    <View style={styles.editFieldWrapper}>
      <View style={styles.editFieldHeader}>
        <Text style={styles.editFieldTitle}>{title}</Text>
        <View style={styles.toggleWrapper}>
          <Text style={styles.toggleLabel}>{isPublic ? '공개' : '비공개'}</Text>
          <Switch
            trackColor={{ false: '#333333', true: '#A1BE44' }}
            thumbColor={isPublic ? '#ffffff' : '#f4f3f4'}
            onValueChange={() => setPublic(!isPublic)}
            value={isPublic}
          />
        </View>
      </View>
      <View style={styles.editInputBox}>
        <TextInput
          style={styles.editInput}
          value={value}
          onChangeText={setValue}
          placeholder={`${title} 입력`}
          placeholderTextColor="#666666"
          keyboardType={unit ? 'numeric' : 'default'}
        />
        {unit ? <Text style={styles.editUnit}>{unit}</Text> : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.background}>
      <View style={styles.topNav}>
        <Text style={styles.logoText}>olla</Text>
        <TouchableOpacity><Image source={require('./assets/Vector.png')} style={styles.topIcon} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 상단 프로필 카드: 이름/전화번호 불러오기 확인 */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={openProfileModal}>
          <View style={styles.profileLeft}>
            <View style={styles.profileImagePlaceholder}><Image source={require('./assets/profile.png')} style={styles.profileImage} /></View>
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>{valName || '사용자'}</Text>
              <Text style={styles.profileEmail}>{valPhone || '번호 없음'}</Text>
            </View>
          </View>
          <Text style={styles.chevronIcon}>＞</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Image source={require('./assets/membership.png')} style={styles.cardHeaderIcon} />
            <Text style={styles.cardHeaderTitle}>멤버십 정보</Text>
          </View>
          <View style={styles.memInfoContainer}>
            <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>회원권</Text><Text style={styles.memInfoValue}>{memInfo.type} (D-{memInfo.remainingDays})</Text></View>
            <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>기간</Text><Text style={styles.memInfoValue}>{memInfo.period}</Text></View>
            <View style={styles.memInfoRow}>
              <Text style={styles.memInfoLabel}>상태</Text>
              <View style={[styles.activeBadge, memInfo.status !== '이용중' && {backgroundColor: '#555'}]}>
                <Text style={styles.activeBadgeText}>{memInfo.status}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.pauseButton} activeOpacity={0.7} onPress={openPauseModal}><Text style={styles.pauseButtonText}>멤버십 일시정지</Text></TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}><Image source={require('./assets/Vector.png')} style={styles.cardHeaderIcon} /><Text style={styles.cardHeaderTitle}>알림설정</Text></View>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}><Text style={styles.settingTitle}>푸시 알림</Text><Text style={styles.settingSub}>전체 알림 수신</Text></View>
            <Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={alerts.isGlobalAlertOn ? '#ffffff' : '#f4f3f4'} 
              onValueChange={(v) => updateAlert('isGlobalAlertOn', v)} value={alerts.isGlobalAlertOn} />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}><Text style={styles.settingTitle}>활동 알림</Text><Text style={styles.settingSub}>랭킹 변동 등 활동 알림</Text></View>
            <Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={alerts.isRankingChangeAlertOn ? '#ffffff' : '#f4f3f4'} 
              onValueChange={(v) => updateAlert('isRankingChangeAlertOn', v)} value={alerts.isRankingChangeAlertOn} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutCard} activeOpacity={0.8} onPress={() => setLogoutModalVisible(true)}>
          <Image source={require('./assets/EXIT.png')} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 하단 네비게이션 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('Home')}><Image source={require('./assets/Home.png')} style={[styles.navIcon, { opacity: 0.4 }]} /><Text style={styles.bottomNavText}>홈</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('Recode')}><Image source={require('./assets/recode.png')} style={[styles.navIcon, { opacity: 0.4 }]} /><Text style={styles.bottomNavText}>기록</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/ranking.png')} style={[styles.navIcon, { opacity: 0.4 }]} /><Text style={styles.bottomNavText}>랭킹</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/community.png')} style={[styles.navIcon, { opacity: 0.4 }]} /><Text style={styles.bottomNavText}>커뮤니티</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/mypage.png')} style={styles.navIcon} /><Text style={styles.bottomNavTextActive}>마이페이지</Text></TouchableOpacity>
      </View>

      {/* 로그아웃 모달 */}
      <Modal visible={isLogoutModalVisible} animationType="fade" transparent={true} onRequestClose={cancelLogout}>
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

      {/* 문의하기/일시정지 모달 복구 */}
      <Modal visible={isPauseModalVisible} animationType="fade" transparent={true} onRequestClose={closePauseModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closePauseModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: pauseSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <Text style={styles.sheetTitleCenter}>멤버십 일시정지</Text>
              <View style={styles.horizontalDivider} />
              <View style={styles.pauseInfoBox}>
                <Text style={styles.pauseInfoText}>멤버십 일시정지는 관리자 승인이 필요합니다. 프론트 데스크에 문의하시겠습니까?</Text>
              </View>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={closePauseModal}><Text style={styles.modalBtnCancelText}>취소</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleInquireClick}><Text style={styles.modalBtnSubmitText}>문의하기</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isContactModalVisible} animationType="fade" transparent={true} onRequestClose={closeContactModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeContactModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: contactSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.dragHandle} />
              <Text style={styles.sheetTitleCenter}>프론트 데스크 문의</Text>
              <View style={styles.horizontalDivider} />
              <View style={styles.contactContentBox}>
                <Image source={require('./assets/PhoneCall.png')} style={styles.phoneIcon} />
                <Text style={styles.contactNumber}>053-1234-5678</Text>
                <Text style={styles.contactTime}>운영시간: 10:00 ~ 22:00</Text>
              </View>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={closeContactModal}><Text style={styles.modalBtnCancelText}>닫기</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSubmit} onPress={closeContactModal}><Text style={styles.modalBtnSubmitText}>전화하기</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 프로필 수정 모달 */}
      <Modal visible={isProfileModalVisible} animationType="fade" transparent={true} onRequestClose={closeProfileModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeProfileModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: profileSlideAnim }], maxHeight: '90%' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>프로필 수정</Text><TouchableOpacity onPress={closeProfileModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity></View>
            <View style={styles.horizontalDivider} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.profileEditContainer}>
                <TouchableOpacity style={styles.profileImageEditWrapper} activeOpacity={0.7}>
                  <Image source={require('./assets/profile.png')} style={styles.profileImageLarge} />
                  <View style={styles.profileImageEditOverlay}><Text style={styles.profileImageEditText}>수정</Text></View>
                </TouchableOpacity>
                {/* 이름과 전화번호는 Member 테이블에 있으므로 수정 가능하게 배치 */}
                {renderEditField('이름', true, () => {}, valName, setValName, '')}
                {renderEditField('전화번호', showPhone, setShowPhone, valPhone, setValPhone, '')}
                {renderEditField('나이', true, () => {}, valAge, setValAge, '세')}
                {renderEditField('키', showHeight, setShowHeight, valHeight, setValHeight, 'cm')}
                {renderEditField('몸무게', showWeight, setShowWeight, valWeight, setValWeight, 'kg')}
                {renderEditField('팔길이', showArm, setShowArm, valArm, setValArm, 'cm')}
                {renderEditField('암벽화 사이즈', showShoe, setShowShoe, valShoe, setValShoe, 'mm')}
                <TouchableOpacity style={styles.saveProfileButton} onPress={handleSaveProfile}><Text style={styles.saveProfileButtonText}>저장하기</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#A1BE44' },
  topIcon: { width: 24, height: 24, resizeMode: 'contain' },
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
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#111111', paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#222222' },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  bottomNavText: { color: '#666666', fontSize: 11, fontWeight: '500' },
  bottomNavTextActive: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },
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

export default MyPageScreen;