import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, Modal, DeviceEventEmitter } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

// ─── axios 직접 호출 + 인터셉터를 apiClient.ts로 이전 ───
// apiClient: baseURL(API_BASE_URL) + 토큰 자동 주입 + 401 재발급/세션만료 처리가 포함된 axios 인스턴스라고 가정
import apiClient, { SESSION_EXPIRED_EVENT, resetSessionFlag } from './src/constants/api/apiClient';

type RootParamList = {
  Login: undefined; Signup: undefined; PersonalInfo: undefined; Loading: undefined;
  Home: undefined; Notice: undefined; Notification: undefined; Recode: undefined; Ranking: undefined;
  Community: { filter?: 'ALL' | 'MY_WRITTEN' | 'MY_APPLIED' } | undefined;
  MY: undefined; ManagerDashboard: undefined;
  ManagerUser: undefined; ManagerTicket: undefined; ManagerNotice: undefined; ManagerCommunity: undefined;
  AdminNotification: undefined;
};

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

const CHANNEL_ID = 'olla_default_channel';

const createNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;
  try {
    const notifeeModule = await import('@notifee/react-native');
    const notifee = notifeeModule.default;
    const { AndroidImportance } = notifeeModule;
    await notifee.requestPermission();
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Olla 알림',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  } catch (e) {}
};

const requestIosPermission = async () => {
  if (Platform.OS !== 'ios') return;
  try {
    const notifeeModule = await import('@notifee/react-native');
    const notifee = notifeeModule.default;
    await notifee.requestPermission();
  } catch (e) {}
};

const displayForegroundNotification = async (remoteMessage: any) => {
  try {
    const settingsRaw = await AsyncStorage.getItem('notiSettings');
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      if (!settings.isGlobalNotificationOn) return;
      const type = remoteMessage.data?.type;
      if (type === 'ACTIVITY' && !settings.isActivityNotificationOn) return;
      if (type === 'CREW' && !settings.isCrewNotificationOn) return;
      if (type === 'MEMBERSHIP' && !settings.isMembershipNotificationOn) return;
      if (type === 'NOTICE' && !settings.isNoticeNotificationOn) return;
    }

    const notifeeModule = await import('@notifee/react-native');
    const notifee = notifeeModule.default;
    const { AndroidImportance } = notifeeModule;

    const title = remoteMessage.data?.title ?? remoteMessage.notification?.title ?? '알림';
    const body  = remoteMessage.data?.body  ?? remoteMessage.notification?.body  ?? '';

    if (Platform.OS === 'android') {
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
        },
      });
    } else {
      await notifee.displayNotification({
        title,
        body,
        ios: { sound: 'default' },
      });
    }
  } catch (e) {}
};

