import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, Image } from 'react-native';

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

const Stack = createNativeStackNavigator();

const App = () => {
  const navigationRef = useNavigationContainerRef();
  const [routeName, setRouteName] = useState('MY');

  // 💡 [실시간 연동] 프로필 및 기록 데이터 통합 관리
  const [profileData, setProfileData] = useState({ name: '권클라이밍', phone: '010-1234-5678', age: '25', height: '175', weight: '70', arm: '180', shoe: '260' });
  const [profileToggles, setProfileToggles] = useState({ showName: true, showPhone: false, showAge: true, showHeight: true, showWeight: true, showArm: true, showShoe: true });

  // 💡 기록 데이터 (RecodeScreen과 RankingScreen이 공유)
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

  const hideNavScreens = ['Login', 'Signup', 'PersonalInfo', 'Loading'];
  const shouldShowNav = !hideNavScreens.includes(routeName);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.background} edges={['top', 'bottom']}>
        <NavigationContainer ref={navigationRef} onReady={() => setRouteName(navigationRef.getCurrentRoute()?.name || 'MY')} onStateChange={() => setRouteName(navigationRef.getCurrentRoute()?.name || 'MY')}>
          <View style={styles.globalContainer}>
            {shouldShowNav && (
              <View style={styles.topNav}>
                <Text style={styles.logoText}>olla</Text>
                <TouchableOpacity onPress={() => navigationRef.navigate('Notice' as never)}><Image source={require('./assets/Vector.png')} style={styles.topIcon} /></TouchableOpacity>
              </View>
            )}
            <View style={styles.mainContent}>
              <Stack.Navigator initialRouteName="MY" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="PersonalInfo" component={PersonalScreen} />
                <Stack.Screen name="Loading" component={LoadingScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Notice" component={NoticeScreen} />
                
                <Stack.Screen name="Recode">
                  {(props) => <RecodeScreen {...props} difficultyData={difficultyData} setDifficultyData={setDifficultyData} enduranceData={enduranceData} setEnduranceData={setEnduranceData} consecutiveData={consecutiveData} setConsecutiveData={setConsecutiveData} />}
                </Stack.Screen>

                <Stack.Screen name="Ranking">
                  {(props) => <RankingScreen {...props} myProfile={profileData} difficultyData={difficultyData} enduranceData={enduranceData} consecutiveData={consecutiveData} />}
                </Stack.Screen>

                <Stack.Screen name="Community">
                  {(props) => <CommunityScreen {...props} myProfile={profileData} myToggles={profileToggles} />}
                </Stack.Screen>

                <Stack.Screen name="MY">
                  {(props) => <MYScreen {...props} profileData={profileData} setProfileData={setProfileData} profileToggles={profileToggles} setProfileToggles={setProfileToggles} />}
                </Stack.Screen>
              </Stack.Navigator>
            </View>
            {shouldShowNav && (
              <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('Home' as never)}><Image source={require('./assets/Home.png')} style={[styles.navIcon, routeName !== 'Home' && { opacity: 0.4 }]} /><Text style={routeName === 'Home' ? styles.bottomNavTextActive : styles.bottomNavText}>홈</Text></TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('Recode' as never)}><Image source={require('./assets/recode.png')} style={[styles.navIcon, routeName !== 'Recode' && { opacity: 0.4 }]} /><Text style={routeName === 'Recode' ? styles.bottomNavTextActive : styles.bottomNavText}>기록</Text></TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('Ranking' as never)}><Image source={require('./assets/ranking.png')} style={[styles.navIcon, routeName !== 'Ranking' && { opacity: 0.4 }]} /><Text style={routeName === 'Ranking' ? styles.bottomNavTextActive : styles.bottomNavText}>랭킹</Text></TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('Community' as never)}><Image source={require('./assets/community.png')} style={[styles.navIcon, routeName !== 'Community' && { opacity: 0.4 }]} /><Text style={routeName === 'Community' ? styles.bottomNavTextActive : styles.bottomNavText}>커뮤니티</Text></TouchableOpacity>
                <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigationRef.navigate('MY' as never)}><Image source={require('./assets/mypage.png')} style={[styles.navIcon, routeName !== 'MY' && { opacity: 0.4 }]} /><Text style={routeName === 'MY' ? styles.bottomNavTextActive : styles.bottomNavText}>마이페이지</Text></TouchableOpacity>
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
  logoText: { fontSize: 28, fontWeight: '900', color: '#A1BE44' },
  topIcon: { width: 24, height: 24, resizeMode: 'contain' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#111111', paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#222222' },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  bottomNavText: { color: '#666666', fontSize: 11, fontWeight: '500' },
  bottomNavTextActive: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },
});

export default App;