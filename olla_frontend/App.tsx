import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, Modal, Alert } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging'; // FCM 추가 
import AsyncStorage from '@react-native-async-storage/async-storage'; // AsyncStorage 추가
import axios from 'axios';
import { API_BASE_URL } from './src/constants/Config';

// Notification 스크린 타입 추가
type RootParamList = {
  Login: undefined; Signup: undefined; PersonalInfo: undefined; Loading: undefined;
  Home: undefined; Notice: undefined; Notification: undefined; Recode: undefined; Ranking: undefined;
  Community: { filter?: 'ALL' | 'MY_WRITTEN' | 'MY_APPLIED' } | undefined; 
  MY: undefined; ManagerDashboard: undefined;
  ManagerUser: undefined; ManagerTicket: undefined; ManagerNotice: undefined; ManagerCommunity: undefined;
  AdminNotification: undefined; // 추가: 관리자 알림함 타입 등록
};

// 스크린 임포트
import LoginScreen from './tsx/LoginScreen';
import SignupScreen from './tsx/SignupScreen';
import PersonalScreen from './tsx/PersonalScreen';
import LoadingScreen from './tsx/LoadingScreen';
import HomeScreen from './tsx/HomeScreen';
import NoticeScreen from './tsx/NoticeScreen';
import NotificationScreen from './tsx/NotificationScreen'; // 스크린 임포트 추가
import RecodeScreen from './tsx/RecodeScreen';
import RankingScreen from './tsx/RankingScreen';
import CommunityScreen from './tsx/CommunityScreen';
import MYScreen from './tsx/MYScreen';
import ManagerDashboard from './tsx/ManagerDashboard';
import ManagerUser from './tsx/ManagerUser';
import ManagerTicket from './tsx/ManagerTicket';
import ManagerNotice from './tsx/ManagerNotice';
import ManagerCommunity from './tsx/ManagerCommunity';
import AdminNotificationScreen from './tsx/AdminNotificationScreen'; // 추가: 관리자 알림함 스크린 임포트

const Stack = createNativeStackNavigator<RootParamList>();

const USER_TAB_ORDER = ['Home', 'Recode', 'Ranking', 'Community', 'MY'];
const ADMIN_TAB_ORDER = ['ManagerDashboard', 'ManagerUser', 'ManagerTicket', 'ManagerNotice', 'ManagerCommunity'];

interface BottomNavItemProps {
  name: keyof RootParamList;
  label: string;
  icon: any;
  currentRoute: string;
  nav: any;
  isAdmin?: boolean;
}

