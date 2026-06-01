import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, Modal, DeviceEventEmitter } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './src/constants/Config';

// Notification 스크린 타입 추가
type RootParamList = {
  Login: undefined; Signup: undefined; PersonalInfo: undefined; Loading: undefined;
  Home: undefined; Notice: undefined; Notification: undefined; Recode: undefined; Ranking: undefined;
  Community: { filter?: 'ALL' | 'MY_WRITTEN' | 'MY_APPLIED' } | undefined; 
  MY: undefined; ManagerDashboard: undefined;
  ManagerUser: undefined; ManagerTicket: undefined; ManagerNotice: undefined; ManagerCommunity: undefined;
  AdminNotification: undefined; 
};

// 스크린 임포트
import LoginScreen from './tsx/LoginScreen';
import SignupScreen from './tsx/SignupScreen';
import PersonalScreen from './tsx/PersonalScreen';
import LoadingScreen from './tsx/LoadingScreen';
import HomeScreen from './tsx/HomeScreen';
import NoticeScreen from './tsx/NoticeScreen';
import NotificationScreen from './tsx/NotificationScreen'; 
import RecodeScreen from './tsx/RecodeScreen';
import RankingScreen from './tsx/RankingScreen';
import CommunityScreen from './tsx/CommunityScreen';
import MYScreen from './tsx/MYScreen';
import ManagerDashboard from './tsx/ManagerDashboard';
import ManagerUser from './tsx/ManagerUser';
import ManagerTicket from './tsx/ManagerTicket';
import ManagerNotice from './tsx/ManagerNotice';
import ManagerCommunity from './tsx/ManagerCommunity';
import AdminNotificationScreen from './tsx/AdminNotificationScreen'; 

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
  const navigationRef = useNavigationContainerRef<RootParamList>();
  const insets = useSafeAreaInsets(); 
  
  const [initialRoute, setInitialRoute] = useState<keyof RootParamList | null>(null);
  const [routeName, setRouteName] = useState<string>('');
  const [slideDirection, setSlideDirection] = useState<'slide_from_right' | 'slide_from_left'>('slide_from_right');
  const prevRouteName = useRef<string>('Home'); 

  const [isExitModalVisible, setExitModalVisible] = useState(false);

  // 💡 [추가] 읽지 않은 알림 상태 및 마지막으로 띄운 알림 ID 기록
  const [hasUnreadNotification, setHasUnreadNotification] = useState(false);
  const lastAlertId = useRef<number | null>(null);

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

  const adminScreens = ['ManagerDashboard', 'ManagerUser', 'ManagerTicket', 'ManagerNotice', 'ManagerCommunity'];
  const isAdminMode = adminScreens.includes(routeName);

  // 💡 [추가] FCM을 대체하는 앱 내부 실시간 알림 폴링 (Polling) 로직
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken || initialRoute !== 'Home') return; 

        const endpoint = isAdminMode 
          ? `${API_BASE_URL}/admin/alerts?page=0&size=10`
          : `${API_BASE_URL}/notifications?page=0&size=10`;

        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${userToken}` }
        });

        const dataObj = response.data?.data?.data || response.data?.data || response.data;
        const list = Array.isArray(dataObj) ? dataObj : (dataObj?.content || []);

        const unreadItems = list.filter((item: any) => !(item.isRead === true || item.read === true));

        if (unreadItems.length > 0) {
          setHasUnreadNotification(true);
          const latest = unreadItems[0]; 

          if (lastAlertId.current !== latest.id) {
            lastAlertId.current = latest.id;
          }
        } else {
          setHasUnreadNotification(false);
        }
      } catch (error) {
        // 무시
      }
    };

    // 처음 한 번 실행
    fetchUnreadNotifications();

    // 30초마다 실행
    const intervalId = setInterval(fetchUnreadNotifications, 30000);

    // 이벤트 리스너 추가 - 알림 화면에서 '읽음' 처리를 했다는 방송이 오면 즉시 업데이트
    const subscription = DeviceEventEmitter.addListener('notificationRead', () => {
      fetchUnreadNotifications();
    });
    return () => {
      clearInterval(intervalId);
      subscription.remove(); // 컴포넌트 정리 시 리스너도 꼭 제거해 줍니다.
    };
  }, [initialRoute, isAdminMode]); // 로그인 상태나 모드가 변경될 때 재시작


  // 앱 시작 시 로그인 상태 및 유저 정보 확인 로직
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        
        if (userToken) {
          try {
            const response = await axios.get(`${API_BASE_URL}/members/me`, {
              headers: { Authorization: `Bearer ${userToken}` }
            });
            const userData = response.data.data;
            setInitialRoute('Home');
          } catch (apiError) {
            console.log('토큰이 만료되었거나 유효하지 않음:', apiError);
            await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
            setInitialRoute('Login');
          }
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('기기 저장소 접근 실패', error);
        setInitialRoute('Login');
      }
    };

    checkLoginStatus();
  }, []);

  const hideNavScreens = ['Login', 'Signup', 'PersonalInfo', 'Loading', 'AdminNotification'];
  const shouldShowNav = routeName ? !hideNavScreens.includes(routeName) : false;

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
              
              {(routeName === 'Notice' || routeName === 'Notification') && (
                <Text style={styles.globalCenterTitle}>
                  {routeName === 'Notice' ? '공지사항' : '알림'}
                </Text>
              )}

              {!isAdminMode ? (
                <>
                  {routeName === 'Notice' || routeName === 'Notification' ? (
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigationRef.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                      <Text style={styles.backBtnText}>←</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.logoText}>olla</Text>
                  )}

                  {routeName !== 'Notice' && routeName !== 'Notification' ? (
                    <TouchableOpacity onPress={() => navigationRef.navigate('Notification')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                      <View>
                        <Image source={require('./assets/Vector.png')} style={styles.topIcon} />
                        {/* 💡 [수정] 안 읽은 알림이 있으면 빨간 점 표시 */}
                        {hasUnreadNotification && <View style={styles.bellBadge} />}
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 20 }} /> 
                  )}
                </>
              ) : (
                <>
                  <View style={styles.adminLogoContainer}>
                    <Text style={styles.logoText}>olla</Text>
                    <Text style={styles.adminSubText}>관리자</Text>
                  </View>
                  
                  <View style={styles.adminRightControls}>
                    <TouchableOpacity 
                      style={styles.adminAlertBtn} 
                      onPress={() => navigationRef.navigate('AdminNotification')}
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    >
                      <View>
                        <Image source={require('./assets/Vector.png')} style={styles.adminAlertIcon} />
                        {/* 💡 [수정] 관리자 모드 알림함 뱃지 */}
                        {hasUnreadNotification && <View style={styles.adminBellBadge} />}
                      </View>
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
  
  // 💡 [추가] 일반 사용자 알림 뱃지 스타일
  bellBadge: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D4D', borderWidth: 1, borderColor: '#1A1A1A' },

  adminLogoContainer: { flexDirection: 'column' },
  adminSubText: { color: '#999999', fontSize: 9, fontWeight: 'bold', marginTop: -3 },
  
  adminRightControls: { flexDirection: 'row', alignItems: 'center' },
  adminAlertBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 0.5, borderColor: '#444' },
  adminAlertIcon: { width: 13, height: 13, tintColor: '#A1BE44', marginRight: 6, resizeMode: 'contain' },
  
  // 💡 [추가] 관리자 알림 뱃지 스타일
  adminBellBadge: { position: 'absolute', top: -3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4D4D' },

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