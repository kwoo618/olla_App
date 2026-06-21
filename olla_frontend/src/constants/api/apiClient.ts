//  axios 싱글톤 + 401 인터셉터 기존 App.tsx에서 이동
/**
 * src/api/apiClient.ts
 *
 * axios 싱글톤 + 401 인터셉터 통합 관리.
 * App.tsx에 있던 인터셉터 코드를 여기로 옮겨두고,
 * 이 파일을 앱 entry(index.js 또는 App.tsx) 최상단에서 딱 한 번 import하면 됩니다.
 *
 * 기존 ts/ 파일들은 수정 없이도 그대로 동작합니다.
 * (axios 모듈은 싱글톤이라 어디서 import해도 같은 인스턴스를 씁니다.)
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { API_BASE_URL } from '../Config';

export const SESSION_EXPIRED_EVENT = 'SESSION_EXPIRED';

let _sessionExpiredFired = false;
let _isReissuing = false;

axios.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';
    const isLoginRequest =
      url.includes('/auth/login') || url.includes('/members/login');
    const isReissueRequest = url.includes('/auth/reissue');

    // 로그인·재발급 요청에서 401 → 세션 만료 처리
    if (status === 401 && (isLoginRequest || isReissueRequest)) {
      if (!_sessionExpiredFired) {
        _sessionExpiredFired = true;
        await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole', 'fcmToken']);
        DeviceEventEmitter.emit(SESSION_EXPIRED_EVENT);
      }
      return Promise.reject(error);
    }

    // 일반 401 → 토큰 재발급 시도
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
  },
);

/** 인터셉터가 등록된 axios를 그대로 export합니다. */
export default axios;

/** 세션 만료 플래그를 외부(로그인 화면 이동 완료 후 등)에서 리셋할 때 사용 */
export const resetSessionExpiredFlag = () => {
  _sessionExpiredFired = false;
};

/** AsyncStorage 토큰으로 Authorization 헤더 객체 반환 (공통 헬퍼) */
export const authHeader = async (): Promise<{ Authorization: string }> => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token ?? ''}` };
};