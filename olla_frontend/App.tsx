/* 기존 파일
import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';

const App = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <LoginScreen />
    </SafeAreaView>
  );
};

export default App;
*/

import React from 'react';
//import LoginScreen from './LoginScreen';
//import SignupSCreen from './SignupScreen';
//import PersonalScreen from './PersonalScreen';
import LoadingScreen from './LoadingScreen';

const App = () => {
  return <LoadingScreen />;
};

export default App;