/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CHANNEL_ID = 'olla_default';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('백그라운드 메시지:', remoteMessage);

  // 알림 설정 확인
  const settingsRaw = await AsyncStorage.getItem('notiSettings');
  if (settingsRaw) {
    const settings = JSON.parse(settingsRaw);

    // 전체 알림 OFF
    if (!settings.isGlobalNotificationOn) {
      console.log('[FCM] 전체 알림 OFF — 백그라운드 알림 무시');
      return;
    }

    // 💡 개별 알림 타입 차단
    const type = remoteMessage.data?.type;
    if (type === 'ACTIVITY' && !settings.isActivityNotificationOn) {  // COMMENT → ACTIVITY
      console.log('[FCM] 활동 알림 OFF — 무시'); return;
    }
    if (type === 'CREW' && !settings.isCrewNotificationOn) {
      console.log('[FCM] 참여/모임 알림 OFF — 무시'); return;
    }
    if (type === 'MEMBERSHIP' && !settings.isMembershipNotificationOn) {
      console.log('[FCM] 이용권 알림 OFF — 무시'); return;
    }
    if (type === 'NOTICE' && !settings.isNoticeNotificationOn) {
      console.log('[FCM] 공지 알림 OFF — 무시'); return;
    }
  }

  const notifeeModule = await import('@notifee/react-native');
  const notifee = notifeeModule.default;
  const { AndroidImportance } = notifeeModule;

  const title = remoteMessage.data?.title ?? '알림';
  const body = remoteMessage.data?.body ?? '';

  if (Platform.OS === 'android') {
    await notifee.createChannel({ id: CHANNEL_ID, name: 'Olla 알림', importance: AndroidImportance.HIGH });
    await notifee.displayNotification({
      title,
      body,
      android: { channelId: CHANNEL_ID, importance: AndroidImportance.HIGH, pressAction: { id: 'default' } },
    });
  } else {
    await notifee.displayNotification({
      title,
      body,
      ios: { sound: 'default' },
    });
  }
});

AppRegistry.registerComponent(appName, () => App);