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
import SignupSCreen from './SignupScreen';

const App = () => {
  return <SignupSCreen />;
};

export default App;