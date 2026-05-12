import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Modal, Platform, PermissionsAndroid, RefreshControl
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'react-native-camera-kit';
import { API_BASE_URL } from '../src/constants/Config';

const POST_API_URL        = `${API_BASE_URL}/posts`;
const NOTICE_API_URL      = `${API_BASE_URL}/admin/notices`;
const MEMBER_API_URL      = `${API_BASE_URL}/admin/memberships/members`;
const MEMBERSHIP_API_URL  = `${API_BASE_URL}/admin/memberships`;
const VISIT_TODAY_API_URL = `${API_BASE_URL}/admin/visits/today`;
const QR_SCAN_API_URL     = `${API_BASE_URL}/admin/visits/scan`; 

const ManagerDashboard = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);

  // ─── 커스텀 알림 모달 상태 추가 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // ─── 삭제 확인 모달 상태 ───
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'notice' | 'post', id: number } | null>(null);

  // ─── QR 에러 모달 상태 (다시 스캔 / 닫기 투버튼) ───
  const [qrErrorVisible, setQrErrorVisible] = useState(false);
  const [qrErrorMsg, setQrErrorMsg] = useState('');

  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    activeMemberships: 0,
    todayVisitors: 0,
    totalPosts: 0,
  });

  const [isScannerVisible, setScannerVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (isScannerVisible) {
      setTimeout(() => setCameraReady(true), 500);
    } else {
      setCameraReady(false);
    }
  }, [isScannerVisible]);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAdminAndFetchData();
    setRefreshing(false);
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const role  = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');

      if (!token || role !== 'ADMIN') {
        showResultModal('권한 오류', '관리자만 접근할 수 있는 페이지입니다.', 'error', () => navigation.goBack());
        return;
      }

      await Promise.all([
        fetchNotices(token),
        fetchPosts(token),
        fetchMembers(token),
        fetchVisits(token),
        fetchActiveMemberships(token),
      ]);
    } catch (error: any) {
      console.error('데이터 로딩 실패:', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotices = async (token: string) => {
    try {
      const response = await axios.get(NOTICE_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 2, sort: 'id,desc' },
      });
      // ✅ Depth 1단계 추가 반영
      const noticeList = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      setNotices(Array.isArray(noticeList) ? noticeList : []);
    } catch (error: any) {
      console.error('공지사항 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const sortPosts = (list: any[]) =>
    list.sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });

  const fetchPosts = async (token: string) => {
    try {
      const response = await axios.get(POST_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 20, sort: 'id,desc' },
      });

      // ✅ Depth 1단계 추가 반영 (복잡한 껍데기 제거)
      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const totalElements = response.data?.data?.totalElements ?? list.length;

      const mappedList = list.map((item: any) => ({
        ...item,
        isPast: new Date(item.meetDateTime).getTime() < Date.now(),
      }));

      setPosts(sortPosts(mappedList).slice(0, 2));
      setMetrics(prev => ({ ...prev, totalPosts: totalElements }));
    } catch (error: any) {
      console.error('게시글 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const fetchMembers = async (token: string) => {
    try {
      const response = await axios.get(MEMBER_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 2, sort: 'id,desc' },
      });
      // ✅ Depth 1단계 추가 반영
      const memberList = response.data?.data?.content ?? response.data?.data ?? [];
      const totalElements = response.data?.data?.totalElements ?? memberList.length;
      
      setRecentMembers(Array.isArray(memberList) ? memberList : []);
      setMetrics(prev => ({ ...prev, totalMembers: totalElements }));
    } catch (error: any) {
      console.error('회원 데이터 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const fetchVisits = async (token: string) => {
    try {
      const response = await axios.get(MEMBER_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 1000 }
      });
      // ✅ Depth 1단계 추가 반영
      const list = response.data?.data?.content ?? response.data?.data ?? [];
      
      const uniqueVisitors = list.filter((item: any) => {
        const member = item.member || item;
        return member.visitedToday === true || member.todayVisit === true || member.hasVisited === true;
      }).length;

      setMetrics(prev => ({ ...prev, todayVisitors: uniqueVisitors }));
    } catch (error: any) {
      console.error('고유 방문자 데이터 로드 실패, 기존 API로 폴백:', error.response?.data?.message || error.message);
      try {
        const fallbackRes = await axios.get(VISIT_TODAY_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const todayCount = fallbackRes.data?.data?.totalVisitsToday ?? fallbackRes.data?.data ?? 0;
        setMetrics(prev => ({ ...prev, todayVisitors: todayCount }));
      } catch (err) {}
    }
  };

  const fetchActiveMemberships = async (token: string) => {
    try {
      const response = await axios.get(`${MEMBERSHIP_API_URL}/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // ✅ Depth 1단계 추가 반영
      const d = response.data?.data?.data;
      let activeCount = 0;
      if (typeof d === 'number') activeCount = d;
      else if (typeof d?.totalElements === 'number') activeCount = d.totalElements;
      else if (typeof d?.count === 'number') activeCount = d.count;
      else if (typeof d?.total === 'number') activeCount = d.total;
      else if (Array.isArray(d)) activeCount = d.length;
      else if (Array.isArray(d?.content)) activeCount = d.totalElements ?? d.content.length;

      setMetrics(prev => ({ ...prev, activeMemberships: activeCount }));
    } catch (error: any) {
      console.log('/active API 로드 실패, 전체 멤버십 목록에서 상태 필터링 시도');
      try {
        const fallbackRes = await axios.get(MEMBER_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
          params: { size: 1000 }
        });
        const list = fallbackRes.data?.data?.content ?? fallbackRes.data?.data ?? [];
        const count = list.filter((m: any) => m.membershipStatus === 'ACTIVE' || m.status === 'ACTIVE').length;
        setMetrics(prev => ({ ...prev, activeMemberships: count }));
      } catch (fallbackError) {
        console.error('활성이용권 폴백 로드 실패', fallbackError);
      }
    }
  };

  const confirmDelete = (type: 'notice' | 'post', id: number) => {
    setItemToDelete({ type, id });
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (itemToDelete.type === 'notice') {
        await axios.delete(`${NOTICE_API_URL}/${itemToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
        showResultModal('성공', '공지사항이 삭제되었습니다.', 'success');
        fetchNotices(token!);
      } else {
        await axios.delete(`${POST_API_URL}/${itemToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
        showResultModal('성공', '게시글이 삭제되었습니다.', 'success');
        fetchPosts(token!);
      }
    } catch (error: any) {
      // ✅ 에러 메시지 처리 적용
      const errorMessage = error.response?.data?.message || '삭제에 실패했습니다.';
      showResultModal('오류', errorMessage, 'error');
    }
    setDeleteModalVisible(false);
    setItemToDelete(null);
  };

  const handleEditNotice = (noticeId: number) => {
    navigation.navigate('ManagerNotice', { editNoticeId: noticeId });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "카메라 권한 필요",
            message: "QR 코드 스캔을 위해 카메라 권한이 필요합니다.",
            buttonNeutral: "나중에",
            buttonNegative: "거절",
            buttonPositive: "허용"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      return true;
    }
  };

  const openScanner = async () => {
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      showResultModal('권한 오류', '카메라 접근 권한을 허용해주세요.', 'error');
      return;
    }

    scannedRef.current = false;
    setIsProcessing(false);
    setScannerVisible(true);
  };

  const closeScanner = () => {
    setScannerVisible(false);
    scannedRef.current = false;
    setIsProcessing(false);
  };

  const handleBarCodeScanned = async (qrData: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setIsProcessing(true); 

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsProcessing(false);
        showResultModal('오류', '로그인 정보가 없습니다.', 'error', () => closeScanner());
        return;
      }

      const response = await axios.post(
        QR_SCAN_API_URL,
        { qrToken: qrData, deductionCount: 1 },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setIsProcessing(false); 

      // ✅ Depth 1단계 추가 반영
      const result = response.data?.data ?? response.data ?? {};
      const memberName    = result.memberName || '회원';
      const remainingInfo = result.remainingInfo || '';
      const message       = result.message || '정상적으로 출석 처리되었습니다.';

      closeScanner(); 

      setTimeout(() => {
        showResultModal(
          '출석 완료! 🎉',
          `${memberName}님 환영합니다.\n${remainingInfo ? `\n${remainingInfo}` : ''}\n\n${message}`,
          'success',
          () => {
            AsyncStorage.getItem('userToken').then(t => {
              if (t) {
                fetchVisits(t); 
                fetchMembers(t); 
              }
            });
          }
        );
      }, 300);

    } catch (error: any) {
      console.error('QR 스캔 실패:', error.response?.data?.message || error.message);
      // ✅ 에러 메시지 처리 적용
      const errorMsg = error.response?.data?.message || '출석 처리에 실패했습니다.\n유효한 QR 코드인지 확인해주세요.';

      setIsProcessing(false); 
      setQrErrorMsg(errorMsg);
      setQrErrorVisible(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
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
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>총 회원 수</Text>
            <Text style={styles.metricValue}>{metrics.totalMembers}명</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>활성이용권</Text>
            <Text style={[styles.metricValue, metrics.activeMemberships === 0 && { color: '#666' }]}>
              {metrics.activeMemberships}건
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>금일 방문자</Text>
            <Text style={styles.metricValue}>{metrics.todayVisitors}명</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>커뮤니티 글</Text>
            <Text style={styles.metricValue}>{metrics.totalPosts}건</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 가입회원</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ManagerUser')}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          {recentMembers.length > 0 ? (
            recentMembers.map((memberResponse, index) => {
              const member     = memberResponse.member || memberResponse;
              const isVisited  = member.visitedToday === true || member.todayVisit === true || member.hasVisited === true;
              const badgeBg    = isVisited ? 'rgba(161,190,68,0.2)' : 'rgba(142,142,142,0.2)';
              const badgeColor = isVisited ? '#A1BE44' : '#8E8E8E';
              const label      = isVisited ? '출석함' : '미출석';

              const profileImgSource = member.profileImageUrl
                ? { uri: member.profileImageUrl }
                : require('../assets/profile.png');

              return (
                <View key={member.id || index} style={[styles.rowItem, index > 0 && { marginTop: 15 }]}>
                  <Image source={profileImgSource} style={styles.profileImg} defaultSource={require('../assets/profile.png')} />
                  <View style={styles.infoCol}>
                    <Text style={styles.nameText}>{member.name || '이름 없음'}</Text>
                    <Text style={styles.subText}>{member.phone || '전화번호 없음'}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.badgeText, { color: badgeColor }]}>{label}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>가입 회원이 없습니다.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 공지사항</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ManagerNotice')}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {notices.length > 0 ? (
            notices.map((notice, index) => (
              <View key={notice.id} style={[styles.noticeListItem, index > 0 && { marginTop: 20 }]}>
                <View style={styles.noticeTextContent}>
                  <View style={styles.noticeHeaderRow}>
                    {notice.important && (
                      <View style={styles.noticeBadge}>
                        <Text style={styles.noticeBadgeText}>중요</Text>
                      </View>
                    )}
                    <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                  </View>
                  <Text style={styles.subText}>{formatDate(notice.createdAt)}</Text>
                </View>
                <View style={styles.noticeActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditNotice(notice.id)}>
                    <Image source={require('../assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => confirmDelete('notice', notice.id)}>
                    <Image source={require('../assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>등록된 공지가 없습니다.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 커뮤니티 글</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ManagerCommunity')}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          {posts.length > 0 ? (
            posts.map((post, index) => {
              const isOut          = post.differentGym;
              const isPast         = post.isPast;
              const postType       = isOut ? '아웃도어' : '센터';
              const badgeBgColor   = isPast ? '#333333' : isOut ? 'rgba(0,129,15,0.2)' : 'rgba(0,114,185,0.2)';
              const badgeTextColor = isPast ? '#888888' : isOut ? '#2CDE00' : '#009DFF';
              return (
                <View key={post.id} style={[styles.noticeListItem, index > 0 && { marginTop: 20 }, isPast && { opacity: 0.6 }]}>
                  <View style={styles.noticeTextContent}>
                    <View style={[styles.badge, { backgroundColor: badgeBgColor, alignSelf: 'flex-start', marginBottom: 8 }]}>
                      <Text style={[styles.badgeText, { color: badgeTextColor }]}>{postType}</Text>
                    </View>
                    {/* 💡 폰트 확대: 인라인 스타일도 적용 */}
                    <Text style={[styles.noticeTitle, isPast && { color: '#888888' }]} numberOfLines={1}>{post.title}</Text>
                    <Text style={[styles.subText, { color: isPast ? '#666666' : '#ffffff', fontSize: 14 }]}>
                      {post.writerName}  {formatDate(post.createdAt)} {isPast ? '(마감됨)' : ''}
                    </Text>
                  </View>
                  <View style={styles.noticeActions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => confirmDelete('post', post.id)}>
                      <Image source={require('../assets/trash.png')} style={[styles.actionIcon, { tintColor: isPast ? '#666666' : '#FF4D4D' }]} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>등록된 게시글이 없습니다.</Text>
          )}
        </View>

      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openScanner}>
        <Image source={require('../assets/Camera.png')} style={styles.fabIcon} />
      </TouchableOpacity>

      {/* ─── 커스텀 알림 결과 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => {
              setResultModalVisible(false);
              if (typeof resultModalConfig.onConfirm === 'function') {
                resultModalConfig.onConfirm();
              }
            }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 삭제 확인 모달 ─── */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>
              해당 {itemToDelete?.type === 'notice' ? '공지사항' : '게시글'}을 정말 삭제하시겠습니까?
            </Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={executeDelete}>
                <Text style={styles.deleteBtnYesText}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.deleteBtnNoText}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── QR 에러 확인 모달 (투버튼) ─── */}
      <Modal visible={qrErrorVisible} animationType="fade" transparent onRequestClose={() => setQrErrorVisible(false)}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={[styles.resultModalTitle, { color: '#FF4D4D', marginBottom: 15 }]}>출석 실패</Text>
            <Text style={styles.resultModalMessage}>{qrErrorMsg}</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={() => { setQrErrorVisible(false); scannedRef.current = false; setIsProcessing(false); }}>
                <Text style={styles.deleteBtnYesText}>다시 스캔</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={() => { setQrErrorVisible(false); closeScanner(); }}>
                <Text style={styles.deleteBtnNoText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isScannerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeScanner}
      >
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>QR 코드 스캔</Text>
            <TouchableOpacity onPress={closeScanner}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scannerContainer}>
            {isScannerVisible && cameraReady ? (
              <Camera
                style={StyleSheet.absoluteFill}
                scanBarcode={true}
                onReadCode={(event: any) =>
                  handleBarCodeScanned(event.nativeEvent.codeStringValue)
                }
                showFrame={true}
                laserColor="#A1BE44"
                frameColor="white"
              />
            ) : (
              <ActivityIndicator
                size="large"
                color="#A1BE44"
                style={{ position: 'absolute' }}
              />
            )}

            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#A1BE44" />
                <Text style={styles.processingText}>처리 중...</Text>
              </View>
            )}
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerDesc}>회원의 휴대폰에 있는 QR 코드를</Text>
            <Text style={styles.scannerDesc}>가이드 사각형 안으로 비춰주세요.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─────────────────────────── 스타일 (글씨 크기 확대 적용) ───────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingBottom: 80 },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }, // 💡 20 -> 25
  metricBox: { flex: 1, backgroundColor: '#2C2C2C', borderRadius: 12, paddingVertical: 20, alignItems: 'center', marginHorizontal: 4 }, // 💡 18 -> 20
  metricTitle: { color: '#999999', fontSize: 13, fontWeight: 'bold', marginBottom: 8 }, // 💡 11 -> 13
  metricValue: { color: '#ffffff', fontSize: 19, fontWeight: '900' }, // 💡 15 -> 19

  card: { backgroundColor: '#2C2C2C', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#ffffff', fontSize: 19, fontWeight: 'bold' }, // 💡 16 -> 19
  viewAllBtn: { borderWidth: 1, borderColor: '#A1BE44', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }, // 💡 14, 6 -> 16, 8
  viewAllBtnText: { color: '#999999', fontSize: 14, fontWeight: 'bold' }, // 💡 12 -> 14
  divider: { height: 1, backgroundColor: '#444444', marginVertical: 15 },
  emptyText: { color: '#999', textAlign: 'center', marginVertical: 10, fontSize: 16 }, // 💡 16 추가

  rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#444444', marginRight: 15 }, // 💡 40 -> 48
  infoCol: { flex: 1 },
  nameText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 }, // 💡 15 -> 17
  subText: { color: '#999999', fontSize: 15 }, // 💡 13 -> 15

  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }, // 💡 12, 4 -> 14, 6
  badgeText: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' }, // 💡 12 -> 14

  noticeListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeTextContent: { flex: 1, paddingRight: 10 },

  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 }, // 💡 6, 2 -> 8, 4
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' }, // 💡 10 -> 12
  noticeTitle: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', flex: 1 }, // 💡 15 -> 17

  noticeActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 6, marginLeft: 6 },
  deleteBtn: { backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 8, padding: 8 }, // 💡 여백 추가
  actionIcon: { width: 24, height: 24, resizeMode: 'contain' }, // 💡 20 -> 24

  fab: { position: 'absolute', bottom: 15, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 }, // 💡 60 -> 70
  fabIcon: { width: 35, height: 35, tintColor: '#1A1A1A', resizeMode: 'contain' }, // 💡 30 -> 35

  scannerModalOverlay: { flex: 1, backgroundColor: '#1A1A1A' },
  scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1A1A1A' },
  scannerTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' }, // 💡 20 -> 23
  closeIcon: { color: '#999999', fontSize: 32 }, // 💡 28 -> 32
  scannerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  processingText: { color: '#ffffff', fontSize: 18, marginTop: 12, fontWeight: 'bold' }, // 💡 16 -> 18
  scannerFooter: { padding: 40, alignItems: 'center', backgroundColor: '#1A1A1A' },
  scannerDesc: { color: '#ffffff', fontSize: 18, marginTop: 5 }, // 💡 16 -> 18

  // ─── 커스텀 알림 모달 전용 스타일 (통일) ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, // 💡 300 -> 320
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, // 💡 18 -> 20
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, // 💡 15 -> 17
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, // 💡 14 -> 16
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18

  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' }, // 💡 300 -> 320
  deleteModalText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', lineHeight: 26 }, // 💡 16 -> 18
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  deleteBtnYesText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  deleteBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
});

export default ManagerDashboard;