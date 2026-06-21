// ============================================================
// useMyPage.ts
// 마이페이지 화면에서 사용하는 커스텀 훅
// - 내 프로필 / 이용권 상태 조회 및 저장
// - 프로필 이미지 선택 및 업로드
// - 알림 설정 조회 및 변경 (낙관적 업데이트)
// - 비밀번호 변경
// - 로그아웃 (FCM 토큰 삭제 포함)
// - 회원 탈퇴
// - 이용권 일시정지 / 문의 슬라이드 모달 제어
// - 프로필 바텀시트 애니메이션 (PanResponder 드래그 + 2단계 스냅)
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dimensions, Animated, PanResponder, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // notiSettings 캐시, 로그아웃/탈퇴 시 토큰 정리용으로 계속 사용
import { useIsFocused } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_BASE_URL } from '../src/constants/Config'; // getFullImageUrl에서 계속 사용
import messaging from '@react-native-firebase/messaging';
import {
  getMyProfile,
  getMyMemberships,
  updateMyInfo,
  uploadProfileImage,
  getNotificationSettings,
  updateNotificationSettings,
  deleteFcmToken,
  withdrawMember,
} from '../src/constants/api/member';
import { changePassword, logout } from '../src/constants/api/auth';

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

// 서버에서 받은 이미지 경로를 전체 URL로 변환
// - 절대 URL이면 그대로, 상대경로면 도메인 루트에 붙여 반환
// - 유효하지 않은 값(null/'null'/'undefined')이면 null 반환
export const getFullImageUrl = (path: string | null | undefined): string | null => {
  if (!path || path.trim() === '' || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

// 이미지 소스 헬퍼 — 유효한 URL이면 { uri }, 없으면 로컬 profile.png로 폴백
export const getProfileImageSource = (url: string | null | undefined) => {
  const resolved = getFullImageUrl(url);
  if (resolved) return { uri: resolved };
  return require('../assets/profile.png');
};

// 오늘 날짜 00:00:00 기준 Date 객체 반환 (이용권 만료일 계산 기준)
const getTodayDate = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
};

// 이용권 시작일이 오늘 이전인지 확인 (시작일 없으면 이미 시작된 것으로 간주)
const isStarted = (startDate: string): boolean => {
  if (!startDate) return true;
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  return start <= getTodayDate();
};

// 생년월일로 나이 계산 (YYYY-MM-DD 형식 입력)
// 올해 생일이 아직 지나지 않았으면 나이 -1
const calcAgeFromBirth = (birthDate: string): string => {
  if (!birthDate || birthDate.length !== 10) return '-';
  const birthYear  = parseInt(birthDate.substring(0, 4), 10);
  const birthMonth = parseInt(birthDate.substring(5, 7), 10);
  const birthDay   = parseInt(birthDate.substring(8, 10), 10);
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return '-';
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth ||
      (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)) { age--; }
  return String(age);
};

// ─── 알림 설정 타입 ──────────────────────────────────────────────────────────
export type NotiState = {
  isGlobalNotificationOn:      boolean; // 전체 알림 ON/OFF
  isMembershipNotificationOn:  boolean; // 이용권 관련 알림
  isActivityNotificationOn:    boolean; // 활동 관련 알림
  isCrewNotificationOn:        boolean; // 크루 관련 알림
  isNoticeNotificationOn:      boolean; // 공지사항 알림
};

// 알림 설정 기본값 (API 조회 실패 시 사용)
const DEFAULT_NOTI_STATE: NotiState = {
  isGlobalNotificationOn:      true,
  isMembershipNotificationOn:  true,
  isActivityNotificationOn:    true,
  isCrewNotificationOn:        true,
  isNoticeNotificationOn:      true,
};

