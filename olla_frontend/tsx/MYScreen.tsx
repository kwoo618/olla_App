import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Switch, Modal, Animated, TextInput, ActivityIndicator, Linking, RefreshControl
} from 'react-native';
import { API_BASE_URL } from '../src/constants/Config';

const resolveMembershipType = (
  typeStr: string,
  startDate: string,
  endDate: string,
  remainingCount: number | null
): string => {
  const upper = typeStr.toUpperCase();

  if (upper === 'COUNT' || upper.includes('횟수') || upper.includes('COUNT')) {
    return '일일권';
  }

  if (upper === 'PERIOD' || upper.includes('기간') || upper.includes('PERIOD') || upper.includes('MONTH')) {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return totalDays <= 1 ? '일일권' : '기간권';
    }
    return '기간권';
  }

  if (remainingCount !== null && remainingCount !== undefined) return '일일권';
  if (endDate) return '기간권';
  return '-';
};

const MYScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);

  // ─── 커스텀 알림 모달 상태 추가 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  const [memInfo, setMemInfo] = useState({
    type: '구매 필요',
    period: '-',
    status: '비회원',
    remainingDays: -1,
    remainingCount: -1,
    isCountType: false,
  });

  const [isAdmin, setIsAdmin] = useState(false);

  const [profileData, setProfileData] = useState<any>({
    name: '', phone: '', gender: '', birthDate: '', age: '', height: '', weight: '', arm: '', shoe: ''
  });

  const [profileToggles, setProfileToggles] = useState<any>({
    showName: true, showPhone: true, showAge: true, showHeight: true,
    showWeight: true, showArm: true, showShoe: true,
  });

  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [isActivityEnabled, setIsActivityEnabled] = useState(true);
  
  const fetchMyInfo = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        showResultModal('인증 오류', '로그인이 필요합니다.', 'error');
        setTimeout(() => navigation.replace('Login'), 1500);
        return;
      }

      const storedRole = await AsyncStorage.getItem('userRole');
      const headers = { Authorization: `Bearer ${userToken}` };

      // [GET] 내 정보 조회
      const userRes = await axios.get(`${API_BASE_URL}/members/me`, { headers });
      
      const data = userRes.data?.data?.data;

      if (!data) {
        showResultModal('오류', '내 정보를 불러오지 못했습니다. 다시 시도해주세요.', 'error');
        setLoading(false);
        return;
      }

      const checkStored = String(storedRole || '').toUpperCase();
      const checkDataRole = String(data.role || '').toUpperCase();
      const checkAuth = String(data.authority || '').toUpperCase();
      const checkMemRole = String(data.memberRole || '').toUpperCase();

      setIsAdmin(
        checkStored.includes('ADMIN') || 
        checkDataRole.includes('ADMIN') || 
        checkAuth.includes('ADMIN') || 
        checkMemRole.includes('ADMIN')
      );

      setProfileData({
        name: data.name || '',
        phone: data.phone || '',
        gender: data.gender === 'MALE' ? '남' : data.gender === 'FEMALE' ? '여' : (data.gender || ''),
        birthDate: data.birthDate || '',
        
        age: data.age?.toString() || '',
        height: data.height?.toString() || '',
        weight: data.weight?.toString() || '',
        arm: data.armSpan?.toString() || '',
        shoe: data.footSize?.toString() || '',
      });

      if (data.privacy) {
        setProfileToggles({
          showName: true,
          showPhone: data.privacy.phonePublic,
          showAge: true,
          showHeight: data.privacy.heightPublic,
          showWeight: data.privacy.weightPublic,
          showArm: data.privacy.armSpanPublic,
          showShoe: data.privacy.footSizePublic,
        });
      }

      // [GET] 오늘 출석 여부 확인
      let attendedToday = false;
      try {
        const today = new Date();
        const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const visitRes = await axios.get(`${API_BASE_URL}/visit/my-history?yearMonth=${yearMonth}`, { headers });
        
        let rawData = visitRes.data?.data?.data || visitRes.data?.data;
        if (rawData && !Array.isArray(rawData) && rawData.data) rawData = rawData.data;
        
        if (Array.isArray(rawData)) {
          const todayDate = today.getDate();
          const daysAttended = rawData
            .map((item: any) => {
              if (typeof item === 'string') {
                const parts = item.split('-');
                if (parts.length >= 3) return parseInt(parts[2], 10);
              } else if (Array.isArray(item) && item.length >= 3) {
                return parseInt(item[2], 10);
              }
              return -1;
            })
            .filter((day: number) => day > 0 && !isNaN(day));
          
          attendedToday = daysAttended.includes(todayDate);
        }
      } catch (error: any) {
        console.log('출석 확인 실패:', error.response?.data?.message || error.message);
      }

      // [GET] 회원권 정보 조회
      try {
        const memRes = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });
        const memData = memRes.data?.data?.data || memRes.data?.data;

        if (memData) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const rawType = String(memData.membershipType || '');
          const displayType = resolveMembershipType(
            rawType,
            memData.startDate || '',
            memData.endDate || '',
            memData.remainingCount ?? null
          );

          const isCountType = displayType === '일일권';

          let remainingDays = -1;
          if (memData.endDate) {
            const end = new Date(memData.endDate);
            end.setHours(0, 0, 0, 0);
            const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            remainingDays = diff >= 0 ? diff : 0;
          }

          const periodStr = isCountType
            ? `잔여 ${memData.remainingCount ?? 0}회`
            : memData.startDate && memData.endDate
              ? `${memData.startDate} ~ ${memData.endDate}`
              : '-';

          let currentStatus = memData.status === 'ACTIVE' ? '이용중' : memData.status === 'HOLDING' ? '정지중' : '구매필요';
          
          if (isCountType && currentStatus === '이용중') {
            currentStatus = attendedToday ? '이용중' : '미사용';
          }

          setMemInfo({
            type: displayType,
            period: periodStr,
            status: currentStatus,
            remainingDays,
            remainingCount: memData.remainingCount ?? -1,
            isCountType,
          });
        } else {
          setMemInfo({ type: '구매 필요', period: '-', status: '비회원', remainingDays: -1, remainingCount: -1, isCountType: false });
        }
      } catch (error: any) {
        console.log('이용권 정보 로드 실패:', error.response?.data?.message || error.message);
        setMemInfo({ type: '구매 필요', period: '-', status: '비회원', remainingDays: -1, remainingCount: -1, isCountType: false });
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '데이터를 불러오는데 실패했습니다.';
      console.error('데이터 로드 실패:', errorMessage);
      showResultModal('오류', errorMessage, 'error'); 
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyInfo();
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchMyInfo(); }, [isFocused]);

  const handleSaveProfile = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${userToken}` };

      const requestBody = {
        name: profileData.name,
        phone: profileData.phone,
        gender: profileData.gender === '남' ? 'MALE' : profileData.gender === '여' ? 'FEMALE' : profileData.gender,
        birthDate: profileData.birthDate,
        profileImageUrl: '',
        
        
        age: parseInt(profileData.age) || 0,
        height: parseFloat(profileData.height) || 0,
        weight: parseFloat(profileData.weight) || 0,
        armSpan: parseFloat(profileData.arm) || 0,
        footSize: parseFloat(profileData.shoe) || 0,
        

        isPublicPhone: profileToggles.showPhone,
        isHeightPublic: profileToggles.showHeight,
        isWeightPublic: profileToggles.showWeight,
        isArmSpanPublic: profileToggles.showArm,
        isFootSizePublic: profileToggles.showShoe
      };

      await axios.patch(`${API_BASE_URL}/members/me/info`, requestBody, { headers });
      fetchMyInfo();
      
      closeProfileModal();

      setTimeout(() => {
        showResultModal('성공', '정보가 저장되었습니다.', 'success');
      }, 500); 

    } catch (error: any) {
      closeProfileModal();
      
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '저장에 실패했습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, 500);
    }
  };

  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);

  const executeLogout = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('userToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (accessToken && refreshToken) {
        await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken }, {
          headers: { Authorization: `Bearer ${accessToken}` }, timeout: 3000
        });
      }
    } catch (error: any) {
      console.log('서버 로그아웃 실패:', error.response?.data?.message || error.message);
    } finally {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
      setLogoutModalVisible(false);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const executeDeleteAccount = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;

      await axios.delete(`${API_BASE_URL}/members/me`, { headers: { Authorization: `Bearer ${userToken}` } });
      
      setDeleteModalVisible(false);

      setTimeout(async () => {
        showResultModal('성공', '회원탈퇴가 완료되었습니다.', 'success');
        await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }, 1500);
      }, 500);

    } catch (error: any) {
      setDeleteModalVisible(false);
      
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '회원탈퇴에 실패했습니다.';
        console.log('회원탈퇴 실패:', errorMessage);
        showResultModal('오류', errorMessage, 'error');
      }, 500);
    }
  };

  const pauseSlideAnim = useRef(new Animated.Value(800)).current;
  const contactSlideAnim = useRef(new Animated.Value(800)).current;
  const profileSlideAnim = useRef(new Animated.Value(800)).current;

  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);

  const openPauseModal = () => {
    setPauseModalVisible(true);
    Animated.timing(pauseSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };
  const closePauseModal = () => {
    Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setPauseModalVisible(false));
  };

  const openProfileModal = () => {
    setProfileModalVisible(true);
    Animated.timing(profileSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };
  const closeProfileModal = () => {
    Animated.timing(profileSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setProfileModalVisible(false));
  };

  const handleInquireClick = () => {
    Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setPauseModalVisible(false);
      setTimeout(() => {
        setContactModalVisible(true);
        setTimeout(() => {
          Animated.timing(contactSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }, 50);
      }, 100);
    });
  };

  const closeContactModal = () => {
    Animated.timing(contactSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setContactModalVisible(false));
  };

  const handlePhoneCall = async () => {
    try {
      await Linking.openURL('tel:053-851-3322');
    } catch (err) {
      showResultModal('알림', '이 기기에서는 전화 연결을 지원하지 않습니다.\n(실제 폰에서 테스트해주세요)', 'info');
    }
    closeContactModal();
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
              thumbColor={profileToggles[toggleKey] ? '#ffffff' : '#f4f3f4'}
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

  const hasMembership = memInfo.isCountType
    ? memInfo.remainingCount > 0
    : memInfo.remainingDays >= 0;

  const memSummaryText = hasMembership
    ? memInfo.isCountType
      ? `${memInfo.type} (${memInfo.remainingCount}회 남음)`
      : `${memInfo.type} (D-${memInfo.remainingDays})`
    : '구매 필요';

  if (loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
      >
        {/* 상단 프로필 */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={openProfileModal}>
          <View style={styles.profileLeft}>
            <View style={styles.profileImagePlaceholder}>
              <Image source={require('../assets/profile.png')} style={styles.profileImage} />
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
          <View style={styles.cardHeader}>
            <Image source={require('../assets/membership.png')} style={styles.cardHeaderIcon} />
            <Text style={styles.cardHeaderTitle}>멤버십 정보</Text>
          </View>
          <View style={styles.memInfoContainer}>
            <View style={styles.memInfoRow}>
              <Text style={styles.memInfoLabel}>이용권</Text>
              <Text style={styles.memInfoValue}>{memSummaryText}</Text>
            </View>
            <View style={styles.memInfoRow}>
              <Text style={styles.memInfoLabel}>
                {memInfo.isCountType ? '잔여 횟수' : '기간'}
              </Text>
              <Text style={styles.memInfoValue}>{memInfo.period}</Text>
            </View>
            <View style={styles.memInfoRow}>
              <Text style={styles.memInfoLabel}>상태</Text>
              <View style={[styles.activeBadge, !hasMembership && { backgroundColor: '#444444' }]}>
                <Text style={[styles.activeBadgeText, !hasMembership && { color: '#999999' }]}>
                  {memInfo.status}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.pauseButton} onPress={openPauseModal}>
            <Text style={styles.pauseButtonText}>멤버십 일시정지</Text>
          </TouchableOpacity>
        </View>

        {/* 내 활동 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
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
          <View style={styles.cardHeader}>
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
              thumbColor={isPushEnabled ? '#ffffff' : '#f4f3f4'}
              onValueChange={() => setIsPushEnabled(!isPushEnabled)}
              value={isPushEnabled}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>활동 알림</Text>
              <Text style={styles.settingSub}>랭킹 변동 등 활동 관련 알림</Text>
            </View>
            <Switch
              trackColor={{ false: '#333333', true: '#A1BE44' }}
              thumbColor={isActivityEnabled ? '#ffffff' : '#f4f3f4'}
              onValueChange={() => setIsActivityEnabled(!isActivityEnabled)}
              value={isActivityEnabled}
            />
          </View>
        </View>

        {/* 관리자 모드 */}
        {isAdmin && (
          <TouchableOpacity style={styles.adminCard} activeOpacity={0.8} onPress={() => navigation.navigate('ManagerDashboard')}>
            <Image source={require('../assets/SquaresFour.png')} style={styles.adminIcon} />
            <Text style={styles.adminText}>관리자 모드 실행</Text>
          </TouchableOpacity>
        )}

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutCard} activeOpacity={0.8} onPress={() => setLogoutModalVisible(true)}>
          <Image source={require('../assets/EXIT.png')} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        {/* 회원탈퇴 */}
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setDeleteModalVisible(true)}>
          <Text style={styles.deleteAccountText}>회원탈퇴</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ─── 커스텀 알림 결과 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 로그아웃 모달 */}
      <Modal visible={isLogoutModalVisible} transparent={true} animationType="fade">
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
      <Modal visible={isDeleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={[styles.centerModalText, { textAlign: 'center', lineHeight: 24 }]}>
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

      {/* 멤버십 일시정지 모달 */}
      <Modal visible={isPauseModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closePauseModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: pauseSlideAnim }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitleCenter}>멤버십 일시정지</Text>
            <View style={styles.horizontalDivider} />
            <View style={styles.pauseInfoBox}>
              <Text style={styles.pauseInfoText}>
                멤버십 일시정지는 관리자 승인이 필요합니다.{'\n'}프론트 데스크에 문의하시겠습니까?
              </Text>
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

      {/* 문의하기 모달 */}
      <Modal visible={isContactModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeContactModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: contactSlideAnim }] }]}>
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.dragHandle} />
              <Text style={styles.sheetTitleCenter}>프론트 데스크 문의</Text>
              <View style={styles.horizontalDivider} />
              <View style={styles.contactContentBox}>
                <Image source={require('../assets/PhoneCall.png')} style={styles.phoneIcon} />
                <Text style={styles.contactLabel}>연락처</Text>
                <Text style={styles.contactNumber}>053-851-3322</Text>
                <Text style={styles.contactTime}>운영시간: 평일 13:00 ~ 22:00 / 토 13:00 ~ 19:00</Text>
                <Text style={[styles.contactTime, { marginTop: 4 }]}>매주 일요일 정기휴무</Text>
              </View>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={closeContactModal}>
                  <Text style={styles.modalBtnCancelText}>닫기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSubmit} onPress={handlePhoneCall}>
                  <Text style={styles.modalBtnSubmitText}>전화하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* 프로필 수정 모달 */}
      <Modal visible={isProfileModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeProfileModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: profileSlideAnim }], maxHeight: '90%' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>프로필 수정</Text>
              <TouchableOpacity onPress={closeProfileModal}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.horizontalDivider} />
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.profileEditContainer}>
                <TouchableOpacity style={styles.profileImageEditWrapper} activeOpacity={0.7}>
                  <Image source={require('../assets/profile.png')} style={styles.profileImageLarge} />
                  <View style={styles.profileImageEditOverlay}>
                    <Text style={styles.profileImageEditText}>수정</Text>
                  </View>
                </TouchableOpacity>

                {renderEditField('이름', 'name', '')}

                <View style={styles.editFieldWrapper}>
                  <View style={styles.editFieldHeader}>
                    <Text style={styles.editFieldTitle}>성별</Text>
                  </View>
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
                  <View style={styles.editFieldHeader}>
                    <Text style={styles.editFieldTitle}>생년월일</Text>
                  </View>
                  <View style={styles.editInputBox}>
                    <TextInput
                      style={styles.editInput}
                      value={profileData.birthDate}
                      onChangeText={(txt) => {
                        const cleaned = txt.replace(/[^0-9]/g, '');
                        let formatted = cleaned;
                        if (cleaned.length > 4 && cleaned.length <= 6) {
                          formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
                        } else if (cleaned.length > 6) {
                          formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
                        }
                        setProfileData({ ...profileData, birthDate: formatted });
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#666666"
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                {renderEditField('전화번호', 'phone', '')}
                {renderEditField('나이', 'age', '세')}
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
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // 기존 스타일 유지
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  card: { backgroundColor: '#212121', borderRadius: 16, padding: 20, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
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
  memInfoValue: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  activeBadge: { backgroundColor: '#C2FF00', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: '#000000', fontSize: 15, fontWeight: 'bold' },
  pauseButton: { backgroundColor: '#2C2C2C', borderWidth: 1, borderColor: '#555555', borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  pauseButtonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  activityText: { color: '#ffffff', fontSize: 17, fontWeight: '500' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  settingTextContainer: { flex: 1, paddingRight: 10 },
  settingTitle: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  settingSub: { color: '#999999', fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#333333', marginVertical: 8 },
  adminCard: { flexDirection: 'row', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#A1BE44' },
  adminIcon: { width: 24, height: 24, tintColor: '#A1BE44', marginRight: 8, resizeMode: 'contain' },
  adminText: { color: '#A1BE44', fontSize: 18, fontWeight: 'bold' },
  logoutCard: { flexDirection: 'row', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  logoutIcon: { width: 24, height: 24, tintColor: '#FF4D4D', marginRight: 8, resizeMode: 'contain' },
  logoutText: { color: '#FF4D4D', fontSize: 18, fontWeight: 'bold' },
  deleteAccountBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 20 },
  deleteAccountText: { color: '#666666', fontSize: 16, textDecorationLine: 'underline' },
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  centerModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  centerModalText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25, lineHeight: 26 },
  centerBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  centerBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  centerBtnYesText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  centerBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  centerBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  
  // 모달 레이아웃
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' },
  sheetTitleCenter: { color: '#ffffff', fontSize: 23, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  contactContentBox: { alignItems: 'center', marginBottom: 30, width: '100%' },
  phoneIcon: { width: 90, height: 90, resizeMode: 'contain', marginBottom: 20 },
  contactLabel: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  contactNumber: { color: '#A1BE44', fontSize: 36, fontWeight: '900', marginBottom: 12 },
  contactTime: { color: '#999999', fontSize: 16, fontWeight: '500' },
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },
  pauseInfoBox: { backgroundColor: '#2C2C2C', borderWidth: 1, borderColor: '#555555', borderRadius: 12, padding: 18, marginBottom: 25, width: '100%' },
  pauseInfoText: { color: '#ffffff', fontSize: 17, lineHeight: 26, fontWeight: '500' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalBtnCancel: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555555', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginRight: 6 },
  modalBtnCancelText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalBtnSubmit: { flex: 1, backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginLeft: 6 },
  modalBtnSubmitText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  profileEditContainer: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginTop: 5 },
  profileImageEditWrapper: { alignSelf: 'center', width: 90, height: 90, borderRadius: 45, backgroundColor: '#444444', marginBottom: 25, overflow: 'hidden' },
  profileImageLarge: { width: '100%', height: '100%', resizeMode: 'cover' },
  profileImageEditOverlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, alignItems: 'center' },
  profileImageEditText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  editFieldWrapper: { marginBottom: 20 },
  editFieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editFieldTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  toggleWrapper: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { color: '#999999', fontSize: 14, marginRight: 6, fontWeight: '500' },
  editInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000000', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 16 },
  editInput: { flex: 1, color: '#ffffff', fontSize: 18, padding: 0 },
  editUnit: { color: '#999999', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  saveProfileButton: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 15 },
  saveProfileButtonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genderBtn: { flex: 1, backgroundColor: '#000000', borderWidth: 1, borderColor: '#444444', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginHorizontal: 4 },
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#999999', fontSize: 18, fontWeight: 'bold' },
  genderBtnTextActive: { color: '#A1BE44' },

  // ─── 커스텀 알림 모달 전용 스타일 ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default MYScreen;