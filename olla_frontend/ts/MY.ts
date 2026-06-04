import { useState, useRef, useEffect, useCallback } from 'react';
import { Dimensions, Animated, PanResponder, Platform, Keyboard } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_BASE_URL } from '../src/constants/Config';
import messaging from '@react-native-firebase/messaging';

// 이미지 절대경로 변환
export const getFullImageUrl = (path: string) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

const getTodayDate = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
};

const isStarted = (startDate: string): boolean => {
  if (!startDate) return true;
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  return start <= getTodayDate();
};

const calcAgeFromBirth = (birthDate: string): string => {
  if (!birthDate || birthDate.length !== 10) return '-';
  const birthYear = parseInt(birthDate.substring(0, 4), 10);
  const birthMonth = parseInt(birthDate.substring(5, 7), 10);
  const birthDay = parseInt(birthDate.substring(8, 10), 10);
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return '-';
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)) { age--; }
  return String(age);
};

export type NotiState = {
  isGlobalNotificationOn: boolean;
  isMembershipNotificationOn: boolean;
  isActivityNotificationOn: boolean;
  isCrewNotificationOn: boolean;
  isNoticeNotificationOn: boolean;
};

const DEFAULT_NOTI_STATE: NotiState = {
  isGlobalNotificationOn: true,
  isMembershipNotificationOn: true,
  isActivityNotificationOn: true,
  isCrewNotificationOn: true,
  isNoticeNotificationOn: true,
};