// ─── 훅 본체 ──────────────────────────────────────────────────────────────────
export const useMyPage = (navigation: any) => {
  // 화면 포커스 여부 (탭 전환 시 재조회 트리거)
  const isFocused = useIsFocused();

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false); // 관리자 여부 (관리 메뉴 노출 조건)

  const [isImageUploading, setIsImageUploading] = useState(false); // 프로필 이미지 업로드 중 여부
  const [isMembershipExpanded, setIsMembershipExpanded] = useState(false); // 이용권 상세 펼침 여부

  // ─── 결과 안내 모달 ────────────────────────────────────────────────────────
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });

  // ─── 각종 모달 표시 상태 ───────────────────────────────────────────────────
  const [isProfileModalVisible, setProfileModalVisible]   = useState(false); // 프로필 편집 바텀시트
  const [isPauseModalVisible, setPauseModalVisible]       = useState(false); // 이용권 일시정지 슬라이드
  const [isContactModalVisible, setContactModalVisible]   = useState(false); // 문의하기 슬라이드
  const [isLogoutModalVisible, setLogoutModalVisible]     = useState(false); // 로그아웃 확인 모달
  const [isDeleteModalVisible, setDeleteModalVisible]     = useState(false); // 회원탈퇴 확인 모달
  const [isAdminModalVisible, setAdminModalVisible]       = useState(false); // 관리자 전환 모달
  const [isChangePwModalVisible, setChangePwModalVisible] = useState(false); // 비밀번호 변경 모달

  // ─── 비밀번호 변경 폼 상태 ─────────────────────────────────────────────────
  const [oldPassword, setOldPassword]               = useState(''); // 현재 비밀번호
  const [newPassword, setNewPassword]               = useState(''); // 새 비밀번호
  const [newPasswordConfirm, setNewPasswordConfirm] = useState(''); // 새 비밀번호 확인
  const [pwError, setPwError]                       = useState(''); // 비밀번호 유효성 오류 메시지
  const [isChangingPw, setIsChangingPw]             = useState(false); // 변경 API 호출 중 여부

  // ─── 이용권 및 프로필 데이터 상태 ──────────────────────────────────────────
  // memInfo: 이용권 상태 요약 (타입, 기간, 잔여일수/횟수 등)
  const [memInfo, setMemInfo] = useState<any>({ type: '구매 필요', period: '-', status: '비회원', remainingDays: -1, remainingCount: -1, hasPeriod: false, hasCount: false, hasFuture: false });
  // profileData: 사용자 기본 정보 및 신체 정보
  const [profileData, setProfileData]     = useState<any>({ name: '', phone: '', gender: '', birthDate: '', height: '', weight: '', arm: '', shoe: '', profileImageUrl: '' });
  // profileToggles: 신체 정보 공개/비공개 설정 (크루원들에게 보임 여부)
  const [profileToggles, setProfileToggles] = useState<any>({ showPhone: true, showAge: true, showHeight: true, showWeight: true, showArm: true, showShoe: true });
  // notiState: 알림 설정
  const [notiState, setNotiState]         = useState<NotiState>(DEFAULT_NOTI_STATE);

  // 이미지 편집 상태 임시 보관 (저장 취소 시 원본 복구를 위해 ref 사용)
  const pendingImageUri   = useRef<string | null>(null); // 선택된 로컬 이미지 URI (미리보기용)
  const pendingImageAsset = useRef<any>(null);           // 선택된 이미지 asset 객체 (업로드용)
  const originalImageUrl  = useRef<string>('');          // 모달 열기 전 원본 이미지 URL (취소 시 복구용)

  // ─── 프로필 바텀시트 애니메이션 설정 ──────────────────────────────────────
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN     = SCREEN_HEIGHT * 0.65; // 절반 스냅 포인트
  const FULL_SCREEN     = SCREEN_HEIGHT * 0.95; // 전체 스냅 포인트
  const THRESHOLD       = (HALF_SCREEN + FULL_SCREEN) / 2; // 두 스냅 중간 → 어느 쪽으로 갈지 결정 기준
  const CLOSE_THRESHOLD = HALF_SCREEN * 0.7;   // 이 아래로 내려오면 자동 닫힘

  // 일시정지/문의 슬라이드 (translateY 기반 슬라이드 인/아웃)
  const pauseSlideAnim   = useRef(new Animated.Value(800)).current; // 초기값 800: 화면 아래 숨긴 상태
  const contactSlideAnim = useRef(new Animated.Value(800)).current;
  // 프로필 바텀시트 (height 기반 슬라이드 업/다운)
  const profileHeightAnim  = useRef(new Animated.Value(0)).current;
  const currentProfileSnap = useRef(FULL_SCREEN); // 현재 스냅 포인트 (드래그 기준)

  // 프로필 바텀시트 PanResponder: 위/아래 드래그로 HALF ↔ FULL ↔ 닫기 전환
  const profilePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        profileHeightAnim.setOffset(currentProfileSnap.current);
        profileHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // 전체화면에서 더 위로 드래그 시 저항감 부여
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
          // THRESHOLD 이상 → 전체화면 스냅
          currentProfileSnap.current = FULL_SCREEN;
          Animated.spring(profileHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight > CLOSE_THRESHOLD) {
          // CLOSE_THRESHOLD ~ THRESHOLD → 절반 스냅
          currentProfileSnap.current = HALF_SCREEN;
          Animated.spring(profileHeightAnim, { toValue: HALF_SCREEN, useNativeDriver: false }).start();
        } else {
          // CLOSE_THRESHOLD 미만 → 모달 닫기
          closeProfileModal();
        }
      }
    })
  ).current;

  // 결과 안내 모달 열기 유틸
  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  // ─── API: 알림 설정 조회 ───────────────────────────────────────────────────
  // 서버에서 알림 설정 불러오기 → AsyncStorage에도 캐시 저장 (오프라인 대비)
  const fetchNotiSettings = useCallback(async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      const notiRes = await getNotificationSettings();
      if (notiRes.data.data) {
        setNotiState(notiRes.data.data);
        await AsyncStorage.setItem('notiSettings', JSON.stringify(notiRes.data.data));
      }
      
    } catch (e) {
      console.log('알림 설정 로드 실패');
    }
  }, []);

  // ─── API: 내 정보 조회 (프로필 + 이용권) ─────────────────────────────────
  const fetchMyInfo = useCallback(async () => {
    try {
      // 내 기본 정보 조회 (/members/me)
      const userRes = await getMyProfile();
      const data    = userRes.data.data;

      if (data) {
        // 관리자 여부 판단 (role에 'ADMIN' 포함 시)
        setIsAdmin(String(data.role || '').toUpperCase().includes('ADMIN'));

        const detailData  = data.detail  ?? data; // 신체 정보 (중첩 또는 flat 구조 대응)
        const privacyData = data.privacy  ?? data; // 공개 설정 (중첩 또는 flat 구조 대응)

        setProfileData({
          name:            data.name      ?? '',
          phone:           data.phone     ?? '',
          // 서버 성별 코드 → 한글 변환
          gender:          data.gender === 'MALE' ? '남' : data.gender === 'FEMALE' ? '여' : (data.gender ?? ''),
          birthDate:       data.birthDate ?? '',
          height:          detailData.height   ? String(detailData.height)   : '',
          weight:          detailData.weight   ? String(detailData.weight)   : '',
          arm:             detailData.armSpan  ? String(detailData.armSpan)  : '',
          shoe:            detailData.footSize ? String(detailData.footSize) : '',
          profileImageUrl: data.profileImageUrl ?? ''
        });

        setProfileToggles({
          showAge:    true, // 나이는 항상 공개
          showHeight: privacyData.isHeightPublic  ?? true,
          showWeight: privacyData.isWeightPublic  ?? true,
          showArm:    privacyData.isArmSpanPublic ?? true,
          showShoe:   privacyData.isFootSizePublic ?? true,
        });
      }

      // 이용권 상태 조회 (/memberships/me)
      const memRes     = await getMyMemberships();
      const rawMemData = memRes.data.data;
      const dataList: any[] = Array.isArray(rawMemData) ? rawMemData : (rawMemData?.content || []);

      if (dataList.length > 0) {
        // 이미 시작된 활성 이용권과 아직 시작 안 된 예정 이용권 분리
        const activeList = dataList.filter(m => m.status === 'ACTIVE' && isStarted(m.startDate));
        const futureList = dataList.filter(m => m.status === 'ACTIVE' && !isStarted(m.startDate));

        // 기간권(회원권)과 일일권(횟수권) 분리
        const periodList = activeList.filter(m => {
          const t = String(m.membershipType).toUpperCase();
          return t.includes('PERIOD') || t.includes('기간') || t.includes('회원');
        });
        const countList = activeList.filter(m => {
          const t = String(m.membershipType).toUpperCase();
          return t.includes('COUNT') || t.includes('횟수') || t.includes('일일');
        });

        // 기간권 합산: 전체 남은 일수 / 가장 이른 시작일 / 가장 늦은 종료일
        let totalRemainingDays = 0, earliestStart = '', latestEnd = '';
        periodList.forEach(m => {
          if (m.endDate) {
            const end  = new Date(m.endDate);
            end.setHours(0, 0, 0, 0);
            const diff = Math.round((end.getTime() - getTodayDate().getTime()) / (1000 * 60 * 60 * 24));
            if (diff >= 0) totalRemainingDays += diff;
            if (!earliestStart || m.startDate < earliestStart) earliestStart = m.startDate;
            if (!latestEnd     || m.endDate   > latestEnd)     latestEnd     = m.endDate;
          }
        });

        // 일일권 합산: 전체 잔여 횟수
        const totalRemainingCount = countList.reduce((sum, m) => sum + (m.remainingCount ?? 0), 0);

        const hasPeriod = periodList.length > 0 && totalRemainingDays >= 0;
        const hasCount  = countList.length > 0 && totalRemainingCount > 0;
        const hasFuture = futureList.length > 0;

        // 이용권 표시 타입 및 기간 텍스트 결정
        let displayType = '구매 필요', periodDisplay = '-';
        if (hasPeriod && hasCount) { displayType = '회원권 / 일일권'; periodDisplay = `${earliestStart} ~ ${latestEnd}`; }
        else if (hasPeriod)        { displayType = '회원권';          periodDisplay = `${earliestStart} ~ ${latestEnd}`; }
        else if (hasCount)         { displayType = '일일권';          periodDisplay = `잔여 ${totalRemainingCount}회`; }
        else if (hasFuture)        { displayType = '시작 예정';       periodDisplay = `${futureList[0]?.startDate || ''} 시작 예정`; }

        setMemInfo({
          type: displayType, period: periodDisplay,
          status: hasPeriod || hasCount ? '이용중' : (hasFuture ? '시작 예정' : '비회원'),
          remainingDays: totalRemainingDays, remainingCount: totalRemainingCount,
          hasPeriod, hasCount, hasFuture,
          startDate: earliestStart, endDate: latestEnd,
        });
      } else {
        // 이용권 없음
        setMemInfo({ type: '구매 필요', period: '-', status: '비회원', remainingDays: -1, remainingCount: -1, hasPeriod: false, hasCount: false, hasFuture: false });
      }
    } catch (error) {
      console.log('데이터 로드 실패', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 화면 포커스 시마다 프로필 + 알림 설정 재조회 (다른 화면에서 수정 후 돌아올 때 반영)
  useEffect(() => {
    if (isFocused) {
      fetchMyInfo();
      fetchNotiSettings();
    }
  }, [isFocused, fetchMyInfo, fetchNotiSettings]);

  // pull-to-refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyInfo();
    await fetchNotiSettings();
    setRefreshing(false);
  }, [fetchMyInfo, fetchNotiSettings]);

  // ─── 알림 설정 일괄 변경 (낙관적 업데이트) ────────────────────────────────
  // UI를 먼저 업데이트한 뒤 API 호출 → 실패 시 원래 상태로 롤백
  const updateMultipleNotiSettings = async (newStateObject: Partial<NotiState>) => {
    const optimisticState = { ...notiState, ...newStateObject };
    setNotiState(optimisticState); // 낙관적 업데이트

    try {
      // 서버는 camelCase와 snake_case 양쪽 필드명을 모두 받는 경우를 대비해 중복 전송
      const requestBody = {
        ...optimisticState,
        globalNotificationOn:     optimisticState.isGlobalNotificationOn,
        membershipNotificationOn: optimisticState.isMembershipNotificationOn,
        activityNotificationOn:   optimisticState.isActivityNotificationOn,
        crewNotificationOn:       optimisticState.isCrewNotificationOn,
        noticeNotificationOn:     optimisticState.isNoticeNotificationOn,
      };
      const res        = await updateNotificationSettings(requestBody);
      // 서버 응답값으로 최종 상태 동기화
      const finalState = res.data.data ? { ...optimisticState, ...res.data.data } : optimisticState;
      setNotiState(finalState);
      await AsyncStorage.setItem('notiSettings', JSON.stringify(finalState));
    } catch (e) {
      // API 실패 시 변경 전 상태로 롤백
      setNotiState(notiState);
      showResultModal('오류', '알림 설정 변경에 실패했습니다.', 'error');
    }
  };

  // ─── 프로필 이미지 선택 ─────────────────────────────────────────────────────
  // 갤러리에서 이미지 선택 → 로컬 URI로 미리보기만 반영 (실제 업로드는 저장 시 실행)
  const handleSelectImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel || response.errorCode) return;
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        pendingImageAsset.current = asset;                // 저장 시 업로드할 asset 보관
        const localUri = asset.uri ?? null;
        pendingImageUri.current = localUri;
        // 미리보기만 로컬 URI로 업데이트 (서버 업로드 전)
        setProfileData((prev: any) => ({ ...prev, profileImageUrl: localUri ?? prev.profileImageUrl }));
      }
    });
  };

  // ─── 프로필 저장 (이미지 업로드 + 신체 정보 수정) ────────────────────────
  // 1. 새 이미지가 선택된 경우 먼저 서버 업로드 (multipart/form-data)
  // 2. 신체 정보 및 공개 설정 PATCH 요청
  // 3. 성공 시 모달 닫기 → 내 정보 재조회 → 결과 안내
  const handleSaveProfile = async () => {
    setIsImageUploading(true);
    try {
      let finalImageUrl = profileData.profileImageUrl;
      
      if (pendingImageAsset.current) {
        // 새 이미지가 선택된 경우 업로드 실행
        const asset    = pendingImageAsset.current;
        const formData = new FormData();

        formData.append('image', {
          uri:  Platform.OS === 'ios' ? asset.uri?.replace('file://', '') : asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `profile_${Date.now()}.jpg`,
        } as any);

        const uploadRes = await uploadProfileImage(formData);

        // 서버 응답에서 최종 이미지 URL 추출
        finalImageUrl = uploadRes.data.data.imageUrl || uploadRes.data.data.profileImageUrl;
        pendingImageAsset.current = null;
        pendingImageUri.current   = null;
      }

      // 신체 정보 + 공개 설정 PATCH
      // 서버 필드명 이중 전송 (isXxxPublic / xxxPublic 양쪽 대응)
      const requestBody = {
        height:          profileData.height ? parseFloat(profileData.height) : null,
        weight:          profileData.weight ? parseFloat(profileData.weight) : null,
        armSpan:         profileData.arm    ? parseFloat(profileData.arm)    : null,
        footSize:        profileData.shoe   ? parseFloat(profileData.shoe)   : null,
        isHeightPublic:  profileToggles.showHeight,  heightPublic:  profileToggles.showHeight,
        isWeightPublic:  profileToggles.showWeight,  weightPublic:  profileToggles.showWeight,
        isArmSpanPublic: profileToggles.showArm,     armSpanPublic: profileToggles.showArm,
        isFootSizePublic:profileToggles.showShoe,    footSizePublic:profileToggles.showShoe,
      };

      await updateMyInfo(requestBody);

      // 저장 성공 후 원본 참조값도 최신으로 갱신 (취소 시 복구 기준점 업데이트)
      originalImageUrl.current = finalImageUrl;
      setProfileData((prev: any) => ({ ...prev, profileImageUrl: finalImageUrl }));

      // 모달 닫기 → 데이터 재조회 → 결과 안내
      closeProfileModal(() => {
        fetchMyInfo();
        setTimeout(() => showResultModal('성공', '정보가 저장되었습니다.', 'success'), 500);
      });
    } catch (e: any) {
      // 이미지 관련 pending 상태 정리
      pendingImageAsset.current = null;
      pendingImageUri.current   = null;                                  

      if (!e.response) {
        // 네트워크 오류
        closeProfileModal(() => setTimeout(() => showResultModal('네트워크 오류', '서버와 통신할 수 없습니다.', 'error'), 500));
        return;
      }

      const errorMessage = e.response.data.message || '저장에 실패했습니다.';
      closeProfileModal(() => setTimeout(() => showResultModal('저장 실패', `에러코드: ${e.response.status}\n${errorMessage}`, 'error'), 500));
    } finally {
      setIsImageUploading(false);
    }
  };

  // ─── 비밀번호 변경 ────────────────────────────────────────────────────────
  // 유효성 검사 → API 호출 → 성공 시 모달 닫기 + 결과 안내
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !newPasswordConfirm) return setPwError('모든 항목을 입력해주세요.');
    // 영문+숫자+특수문자 포함 6자 이상
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{6,}$/.test(newPassword)) return setPwError('새 비밀번호는 영문, 숫자, 특수문자를 포함해 6자 이상이어야 합니다.');
    if (newPassword !== newPasswordConfirm) return setPwError('새 비밀번호가 일치하지 않습니다.');

    setIsChangingPw(true);
    setIsChangingPw(true);
    try {
      await changePassword(oldPassword, newPassword);

      // 성공 → 모달 닫기 + 입력값 초기화 + 결과 안내
      setChangePwModalVisible(false);
      setOldPassword(''); setNewPassword(''); setNewPasswordConfirm(''); setPwError('');
      // iOS 모달 닫힘 애니메이션 완료 후 결과 모달 표시
      setTimeout(() => showResultModal('성공', '비밀번호가 성공적으로 변경되었습니다.', 'success'), Platform.OS === 'ios' ? 400 : 100);
    } catch (error: any) {
      setPwError(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsChangingPw(false);
    }
  };

  // ─── 로그아웃 ─────────────────────────────────────────────────────────────
  // FCM 토큰 삭제 시도(실패해도 무시) → 서버 로그아웃 → 로컬 토큰 전체 삭제 → 로그인 화면으로
  const executeLogout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      // FCM 토큰 삭제 (서버에서 해당 기기로 더 이상 알림 안 보내도록)
      try {
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          // 백엔드에 DELETE 매핑이 없을 수 있음 — 실패해도 로그아웃은 계속 진행
          await deleteFcmToken(fcmToken);
        }
      } catch (fcmError) {
        console.log('FCM 토큰 삭제 실패 (무시):', fcmError);
      }

      // 서버 로그아웃 (refreshToken 무효화)
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch (e) { } finally {
      // 로컬 저장소에서 인증 정보 전체 삭제
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userRole', 'fcmToken']);
      setLogoutModalVisible(false);
      // 로그인 화면으로 stack 리셋 (뒤로가기 불가)
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }), Platform.OS === 'ios' ? 400 : 100);
    }
  };

  // ─── 회원 탈퇴 ────────────────────────────────────────────────────────────
  // 서버에 탈퇴 요청 → 로컬 토큰 삭제 → 결과 안내 → 로그인 화면으로
  const executeDeleteAccount = async () => {
    try {
      await withdrawMember();
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

  // ─── 프로필 바텀시트 제어 ──────────────────────────────────────────────────

  // 프로필 편집 바텀시트 열기: 이미지 편집 상태 초기화 → 원본 URL 백업 → 전체화면으로 슬라이드 업
  const openProfileModal = () => {
    pendingImageAsset.current = null;
    pendingImageUri.current   = null;
    originalImageUrl.current  = profileData.profileImageUrl; // 취소 시 복구용 백업
    setProfileModalVisible(true);
    currentProfileSnap.current = FULL_SCREEN;
    profileHeightAnim.setValue(0);
    Animated.timing(profileHeightAnim, { toValue: FULL_SCREEN, duration: 300, useNativeDriver: false }).start();
  };

  // 프로필 편집 바텀시트 닫기
  // - 이미지 선택 후 취소 시 원본 이미지 URL로 복구
  // - 슬라이드 다운 → 모달 숨김 → 콜백 실행
  const closeProfileModal = (onClosed?: () => void) => {
    if (pendingImageAsset.current) {
      // 저장하지 않고 닫으면 미리보기를 원본으로 되돌림
      pendingImageAsset.current = null;
      pendingImageUri.current   = null;
      setProfileData((prev: any) => ({ ...prev, profileImageUrl: originalImageUrl.current }));
    }
    Animated.timing(profileHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setProfileModalVisible(false);
      if (onClosed) setTimeout(onClosed, Platform.OS === 'ios' ? 400 : 100);
    });
  };

  // ─── 일시정지 / 문의 슬라이드 제어 ───────────────────────────────────────
  // translateY 기반 슬라이드 인/아웃 (800 = 화면 아래 숨김, 0 = 표시)

  // 일시정지 슬라이드 열기
  const openPauseModal  = () => { setPauseModalVisible(true); Animated.timing(pauseSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  // 일시정지 슬라이드 닫기
  const closePauseModal = () => Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setPauseModalVisible(false));
  // 문의 슬라이드 닫기
  const closeContactModal = () => Animated.timing(contactSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => setContactModalVisible(false));

  // 일시정지 슬라이드에서 '문의하기' 클릭 → 일시정지 슬라이드 닫기 → 문의 슬라이드 열기 (순차 처리)
  const handleInquireClick = () => {
    Animated.timing(pauseSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setPauseModalVisible(false);
      setTimeout(() => {
        setContactModalVisible(true);
        Animated.timing(contactSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, Platform.OS === 'ios' ? 400 : 100); // iOS 애니메이션 충돌 방지 딜레이
    });
  };

  // ─── 파생 상태 계산 ────────────────────────────────────────────────────────

  // 현재 이용 가능한 이용권이 있는지 여부 (기간권 또는 일일권 보유 시 true)
  const hasMembership = memInfo.hasPeriod || memInfo.hasCount;

  // 이용권 요약 텍스트 (마이페이지 상단 이용권 카드에 표시)
  const memSummaryText = (() => {
    if (!hasMembership && !memInfo.hasFuture) return '구매 필요';
    if (!hasMembership && memInfo.hasFuture)  return '시작 예정';
    const parts = [];
    if (memInfo.hasPeriod) parts.push(`회원권 (D-${memInfo.remainingDays})`);
    if (memInfo.hasCount)  parts.push(`일일권 (${memInfo.remainingCount}회 남음)`);
    return parts.join(' / ');
  })();

  // ─── 훅 사용 컴포넌트에 노출할 상태와 함수 반환 ──────────────────────────
  return {
    loading, refreshing, onRefresh, isAdmin, calcAgeFromBirth,
    memInfo, hasMembership, memSummaryText, isMembershipExpanded, setIsMembershipExpanded,
    profileData, setProfileData, profileToggles, setProfileToggles,
    notiState, updateMultipleNotiSettings,
    resultModalVisible, setResultModalVisible, resultModalConfig,
    isProfileModalVisible, openProfileModal, closeProfileModal, profileHeightAnim, profilePanResponder,
    isImageUploading, handleSelectImage, handleSaveProfile,                                             
    isChangePwModalVisible, setChangePwModalVisible, oldPassword, setOldPassword, newPassword, setNewPassword, newPasswordConfirm, setNewPasswordConfirm, pwError, setPwError, isChangingPw, handleChangePassword,
    isPauseModalVisible, openPauseModal, closePauseModal, handleInquireClick, pauseSlideAnim,
    isContactModalVisible, closeContactModal, contactSlideAnim,
    isLogoutModalVisible, setLogoutModalVisible, executeLogout,
    isDeleteModalVisible, setDeleteModalVisible, executeDeleteAccount,
    isAdminModalVisible, setAdminModalVisible,
    getProfileImageSource,
  };
};