const BottomNavItem = ({ name, label, icon, currentRoute, nav, isAdmin = false }: BottomNavItemProps) => {
  const isActive = currentRoute === name;
  const activeColor = '#A1BE44';
  const inactiveColor = '#7D7D7D';

  return (
    <TouchableOpacity style={styles.bottomNavItem} onPress={() => nav.navigate(name)}>
      <Image 
        source={icon} 
        style={[styles.navIcon, { tintColor: isActive ? activeColor : inactiveColor, opacity: isActive ? 1 : 0.6 }]} 
      />
      <Text style={[styles.bottomNavText, isActive && { color: activeColor, fontWeight: 'bold' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const AppContent = () => {
  /* useEffect(() => { //임시 주석 처리 FCM 관련 

  // 앱 켜져 있을 때 알림 받기 FCM 
  const unsubscribe = messaging().onMessage(async remoteMessage => {

    console.log('Foreground Message:', remoteMessage);

    Alert.alert(
      remoteMessage.notification?.title || '알림',
      remoteMessage.notification?.body || ''
    );
  });

  return unsubscribe;

}, []); */ 

  const navigationRef = useNavigationContainerRef<RootParamList>();
  const insets = useSafeAreaInsets(); 
  
  // 초기 라우트를 결정하기 위한 상태 추가
  const [initialRoute, setInitialRoute] = useState<keyof RootParamList | null>(null);
  
  const [routeName, setRouteName] = useState<string>('');
  const [slideDirection, setSlideDirection] = useState<'slide_from_right' | 'slide_from_left'>('slide_from_right');
  const prevRouteName = useRef<string>('Home'); 

  const [isExitModalVisible, setExitModalVisible] = useState(false);

  // --- 데이터 유지 ---
  const [profileData, setProfileData] = useState({ name: '권클라이밍', phone: '010-1234-5678', age: '25', height: '175', weight: '70', arm: '180', shoe: '260' });
  const [profileToggles, setProfileToggles] = useState({ showName: true, showPhone: false, showAge: true, showHeight: true, showWeight: true, showArm: true, showShoe: true });
  
  const [difficultyData, setDifficultyData] = useState([
    { id: 1, color: '흰색', hex: '#EAEAEA', type: '왕복', current: 26, total: 26, status: '완료', score: 10 },
    { id: 2, color: '노랑', hex: '#F4D03F', type: '왕복', current: 33, total: 33, status: '완료', score: 20 },
    { id: 3, color: '초록', hex: '#58D68D', type: '왕복', current: 28, total: 28, status: '완료', score: 30 },
    { id: 4, color: '파랑', hex: '#5DADE2', type: '왕복', current: 26, total: 26, status: '완료', score: 40 },
    { id: 5, color: '빨강', hex: '#EC7063', type: '왕복', current: 26, total: 26, status: '완료', score: 50 },
    { id: 6, color: '보라', hex: '#AF7AC5', type: '왕복', current: 25, total: 25, status: '완료', score: 60 },
    { id: 7, color: '주황', hex: '#F0B27A', type: '왕복', current: 28, total: 28, status: '완료', score: 70 },
    { id: 8, color: '검정', hex: '#000000', type: '편도', current: 15, total: 30, status: '진행중', score: 80 },
  ]);
  const [enduranceData, setEnduranceData] = useState([{ id: 1, type: '편도', arrow: '->', laps: '5', time: '12:30', section: '3-2' }]);
  const [consecutiveData, setConsecutiveData] = useState([{ id: 1, colors: ['#EAEAEA', '#F4D03F', '#58D68D', '#5DADE2'] }]);
  const [users, setUsers] = useState([{ id: 1, name: '권클라이밍', phone: '010-1234-5678', status: '활동중', ticket: { type: '회원권', start: '2026-03-01', end: '2026-06-01' } }]);

  // 앱 시작 시 로그인 상태 및 유저 정보 확인 로직
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        
        if (userToken) {
          try {
            // 🌟 1. 토큰이 있으면 서버에 유저 정보를 요청합니다. (백엔드 API 엔드포인트에 맞게 수정 필요)
            const response = await axios.get(`${API_BASE_URL}/members/me`, {
              headers: { Authorization: `Bearer ${userToken}` }
            });

            // 🌟 2. 서버에서 유저 정보를 성공적으로 받아왔다면, App.tsx의 상태(State)에 저장합니다.
            const userData = response.data.data;
            
            // 🌟 3. 데이터 세팅이 끝난 후 홈 화면으로 이동
            setInitialRoute('Home');

          } catch (apiError) {
            console.log('토큰이 만료되었거나 유효하지 않음:', apiError);
            // 🌟 4. API 요청이 실패했다면 (토큰 만료 등) 기기에서 토큰을 지우고 로그인 화면으로 보냅니다.
            await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
            setInitialRoute('Login');
          }
        } else {
          // 토큰이 아예 없으면 로그인 화면으로
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('기기 저장소 접근 실패', error);
        setInitialRoute('Login');
      }
    };

    checkLoginStatus();
  }, []);

  // 관리자 알림함(AdminNotification)은 내부 헤더를 쓰므로 글로벌 네비바를 숨김 처리
  const hideNavScreens = ['Login', 'Signup', 'PersonalInfo', 'Loading', 'AdminNotification'];
  const shouldShowNav = routeName ? !hideNavScreens.includes(routeName) : false;
  const adminScreens = ['ManagerDashboard', 'ManagerUser', 'ManagerTicket', 'ManagerNotice', 'ManagerCommunity'];
  const isAdminMode = adminScreens.includes(routeName);

  const handleStateChange = () => {
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (!currentRoute) return;

    const currentOrder = isAdminMode ? ADMIN_TAB_ORDER : USER_TAB_ORDER;
    const prevIndex = currentOrder.indexOf(prevRouteName.current);
    const currentIndex = currentOrder.indexOf(currentRoute);

    if (prevIndex !== -1 && currentIndex !== -1) {
      if (currentIndex > prevIndex) {
        setSlideDirection('slide_from_right'); 
      } else if (currentIndex < prevIndex) {
        setSlideDirection('slide_from_left');  
      }
    } else {
       setSlideDirection('slide_from_right');
    }

    setRouteName(currentRoute);
    prevRouteName.current = currentRoute; 
  };

  // initialRoute가 설정될 때까지 렌더링을 멈추거나 검은 화면(로딩 화면) 렌더링
  if (initialRoute === null) {
    return <View style={styles.globalContainer} />;
  }

  return (
    <View style={styles.globalContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <NavigationContainer 
        ref={navigationRef} 
        onReady={() => {
          const initRoute = navigationRef.getCurrentRoute()?.name || initialRoute;
          setRouteName(initRoute);
          prevRouteName.current = initRoute;
        }} 
        onStateChange={handleStateChange} 
      >
        {shouldShowNav && (
          <View style={[styles.topNav, { paddingTop: Math.max(insets.top, 10) }]}>
            <View style={styles.topNavInner}>
              
              {/* 🌟 1. 가운데 타이틀: 공지사항 또는 알림 화면일 때만 나타납니다. */}
              {(routeName === 'Notice' || routeName === 'Notification') && (
                <Text style={styles.globalCenterTitle}>
                  {routeName === 'Notice' ? '공지사항' : '알림'}
                </Text>
              )}

              {!isAdminMode ? (
                <>
                  {/* 🌟 2. 왼쪽 영역: 해당 화면에서는 뒤로가기 버튼, 아니면 로고 */}
                  {routeName === 'Notice' || routeName === 'Notification' ? (
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigationRef.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                      <Text style={styles.backBtnText}>←</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.logoText}>olla</Text>
                  )}

                  {/* 🌟 3. 오른쪽 영역: 알림 버튼 (Notice나 Notification 화면에서는 숨김 처리) */}
                  {routeName !== 'Notice' && routeName !== 'Notification' ? (
                    <TouchableOpacity onPress={() => navigationRef.navigate('Notification')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                      <Image source={require('./assets/Vector.png')} style={styles.topIcon} />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 20 }} /> // 좌우 균형을 맞추기 위한 빈 공간
                  )}
                </>
              ) : (
                <>
                  <View style={styles.adminLogoContainer}>
                    <Text style={styles.logoText}>olla</Text>
                    <Text style={styles.adminSubText}>관리자</Text>
                  </View>
                  
                  {/* 💡 수정: 우측 영역 버튼 배치 그룹화 (알림함 버튼 추가) */}
                  <View style={styles.adminRightControls}>
                    <TouchableOpacity 
                      style={styles.adminAlertBtn} 
                      onPress={() => navigationRef.navigate('AdminNotification')}
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    >
                      <Image source={require('./assets/Vector.png')} style={styles.adminAlertIcon} />
                      <Text style={styles.adminAlertText}>알림함</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.adminExitBtn} onPress={() => setExitModalVisible(true)}>
                      <Image source={require('./assets/EXIT.png')} style={styles.adminExitIcon} />
                      <Text style={styles.adminExitText}>관리자 모드 종료</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View> 
          </View>
        )}

        <View style={styles.mainContent}>
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, animation: slideDirection }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="PersonalInfo" component={PersonalScreen} />
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Notice" component={NoticeScreen} />
            
            <Stack.Screen name="Notification" component={NotificationScreen} />

            <Stack.Screen name="Recode">{(props) => <RecodeScreen {...props} difficultyData={difficultyData} setDifficultyData={setDifficultyData} enduranceData={enduranceData} setEnduranceData={setEnduranceData} consecutiveData={consecutiveData} setConsecutiveData={setConsecutiveData} />}</Stack.Screen>
            <Stack.Screen name="Ranking">{(props) => <RankingScreen {...props} myProfile={profileData} difficultyData={difficultyData} enduranceData={enduranceData} consecutiveData={consecutiveData} />}</Stack.Screen>
            <Stack.Screen name="Community">{(props) => <CommunityScreen {...props} myProfile={profileData} myToggles={profileToggles} />}</Stack.Screen>
            <Stack.Screen name="MY">{(props) => <MYScreen {...props} profileData={profileData} setProfileData={setProfileData} profileToggles={profileToggles} setProfileToggles={setProfileToggles} />}</Stack.Screen>
            <Stack.Screen name="ManagerDashboard" component={ManagerDashboard} />
            <Stack.Screen name="ManagerUser">{(props) => <ManagerUser {...props} users={users} setUsers={setUsers} />}</Stack.Screen>
            <Stack.Screen name="ManagerTicket">{(props) => <ManagerTicket {...props} users={users} setUsers={setUsers} />}</Stack.Screen>
            <Stack.Screen name="ManagerNotice" component={ManagerNotice} />
            <Stack.Screen name="ManagerCommunity" component={ManagerCommunity} />
            
            <Stack.Screen name="AdminNotification" component={AdminNotificationScreen} />
          </Stack.Navigator>
        </View>

        {shouldShowNav && (
          <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {!isAdminMode ? (
              <>
                <BottomNavItem name="Home" label="홈" icon={require('./assets/Home.png')} currentRoute={routeName} nav={navigationRef} />
                <BottomNavItem name="Recode" label="기록" icon={require('./assets/recode.png')} currentRoute={routeName} nav={navigationRef} />
                <BottomNavItem name="Ranking" label="랭킹" icon={require('./assets/ranking.png')} currentRoute={routeName} nav={navigationRef} />
                <BottomNavItem name="Community" label="커뮤니티" icon={require('./assets/community.png')} currentRoute={routeName} nav={navigationRef} />
                <BottomNavItem name="MY" label="마이" icon={require('./assets/mypage.png')} currentRoute={routeName} nav={navigationRef} />
              </>
            ) : (
              <>
                <BottomNavItem name="ManagerDashboard" label="대시보드" icon={require('./assets/SquaresFour.png')} currentRoute={routeName} nav={navigationRef} isAdmin={true} />
                <BottomNavItem name="ManagerUser" label="회원관리" icon={require('./assets/profile.png')} currentRoute={routeName} nav={navigationRef} isAdmin={true} />
                <BottomNavItem name="ManagerTicket" label="이용권" icon={require('./assets/ticket.png')} currentRoute={routeName} nav={navigationRef} isAdmin={true} />
                <BottomNavItem name="ManagerNotice" label="공지" icon={require('./assets/Loudspeaker.png')} currentRoute={routeName} nav={navigationRef} isAdmin={true} />
                <BottomNavItem name="ManagerCommunity" label="커뮤니티" icon={require('./assets/people.png')} currentRoute={routeName} nav={navigationRef} isAdmin={true} />
              </>
            )}
          </View>
        )}
      </NavigationContainer>

      <Modal visible={isExitModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.modalTitle}>관리자 모드를 종료하시겠습니까?</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnYes} onPress={() => { setExitModalVisible(false); navigationRef.navigate('MY'); }}>
                <Text style={styles.btnTextBlack}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={() => setExitModalVisible(false)}>
                <Text style={styles.btnTextWhite}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  globalContainer: { flex: 1, backgroundColor: '#1A1A1A' },
  mainContent: { flex: 1 },
  topNav: { backgroundColor: '#1A1A1A', borderBottomWidth: 0.5, borderBottomColor: '#222' },
  topNavInner: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, position: 'relative' },
  
  globalCenterTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#ffffff', fontSize: 20, fontWeight: 'bold', zIndex: 1 },
  backBtn: { padding: 5, zIndex: 10, marginLeft: -5 },
  backBtnText: { color: '#ffffff', fontSize: 28 },

  logoText: { fontSize: 24, fontWeight: '900', color: '#A1BE44' }, 
  topIcon: { width: 20, height: 20, resizeMode: 'contain' }, 
  adminLogoContainer: { flexDirection: 'column' },
  adminSubText: { color: '#999999', fontSize: 9, fontWeight: 'bold', marginTop: -3 },
  
  // 💡 추가된 스타일 객체들
  adminRightControls: { flexDirection: 'row', alignItems: 'center' },
  adminAlertBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 0.5, borderColor: '#444' },
  adminAlertIcon: { width: 13, height: 13, tintColor: '#A1BE44', marginRight: 6, resizeMode: 'contain' },
  adminAlertText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },

  adminExitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#331111', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  adminExitIcon: { width: 14, height: 14, tintColor: '#FF4D4D', marginRight: 6 },
  adminExitText: { color: '#FF4D4D', fontSize: 13, fontWeight: 'bold' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#111111', borderTopWidth: 1, borderTopColor: '#222222', paddingTop: 8 },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 20, height: 20, marginBottom: 3, resizeMode: 'contain' },
  bottomNavText: { fontSize: 9, color: '#7D7D7D' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  modalTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 25 },
  modalBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});