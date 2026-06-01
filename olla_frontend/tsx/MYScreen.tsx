import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Switch, Modal, Animated, TextInput, ActivityIndicator, Linking, RefreshControl,
  Platform, TouchableWithoutFeedback, KeyboardAvoidingView
} from 'react-native';
import { useMyPage, getFullImageUrl } from '../ts/MY';

const MYScreen = ({ navigation }: any) => {
  const {
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
  } = useMyPage(navigation);

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
              {/* 💡 getFullImageUrl을 통해 로컬/서버 이미지를 모두 올바르게 렌더링합니다 */}
              <Image
                source={profileData.profileImageUrl ? { uri: getFullImageUrl(profileData.profileImageUrl) } : require('../assets/profile.png')}
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
          <TouchableOpacity style={[styles.cardHeader, { marginBottom: isMembershipExpanded ? 20 : 0 }]} onPress={() => setIsMembershipExpanded(!isMembershipExpanded)} activeOpacity={0.8}>
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
              {memInfo.hasFuture && !hasMembership && (
                <View style={styles.memInfoRow}>
                  <Text style={styles.memInfoLabel}>시작 예정</Text>
                  <Text style={[styles.memInfoValue, { color: '#A1BE44' }]}>{memInfo.period}</Text>
                </View>
              )}
              <View style={styles.memInfoRow}>
                <Text style={styles.memInfoLabel}>상태</Text>
                <View style={[styles.activeBadge, !hasMembership && memInfo.hasFuture ? { backgroundColor: '#3A3A5C' } : !hasMembership ? { backgroundColor: '#444444' } : {}]}>
                  <Text style={[styles.activeBadgeText, !hasMembership && memInfo.hasFuture ? { color: '#A1BE44' } : {}]}>{memInfo.status}</Text>
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
          {[
            { title: '푸시 알림', sub: '모든 알림 수신', key: 'isGlobalNotificationOn' },
            { title: '이용권 알림', sub: '이용권 만료 및 안내 알림', key: 'isMembershipNotificationOn' },
            { title: '활동 알림', sub: '활동 관련 알림', key: 'isActivityNotificationOn' },
            { title: '모임/크루 알림', sub: '참여 및 리마인드 알림', key: 'isCrewNotificationOn' },
            { title: '공지사항 알림', sub: '공지 및 이벤트 알림', key: 'isNoticeNotificationOn' },
          ].map((item, index) => (
            <React.Fragment key={item.key}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingSub}>{item.sub}</Text>
                </View>
                <Switch
                  trackColor={{ false: '#333333', true: '#A1BE44' }}
                  thumbColor={'#ffffff'}
                  onValueChange={() => handleNotiToggle(item.key as any)}
                  value={(notiState as any)[item.key]}
                />
              </View>
              {index < 4 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {isAdmin && (
          <TouchableOpacity style={styles.adminCard} activeOpacity={0.8} onPress={() => setAdminModalVisible(true)}>
            <Image source={require('../assets/SquaresFour.png')} style={styles.adminIcon} />
            <Text style={styles.adminText}>관리자 모드 실행</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.changePwCard} activeOpacity={0.8} onPress={() => {
          setOldPassword(''); setNewPassword(''); setNewPasswordConfirm(''); setPwError(''); setChangePwModalVisible(true);
        }}>
          <Text style={styles.changePwText}>비밀번호 변경</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutCard} activeOpacity={0.8} onPress={() => setLogoutModalVisible(true)}>
          <Image source={require('../assets/EXIT.png')} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => Linking.openURL('https://www.termsfeed.com/live/934afa2d-b905-435a-9800-be35ec29dff2')}>
          <Text style={styles.deleteAccountText}>개인정보처리방침</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setDeleteModalVisible(true)}>
          <Text style={styles.deleteAccountText}>계정 삭제</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 프로필 수정 모달 */}
      <Modal visible={isProfileModalVisible} transparent animationType="fade" onRequestClose={() => closeProfileModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => closeProfileModal()}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
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
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
                <View style={styles.profileEditContainer}>
                  <TouchableOpacity style={styles.profileImageEditWrapper} activeOpacity={0.7} onPress={handleSelectImage} disabled={isImageUploading}>
                    {/* 💡 모달 안에서도 getFullImageUrl 적용 */}
                    <Image source={profileData.profileImageUrl ? { uri: getFullImageUrl(profileData.profileImageUrl) } : require('../assets/profile.png')} style={styles.profileImageLarge} />
                    <View style={styles.profileImageEditOverlay}>
                      {isImageUploading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.profileImageEditText}>수정</Text>}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.editFieldWrapper}>
                    <View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>이름</Text></View>
                    <View style={styles.editInputBox}>
                      <TextInput style={styles.editInput} value={profileData.name} onChangeText={(txt) => setProfileData({ ...profileData, name: txt })} placeholderTextColor="#666666" />
                    </View>
                  </View>

                  <View style={styles.editFieldWrapper}>
                    <View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>성별</Text></View>
                    <View style={styles.genderRow}>
                      <TouchableOpacity style={[styles.genderBtn, profileData.gender === '남' && styles.genderBtnActive]} onPress={() => setProfileData({ ...profileData, gender: '남' })}>
                        <Text style={[styles.genderBtnText, profileData.gender === '남' && styles.genderBtnTextActive]}>남자</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.genderBtn, profileData.gender === '여' && styles.genderBtnActive]} onPress={() => setProfileData({ ...profileData, gender: '여' })}>
                        <Text style={[styles.genderBtnText, profileData.gender === '여' && styles.genderBtnTextActive]}>여자</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.editFieldWrapper}>
                    <View style={styles.editFieldHeader}><Text style={styles.editFieldTitle}>생년월일</Text></View>
                    <View style={styles.editInputBox}>
                      <TextInput style={styles.editInput} value={profileData.birthDate} onChangeText={(txt) => setProfileData({ ...profileData, birthDate: txt })} placeholder="YYYY-MM-DD" keyboardType="numeric" maxLength={10} />
                    </View>
                  </View>

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

                  <TouchableOpacity style={[styles.saveProfileButton, isImageUploading && { backgroundColor: '#555555' }]} onPress={handleSaveProfile} disabled={isImageUploading}>
                    <Text style={[styles.saveProfileButtonText, isImageUploading && { color: '#999999' }]}>{isImageUploading ? '저장 중...' : '저장하기'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 비밀번호 변경 모달 */}
      <Modal visible={isChangePwModalVisible} transparent animationType="fade" onRequestClose={() => setChangePwModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', alignItems: 'center' }}>
            <View style={styles.inputModalBox}>
              <View style={styles.inputModalHeader}>
                <Text style={styles.inputModalTitle}>비밀번호 변경</Text>
                <TouchableOpacity onPress={() => setChangePwModalVisible(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
              <TextInput style={styles.inputField} placeholder="현재 비밀번호" placeholderTextColor="#999" secureTextEntry value={oldPassword} onChangeText={setOldPassword} autoCapitalize="none" />
              <TextInput style={styles.inputField} placeholder="새 비밀번호 (영문, 숫자, 특수문자 6자 이상)" placeholderTextColor="#999" secureTextEntry value={newPassword} onChangeText={setNewPassword} autoCapitalize="none" />
              <TextInput style={styles.inputField} placeholder="새 비밀번호 확인" placeholderTextColor="#999" secureTextEntry value={newPasswordConfirm} onChangeText={setNewPasswordConfirm} autoCapitalize="none" />
              {pwError !== '' && <Text style={styles.errorText}>{pwError}</Text>}
              <TouchableOpacity style={styles.submitBtn} onPress={handleChangePassword} disabled={isChangingPw}>
                {isChangingPw ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>변경하기</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 기타 모달 모음 (관리자, 로그아웃, 탈퇴, 결과, 문의하기 등) */}
      <Modal visible={isAdminModalVisible} transparent animationType="fade" onRequestClose={() => setAdminModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={styles.centerModalText}>관리자 모드로 들어가시겠습니까?</Text>
            <View style={styles.centerBtnRow}>
              <TouchableOpacity style={styles.centerBtnYes} onPress={() => { setAdminModalVisible(false); setTimeout(() => navigation.navigate('ManagerDashboard'), Platform.OS === 'ios' ? 400 : 100); }}><Text style={styles.centerBtnYesText}>예</Text></TouchableOpacity>
              <TouchableOpacity style={styles.centerBtnNo} onPress={() => setAdminModalVisible(false)}><Text style={styles.centerBtnNoText}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isLogoutModalVisible} transparent animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={styles.centerModalText}>로그아웃 하시겠습니까?</Text>
            <View style={styles.centerBtnRow}>
              <TouchableOpacity style={styles.centerBtnYes} onPress={executeLogout}><Text style={styles.centerBtnYesText}>예</Text></TouchableOpacity>
              <TouchableOpacity style={styles.centerBtnNo} onPress={() => setLogoutModalVisible(false)}><Text style={styles.centerBtnNoText}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={[styles.centerModalText, { textAlign: 'center' }]}>정말로 삭제하시겠습니까?{'\n'}모든 데이터가 삭제됩니다.</Text>
            <View style={styles.centerBtnRow}>
              <TouchableOpacity style={[styles.centerBtnYes, { backgroundColor: '#FF4D4D' }]} onPress={executeDeleteAccount}><Text style={styles.centerBtnYesText}>삭제하기</Text></TouchableOpacity>
              <TouchableOpacity style={styles.centerBtnNo} onPress={() => setDeleteModalVisible(false)}><Text style={styles.centerBtnNoText}>취소</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={resultModalVisible} transparent animationType="fade" onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: resultModalConfig.type === 'error' ? '#FF4D4D' : '#A1BE44' }]}>{resultModalConfig.title}</Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => setResultModalVisible(false)}><Text style={styles.resultModalBtnText}>확인</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isPauseModalVisible} transparent animationType="fade" onRequestClose={closePauseModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closePauseModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: pauseSlideAnim }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitleCenter}>문의하기</Text>
            <View style={styles.horizontalDivider} />
            <View style={styles.pauseInfoBox}><Text style={styles.pauseInfoText}>프론트 데스크에 문의하시겠습니까?</Text></View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={closePauseModal}><Text style={styles.modalBtnCancelText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleInquireClick}><Text style={styles.modalBtnSubmitText}>문의하기</Text></TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

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
              <TouchableOpacity style={styles.modalBtnCancel} onPress={closeContactModal}><Text style={styles.modalBtnCancelText}>닫기</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={() => Linking.openURL('tel:053-851-3322')}><Text style={styles.modalBtnSubmitText}>전화하기</Text></TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// StyleSheet은 기존과 완전히 동일하므로 그대로 사용하시면 됩니다.
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
  changePwCard: { flexDirection: 'row', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  changePwText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  logoutCard: { flexDirection: 'row', backgroundColor: '#212121', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  logoutIcon: { width: 24, height: 24, tintColor: '#FF4D4D', marginRight: 8, resizeMode: 'contain' },
  logoutText: { color: '#FF4D4D', fontSize: 18, fontWeight: 'bold' },
  deleteAccountBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 0 },
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
  inputModalBox: { width: 320, backgroundColor: '#2A2A2A', borderRadius: 16, padding: 20 },
  inputModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  inputModalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  inputField: { backgroundColor: '#1A1A1A', color: '#FFF', borderRadius: 8, padding: 15, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#444' },
  submitBtn: { backgroundColor: '#A1BE44', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#00', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: '#FF4D4D', fontSize: 14, marginBottom: 10, textAlign: 'center' }
});

export default MYScreen;