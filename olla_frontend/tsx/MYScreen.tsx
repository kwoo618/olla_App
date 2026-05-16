import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Switch, Modal, Animated, TextInput, ActivityIndicator, Linking, RefreshControl,
  Platform, Dimensions, PanResponder, TouchableWithoutFeedback, KeyboardAvoidingView
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_BASE_URL } from '../src/constants/Config';

// ✅ 오늘 날짜(자정 기준) 반환
const getTodayDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ✅ 시작일이 오늘 이전이거나 오늘인 경우에만 활성화된 이용권으로 판단
const isStarted = (startDate: string): boolean => {
  if (!startDate) return true;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return start <= getTodayDate();
};

const resolveMembershipType = (typeStr: string, startDate: string, endDate: string, remainingCount: number | null): string => {
  const upper = typeStr?.toUpperCase() || '';
  if (upper === 'COUNT' || upper.includes('횟수')) return '일일권';
  if (upper === 'PERIOD' || upper.includes('기간') || upper.includes('MONTH')) {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return totalDays <= 1 ? '일일권' : '회원권';
    }
    return '회원권';
  }
  return remainingCount !== null ? '일일권' : endDate ? '회원권' : '-';
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

type NotiState = {
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

const MYScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [isMembershipExpanded, setIsMembershipExpanded] = useState(false);
  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isAdminModalVisible, setAdminModalVisible] = useState(false);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const pauseSlideAnim = useRef(new Animated.Value(800)).current;
  const contactSlideAnim = useRef(new Animated.Value(800)).current;

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN = SCREEN_HEIGHT * 0.65;
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95;
  const THRESHOLD = (HALF_SCREEN + FULL_SCREEN) / 2;
  const CLOSE_THRESHOLD = HALF_SCREEN * 0.7;

  const profileHeightAnim = useRef(new Animated.Value(0)).current;
  const currentProfileSnap = useRef(FULL_SCREEN);

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

  const [isAdmin, setIsAdmin] = useState(false);

  const [memInfo, setMemInfo] = useState({
    type: '구매 필요',
    period: '-',
    status: '비회원',
    remainingDays: -1,
    remainingCount: -1,
    isCountType: false,
    hasPeriod: false,
    hasCount: false,
    hasFuture: false, // ✅ 미래 시작 예정 이용권 여부
    startDate: '',
    endDate: '',
  });

  const [profileData, setProfileData] = useState<any>({
    name: '', phone: '', gender: '', birthDate: '', height: '', weight: '', arm: '', shoe: '', profileImageUrl: ''
  });
  const [profileToggles, setProfileToggles] = useState<any>({ showPhone: true, showAge: true, showHeight: true, showWeight: true, showArm: true, showShoe: true });

  const [notiState, setNotiState] = useState<NotiState>(DEFAULT_NOTI_STATE);
  const notiLoadedRef = useRef(false);

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  const fetchNotiSettings = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      const headers = { Authorization: `Bearer ${userToken}` };
      const notiRes = await axios.get(`${API_BASE_URL}/members/me/notifications/settings`, { headers });
      const nData = notiRes.data?.data?.data || notiRes.data?.data;
      if (nData) {
        setNotiState({
          isGlobalNotificationOn: nData.isGlobalNotificationOn ?? true,
          isMembershipNotificationOn: nData.isMembershipNotificationOn ?? true,
          isActivityNotificationOn: nData.isActivityNotificationOn ?? true,
          isCrewNotificationOn: nData.isCrewNotificationOn ?? true,
          isNoticeNotificationOn: nData.isNoticeNotificationOn ?? true,
        });
        notiLoadedRef.current = true;
      }
    } catch (e) {
      console.log('알림 설정 로드 실패');
    }
  };

  const fetchMyInfo = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) { navigation.replace('Login'); return; }
      const headers = { Authorization: `Bearer ${userToken}` };

      const userRes = await axios.get(`${API_BASE_URL}/members/me`, { headers });
      const data = userRes.data?.data?.data || userRes.data?.data;

      if (data) {
        setIsAdmin(String(data.role || '').toUpperCase().includes('ADMIN') || String(data.memberRole || '').toUpperCase().includes('ADMIN'));

        const detailData = data.detail || data.memberDetail || data;
        const privacyData = data.privacy || data.memberPrivacy || data;

        setProfileData({
          name: data.name || '',
          phone: data.phone || '',
          gender: data.gender === 'MALE' ? '남' : data.gender === 'FEMALE' ? '여' : (data.gender || ''),
          birthDate: data.birthDate || '',
          height: detailData.height && detailData.height !== 0 ? detailData.height.toString() : '',
          weight: detailData.weight && detailData.weight !== 0 ? detailData.weight.toString() : '',
          arm: detailData.armSpan && detailData.armSpan !== 0 ? detailData.armSpan.toString() : '',
          shoe: data.footSize && data.footSize !== 0 ? data.footSize.toString() : '',
          profileImageUrl: data.profileImageUrl || ''
        });

        const getBool = (obj: any, ...keys: string[]) => {
          if (!obj) return true;
          for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) return obj[key];
          }
          return true;
        };

        setProfileToggles({
          showPhone: getBool(privacyData, 'isPublicPhone', 'isPhonePublic', 'phonePublic', 'publicPhone'),
          showAge: true,
          showHeight: getBool(privacyData, 'isHeightPublic', 'heightPublic', 'isPublicHeight'),
          showWeight: getBool(privacyData, 'isWeightPublic', 'weightPublic', 'isPublicWeight'),
          showArm: getBool(privacyData, 'isArmSpanPublic', 'armSpanPublic', 'isPublicArmSpan'),
          showShoe: getBool(privacyData, 'isFootSizePublic', 'footSizePublic', 'isPublicFootSize'),
        });
      }

      const memRes = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });
      const memData = memRes.data?.data?.data;

      const dataList: any[] = Array.isArray(memData)
        ? memData
        : memData && typeof memData === 'object' && !Array.isArray(memData)
          ? [memData]
          : [];

      if (dataList.length > 0) {
        // ✅ ACTIVE 상태 + 시작일이 오늘 이전인 것만 실제 활성화로 처리
        const activeList = dataList.filter((m: any) =>
          String(m.status || m.membershipStatus || '').toUpperCase() === 'ACTIVE' &&
          isStarted(m.startDate)
        );

        // ✅ 미래 시작 예정 이용권 (ACTIVE지만 아직 시작 안 됨)
        const futureList = dataList.filter((m: any) =>
          String(m.status || m.membershipStatus || '').toUpperCase() === 'ACTIVE' &&
          !isStarted(m.startDate)
        );

        const periodList = activeList.filter((m: any) =>
          String(m.membershipType).toUpperCase() === 'PERIOD'
        );
        const countList = activeList.filter((m: any) =>
          String(m.membershipType).toUpperCase() === 'COUNT'
        );

        // 회원권 잔여일 합산 (오늘 기준 남은 일수)
        let totalRemainingDays = 0;
        let earliestStart = '';
        let latestEnd = '';

        periodList.forEach((m: any) => {
          if (m.endDate) {
            const end = new Date(m.endDate);
            end.setHours(0, 0, 0, 0);
            const todayDate = getTodayDate();
            const diff = Math.round((end.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
            totalRemainingDays += diff > 0 ? diff : 0;

            if (!earliestStart || m.startDate < earliestStart) earliestStart = m.startDate;
            if (!latestEnd || m.endDate > latestEnd) latestEnd = m.endDate;
          }
        });

        const totalRemainingCount = countList.reduce(
          (sum: number, m: any) => sum + (m.remainingCount ?? 0), 0
        );

        const hasPeriod = periodList.length > 0 && totalRemainingDays > 0;
        const hasCount = countList.length > 0 && totalRemainingCount > 0;
        const hasFuture = futureList.length > 0;

        let displayType = '구매 필요';
        let periodText = '';
        let countText = '';

        if (hasPeriod) {
          displayType = '회원권';
          periodText = `회원권 D-${totalRemainingDays} (${earliestStart} ~ ${latestEnd})`;
        }
        if (hasCount) {
          displayType = hasPeriod ? '회원권 / 일일권' : '일일권';
          countText = `일일권 잔여 ${totalRemainingCount}회`;
        }

        let periodDisplay = '';
        if (hasPeriod && hasCount) {
          periodDisplay = `${periodText}\n${countText}`;
        } else if (hasPeriod) {
          periodDisplay = `${earliestStart} ~ ${latestEnd}`;
        } else if (hasCount) {
          periodDisplay = `잔여 ${totalRemainingCount}회`;
        } else if (hasFuture) {
          // ✅ 현재 활성화된 이용권은 없지만 미래 시작 예정이 있을 때
          const nextStart = futureList[0]?.startDate || '';
          periodDisplay = `${nextStart} 시작 예정`;
        } else {
          periodDisplay = '-';
        }

        // ✅ 상태 텍스트: 활성화된 것 없고 미래 예정만 있으면 "시작 예정"
        let statusText = '비회원';
        if (hasPeriod || hasCount) statusText = '이용중';
        else if (hasFuture) statusText = '시작 예정';

        setMemInfo({
          type: displayType !== '구매 필요' ? displayType : (hasFuture ? '시작 예정' : '구매 필요'),
          period: periodDisplay,
          status: statusText,
          remainingDays: totalRemainingDays,
          remainingCount: totalRemainingCount,
          isCountType: !hasPeriod && hasCount,
          hasPeriod,
          hasCount,
          hasFuture,
          startDate: earliestStart,
          endDate: latestEnd,
        });
      } else {
        setMemInfo({
          type: '구매 필요',
          period: '-',
          status: '비회원',
          remainingDays: -1,
          remainingCount: -1,
          isCountType: false,
          hasPeriod: false,
          hasCount: false,
          hasFuture: false,
          startDate: '',
          endDate: '',
        });
      }
    } catch (error) {
      console.log('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchMyInfo();
      if (!notiLoadedRef.current) {
        fetchNotiSettings();
      }
    }
  }, [isFocused]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyInfo();
    await fetchNotiSettings();
    setRefreshing(false);
  }, []);

  const handleNotiToggle = async (field: keyof NotiState) => {
    const currentValue = notiState[field];
    const newValue = !currentValue;

    const optimisticState = { ...notiState, [field]: newValue };
    setNotiState(optimisticState);

    const requestBody: NotiState = {
      isGlobalNotificationOn: optimisticState.isGlobalNotificationOn,
      isMembershipNotificationOn: optimisticState.isMembershipNotificationOn,
      isActivityNotificationOn: optimisticState.isActivityNotificationOn,
      isCrewNotificationOn: optimisticState.isCrewNotificationOn,
      isNoticeNotificationOn: optimisticState.isNoticeNotificationOn,
    };

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const res = await axios.patch(`${API_BASE_URL}/members/me/notifications/settings`, requestBody, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const nData = res.data?.data?.data || res.data?.data;
      if (nData) {
        setNotiState({
          isGlobalNotificationOn: nData.isGlobalNotificationOn ?? optimisticState.isGlobalNotificationOn,
          isMembershipNotificationOn: nData.isMembershipNotificationOn ?? optimisticState.isMembershipNotificationOn,
          isActivityNotificationOn: nData.isActivityNotificationOn ?? optimisticState.isActivityNotificationOn,
          isCrewNotificationOn: nData.isCrewNotificationOn ?? optimisticState.isCrewNotificationOn,
          isNoticeNotificationOn: nData.isNoticeNotificationOn ?? optimisticState.isNoticeNotificationOn,
        });
      }
    } catch (e) {
      setNotiState(prev => ({ ...prev, [field]: currentValue }));
      showResultModal('오류', '알림 설정 변경에 실패했습니다.', 'error');
    }
  };

  const handleSelectImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response) => {
      if (response.didCancel || response.errorCode) return;
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        const fileType = asset.type || 'image/jpeg';
        const fileName = asset.fileName || `profile_${Date.now()}.jpg`;

        setProfileData((prev: any) => ({ ...prev, profileImageUrl: asset.uri }));

        try {
          setIsImageUploading(true);
          const userToken = await AsyncStorage.getItem('userToken');

          const formData = new FormData();
          formData.append('image', {
            uri: Platform.OS === 'ios' ? asset.uri?.replace('file://', '') : asset.uri,
            type: fileType,
            name: fileName,
          } as any);

          const uploadRes = await axios.post(
            `${API_BASE_URL}/members/me/profile-image`,
            formData,
            {
              headers: { Authorization: `Bearer ${userToken}` },
              timeout: 30000,
            }
          );

          const uploadedUrl = uploadRes.data?.data?.data ||
            uploadRes.data?.data ||
            uploadRes.data?.profileImageUrl;

          if (uploadedUrl && typeof uploadedUrl === 'string') {
            setProfileData((prev: any) => ({ ...prev, profileImageUrl: uploadedUrl }));
            showResultModal('성공', '프로필 이미지가 변경되었습니다.', 'success');
          } else {
            throw new Error('URL 반환 없음');
          }
        } catch (e: any) {
          console.error('이미지 업로드 에러:', e.response?.data || e.message);
          fetchMyInfo();
          showResultModal('오류', '이미지 업로드에 실패했습니다.', 'error');
        } finally {
          setIsImageUploading(false);
        }
      }
    });
  };

  const openProfileModal = () => {
    setProfileModalVisible(true);
    currentProfileSnap.current = FULL_SCREEN;
    profileHeightAnim.setValue(0);
    Animated.timing(profileHeightAnim, { toValue: FULL_SCREEN, duration: 300, useNativeDriver: false }).start();
  };

  const closeProfileModal = (onClosed?: () => void) => {
    Animated.timing(profileHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setProfileModalVisible(false);
      if (onClosed) {
        setTimeout(onClosed, Platform.OS === 'ios' ? 400 : 100);
      }
    });
  };

  const openPauseModal = () => {
    setPauseModalVisible(true);
    Animated.timing(pauseSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closePauseModal = () => {
    Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setPauseModalVisible(false));
  };

  const handleInquireClick = () => {
    Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setPauseModalVisible(false);
      setTimeout(() => {
        setContactModalVisible(true);
        Animated.timing(contactSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, Platform.OS === 'ios' ? 400 : 100);
    });
  };

  const closeContactModal = () => {
    Animated.timing(contactSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setContactModalVisible(false));
  };

  const executeLogout = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('userToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (accessToken && refreshToken) {
        await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken }, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 3000 });
      }
    } catch (e) {
      console.log('로그아웃 통신 실패');
    } finally {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
      setLogoutModalVisible(false);
      notiLoadedRef.current = false;
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }, Platform.OS === 'ios' ? 400 : 100);
    }
  };

  const executeDeleteAccount = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_BASE_URL}/members/me`, { headers: { Authorization: `Bearer ${userToken}` } });
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
      setDeleteModalVisible(false);
      notiLoadedRef.current = false;
      setTimeout(() => {
        showResultModal('성공', '회원탈퇴가 완료되었습니다.', 'success');
        setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }), 1500);
      }, Platform.OS === 'ios' ? 400 : 100);
    } catch (e) {
      setDeleteModalVisible(false);
      setTimeout(() => showResultModal('오류', '탈퇴 실패', 'error'), Platform.OS === 'ios' ? 400 : 100);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');

      const requestBody = {
        name: profileData.name,
        phone: profileData.phone,
        gender: profileData.gender,
        birthDate: profileData.birthDate,
        height: profileData.height ? parseFloat(profileData.height) : null,
        weight: profileData.weight ? parseFloat(profileData.weight) : null,
        armSpan: profileData.arm ? parseFloat(profileData.arm) : null,
        footSize: profileData.shoe ? parseFloat(profileData.shoe) : null,
        isPublicPhone: profileToggles.showPhone,
        publicPhone: profileToggles.showPhone,
        isPhonePublic: profileToggles.showPhone,
        isEmailPublic: true,
        emailPublic: true,
        isPublicEmail: true,
        isHeightPublic: profileToggles.showHeight,
        heightPublic: profileToggles.showHeight,
        isPublicHeight: profileToggles.showHeight,
        isWeightPublic: profileToggles.showWeight,
        weightPublic: profileToggles.showWeight,
        isPublicWeight: profileToggles.showWeight,
        isArmSpanPublic: profileToggles.showArm,
        armSpanPublic: profileToggles.showArm,
        isPublicArmSpan: profileToggles.showArm,
        isFootSizePublic: profileToggles.showShoe,
        footSizePublic: profileToggles.showShoe,
        isPublicFootSize: profileToggles.showShoe,
        age: parseInt(calcAgeFromBirth(profileData.birthDate)) || 0,
      };

      await axios.patch(`${API_BASE_URL}/members/me/info`, requestBody, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      closeProfileModal(() => {
        fetchMyInfo();
        setTimeout(() => {
          showResultModal('성공', '정보가 저장되었습니다.', 'success');
        }, Platform.OS === 'ios' ? 500 : 200);
      });

    } catch (e) {
      closeProfileModal(() => {
        setTimeout(() => {
          showResultModal('오류', '저장 실패', 'error');
        }, Platform.OS === 'ios' ? 500 : 200);
      });
    }
  };

  const renderEditField = (title: string, fieldKey: string, unit: string) => {
    const toggleKey = `show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
    return (
      <View style={styles.editFieldWrapper}>
        <View style={styles.editFieldHeader}>
          <Text style={styles.editFieldTitle}>{title}</Text>
          <View style={styles.toggleWrapper}>
            <Text style={styles.toggleLabel}>{profileToggles[toggleKey] ? '공개' : '비공개'}</Text>
            <Switch
              trackColor={{ false: '#333333', true: '#A1BE44' }}
              thumbColor={'#ffffff'}
              onValueChange={() => setProfileToggles({ ...profileToggles, [toggleKey]: !profileToggles[toggleKey] })}
              value={profileToggles[toggleKey]}
            />
          </View>
        </View>
        <View style={styles.editInputBox}>
          <TextInput
            style={styles.editInput}
            value={profileData[fieldKey]}
            onChangeText={(txt) => setProfileData({ ...profileData, [fieldKey]: txt })}
            placeholderTextColor="#666666"
            keyboardType={unit ? 'numeric' : 'default'}
          />
          {unit ? <Text style={styles.editUnit}>{unit}</Text> : null}
        </View>
      </View>
    );
  };

  const hasMembership = memInfo.hasPeriod || memInfo.hasCount;

  const memSummaryText = (() => {
    if (!hasMembership && !memInfo.hasFuture) return '구매 필요';
    if (!hasMembership && memInfo.hasFuture) return '시작 예정';
    const parts: string[] = [];
    if (memInfo.hasPeriod) parts.push(`회원권 (D-${memInfo.remainingDays})`);
    if (memInfo.hasCount) parts.push(`일일권 (${memInfo.remainingCount}회 남음)`);
    return parts.join(' / ');
  })();

  if (loading) return <View style={[styles.background, { justifyContent: 'center' }]}><ActivityIndicator size="large" color="#A1BE44" /></View>;

  return (
    <View style={styles.background}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}
      >
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={openProfileModal}>
          <View style={styles.profileLeft}>
            <View style={styles.profileImagePlaceholder}>
              <Image
                source={profileData.profileImageUrl ? { uri: profileData.profileImageUrl } : require('../assets/profile.png')}
                style={styles.profileImage}
              />
            </View>
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>{profileData.name || '사용자'}</Text>
              <Text style={styles.profileEmail}>{profileData.phone || '번호 없음'}</Text>
            </View>
          </View>
          <Text style={styles.chevronIcon}>＞</Text>
        </TouchableOpacity>

        {/* 멤버십 */}
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.cardHeader, { marginBottom: isMembershipExpanded ? 20 : 0 }]}
            onPress={() => setIsMembershipExpanded(!isMembershipExpanded)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={require('../assets/membership.png')} style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>멤버십 정보</Text>
            </View>
            <Text style={styles.chevronIcon}>{isMembershipExpanded ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {isMembershipExpanded && (
            <View style={styles.memInfoContainer}>
              <View style={styles.memInfoRow}>
                <Text style={styles.memInfoLabel}>이용권</Text>
                <Text style={styles.memInfoValue}>{memSummaryText}</Text>
              </View>

              {memInfo.hasPeriod && (
                <View style={styles.memInfoRow}>
                  <Text style={styles.memInfoLabel}>회원권 기간</Text>
                  <Text style={styles.memInfoValue}>{memInfo.startDate} ~ {memInfo.endDate}</Text>
                </View>
              )}

              {memInfo.hasCount && (
                <View style={styles.memInfoRow}>
                  <Text style={styles.memInfoLabel}>일일권 잔여</Text>
                  <Text style={styles.memInfoValue}>{memInfo.remainingCount}회</Text>
                </View>
              )}

              {/* ✅ 미래 시작 예정 안내 */}
              {memInfo.hasFuture && !hasMembership && (
                <View style={styles.memInfoRow}>
                  <Text style={styles.memInfoLabel}>시작 예정</Text>
                  <Text style={[styles.memInfoValue, { color: '#A1BE44' }]}>{memInfo.period}</Text>
                </View>
              )}

              <View style={styles.memInfoRow}>
                <Text style={styles.memInfoLabel}>상태</Text>
                <View style={[
                  styles.activeBadge,
                  !hasMembership && memInfo.hasFuture
                    ? { backgroundColor: '#3A3A5C' }
                    : !hasMembership
                      ? { backgroundColor: '#444444' }
                      : {}
                ]}>
                  <Text style={[
                    styles.activeBadgeText,
                    !hasMembership && memInfo.hasFuture ? { color: '#A1BE44' } : {}
                  ]}>{memInfo.status}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.pauseButton} onPress={openPauseModal}>
                <Text style={styles.pauseButtonText}>문의하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 내 활동 */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { justifyContent: 'flex-start', marginBottom: 20 }]}>
            <Image source={require('../assets/FilmScript.png')} style={styles.cardHeaderIcon} />
            <Text style={styles.cardHeaderTitle}>내 활동</Text>
          </View>
          <TouchableOpacity style={styles.activityRow} onPress={() => navigation.navigate('Community', { filter: 'MY_WRITTEN' })}>
            <Text style={styles.activityText}>내가 쓴 게시글</Text>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.activityRow} onPress={() => navigation.navigate('Community', { filter: 'MY_APPLIED' })}>
            <Text style={styles.activityText}>내가 참여한 게시글</Text>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>
        </View>

        {/* 알림 설정 */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { justifyContent: 'flex-start', marginBottom: 20 }]}>
            <Image source={require('../assets/Vector.png')} style={styles.cardHeaderIcon} />
            <Text style={styles.cardHeaderTitle}>알림설정</Text>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>푸시 알림</Text>
              <Text style={styles.settingSub}>모든 알림 수신</Text>
            </View>
            <Switch
              trackColor={{ false: '#333333', true: '#A1BE44' }}
              thumbColor={'#ffffff'}
              onValueChange={() => handleNotiToggle('isGlobalNotificationOn')}
              value={notiState.isGlobalNotificationOn}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>활동 알림</Text>
              <Text style={styles.settingSub}>활동 관련 알림</Text>
            </View>
            <Switch
              trackColor={{ false: '#333333', true: '#A1BE44' }}
              thumbColor={'#ffffff'}
              onValueChange={() => handleNotiToggle('isActivityNotificationOn')}
              value={notiState.isActivityNotificationOn}
            />
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity style={styles.adminCard} activeOpacity={0.8} onPress={() => setAdminModalVisible(true)}>
            <Image source={require('../assets/SquaresFour.png')} style={styles.adminIcon} />
            <Text style={styles.adminText}>관리자 모드 실행</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutCard} activeOpacity={0.8} onPress={() => setLogoutModalVisible(true)}>
          <Image source={require('../assets/EXIT.png')} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setDeleteModalVisible(true)}>
          <Text style={styles.deleteAccountText}>회원탈퇴</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 프로필 수정 모달 */}
      <Modal visible={isProfileModalVisible} transparent animationType="fade" onRequestClose={() => closeProfileModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => closeProfileModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }}
            pointerEvents="box-none"
          >
            <Animated.View style={[styles.bottomSheet, { height: profileHeightAnim }]}>
              <View {...profilePanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>프로필 수정</Text>
                  <TouchableOpacity onPress={() => closeProfileModal()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horizontalDivider} />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.profileEditContainer}>
                  <TouchableOpacity
                    style={styles.profileImageEditWrapper}
                    activeOpacity={0.7}
                    onPress={handleSelectImage}
                    disabled={isImageUploading}
                  >
                    <Image
                      source={profileData.profileImageUrl
                        ? { uri: profileData.profileImageUrl }
                        : require('../assets/profile.png')}
                      style={styles.profileImageLarge}
                    />
                    <View style={styles.profileImageEditOverlay}>
                      {isImageUploading
                        ? <ActivityIndicator size="small" color="#ffffff" />
                        : <Text style={styles.profileImageEditText}>수정</Text>
                      }
                    </View>
                  </TouchableOpacity>

                  <View style={styles.editFieldWrapper}>
                    <View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>이름</Text></View>
                    <View style={styles.editInputBox}>
                      <TextInput
                        style={styles.editInput}
                        value={profileData.name}
                        onChangeText={(txt) => setProfileData({ ...profileData, name: txt })}
                        placeholderTextColor="#666666"
                      />
                    </View>
                  </View>

                  <View style={styles.editFieldWrapper}>
                    <View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>성별</Text></View>
                    <View style={styles.genderRow}>
                      <TouchableOpacity
                        style={[styles.genderBtn, profileData.gender === '남' && styles.genderBtnActive]}
                        onPress={() => setProfileData({ ...profileData, gender: '남' })}
                      >
                        <Text style={[styles.genderBtnText, profileData.gender === '남' && styles.genderBtnTextActive]}>남자</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderBtn, profileData.gender === '여' && styles.genderBtnActive]}
                        onPress={() => setProfileData({ ...profileData, gender: '여' })}
                      >
                        <Text style={[styles.genderBtnText, profileData.gender === '여' && styles.genderBtnTextActive]}>여자</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.editFieldWrapper}>
                    <View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>생년월일</Text></View>
                    <View style={styles.editInputBox}>
                      <TextInput
                        style={styles.editInput}
                        value={profileData.birthDate}
                        onChangeText={(txt) => setProfileData({ ...profileData, birthDate: txt })}
                        placeholder="YYYY-MM-DD"
                        keyboardType="numeric"
                        maxLength={10}
                      />
                    </View>
                  </View>

                  <View style={styles.editFieldWrapper}>
                    <View style={styles.editFieldHeader}>
                      <Text style={styles.editFieldTitle}>나이</Text>
                      <View style={styles.toggleWrapper}>
                        <Text style={styles.toggleLabel}>{profileToggles.showAge ? '공개' : '비공개'}</Text>
                        <Switch
                          trackColor={{ false: '#333333', true: '#A1BE44' }}
                          thumbColor={'#ffffff'}
                          onValueChange={() => setProfileToggles({ ...profileToggles, showAge: !profileToggles.showAge })}
                          value={profileToggles.showAge}
                        />
                      </View>
                    </View>
                    <View style={styles.editInputBox}>
                      <TextInput
                        style={[styles.editInput, { color: '#999999' }]}
                        value={calcAgeFromBirth(profileData.birthDate)}
                        editable={false}
                      />
                      <Text style={styles.editUnit}>세</Text>
                    </View>
                  </View>

                  {renderEditField('전화번호', 'phone', '')}
                  {renderEditField('키', 'height', 'cm')}
                  {renderEditField('몸무게', 'weight', 'kg')}
                  {renderEditField('팔길이', 'arm', 'cm')}
                  {renderEditField('암벽화 사이즈', 'shoe', 'mm')}

                  <TouchableOpacity style={styles.saveProfileButton} onPress={handleSaveProfile}>
                    <Text style={styles.saveProfileButtonText}>저장하기</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 관리자 모달 */}
      <Modal visible={isAdminModalVisible} transparent animationType="fade" onRequestClose={() => setAdminModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={styles.centerModalText}>관리자 모드로 들어가시겠습니까?</Text>
            <View style={styles.centerBtnRow}>
              <TouchableOpacity style={styles.centerBtnYes} onPress={() => {
                setAdminModalVisible(false);
                setTimeout(() => navigation.navigate('ManagerDashboard'), Platform.OS === 'ios' ? 400 : 100);
              }}>
                <Text style={styles.centerBtnYesText}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.centerBtnNo} onPress={() => setAdminModalVisible(false)}>
                <Text style={styles.centerBtnNoText}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 로그아웃 모달 */}
      <Modal visible={isLogoutModalVisible} transparent animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={styles.centerModalText}>로그아웃 하시겠습니까?</Text>
            <View style={styles.centerBtnRow}>
              <TouchableOpacity style={styles.centerBtnYes} onPress={executeLogout}>
                <Text style={styles.centerBtnYesText}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.centerBtnNo} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.centerBtnNoText}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 회원탈퇴 모달 */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={[styles.centerModalText, { textAlign: 'center' }]}>
              정말로 탈퇴하시겠습니까?{'\n'}모든 데이터가 삭제됩니다.
            </Text>
            <View style={styles.centerBtnRow}>
              <TouchableOpacity style={[styles.centerBtnYes, { backgroundColor: '#FF4D4D' }]} onPress={executeDeleteAccount}>
                <Text style={styles.centerBtnYesText}>탈퇴하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.centerBtnNo} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.centerBtnNoText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 결과 모달 */}
      <Modal visible={resultModalVisible} transparent animationType="fade" onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: resultModalConfig.type === 'error' ? '#FF4D4D' : '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 문의하기 모달 */}
      <Modal visible={isPauseModalVisible} transparent animationType="fade" onRequestClose={closePauseModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closePauseModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: pauseSlideAnim }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitleCenter}>문의하기</Text>
            <View style={styles.horizontalDivider} />
            <View style={styles.pauseInfoBox}>
              <Text style={styles.pauseInfoText}>프론트 데스크에 문의하시겠습니까?</Text>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={closePauseModal}>
                <Text style={styles.modalBtnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleInquireClick}>
                <Text style={styles.modalBtnSubmitText}>문의하기</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* 전화 문의 모달 */}
      <Modal visible={isContactModalVisible} transparent animationType="fade" onRequestClose={closeContactModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeContactModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: contactSlideAnim }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitleCenter}>프론트 데스크 문의</Text>
            <View style={styles.horizontalDivider} />
            <View style={styles.contactContentBox}>
              <Image source={require('../assets/PhoneCall.png')} style={styles.phoneIcon} />
              <Text style={styles.contactNumber}>053-851-3322</Text>
              <Text style={styles.contactTime}>평일 13:00~22:00 / 토 13:00~19:00 (일요일 휴무)</Text>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={closeContactModal}>
                <Text style={styles.modalBtnCancelText}>닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={() => Linking.openURL('tel:053-851-3322')}>
                <Text style={styles.modalBtnSubmitText}>전화하기</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  card: { backgroundColor: '#212121', borderRadius: 16, padding: 20, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderIcon: { width: 24, height: 24, tintColor: '#A1BE44', marginRight: 10, resizeMode: 'contain' },
  cardHeaderTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  profileCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 15 },
  profileLeft: { flexDirection: 'row', alignItems: 'center' },
  profileImagePlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#444444', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 15 },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  profileTextContainer: { flexDirection: 'column' },
  profileName: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  profileEmail: { color: '#999999', fontSize: 15 },
  chevronIcon: { color: '#999999', fontSize: 20, fontWeight: 'bold' },
  memInfoContainer: { marginBottom: 5 },
  memInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  memInfoLabel: { color: '#ffffff', fontSize: 17, fontWeight: '500' },
  memInfoValue: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'right', marginLeft: 10 },
  activeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: '#000000', fontSize: 15, fontWeight: 'bold' },
  pauseButton: { backgroundColor: '#2C2C2C', borderWidth: 1, borderColor: '#555555', borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  pauseButtonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  activityText: { color: '#ffffff', fontSize: 17, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#333333', marginVertical: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  settingTextContainer: { flex: 1, paddingRight: 10 },
  settingTitle: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  settingSub: { color: '#999999', fontSize: 14, lineHeight: 20 },
  adminCard: { flexDirection: 'row', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#A1BE44' },
  adminIcon: { width: 24, height: 24, tintColor: '#A1BE44', marginRight: 8, resizeMode: 'contain' },
  adminText: { color: '#A1BE44', fontSize: 18, fontWeight: 'bold' },
  logoutCard: { flexDirection: 'row', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  logoutIcon: { width: 24, height: 24, tintColor: '#FF4D4D', marginRight: 8, resizeMode: 'contain' },
  logoutText: { color: '#FF4D4D', fontSize: 18, fontWeight: 'bold' },
  deleteAccountBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 20 },
  deleteAccountText: { color: '#666666', fontSize: 16, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%', overflow: 'hidden' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' },
  sheetTitleCenter: { color: '#ffffff', fontSize: 23, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },
  profileEditContainer: { backgroundColor: '#262626', borderRadius: 16, padding: 20 },
  profileImageEditWrapper: { alignSelf: 'center', width: 90, height: 90, borderRadius: 45, backgroundColor: '#444444', marginBottom: 25, overflow: 'hidden' },
  profileImageLarge: { width: '100%', height: '100%' },
  profileImageEditOverlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, alignItems: 'center' },
  profileImageEditText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  editFieldWrapper: { marginBottom: 20 },
  editFieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editFieldTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  toggleWrapper: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { color: '#999999', fontSize: 14, marginRight: 6 },
  editInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000000', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 16 },
  editInput: { flex: 1, color: '#ffffff', fontSize: 18, padding: 0 },
  editUnit: { color: '#999999', fontSize: 18, marginLeft: 10 },
  saveProfileButton: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 15 },
  saveProfileButtonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genderBtn: { flex: 1, backgroundColor: '#000000', borderWidth: 1, borderColor: '#444444', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginHorizontal: 4 },
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#999999', fontSize: 18, fontWeight: 'bold' },
  genderBtnTextActive: { color: '#A1BE44' },
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  centerModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  centerModalText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25 },
  centerBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  centerBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  centerBtnYesText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  centerBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  centerBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  pauseInfoBox: { backgroundColor: '#2C2C2C', borderRadius: 12, padding: 18, marginBottom: 25 },
  pauseInfoText: { color: '#ffffff', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtnCancel: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555555', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginRight: 6 },
  modalBtnCancelText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalBtnSubmit: { flex: 1, backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginLeft: 6 },
  modalBtnSubmitText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  contactContentBox: { alignItems: 'center', marginBottom: 30 },
  phoneIcon: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 15 },
  contactNumber: { color: '#A1BE44', fontSize: 32, fontWeight: '900', marginBottom: 8 },
  contactTime: { color: '#999999', fontSize: 14, textAlign: 'center' },
});

export default MYScreen;