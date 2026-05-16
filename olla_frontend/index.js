/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging'; // FCM 토큰 

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('백그라운드 메시지:', remoteMessage);
}); 
  

AppRegistry.registerComponent(appName, () => App);
