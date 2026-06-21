import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { API_BASE_URL } from '../Config';

export const SESSION_EXPIRED_EVENT = 'SESSION_EXPIRED';

// ─── 동시 401 처리를 위한 단일 재발급 프로미스 ───────────────────────────────
// _isReissuing(boolean) 대신 Promise를 공유해서
// 동시에 여러 요청이 401 나도 재발급은 1번만 하고 나머지는 대기 후 재시도
let _refreshPromise: Promise<string> | null = null;
let _sessionExpiredFired = false;

// 세션 만료 처리 공통 함수
const handleSessionExpired = async () => {
  if (_sessionExpiredFired) return;
  _sessionExpiredFired = true;
  await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole', 'fcmToken']);
  DeviceEventEmitter.emit(SESSION_EXPIRED_EVENT);
};

// ─── axios 인스턴스 ───────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// ─── 요청 인터셉터: 모든 요청에 토큰 자동 주입 ───────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── 응답 인터셉터: 401 처리 + 토큰 재발급 ───────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';

    // Spring Security가 인증 실패 시 401이 아니라 403을 반환하는 경우가 있어
    // (JwtAuthenticationFilter가 SecurityContext를 못 채우면 anyRequest().authenticated()에서 403 발생)
    // 401과 403 모두 인증 실패로 간주해서 동일하게 처리
    const isAuthError = status === 401 || status === 403;

    // 로그인/재발급 요청 자체가 인증 실패면 바로 세션 만료로 처리
    const isLoginRequest = url.includes('/auth/login') || url.includes('/members/login');
    const isReissueRequest = url.includes('/auth/reissue');

    if (isAuthError && (isLoginRequest || isReissueRequest)) {
      await handleSessionExpired();
      return Promise.reject(error);
    }

    if (isAuthError && !_sessionExpiredFired) {
      // 동시 401이 여러 개 와도 재발급은 1번만
      // _refreshPromise가 있으면 기존 프로미스 재사용, 없으면 새로 생성
      if (!_refreshPromise) {
        _refreshPromise = (async () => {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

          const reissueRes = await axios.post(
            `${API_BASE_URL}/auth/reissue`,
            { refreshToken },
          );

          const newAccessToken =
            reissueRes.data?.data?.accessToken ?? reissueRes.data?.accessToken;
          if (!newAccessToken) throw new Error('NO_ACCESS_TOKEN');

          await AsyncStorage.setItem('userToken', newAccessToken);
          return newAccessToken;
        })().finally(() => {
          // 성공/실패 모두 프로미스 초기화 (다음 재발급을 위해)
          _refreshPromise = null;
        });
      }

      try {
        const newToken = await _refreshPromise;
        // 재발급 받은 토큰으로 원래 요청 재시도
        error.config.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(error.config);
      } catch {
        await handleSessionExpired();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// 세션 만료 플래그 초기화 (로그인 성공 후 호출)
export const resetSessionFlag = () => {
  _sessionExpiredFired = false;
};

export default apiClient;