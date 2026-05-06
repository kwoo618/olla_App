import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// 네비게이션 타입 정의
type RootParamList = {
  Login: undefined; Signup: undefined; PersonalInfo: undefined; Loading: undefined;
  Home: undefined; Notice: undefined; Recode: undefined; Ranking: undefined;
  Community: undefined; MY: undefined; ManagerDashboard: undefined;
  ManagerUser: undefined; ManagerTicket: undefined; ManagerNotice: undefined; ManagerCommunity: undefined;
};

// 스크린 임포트 (기존 경로 유지)
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import PersonalScreen from './PersonalScreen';
import LoadingScreen from './LoadingScreen';
import HomeScreen from './HomeScreen';
import NoticeScreen from './NoticeScreen';
import RecodeScreen from './RecodeScreen';
import RankingScreen from './RankingScreen';
import CommunityScreen from './CommunityScreen';
import MYScreen from './MYScreen';
import ManagerDashboard from './ManagerDashboard';
import ManagerUser from './ManagerUser';
import ManagerTicket from './ManagerTicket';
import ManagerNotice from './ManagerNotice';
import ManagerCommunity from './ManagerCommunity';

const Stack = createNativeStackNavigator<RootParamList>();

// 하단 내비게이션 아이템
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
  const [routeName, setRouteName] = useState<string>('');

  // --- 기존 데이터 유지 ---
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

  const hideNavScreens = ['Login', 'Signup', 'PersonalInfo', 'Loading'];
  const shouldShowNav = !hideNavScreens.includes(routeName);
  const adminScreens = ['ManagerDashboard', 'ManagerUser', 'ManagerTicket', 'ManagerNotice', 'ManagerCommunity'];
  const isAdminMode = adminScreens.includes(routeName);

  return (
    <View style={styles.globalContainer}>
      {/* StatusBar 설정을 조정하여 공백 느낌 제거 */}
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <NavigationContainer 
        ref={navigationRef} 
        onReady={() => setRouteName(navigationRef.getCurrentRoute()?.name || '')} 
        onStateChange={() => setRouteName(navigationRef.getCurrentRoute()?.name || '')}
      >
        {/* 상단 배너 높이 최적화 */}
        {shouldShowNav && (
          <View style={[styles.topNav, { paddingTop: Math.max(insets.top, 10) }]}>
            <View style={styles.topNavInner}>
              {!isAdminMode ? (
                <>
                  <Text style={styles.logoText}>olla</Text>
                  <TouchableOpacity onPress={() => navigationRef.navigate('Notice')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Image source={require('./assets/Vector.png')} style={styles.topIcon} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.adminLogoContainer}>
                    <Text style={styles.logoText}>olla</Text>
                    <Text style={styles.adminSubText}>관리자</Text>
                  </View>
                  <TouchableOpacity style={styles.adminExitBtn} onPress={() => navigationRef.navigate('MY')}>
                    <Image source={require('./assets/EXIT.png')} style={styles.adminExitIcon} />
                    <Text style={styles.adminExitText}>종료</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.mainContent}>
          <Stack.Navigator initialRouteName="ManagerDashboard" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="PersonalInfo" component={PersonalScreen} />
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Notice" component={NoticeScreen} />
            <Stack.Screen name="Recode">{(props) => <RecodeScreen {...props} difficultyData={difficultyData} setDifficultyData={setDifficultyData} enduranceData={enduranceData} setEnduranceData={setEnduranceData} consecutiveData={consecutiveData} setConsecutiveData={setConsecutiveData} />}</Stack.Screen>
            <Stack.Screen name="Ranking">{(props) => <RankingScreen {...props} myProfile={profileData} difficultyData={difficultyData} enduranceData={enduranceData} consecutiveData={consecutiveData} />}</Stack.Screen>
            <Stack.Screen name="Community">{(props) => <CommunityScreen {...props} myProfile={profileData} myToggles={profileToggles} />}</Stack.Screen>
            <Stack.Screen name="MY">{(props) => <MYScreen {...props} profileData={profileData} setProfileData={setProfileData} profileToggles={profileToggles} setProfileToggles={setProfileToggles} />}</Stack.Screen>
            <Stack.Screen name="ManagerDashboard" component={ManagerDashboard} />
            <Stack.Screen name="ManagerUser">{(props) => <ManagerUser {...props} users={users} setUsers={setUsers} />}</Stack.Screen>
            <Stack.Screen name="ManagerTicket">{(props) => <ManagerTicket {...props} users={users} setUsers={setUsers} />}</Stack.Screen>
            <Stack.Screen name="ManagerNotice" component={ManagerNotice} />
            <Stack.Screen name="ManagerCommunity" component={ManagerCommunity} />
          </Stack.Navigator>
        </View>

        {/* 하단바 */}
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
  topNavInner: { 
    height: 50, // 60에서 50으로 축소 (슬림한 배너)
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  logoText: { fontSize: 24, fontWeight: '900', color: '#A1BE44' }, // 로고 크기 살짝 축소
  topIcon: { width: 20, height: 20, resizeMode: 'contain' }, // 아이콘 크기 살짝 축소
  adminLogoContainer: { flexDirection: 'column' },
  adminSubText: { color: '#999999', fontSize: 9, fontWeight: 'bold', marginTop: -3 },
  adminExitBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#331111', 
    paddingHorizontal: 8, 
    paddingVertical: 5, 
    borderRadius: 6 
  },
  adminExitIcon: { width: 10, height: 10, tintColor: '#FF4D4D', marginRight: 4 },
  adminExitText: { color: '#FF4D4D', fontSize: 10, fontWeight: 'bold' },
  bottomNav: { 
    flexDirection: 'row', 
    backgroundColor: '#111111', 
    borderTopWidth: 1, 
    borderTopColor: '#222222', 
    paddingTop: 8 
  },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 20, height: 20, marginBottom: 3, resizeMode: 'contain' },
  bottomNavText: { fontSize: 9, color: '#7D7D7D' },
});