export const useMyPage = (navigation: any) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isMembershipExpanded, setIsMembershipExpanded] = useState(false);
  
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' as 'info'|'success'|'error' });

  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isAdminModalVisible, setAdminModalVisible] = useState(false);
  const [isChangePwModalVisible, setChangePwModalVisible] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  const [memInfo, setMemInfo] = useState<any>({ type: '구매 필요', period: '-', status: '비회원', remainingDays: -1, remainingCount: -1, hasPeriod: false, hasCount: false, hasFuture: false });
  const [profileData, setProfileData] = useState<any>({ name: '', phone: '', gender: '', birthDate: '', height: '', weight: '', arm: '', shoe: '', profileImageUrl: '' });
  const [profileToggles, setProfileToggles] = useState<any>({ showPhone: true, showAge: true, showHeight: true, showWeight: true, showArm: true, showShoe: true });
  const [notiState, setNotiState] = useState<NotiState>(DEFAULT_NOTI_STATE);

  const pendingImageAsset = useRef<any>(null);
  const originalImageUrl = useRef<string>('');

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN = SCREEN_HEIGHT * 0.65;
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95;
  const THRESHOLD = (HALF_SCREEN + FULL_SCREEN) / 2;
  const CLOSE_THRESHOLD = HALF_SCREEN * 0.7;

  const pauseSlideAnim = useRef(new Animated.Value(800)).current;
  const contactSlideAnim = useRef(new Animated.Value(800)).current;
  const profileHeightAnim = useRef(new Animated.Value(0)).current;
  const currentProfileSnap = useRef(FULL_SCREEN);

  // 드래그로 프로필 모달 닫기
  const profilePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        profileHeightAnim.setOffset(currentProfileSnap.current);
        profileHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (currentProfileSnap.current === FULL_SCREEN && gestureState.dy < 0) {
          profileHeightAnim.setValue(Math.max(0, -gestureState.dy * 0.1));
        } else {
          profileHeightAnim.setValue(-gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        profileHeightAnim.flattenOffset();
        const finalHeight = currentProfileSnap.current - gestureState.dy;
        if (finalHeight > THRESHOLD) {
          currentProfileSnap.current = FULL_SCREEN;
          Animated.spring(profileHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight > CLOSE_THRESHOLD) {
          currentProfileSnap.current = HALF_SCREEN;
          Animated.spring(profileHeightAnim, { toValue: HALF_SCREEN, useNativeDriver: false }).start();
        } else {
          closeProfileModal();
        }
      }
    })
  ).current;

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  // 알림 설정 로드
  const fetchNotiSettings = useCallback(async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      const notiRes = await axios.get(`${API_BASE_URL}/members/me/notifications/settings`, { headers: { Authorization: `Bearer ${userToken}` } });
      if (notiRes.data.data) {
        setNotiState(notiRes.data.data);
      }
    } catch (e) {
      console.log('알림 설정 로드 실패');
    }
  }, []);

  // 유저 정보 및 멤버십 로드
  const fetchMyInfo = useCallback(async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) { navigation.replace('Login'); return; }
      const headers = { Authorization: `Bearer ${userToken}` };

      const userRes = await axios.get(`${API_BASE_URL}/members/me`, { headers });
      const data = userRes.data.data;
      console.log('이미지 URL 원본:', data.profileImageUrl);
      console.log('변환 후:', getFullImageUrl(data.profileImageUrl)); 

      if (data) {
        setIsAdmin(String(data.role || '').toUpperCase().includes('ADMIN'));
        
        const detailData = data.detail ?? data;
        const privacyData = data.privacy ?? data;

        setProfileData({
          name: data.name ?? '',
          phone: data.phone ?? '',
          gender: data.gender === 'MALE' ? '남' : data.gender === 'FEMALE' ? '여' : (data.gender ?? ''),
          birthDate: data.birthDate ?? '',
          height: detailData.height ? String(detailData.height) : '',
          weight: detailData.weight ? String(detailData.weight) : '',
          arm: detailData.armSpan ? String(detailData.armSpan) : '',
          shoe: detailData.footSize ? String(detailData.footSize) : '',
          profileImageUrl: data.profileImageUrl ?? ''
        });

        setProfileToggles({
          showPhone: privacyData.isPhonePublic ?? true,
          showAge: true,
          showHeight: privacyData.isHeightPublic ?? true,
          showWeight: privacyData.isWeightPublic ?? true,
          showArm: privacyData.isArmSpanPublic ?? true,
          showShoe: privacyData.isFootSizePublic ?? true,
        });
      }

      const memRes = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });
      const rawMemData = memRes.data.data;
      const dataList: any[] = Array.isArray(rawMemData) ? rawMemData : (rawMemData?.content || []);

      if (dataList.length > 0) {
        const activeList = dataList.filter(m => m.status === 'ACTIVE' && isStarted(m.startDate));
        const futureList = dataList.filter(m => m.status === 'ACTIVE' && !isStarted(m.startDate));
        
        const periodList = activeList.filter(m => {
          const t = String(m.membershipType).toUpperCase();
          return t.includes('PERIOD') || t.includes('기간') || t.includes('회원');
        });
        const countList = activeList.filter(m => {
          const t = String(m.membershipType).toUpperCase();
          return t.includes('COUNT') || t.includes('횟수') || t.includes('일일');
        });

        let totalRemainingDays = 0, earliestStart = '', latestEnd = '';
        periodList.forEach(m => {
          if (m.endDate) {
            const end = new Date(m.endDate); 
            end.setHours(0, 0, 0, 0);
            const diff = Math.round((end.getTime() - getTodayDate().getTime()) / (1000 * 60 * 60 * 24));
            
            if (diff >= 0) totalRemainingDays += diff; 
            
            if (!earliestStart || m.startDate < earliestStart) earliestStart = m.startDate;
            if (!latestEnd || m.endDate > latestEnd) latestEnd = m.endDate;
          }
        });

        const totalRemainingCount = countList.reduce((sum, m) => sum + (m.remainingCount ?? 0), 0);
        
        const hasPeriod = periodList.length > 0 && totalRemainingDays >= 0; 
        const hasCount = countList.length > 0 && totalRemainingCount > 0;
        const hasFuture = futureList.length > 0;

        let displayType = '구매 필요', periodDisplay = '-';
        if (hasPeriod && hasCount) { displayType = '회원권 / 일일권'; periodDisplay = `${earliestStart} ~ ${latestEnd}`; }
        else if (hasPeriod) { displayType = '회원권'; periodDisplay = `${earliestStart} ~ ${latestEnd}`; }
        else if (hasCount) { displayType = '일일권'; periodDisplay = `잔여 ${totalRemainingCount}회`; }
        else if (hasFuture) { displayType = '시작 예정'; periodDisplay = `${futureList[0]?.startDate || ''} 시작 예정`; }

        setMemInfo({
          type: displayType, 
          period: periodDisplay,
          status: hasPeriod || hasCount ? '이용중' : (hasFuture ? '시작 예정' : '비회원'),
          remainingDays: totalRemainingDays, 
          remainingCount: totalRemainingCount,
          hasPeriod, hasCount, hasFuture, 
          startDate: earliestStart, endDate: latestEnd,
        });
      } else {
        setMemInfo({ type: '구매 필요', period: '-', status: '비회원', remainingDays: -1, remainingCount: -1, hasPeriod: false, hasCount: false, hasFuture: false });
      }
    } catch (error) {
      console.log('데이터 로드 실패', error);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  // 설명: 탭 복귀 시 데이터 최신화 동기화
  useEffect(() => {
    if (isFocused) {
      fetchMyInfo();
      fetchNotiSettings();
    }
  }, [isFocused, fetchMyInfo, fetchNotiSettings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyInfo();
    await fetchNotiSettings();
    setRefreshing(false);
  }, [fetchMyInfo, fetchNotiSettings]);

  // 알림 토글 백엔드 전송 (Spring Boot is 누락 방어)
  const handleNotiToggle = async (field: keyof NotiState) => {
    const currentValue = notiState[field];
    const optimisticState = { ...notiState, [field]: !currentValue };
    setNotiState(optimisticState); // 화면 즉시 변경

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      
      const requestBody = {
        ...optimisticState,
        globalNotificationOn: optimisticState.isGlobalNotificationOn,
        membershipNotificationOn: optimisticState.isMembershipNotificationOn,
        activityNotificationOn: optimisticState.isActivityNotificationOn,
        crewNotificationOn: optimisticState.isCrewNotificationOn,
        noticeNotificationOn: optimisticState.isNoticeNotificationOn,
      };

      const res = await axios.patch(`${API_BASE_URL}/members/me/notifications/settings`, requestBody, { 
        headers: { Authorization: `Bearer ${userToken}` } 
      });
      
      if (res.data.data) setNotiState({ ...optimisticState, ...res.data.data });
    } catch (e) {
      setNotiState(prev => ({ ...prev, [field]: currentValue })); // 롤백
      showResultModal('오류', '알림 설정 변경에 실패했습니다.', 'error');
    }
  };

  const handleSelectImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel || response.errorCode) return;
      if (response.assets && response.assets.length > 0) {
        pendingImageAsset.current = response.assets[0];
        setProfileData((prev: any) => ({ ...prev, profileImageUrl: response.assets![0].uri }));
      }
    });
  };

  // 프로필 정보 및 공개 여부 백엔드 전송 (변수명 불일치 완벽 방어)
  const handleSaveProfile = async () => {
    setIsImageUploading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      let finalImageUrl = profileData.profileImageUrl;

      if (pendingImageAsset.current) {
        const asset = pendingImageAsset.current;
        const formData = new FormData();
        
        formData.append('image', { 
          uri: Platform.OS === 'ios' ? asset.uri?.replace('file://', '') : asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `profile_${Date.now()}.jpg`,
        } as any);

        const uploadRes = await axios.post(`${API_BASE_URL}/members/me/profile-image`, formData, { 
          headers: { 
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'multipart/form-data', 
          }, 
          timeout: 30000 
        });
        
        finalImageUrl = uploadRes.data.data.imageUrl || uploadRes.data.data.profileImageUrl; 
        pendingImageAsset.current = null;
      }

      const requestBody = {
        name: profileData.name, 
        phone: profileData.phone, 
        gender: profileData.gender, 
        birthDate: profileData.birthDate,
        height: profileData.height ? parseFloat(profileData.height) : null,
        weight: profileData.weight ? parseFloat(profileData.weight) : null,
        armSpan: profileData.arm ? parseFloat(profileData.arm) : null,
        footSize: profileData.shoe ? parseFloat(profileData.shoe) : null,
        age: parseInt(calcAgeFromBirth(profileData.birthDate)) || 0,

        // 백엔드 변수명 및 Jackson 파싱 에러 대비 4가지 경우의 수 모두 전송
        isPhonePublic: profileToggles.showPhone,
        phonePublic: profileToggles.showPhone,
        isPublicPhone: profileToggles.showPhone,
        publicPhone: profileToggles.showPhone,

        isHeightPublic: profileToggles.showHeight,
        heightPublic: profileToggles.showHeight,

        isWeightPublic: profileToggles.showWeight, 
        weightPublic: profileToggles.showWeight, 

        isArmSpanPublic: profileToggles.showArm,
        armSpanPublic: profileToggles.showArm,

        isFootSizePublic: profileToggles.showShoe,
        footSizePublic: profileToggles.showShoe,
      };

      await axios.patch(`${API_BASE_URL}/members/me/info`, requestBody, { 
        headers: { Authorization: `Bearer ${userToken}` } 
      });
      
      setProfileData((prev: any) => ({ ...prev, profileImageUrl: finalImageUrl }));

      closeProfileModal(() => {
        fetchMyInfo();
        setTimeout(() => showResultModal('성공', '정보가 저장되었습니다.', 'success'), 500);
      });
    } catch (e: any) {
      pendingImageAsset.current = null;
      
      if (!e.response) {
        closeProfileModal(() => setTimeout(() => showResultModal('네트워크 오류', '서버와 통신할 수 없습니다.', 'error'), 500));
        return;
      }

      const errorMessage = e.response.data.message || '저장에 실패했습니다.';
      closeProfileModal(() => setTimeout(() => showResultModal('저장 실패', `에러코드: ${e.response.status}\n${errorMessage}`, 'error'), 500));
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !newPasswordConfirm) return setPwError('모든 항목을 입력해주세요.');
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{6,}$/.test(newPassword)) return setPwError('새 비밀번호는 영문, 숫자, 특수문자를 포함해 6자 이상이어야 합니다.');
    if (newPassword !== newPasswordConfirm) return setPwError('새 비밀번호가 일치하지 않습니다.');

    setIsChangingPw(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      await axios.patch(`${API_BASE_URL}/auth/password`, { oldPassword, newPassword }, { headers: { Authorization: `Bearer ${userToken}` } });
      
      setChangePwModalVisible(false);
      setOldPassword(''); setNewPassword(''); setNewPasswordConfirm(''); setPwError('');
      setTimeout(() => showResultModal('성공', '비밀번호가 성공적으로 변경되었습니다.', 'success'), Platform.OS === 'ios' ? 400 : 100);
    } catch (error: any) {
      setPwError(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsChangingPw(false);
    }
  };

  // 로그아웃 (기기 토큰 파기 + FCM 토큰 서버 삭제)
  const executeLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      // FCM 토큰을 서버에서 삭제 (로그아웃 후 알림 수신 차단)
      try {
        const fcmToken = await messaging().getToken();
        if (token && fcmToken) {
          await axios.delete(`${API_BASE_URL}/members/me/fcm-token`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { token: fcmToken },
            timeout: 3000,
          });
        }
      } catch (fcmError) {
        // FCM 토큰 삭제 실패해도 로그아웃은 계속 진행
        console.log('FCM 토큰 삭제 실패 (무시):', fcmError);
      }

      if (token && refreshToken) {
        await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken }, { headers: { Authorization: `Bearer ${token}` }, timeout: 3000 });
      }
    } catch (e) {} finally {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
      setLogoutModalVisible(false);
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }), Platform.OS === 'ios' ? 400 : 100);
    }
  };

  // 회원 탈퇴
  const executeDeleteAccount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_BASE_URL}/members/me`, { headers: { Authorization: `Bearer ${token}` } });
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
      setDeleteModalVisible(false);
      setTimeout(() => {
        showResultModal('성공', '회원탈퇴가 완료되었습니다.', 'success');
        setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }), 1500);
      }, Platform.OS === 'ios' ? 400 : 100);
    } catch (e) {
      setDeleteModalVisible(false);
      setTimeout(() => showResultModal('오류', '탈퇴 실패', 'error'), Platform.OS === 'ios' ? 400 : 100);
    }
  };

  const openProfileModal = () => {
    pendingImageAsset.current = null;
    originalImageUrl.current = profileData.profileImageUrl;
    setProfileModalVisible(true);
    currentProfileSnap.current = FULL_SCREEN;
    profileHeightAnim.setValue(0);
    Animated.timing(profileHeightAnim, { toValue: FULL_SCREEN, duration: 300, useNativeDriver: false }).start();
  };

  const closeProfileModal = (onClosed?: () => void) => {
    if (pendingImageAsset.current) {
      pendingImageAsset.current = null;
      setProfileData((prev: any) => ({ ...prev, profileImageUrl: originalImageUrl.current }));
    }
    Animated.timing(profileHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setProfileModalVisible(false);
      if (onClosed) setTimeout(onClosed, Platform.OS === 'ios' ? 400 : 100);
    });
  };

  const openPauseModal = () => { setPauseModalVisible(true); Animated.timing(pauseSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closePauseModal = () => Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setPauseModalVisible(false));
  const closeContactModal = () => Animated.timing(contactSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setContactModalVisible(false));
  
  const handleInquireClick = () => {
    Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setPauseModalVisible(false);
      setTimeout(() => {
        setContactModalVisible(true);
        Animated.timing(contactSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, Platform.OS === 'ios' ? 400 : 100);
    });
  };

  const hasMembership = memInfo.hasPeriod || memInfo.hasCount;
  const memSummaryText = (() => {
    if (!hasMembership && !memInfo.hasFuture) return '구매 필요';
    if (!hasMembership && memInfo.hasFuture) return '시작 예정';
    const parts = [];
    if (memInfo.hasPeriod) parts.push(`회원권 (D-${memInfo.remainingDays})`);
    if (memInfo.hasCount) parts.push(`일일권 (${memInfo.remainingCount}회 남음)`);
    return parts.join(' / ');
  })();

  return {
    loading, refreshing, onRefresh, isAdmin, calcAgeFromBirth,
    memInfo, hasMembership, memSummaryText, isMembershipExpanded, setIsMembershipExpanded,
    profileData, setProfileData, profileToggles, setProfileToggles,
    notiState, handleNotiToggle,
    resultModalVisible, setResultModalVisible, resultModalConfig,
    isProfileModalVisible, openProfileModal, closeProfileModal, profileHeightAnim, profilePanResponder,
    isImageUploading, handleSelectImage, handleSaveProfile,
    isChangePwModalVisible, setChangePwModalVisible, oldPassword, setOldPassword, newPassword, setNewPassword, newPasswordConfirm, setNewPasswordConfirm, pwError, setPwError, isChangingPw, handleChangePassword,
    isPauseModalVisible, openPauseModal, closePauseModal, handleInquireClick, pauseSlideAnim,
    isContactModalVisible, closeContactModal, contactSlideAnim,
    isLogoutModalVisible, setLogoutModalVisible, executeLogout,
    isDeleteModalVisible, setDeleteModalVisible, executeDeleteAccount,
    isAdminModalVisible, setAdminModalVisible
  };
};