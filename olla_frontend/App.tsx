import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, Modal, DeviceEventEmitter } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './src/constants/Config';
import messaging from '@react-native-firebase/messaging';

export const SESSION_EXPIRED_EVENT = 'SESSION_EXPIRED';

let _sessionExpiredFired = false;
let _isReissuing = false;

axios.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';
    const isLoginRequest = url.includes('/auth/login') || url.includes('/members/login');
    const isReissueRequest = url.includes('/auth/reissue');

    if (status === 401 && (isLoginRequest || isReissueRequest)) {
      if (!_sessionExpiredFired) {
        _sessionExpiredFired = true;
        await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole', 'fcmToken']);
        DeviceEventEmitter.emit(SESSION_EXPIRED_EVENT);
      }
      return Promise.reject(error);
    }

    if (status === 401 && !_isReissuing && !_sessionExpiredFired) {
      _isReissuing = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

        const reissueRes = await axios.post(`${API_BASE_URL}/auth/reissue`, { refreshToken });

        const newAccessToken =
          reissueRes.data?.data?.accessToken ?? reissueRes.data?.accessToken;
        if (!newAccessToken) throw new Error('NO_ACCESS_TOKEN');

        await AsyncStorage.setItem('userToken', newAccessToken);

        error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axios(error.config);
      } catch {
        if (!_sessionExpiredFired) {
          _sessionExpiredFired = true;
          await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole', 'fcmToken']);
          DeviceEventEmitter.emit(SESSION_EXPIRED_EVENT);
        }
        return Promise.reject(error);
      } finally {
        _isReissuing = false;
      }
    }

    return Promise.reject(error);
  }
);

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

    await axios.post(
      `${API_BASE_URL}/members/me/fcm-token`,
      { deviceToken: fcmToken },
      { headers: { Authorization: `Bearer ${userToken}` } },
    );

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
        const res = await axios.get(`${API_BASE_URL}/memberships/me`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
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
    _sessionExpiredFired = false;
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

        const endpoint = isAdminMode
          ? `${API_BASE_URL}/admin/alerts?page=0&size=50`
          : `${API_BASE_URL}/notifications?page=0&size=50`;

        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${userToken}` },
        });

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
            await axios.get(`${API_BASE_URL}/members/me`, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            await AsyncStorage.removeItem('fcmToken');
            setInitialRoute('Home');
          } catch (apiError) {
            await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
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
                    <Text style={styles.logoText}>olla</Text>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalMessage: { color: '#999999', fontSize: 15, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  modalBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnConfirm: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  btnTextBlack: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  btnTextWhite: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});