import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Switch, Modal, Animated, TextInput, ActivityIndicator, Linking, RefreshControl,
  Platform, StyleSheet as RNStyleSheet
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker'; 
import { API_BASE_URL } from '../src/constants/Config';

// ─── 헬퍼 함수 ───
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
  if (
    today.getMonth() + 1 < birthMonth || 
    (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)
  ) {
    age--;
  }

  return String(age);
};

const MYScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);

  // ─── 모달 및 애니메이션 상태 ───
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [isMembershipExpanded, setIsMembershipExpanded] = useState(false);
  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const profileSlideAnim = useRef(new Animated.Value(800)).current;
  const pauseSlideAnim = useRef(new Animated.Value(800)).current;
  const contactSlideAnim = useRef(new Animated.Value(800)).current;

  // ─── 데이터 상태 ───
  const [isAdmin, setIsAdmin] = useState(false);
  const [memInfo, setMemInfo] = useState({ type: '구매 필요', period: '-', status: '비회원', remainingDays: -1, remainingCount: -1, isCountType: false });
  
  const [profileData, setProfileData] = useState<any>({ 
    name: '', phone: '', gender: '', birthDate: '', height: '', weight: '', arm: '', shoe: '', profileImageUrl: '' 
  });
  const [profileToggles, setProfileToggles] = useState<any>({ showPhone: true, showAge: true, showHeight: true, showWeight: true, showArm: true, showShoe: true });
  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [isActivityEnabled, setIsActivityEnabled] = useState(true);

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  // ─── 데이터 불러오기 ───
  const fetchMyInfo = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) { navigation.replace('Login'); return; }
      const headers = { Authorization: `Bearer ${userToken}` };

      const userRes = await axios.get(`${API_BASE_URL}/members/me`, { headers });
      const data = userRes.data?.data?.data;
      if (data) {
        setIsAdmin(String(data.role || '').toUpperCase().includes('ADMIN') || String(data.memberRole || '').toUpperCase().includes('ADMIN'));
        setProfileData({
          name: data.name || '', phone: data.phone || '',
          gender: data.gender === 'MALE' ? '남' : data.gender === 'FEMALE' ? '여' : (data.gender || ''),
          birthDate: data.birthDate || '', height: data.height?.toString() || '', weight: data.weight?.toString() || '',
          arm: data.armSpan?.toString() || '', shoe: data.footSize?.toString() || '',
          profileImageUrl: data.profileImageUrl || '' 
        });
        if (data.privacy) {
          setProfileToggles({
            showPhone: data.privacy.phonePublic, showAge: true, showHeight: data.privacy.heightPublic,
            showWeight: data.privacy.weightPublic, showArm: data.privacy.armSpanPublic, showShoe: data.privacy.footSizePublic,
          });
        }
      }

      const memRes = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });
      const memData = memRes.data?.data?.data || memRes.data?.data;
      if (memData) {
        const displayType = resolveMembershipType(String(memData.membershipType || ''), memData.startDate, memData.endDate, memData.remainingCount);
        const isCount = displayType === '일일권';
        let rDays = -1;
        if (memData.endDate) {
          const end = new Date(memData.endDate);
          end.setHours(0, 0, 0, 0);
          const todayStr = new Date();
          todayStr.setHours(0, 0, 0, 0);
          const diff = Math.round((end.getTime() - todayStr.getTime()) / (1000 * 60 * 60 * 24));
          rDays = diff >= 0 ? diff : 0;
        }
        setMemInfo({
          type: displayType, period: isCount ? `잔여 ${memData.remainingCount ?? 0}회` : `${memData.startDate} ~ ${memData.endDate}`,
          status: memData.status === 'ACTIVE' ? '이용중' : '정지/만료',
          remainingDays: rDays, remainingCount: memData.remainingCount ?? -1, isCountType: isCount,
        });
      }
    } catch (error) { console.log('데이터 로드 실패'); } finally { setLoading(false); }
  };

  useEffect(() => { if (isFocused) fetchMyInfo(); }, [isFocused]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyInfo();
    setRefreshing(false);
  }, []);

  const handleSelectImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) {
        return;
      } else if (response.errorCode) {
        console.log('이미지 선택 오류:', response.errorMessage);
        return;
      } else if (response.assets && response.assets.length > 0) {
        setProfileData((prev: any) => ({ ...prev, profileImageUrl: response.assets![0].uri }));
      }
    });
  };

  // ─── 팝업 제어 ─── ios modal 오류 때문에 
  const openProfileModal = () => {
    setProfileModalVisible(true);
    Animated.timing(profileSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };
  const closeProfileModal = () => {
    Animated.timing(profileSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setProfileModalVisible(false));
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
      }, 100);
    });
  };
  const closeContactModal = () => {
    Animated.timing(contactSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setContactModalVisible(false));
  };

  // ─── 실행 함수들 ───
  const executeLogout = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('userToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (accessToken && refreshToken) {
        await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken }, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 3000 });
      }
    } catch (e) { console.log('로그아웃 통신 실패'); } finally {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole']);
      setLogoutModalVisible(false);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const executeDeleteAccount = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_BASE_URL}/members/me`, { headers: { Authorization: `Bearer ${userToken}` } });
      setDeleteModalVisible(false);
      showResultModal('성공', '회원탈퇴가 완료되었습니다.', 'success');
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }), 1500);
    } catch (e) { setDeleteModalVisible(false); showResultModal('오류', '탈퇴 실패', 'error'); }
  };

  const handleSaveProfile = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const requestBody = {
        name: profileData.name, phone: profileData.phone, gender: profileData.gender === '남' ? 'MALE' : 'FEMALE',
        birthDate: profileData.birthDate, height: parseFloat(profileData.height) || 0, weight: parseFloat(profileData.weight) || 0,
        armSpan: parseFloat(profileData.arm) || 0, footSize: parseFloat(profileData.shoe) || 0,
        isPublicPhone: profileToggles.showPhone, isEmailPublic: true, isHeightPublic: profileToggles.showHeight, isWeightPublic: profileToggles.showWeight,
        isArmSpanPublic: profileToggles.showArm, isFootSizePublic: profileToggles.showShoe,
        age: parseInt(calcAgeFromBirth(profileData.birthDate)) || 0,
        profileImageUrl: profileData.profileImageUrl
      };
      
      await axios.patch(`${API_BASE_URL}/members/me/info`, requestBody, { headers: { Authorization: `Bearer ${userToken}` } });
      closeProfileModal();
      setTimeout(() => showResultModal('성공', '정보가 저장되었습니다.', 'success'), 500);
      fetchMyInfo();
    } catch (e) { showResultModal('오류', '저장 실패', 'error'); }
  };

  const renderEditField = (title: string, fieldKey: string, unit: string) => {
    const toggleKey = `show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
    return (
      <View style={styles.editFieldWrapper}>
        <View style={styles.editFieldHeader}>
          <Text style={styles.editFieldTitle}>{title}</Text>
          <View style={styles.toggleWrapper}>
            <Text style={styles.toggleLabel}>{profileToggles[toggleKey] ? '공개' : '비공개'}</Text>
            <Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={'#ffffff'} onValueChange={() => setProfileToggles({ ...profileToggles, [toggleKey]: !profileToggles[toggleKey] })} value={profileToggles[toggleKey]} />
          </View>
        </View>
        <View style={styles.editInputBox}><TextInput style={styles.editInput} value={profileData[fieldKey]} onChangeText={(txt) => setProfileData({ ...profileData, [fieldKey]: txt })} placeholderTextColor="#666666" keyboardType={unit ? 'numeric' : 'default'} />{unit ? <Text style={styles.editUnit}>{unit}</Text> : null}</View>
      </View>
    );
  };

  const hasMembership = memInfo.isCountType ? memInfo.remainingCount > 0 : memInfo.remainingDays >= 0;
  const memSummaryText = hasMembership ? (memInfo.isCountType ? `${memInfo.type} (${memInfo.remainingCount}회 남음)` : `${memInfo.type} (D-${memInfo.remainingDays})`) : '구매 필요';

  if (loading) return <View style={[styles.background, { justifyContent: 'center' }]}><ActivityIndicator size="large" color="#A1BE44" /></View>;

  return (
    <View style={styles.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}>
        
        {/* 상단 프로필 클릭 시 팝업 실행 */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={openProfileModal}>
          <View style={styles.profileLeft}>
            <View style={styles.profileImagePlaceholder}>
              <Image source={profileData.profileImageUrl ? { uri: profileData.profileImageUrl } : require('../assets/profile.png')} style={styles.profileImage} />
            </View>
            <View style={styles.profileTextContainer}><Text style={styles.profileName}>{profileData.name || '사용자'}</Text><Text style={styles.profileEmail}>{profileData.phone || '번호 없음'}</Text></View>
          </View>
          <Text style={styles.chevronIcon}>＞</Text>
        </TouchableOpacity>

        {/* 멤버십 */}
        <View style={styles.card}>
          <TouchableOpacity style={[styles.cardHeader, { marginBottom: isMembershipExpanded ? 20 : 0 }]} onPress={() => setIsMembershipExpanded(!isMembershipExpanded)} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Image source={require('../assets/membership.png')} style={styles.cardHeaderIcon} /><Text style={styles.cardHeaderTitle}>멤버십 정보</Text></View>
            <Text style={styles.chevronIcon}>{isMembershipExpanded ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {isMembershipExpanded && (
            <View style={styles.memInfoContainer}>
              <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>이용권</Text><Text style={styles.memInfoValue}>{memSummaryText}</Text></View>
              <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>{memInfo.isCountType ? '잔여 횟수' : '기간'}</Text><Text style={styles.memInfoValue}>{memInfo.period}</Text></View>
              <View style={styles.memInfoRow}><Text style={styles.memInfoLabel}>상태</Text><View style={[styles.activeBadge, !hasMembership && { backgroundColor: '#444444' }]}><Text style={styles.activeBadgeText}>{memInfo.status}</Text></View></View>
              <TouchableOpacity style={styles.pauseButton} onPress={openPauseModal}><Text style={styles.pauseButtonText}>문의하기</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* 내 활동 */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { justifyContent: 'flex-start', marginBottom: 20 }]}><Image source={require('../assets/FilmScript.png')} style={styles.cardHeaderIcon} /><Text style={styles.cardHeaderTitle}>내 활동</Text></View>
          <TouchableOpacity style={styles.activityRow} onPress={() => navigation.navigate('Community', { filter: 'MY_WRITTEN' })}><Text style={styles.activityText}>내가 쓴 게시글</Text><Text style={styles.chevronIcon}>＞</Text></TouchableOpacity>
          <View style={styles.divider} /><TouchableOpacity style={styles.activityRow} onPress={() => navigation.navigate('Community', { filter: 'MY_APPLIED' })}><Text style={styles.activityText}>내가 참여한 게시글</Text><Text style={styles.chevronIcon}>＞</Text></TouchableOpacity>
        </View>

        {/* 알림 설정 */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { justifyContent: 'flex-start', marginBottom: 20 }]}><Image source={require('../assets/Vector.png')} style={styles.cardHeaderIcon} /><Text style={styles.cardHeaderTitle}>알림설정</Text></View>
          <View style={styles.settingRow}><View style={styles.settingTextContainer}><Text style={styles.settingTitle}>푸시 알림</Text><Text style={styles.settingSub}>모든 알림 수신</Text></View><Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={'#ffffff'} onValueChange={() => setIsPushEnabled(!isPushEnabled)} value={isPushEnabled} /></View>
          <View style={styles.divider} /><View style={styles.settingRow}><View style={styles.settingTextContainer}><Text style={styles.settingTitle}>활동 알림</Text><Text style={styles.settingSub}>활동 관련 알림</Text></View><Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={'#ffffff'} onValueChange={() => setIsActivityEnabled(!isActivityEnabled)} value={isActivityEnabled} /></View>
        </View>

        {isAdmin && (
          <TouchableOpacity style={styles.adminCard} activeOpacity={0.8} onPress={() => navigation.navigate('ManagerDashboard')}>
            <Image source={require('../assets/SquaresFour.png')} style={styles.adminIcon} /><Text style={styles.adminText}>관리자 모드 실행</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutCard} activeOpacity={0.8} onPress={() => setLogoutModalVisible(true)}>
          <Image source={require('../assets/EXIT.png')} style={styles.logoutIcon} /><Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setDeleteModalVisible(true)}><Text style={styles.deleteAccountText}>회원탈퇴</Text></TouchableOpacity>
      </ScrollView>

      {/* ─── 프로필 수정 모달 ─── */}
      <Modal visible={isProfileModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeProfileModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: profileSlideAnim }], maxHeight: '90%' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>프로필 수정</Text><TouchableOpacity onPress={closeProfileModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity></View>
            <View style={styles.horizontalDivider} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              <View style={styles.profileEditContainer}>
                
                <TouchableOpacity style={styles.profileImageEditWrapper} activeOpacity={0.7} onPress={handleSelectImage}>
                  <Image source={profileData.profileImageUrl ? { uri: profileData.profileImageUrl } : require('../assets/profile.png')} style={styles.profileImageLarge} />
                  <View style={styles.profileImageEditOverlay}><Text style={styles.profileImageEditText}>수정</Text></View>
                </TouchableOpacity>

                <View style={styles.editFieldWrapper}><View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>이름</Text></View><View style={styles.editInputBox}><TextInput style={styles.editInput} value={profileData.name} onChangeText={(txt) => setProfileData({ ...profileData, name: txt })} placeholderTextColor="#666666" /></View></View>
                <View style={styles.editFieldWrapper}><View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>성별</Text></View><View style={styles.genderRow}><TouchableOpacity style={[styles.genderBtn, profileData.gender === '남' && styles.genderBtnActive]} onPress={() => setProfileData({ ...profileData, gender: '남' })}><Text style={[styles.genderBtnText, profileData.gender === '남' && styles.genderBtnTextActive]}>남자</Text></TouchableOpacity><TouchableOpacity style={[styles.genderBtn, profileData.gender === '여' && styles.genderBtnActive]} onPress={() => setProfileData({ ...profileData, gender: '여' })}><Text style={[styles.genderBtnText, profileData.gender === '여' && styles.genderBtnTextActive]}>여자</Text></TouchableOpacity></View></View>
                <View style={styles.editFieldWrapper}><View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>생년월일</Text></View><View style={styles.editInputBox}><TextInput style={styles.editInput} value={profileData.birthDate} onChangeText={(txt) => setProfileData({ ...profileData, birthDate: txt })} placeholder="YYYY-MM-DD" keyboardType="numeric" maxLength={10} /></View></View>
                
                {/* 💡 나이 렌더링 */}
                <View style={styles.editFieldWrapper}>
                  <View style={styles.editFieldHeader}>
                    <Text style={styles.editFieldTitle}>나이</Text>
                    <View style={styles.toggleWrapper}>
                      <Text style={styles.toggleLabel}>{profileToggles.showAge ? '공개' : '비공개'}</Text>
                      <Switch trackColor={{ false: '#333333', true: '#A1BE44' }} thumbColor={'#ffffff'} onValueChange={() => setProfileToggles({ ...profileToggles, showAge: !profileToggles.showAge })} value={profileToggles.showAge} />
                    </View>
                  </View>
                  <View style={styles.editInputBox}>
                    <TextInput style={[styles.editInput, { color: '#999999' }]} value={calcAgeFromBirth(profileData.birthDate)} editable={false} />
                    <Text style={styles.editUnit}>세</Text>
                  </View>
                </View>

                {renderEditField('전화번호', 'phone', '')}
                {renderEditField('키', 'height', 'cm')}
                {renderEditField('몸무게', 'weight', 'kg')}
                {renderEditField('팔길이', 'arm', 'cm')}
                {renderEditField('암벽화 사이즈', 'shoe', 'mm')}
                
                <TouchableOpacity style={styles.saveProfileButton} onPress={handleSaveProfile}><Text style={styles.saveProfileButtonText}>저장하기</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* 기타 모달 */}
      <Modal visible={isLogoutModalVisible} transparent animationType="fade"><View style={styles.centerModalOverlay}><View style={styles.centerModalBox}><Text style={styles.centerModalText}>로그아웃 하시겠습니까?</Text><View style={styles.centerBtnRow}><TouchableOpacity style={styles.centerBtnYes} onPress={executeLogout}><Text style={styles.centerBtnYesText}>예</Text></TouchableOpacity><TouchableOpacity style={styles.centerBtnNo} onPress={() => setLogoutModalVisible(false)}><Text style={styles.centerBtnNoText}>아니오</Text></TouchableOpacity></View></View></View></Modal>
      <Modal visible={isDeleteModalVisible} transparent animationType="fade"><View style={styles.centerModalOverlay}><View style={styles.centerModalBox}><Text style={[styles.centerModalText, { textAlign: 'center' }]}>정말로 탈퇴하시겠습니까?{'\n'}모든 데이터가 삭제됩니다.</Text><View style={styles.centerBtnRow}><TouchableOpacity style={[styles.centerBtnYes, { backgroundColor: '#FF4D4D' }]} onPress={executeDeleteAccount}><Text style={styles.centerBtnYesText}>탈퇴하기</Text></TouchableOpacity><TouchableOpacity style={styles.centerBtnNo} onPress={() => setDeleteModalVisible(false)}><Text style={styles.centerBtnNoText}>취소</Text></TouchableOpacity></View></View></View></Modal>
      <Modal visible={resultModalVisible} transparent animationType="fade"><View style={styles.resultModalOverlay}><View style={styles.resultModalBox}><Text style={[styles.resultModalTitle, { color: resultModalConfig.type === 'error' ? '#FF4D4D' : '#A1BE44' }]}>{resultModalConfig.title}</Text><Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text><TouchableOpacity style={styles.resultModalBtn} onPress={() => setResultModalVisible(false)}><Text style={styles.resultModalBtnText}>확인</Text></TouchableOpacity></View></View></Modal>

      <Modal visible={isPauseModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closePauseModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: pauseSlideAnim }] }]}>
            <View style={styles.dragHandle} /><Text style={styles.sheetTitleCenter}>문의하기</Text><View style={styles.horizontalDivider} />
            <View style={styles.pauseInfoBox}><Text style={styles.pauseInfoText}>프론트 데스크에 문의하시겠습니까?</Text></View>
            <View style={styles.modalBtnRow}><TouchableOpacity style={styles.modalBtnCancel} onPress={closePauseModal}><Text style={styles.modalBtnCancelText}>취소</Text></TouchableOpacity><TouchableOpacity style={styles.modalBtnSubmit} onPress={handleInquireClick}><Text style={styles.modalBtnSubmitText}>문의하기</Text></TouchableOpacity></View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={isContactModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeContactModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: contactSlideAnim }] }]}>
            <View style={styles.dragHandle} /><Text style={styles.sheetTitleCenter}>프론트 데스크 문의</Text><View style={styles.horizontalDivider} />
            <View style={styles.contactContentBox}><Image source={require('../assets/PhoneCall.png')} style={styles.phoneIcon} /><Text style={styles.contactNumber}>053-851-3322</Text><Text style={styles.contactTime}>평일 13:00~22:00 / 토 13:00~19:00 (일요일 휴무)</Text></View>
            <View style={styles.modalBtnRow}><TouchableOpacity style={styles.modalBtnCancel} onPress={closeContactModal}><Text style={styles.modalBtnCancelText}>닫기</Text></TouchableOpacity><TouchableOpacity style={styles.modalBtnSubmit} onPress={() => Linking.openURL('tel:053-851-3322')}><Text style={styles.modalBtnSubmitText}>전화하기</Text></TouchableOpacity></View>
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
  memInfoValue: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
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
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%' },
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