const registerFcmToken = async () => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) return;

    if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
    }

    const fcmToken = await messaging().getToken();
    if (!fcmToken) return;

    const savedToken = await AsyncStorage.getItem('fcmToken');
    if (savedToken === fcmToken) return;

    // ─── 💡 axios.post(`${API_BASE_URL}/...`, ..., { headers: Authorization }) → apiClient.post로 교체 ───
    await apiClient.post('/members/me/fcm-token', { deviceToken: fcmToken });

    await AsyncStorage.setItem('fcmToken', fcmToken);
  } catch (e) {}
};

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
      <Text style={[styles.bottomNavText, isActive && { color: activeColor, fontWeight: 'bold' }]}>
        {label}
      </Text>
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
  const [hasUnreadNotification, setHasUnreadNotification] = useState(false);
  const lastAlertId = useRef<number | null>(null);

  const [sessionExpiredVisible, setSessionExpiredVisible] = useState(false);

  // ─── 🔍 임시 디버그 모달 (토큰 만료/네트워크 이슈 원인 파악용, 릴리즈에서도 보임) ───
  const [debugModalVisible, setDebugModalVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  // ─── 🔍 토큰 강제 조작용 디버그 (로고 5번 탭으로 호출) ───
  const [tokenDebugVisible, setTokenDebugVisible] = useState(false);
  const [tokenDebugInfo, setTokenDebugInfo] = useState('버튼을 눌러 토큰을 조작해보세요.');
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    if (logoTapCount.current >= 5) {
      logoTapCount.current = 0;
      setTokenDebugVisible(true);
      return;
    }
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0; }, 1000);
  };

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

  const [hasMembership, setHasMembership] = useState(false);

  useEffect(() => {
    const fetchMembership = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) { setHasMembership(false); return; }
        // ─── 💡 axios.get(`${API_BASE_URL}/memberships/me`, { headers }) → apiClient.get로 교체 ───
        const res = await apiClient.get('/memberships/me');
        const rawData = res.data.data;
        const dataList: any[] = Array.isArray(rawData) ? rawData : (rawData?.content || []);

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const active = dataList.filter((m: any) => {
          const status = String(m.membershipStatus || m.status || '').toUpperCase();
          if (status === 'DELETED' || status === 'INACTIVE') return false;
          if (m.startDate) {
            const s = new Date(m.startDate); s.setHours(0,0,0,0);
            if (s > today) return false;
          }
          return true;
        });
        const hasPeriod = active.some((m: any) => {
          const t = String(m.membershipType ?? '').toUpperCase();
          const isCountType = t.includes('COUNT') || t.includes('횟수') || t.includes('일일');
          if (isCountType) return false;
          if (!m.endDate) return false;
          const end = new Date(m.endDate); end.setHours(23, 59, 59, 999);
          return end.getTime() >= Date.now();
        });
        setHasMembership(hasPeriod);
      } catch {
        setHasMembership(false);
      }
    };
    if (initialRoute === 'Home') fetchMembership();
  }, [initialRoute]);

  const handleSessionExpiredConfirm = () => {
    setSessionExpiredVisible(false);
    // ─── 💡 _sessionExpiredFired = false 직접 조작 → apiClient의 resetSessionFlag() 호출로 교체 ───
    resetSessionFlag();
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SESSION_EXPIRED_EVENT, () => {
      setSessionExpiredVisible(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let unsubscribeForeground: (() => void) | null = null;
    let unsubscribeTokenRefresh: (() => void) | null = null;

    const init = async () => {
      try {
        await createNotificationChannel();
        await requestIosPermission();

        unsubscribeForeground = messaging().onMessage(async remoteMessage => {
          await displayForegroundNotification(remoteMessage);
          setHasUnreadNotification(true);
        });

        unsubscribeTokenRefresh = messaging().onTokenRefresh(async () => {
          await registerFcmToken();
        });

        await registerFcmToken();
      } catch (e) {}
    };

    init();

    return () => {
      unsubscribeForeground?.();
      unsubscribeTokenRefresh?.();
    };
  }, []);

  useEffect(() => {
    if (initialRoute !== 'Home') return;

    const fetchUnreadNotifications = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) return;

        // ─── 💡 API_BASE_URL 접두사 제거, axios → apiClient로 교체 ───
        const endpoint = isAdminMode
          ? '/admin/alerts?page=0&size=50'
          : '/notifications?page=0&size=50';

        const response = await apiClient.get(endpoint);

        const raw = response.data?.data;
        const list: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.content)
          ? raw.content
          : [];

        const unreadItems = list.filter(
          (item: any) => item.isRead === false || item.read === false
        );

        setHasUnreadNotification(unreadItems.length > 0);
      } catch (error) {}
    };

    fetchUnreadNotifications();
    const intervalId = setInterval(fetchUnreadNotifications, 30000);
    const subscription = DeviceEventEmitter.addListener('notificationRead', fetchUnreadNotifications);

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [initialRoute, isAdminMode]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (userToken) {
          try {
            // ─── 💡 axios.get(`${API_BASE_URL}/members/me`, { headers }) → apiClient.get로 교체 ───
            await apiClient.get('/members/me');
            await AsyncStorage.removeItem('fcmToken');
            setInitialRoute('Home');
          } catch (apiError: any) {
            // 🔍 디버그: 릴리즈 빌드에서도 원인을 눈으로 확인하기 위해 모달로 표시
            setDebugInfo(
              `[checkLoginStatus]\n` +
              `status: ${apiError?.response?.status}\n` +
              `code: ${apiError?.code}\n` +
              `message: ${apiError?.message}\n` +
              `hasResponse: ${!!apiError?.response}\n` +
              `hasRequest: ${!!apiError?.request}`
            );
            setDebugModalVisible(true);

            // apiClient의 401 인터셉터가 이미 재발급을 시도했고
            // 실패해서 여기까지 전파된 상태이므로, 다시 토큰 유무를 확인해서
            // Home으로 보내는 분기는 제거 — 인터셉터가 이미 토큰을 지웠다고 보고 무조건 로그인으로
            await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole', 'fcmToken']);
            setInitialRoute('Login');
          }
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
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
      setSlideDirection(currentIndex > prevIndex ? 'slide_from_right' : 'slide_from_left');
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
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigationRef.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.backBtnText}>←</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleLogoTap} activeOpacity={1} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.logoText}>olla</Text>
                    </TouchableOpacity>
                  )}
                  {routeName !== 'Notice' && routeName !== 'Notification' ? (
                    <TouchableOpacity onPress={() => navigationRef.navigate('Notification')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <View>
                        <Image source={require('./assets/Vector.png')} style={styles.topIcon} />
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
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View>
                        <Image source={require('./assets/Vector.png')} style={styles.adminAlertIcon} />
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
            <Stack.Screen name="Recode">
              {(props) => (
                <RecodeScreen
                  {...props}
                  hasMembership={hasMembership}
                  difficultyData={difficultyData}
                  setDifficultyData={setDifficultyData}
                  enduranceData={enduranceData}
                  setEnduranceData={setEnduranceData}
                  consecutiveData={consecutiveData}
                  setConsecutiveData={setConsecutiveData}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Ranking">
              {(props) => (
                <RankingScreen
                  {...props}
                  hasMembership={hasMembership}
                  myProfile={profileData}
                  difficultyData={difficultyData}
                  enduranceData={enduranceData}
                  consecutiveData={consecutiveData}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Community">
              {(props) => (
                <CommunityScreen
                  {...props}
                  hasMembership={hasMembership}
                  myProfile={profileData}
                  myToggles={profileToggles}
                />
              )}
            </Stack.Screen>
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

      {/* ─── 세션 만료 모달 ─── */}
      <Modal visible={sessionExpiredVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={[styles.modalTitle, { color: '#FF4D4D' }]}>세션 만료</Text>
            <Text style={styles.modalMessage}>세션이 만료되었습니다.{'\n'}다시 로그인해주세요.</Text>
            <TouchableOpacity style={styles.btnConfirm} onPress={handleSessionExpiredConfirm}>
              <Text style={styles.btnTextBlack}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 🔍 임시 디버그 모달 (원인 파악 끝나면 통째로 삭제) ─── */}
      <Modal visible={debugModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={[styles.modalTitle, { color: '#FFD23F', fontSize: 20 }]}>DEBUG</Text>
            <Text style={[styles.modalMessage, { fontSize: 13, textAlign: 'left', fontWeight: 'normal' }]} selectable>
              {debugInfo}
            </Text>
            <TouchableOpacity style={styles.btnConfirm} onPress={() => setDebugModalVisible(false)}>
              <Text style={styles.btnTextBlack}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 🔍 토큰 강제 조작 디버그 모달: 평소엔 안 보임, 로고 5번 탭으로 호출 ─── */}
      <Modal visible={tokenDebugVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={[styles.modalTitle, { color: '#A1BE44', fontSize: 18 }]}>TOKEN DEBUG</Text>
            <Text style={[styles.modalMessage, { fontSize: 12, textAlign: 'left', fontWeight: 'normal' }]} selectable>
              {tokenDebugInfo}
            </Text>

            <TouchableOpacity
              style={[styles.btnConfirm, { marginBottom: 10 }]}
              onPress={async () => {
                // 액세스 토큰만 깨뜨림 → 다음 API 호출에서 401 → 인터셉터가 reissue 시도
                await AsyncStorage.setItem('userToken', 'invalid_access_token_for_test');
                setTokenDebugInfo('액세스 토큰을 깨뜻습니다.\n이제 화면을 새로고침(pull-to-refresh)하거나\n탭을 이동해서 API를 호출해보세요.\n→ reissue가 성공하면 정상 동작,\n   화면이 빈칸 되면 버그 재현됨.');
              }}
            >
              <Text style={styles.btnTextBlack}>액세스 토큰만 깨기 (reissue 테스트)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnConfirm, { marginBottom: 10, backgroundColor: '#FF4D4D' }]}
              onPress={async () => {
                // 리프레시 토큰까지 깨뜨림 → reissue 자체가 실패 → 세션 만료 모달이 떠야 정상
                await AsyncStorage.setItem('userToken', 'invalid_access_token_for_test');
                await AsyncStorage.setItem('refreshToken', 'invalid_refresh_token_for_test');
                setTokenDebugInfo('액세스+리프레시 토큰 모두 깨뜻습니다.\n이제 화면을 새로고침하거나 탭 이동해보세요.\n→ "세션 만료" 모달이 떠야 정상.\n→ 안 뜨고 데이터만 빈칸이면 버그 재현됨.');
              }}
            >
              <Text style={styles.btnTextBlack}>리프레시 토큰까지 깨기 (세션만료 테스트)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnConfirm}
              onPress={async () => {
                const t = await AsyncStorage.getItem('userToken');
                const r = await AsyncStorage.getItem('refreshToken');
                setTokenDebugInfo(`현재 저장된 값:\nuserToken: ${t?.slice(0, 30)}...\nrefreshToken: ${r?.slice(0, 30)}...`);
              }}
            >
              <Text style={styles.btnTextBlack}>현재 토큰 값 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnNo, { marginTop: 10, width: '100%' }]} onPress={() => setTokenDebugVisible(false)}>
              <Text style={styles.btnTextWhite}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 관리자 모드 종료 모달 ─── */}
      <Modal visible={isExitModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.modalMessage}>관리자 모드를 종료하시겠습니까?</Text>
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
  bellBadge: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D4D', borderWidth: 1, borderColor: '#1A1A1A' },
  adminLogoContainer: { flexDirection: 'column' },
  adminSubText: { color: '#999999', fontSize: 9, fontWeight: 'bold', marginTop: -3 },
  adminRightControls: { flexDirection: 'row', alignItems: 'center' },
  adminAlertBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 0.5, borderColor: '#444' },
  adminAlertIcon: { width: 13, height: 13, tintColor: '#A1BE44', marginRight: 6, resizeMode: 'contain' },
  adminBellBadge: { position: 'absolute', top: -3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4D4D' },
  adminAlertText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  adminExitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#331111', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  adminExitIcon: { width: 14, height: 14, tintColor: '#FF4D4D', marginRight: 6 },
  adminExitText: { color: '#FF4D4D', fontSize: 13, fontWeight: 'bold' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#111111', borderTopWidth: 1, borderTopColor: '#222222', paddingTop: 8 },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 20, height: 20, marginBottom: 3, resizeMode: 'contain' },
  bottomNavText: { fontSize: 9, color: '#7D7D7D' },

  // ─────────────────────────── 💡 OLLA 모달창 표준 디자인 스타일 통일 적용 ───────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: {
    width: '90%',
    backgroundColor: '#212121',
    borderRadius: 25,
    paddingVertical: 45,
    paddingHorizontal: 35,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  modalMessage: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24
  },
  modalBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnConfirm: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});