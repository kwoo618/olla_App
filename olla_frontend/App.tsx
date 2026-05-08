import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, Modal } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// 네비게이션 타입 정의
type RootParamList = {
  Login: undefined; Signup: undefined; PersonalInfo: undefined; Loading: undefined;
  Home: undefined; Notice: undefined; Recode: undefined; Ranking: undefined;
  // Community에 데이터를 넘길 수 있도록 수정 // 내 정보 조회 
  Community: { filter?: 'ALL' | 'MY_WRITTEN' | 'MY_APPLIED' } | undefined; 
  MY: undefined; ManagerDashboard: undefined;
  ManagerUser: undefined; ManagerTicket: undefined; ManagerNotice: undefined; ManagerCommunity: undefined;
};

// 스크린 임포트
import LoginScreen from './tsx/LoginScreen';
import SignupScreen from './tsx/SignupScreen';
import PersonalScreen from './tsx/PersonalScreen';
import LoadingScreen from './tsx/LoadingScreen';
import HomeScreen from './tsx/HomeScreen';
import NoticeScreen from './tsx/NoticeScreen';
import RecodeScreen from './tsx/RecodeScreen';
import RankingScreen from './tsx/RankingScreen';
import CommunityScreen from './tsx/CommunityScreen';
import MYScreen from './tsx/MYScreen';
import ManagerDashboard from './tsx/ManagerDashboard';
import ManagerUser from './tsx/ManagerUser';
import ManagerTicket from './tsx/ManagerTicket';
import ManagerNotice from './tsx/ManagerNotice';
import ManagerCommunity from './tsx/ManagerCommunity';

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

  const [isExitModalVisible, setExitModalVisible] = useState(false);

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
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <NavigationContainer 
        ref={navigationRef} 
        onReady={() => setRouteName(navigationRef.getCurrentRoute()?.name || '')} 
        onStateChange={() => setRouteName(navigationRef.getCurrentRoute()?.name || '')}
      >
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
                  <TouchableOpacity style={styles.adminExitBtn} onPress={() => setExitModalVisible(true)}>
                    <Image source={require('./assets/EXIT.png')} style={styles.adminExitIcon} />
                    <Text style={styles.adminExitText}>관리자 모드 종료</Text>
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
  topNavInner: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  logoText: { fontSize: 24, fontWeight: '900', color: '#A1BE44' }, 
  topIcon: { width: 20, height: 20, resizeMode: 'contain' }, 
  adminLogoContainer: { flexDirection: 'column' },
  adminSubText: { color: '#999999', fontSize: 9, fontWeight: 'bold', marginTop: -3 },
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