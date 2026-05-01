import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

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

const Stack = createNativeStackNavigator();

const App = () => {
  const navigationRef = useNavigationContainerRef();
  const [routeName, setRouteName] = useState('MY');

  const [profileData, setProfileData] = useState({ name: '권클라이밍', phone: '010-1234-5678', age: '25', height: '175', weight: '70', arm: '180', shoe: '260' });
  const [profileToggles, setProfileToggles] = useState({ showName: true, showPhone: false, showAge: true, showHeight: true, showWeight: true, showArm: true, showShoe: true });
  
  const [difficultyData, setDifficultyData] = useState([
    { id: 1, color: '흰색', hex: '#EAEAEA', type: '왕복', current: 26, total: 26, status: '완료', score: 10 },
    { id: 2, color: '노랑', hex: '#F4D03F', type: '왕복', current: 33, total: 33, status: '완료', score: 20 },
    { id: 3, color: '초록', hex: '#58D68D', type: '왕복', current: 28, total: 28, status: '완료', score: 30 },
    { id: 8, color: '검정', hex: '#000000', type: '편도', current: 15, total: 30, status: '진행중', score: 80 },
  ]);
  const [enduranceData, setEnduranceData] = useState([{ id: 1, type: '편도', arrow: '->', laps: '5', time: '12:30', section: '3-2' }]);
  const [consecutiveData, setConsecutiveData] = useState([{ id: 1, colors: ['#EAEAEA', '#F4D03F', '#58D68D', '#5DADE2'] }]);

  // 💡 [핵심] 통합 회원 관리 데이터 (티켓 정보 포함)
  const [users, setUsers] = useState([
    { id: 1, name: '권클라이밍', phone: '010-1234-5678', status: '활동중', ticket: { type: '회원권', start: '2026-03-01', end: '2026-06-01' } },
    { id: 2, name: '김정산', phone: '010-9876-5432', status: '비활중', ticket: null }, // 티켓 없음
    { id: 3, name: '최강우', phone: '010-1111-2222', status: '활동중', ticket: { type: '회원권', start: '2026-01-15', end: '2026-04-15' } },
    { id: 4, name: 'Alex', phone: '010-3333-4444', status: '활동중', ticket: null },
    { id: 5, name: '박지구력', phone: '010-6666-7777', status: '활동중', ticket: { type: '일일권', start: '2026-05-01', end: '' } },
  ]);

  const hideNavScreens = ['Login', 'Signup', 'PersonalInfo', 'Loading'];
  const shouldShowNav = !hideNavScreens.includes(routeName);

  const adminScreens = ['ManagerDashboard', 'ManagerUser', 'ManagerTicket', 'ManagerNotice', 'ManagerCommunity'];
  const isAdminMode = adminScreens.includes(routeName);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.background} edges={['top', 'bottom']}>
        <NavigationContainer ref={navigationRef} onReady={() => setRouteName(navigationRef.getCurrentRoute()?.name || 'MY')} onStateChange={() => setRouteName(navigationRef.getCurrentRoute()?.name || 'MY')}>
          <View style={styles.globalContainer}>
            
            {shouldShowNav && !isAdminMode && (
              <View style={styles.topNav}>
                <Text style={styles.logoText}>olla</Text>
                <TouchableOpacity onPress={() => navigationRef.navigate('Notice' as never)}><Image source={require('./assets/Vector.png')} style={styles.topIcon} /></TouchableOpacity>
              </View>
            )}
            {shouldShowNav && isAdminMode && (
              <View style={styles.topNav}>
                <View style={styles.adminLogoContainer}>
                  <Text style={styles.logoText}>olla</Text>
                  <Text style={styles.adminSubText}>관리자</Text>
                </View>
                <TouchableOpacity style={styles.adminExitBtn} onPress={() => navigationRef.navigate('MY' as never)}>
                  <Image source={require('./assets/EXIT.png')} style={styles.adminExitIcon} />
                  <Text style={styles.adminExitText}>관리자 모드 종료</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.mainContent}>
              <Stack.Navigator initialRouteName="ManagerCommunity" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
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
                {/* 💡 ManagerUser와 ManagerTicket에 users 데이터를 넘겨줌 */}
                <Stack.Screen name="ManagerUser">{(props) => <ManagerUser {...props} users={users} setUsers={setUsers} />}</Stack.Screen>
                <Stack.Screen name="ManagerTicket">{(props) => <ManagerTicket {...props} users={users} setUsers={setUsers} />}</Stack.Screen>
                <Stack.Screen name="ManagerNotice" component={ManagerNotice} />
                <Stack.Screen name="ManagerCommunity" component={ManagerCommunity} />
              </Stack.Navigator>
            </View>

            {shouldShowNav && !isAdminMode && (
              <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('Home' as never)}><Image source={require('./assets/Home.png')} style={[styles.navIcon, routeName !== 'Home' && { opacity: 0.4 }]} /><Text style={routeName === 'Home' ? styles.bottomNavTextActive : styles.bottomNavText}>홈</Text></TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('Recode' as never)}><Image source={require('./assets/recode.png')} style={[styles.navIcon, routeName !== 'Recode' && { opacity: 0.4 }]} /><Text style={routeName === 'Recode' ? styles.bottomNavTextActive : styles.bottomNavText}>기록</Text></TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('Ranking' as never)}><Image source={require('./assets/ranking.png')} style={[styles.navIcon, routeName !== 'Ranking' && { opacity: 0.4 }]} /><Text style={routeName === 'Ranking' ? styles.bottomNavTextActive : styles.bottomNavText}>랭킹</Text></TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('Community' as never)}><Image source={require('./assets/community.png')} style={[styles.navIcon, routeName !== 'Community' && { opacity: 0.4 }]} /><Text style={routeName === 'Community' ? styles.bottomNavTextActive : styles.bottomNavText}>커뮤니티</Text></TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('MY' as never)}><Image source={require('./assets/mypage.png')} style={[styles.navIcon, routeName !== 'MY' && { opacity: 0.4 }]} /><Text style={routeName === 'MY' ? styles.bottomNavTextActive : styles.bottomNavText}>마이페이지</Text></TouchableOpacity>
              </View>
            )}
            
            {shouldShowNav && isAdminMode && (
              <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('ManagerDashboard' as never)}>
                  <Image source={require('./assets/SquaresFour.png')} style={[styles.navIcon, { tintColor: routeName === 'ManagerDashboard' ? '#A1BE44' : '#7D7D7D' }]} />
                  <Text style={[styles.adminBottomNavText, routeName === 'ManagerDashboard' && { color: '#A1BE44' }]}>대시보드</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('ManagerUser' as never)}>
                  <Image source={require('./assets/profile.png')} style={[styles.navIcon, { tintColor: routeName === 'ManagerUser' ? '#A1BE44' : '#7D7D7D' }]} />
                  <Text style={[styles.adminBottomNavText, routeName === 'ManagerUser' && { color: '#A1BE44' }]}>회원 관리</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('ManagerTicket' as never)}>
                  <Image source={require('./assets/ticket.png')} style={[styles.navIcon, { tintColor: routeName === 'ManagerTicket' ? '#A1BE44' : '#7D7D7D' }]} />
                  <Text style={[styles.adminBottomNavText, routeName === 'ManagerTicket' && { color: '#A1BE44' }]}>이용권 관리</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('ManagerNotice' as never)}>
                  <Image source={require('./assets/Loudspeaker.png')} style={[styles.navIcon, { tintColor: routeName === 'ManagerNotice' ? '#A1BE44' : '#7D7D7D' }]} />
                  <Text style={[styles.adminBottomNavText, routeName === 'ManagerNotice' && { color: '#A1BE44' }]}>공지사항</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('ManagerCommunity' as never)}>
                  <Image source={require('./assets/people.png')} style={[styles.navIcon, { tintColor: routeName === 'ManagerCommunity' ? '#A1BE44' : '#7D7D7D' }]} />
                  <Text style={[styles.adminBottomNavText, routeName === 'ManagerCommunity' && { color: '#A1BE44' }]}>커뮤니티</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  globalContainer: { flex: 1, backgroundColor: '#1A1A1A' },
  mainContent: { flex: 1 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60, backgroundColor: '#1A1A1A' },
  logoText: { fontSize: 28, fontWeight: '900', color: '#A1BE44', lineHeight: 30 },
  topIcon: { width: 24, height: 24, resizeMode: 'contain' },
  adminLogoContainer: { flexDirection: 'column', justifyContent: 'center' },
  adminSubText: { color: '#999999', fontSize: 11, fontWeight: 'bold', marginTop: -4, marginLeft: 2 },
  adminExitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 0, 0, 0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  adminExitIcon: { width: 14, height: 14, tintColor: '#FF4D4D', marginRight: 6, resizeMode: 'contain' },
  adminExitText: { color: '#FF4D4D', fontSize: 12, fontWeight: 'bold' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#111111', paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#222222' },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  bottomNavText: { color: '#666666', fontSize: 11, fontWeight: '500' },
  bottomNavTextActive: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },
  adminBottomNavText: { color: '#7D7D7D', fontSize: 11, fontWeight: 'bold' }, 
});

export default App;