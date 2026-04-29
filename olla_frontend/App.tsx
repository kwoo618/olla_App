import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 💡 지금까지 만든 화면들을 모두 불러옵니다. (파일 이름이 다르다면 맞춰주세요!)
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import PersonalScreen from './PersonalScreen';
import LoadingScreen from './LoadingScreen';
import HomeScreen from './HomeScreen';
import NoticeScreen from './NoticeScreen';
import RecodeScreen from './RecodeScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      {/* initialRouteName="Login" -> 앱을 켜면 무조건 로그인 화면부터 띄움 */}
      {/* headerShown: false -> 기본으로 생기는 상단 제목 표시줄(헤더) 숨기기 */}
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="PersonalInfo" component={PersonalScreen} />
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Notice" component={NoticeScreen} />
        <Stack.Screen name="Recode" component={RecodeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;