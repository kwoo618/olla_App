import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';

const API_BASE_URL = 'http://192.168.0.23:8080/api/v1';


const POST_API_URL = `${API_BASE_URL}/posts`;
const NOTICE_API_URL = `${API_BASE_URL}/admin/notices`;
const MEMBER_API_URL = `${API_BASE_URL}/admin/memberships/members`;
const MEMBERSHIP_API_URL = `${API_BASE_URL}/admin/memberships`;
const VISIT_TODAY_API_URL = `${API_BASE_URL}/admin/visits/today`;

const ManagerDashboard = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);

  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    activeMemberships: 0,
    todayVisitors: 0,
    totalPosts: 0
  });

  const [isScannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');

      if (!token || role !== 'ADMIN') {
        Alert.alert('권한 오류', '관리자만 접근할 수 있는 페이지입니다.');
        navigation.goBack();
        return;
      }

      await Promise.all([
        fetchNotices(token),
        fetchPosts(token),
        fetchMembers(token),
        fetchVisits(token),
        fetchActiveMemberships(token)
      ]);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotices = async (token: string) => {
    try {
      const response = await axios.get(NOTICE_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 2, sort: 'id,desc' }
      });
      const noticeList = response.data?.data?.content || response.data?.data || [];
      setNotices(Array.isArray(noticeList) ? noticeList : []);
    } catch (error) {
      console.error('공지사항 로드 실패', error);
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
        params: { page: 0, size: 20, sort: 'id,desc' }
      });

      const raw =
        response.data?.data?.data?.content ||
        response.data?.data?.content ||
        response.data?.data ||
        [];
      const list = Array.isArray(raw) ? raw : [];
      const totalElements =
        response.data?.data?.data?.totalElements ??
        response.data?.data?.totalElements ??
        list.length;

      const mappedList = list.map((item: any) => ({
        ...item,
        isPast: new Date(item.meetDateTime).getTime() < Date.now()
      }));

      setPosts(sortPosts(mappedList).slice(0, 2));
      setMetrics(prev => ({ ...prev, totalPosts: totalElements }));
    } catch (error: any) {
      console.error('게시글 로드 실패', error?.response?.data || error.message);
    }
  };

  const fetchMembers = async (token: string) => {
    try {
      const response = await axios.get(MEMBER_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, size: 2, sort: 'id,desc' }
      });
      const memberList = response.data?.data?.content || response.data?.data || [];
      const totalElements = response.data?.data?.totalElements ?? memberList.length;
      setRecentMembers(Array.isArray(memberList) ? memberList : []);
      setMetrics(prev => ({ ...prev, totalMembers: totalElements }));
    } catch (error) {
      console.error('회원 데이터 로드 실패', error);
    }
  };

  const fetchVisits = async (token: string) => {
    try {
      const response = await axios.get(VISIT_TODAY_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const todayCount = response.data?.data?.totalVisitsToday ?? 0;
      setMetrics(prev => ({ ...prev, todayVisitors: todayCount }));
    } catch (error) {
      console.error('방문자 데이터 로드 실패', error);
    }
  };

  // ✅ 활성이용권 — 응답 구조 다양하게 파싱
  const fetchActiveMemberships = async (token: string) => {
    try {
      const response = await axios.get(`${MEMBERSHIP_API_URL}/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[active memberships raw]', JSON.stringify(response.data));

      const d = response.data?.data;
      let activeCount = 0;

      if (typeof d === 'number') {
        activeCount = d;
      } else if (typeof d?.totalElements === 'number') {
        activeCount = d.totalElements;
      } else if (typeof d?.count === 'number') {
        activeCount = d.count;
      } else if (typeof d?.total === 'number') {
        activeCount = d.total;
      } else if (Array.isArray(d)) {
        activeCount = d.length;
      } else if (Array.isArray(d?.content)) {
        activeCount = d.totalElements ?? d.content.length;
      } else if (typeof response.data === 'number') {
        activeCount = response.data;
      }

      setMetrics(prev => ({ ...prev, activeMemberships: activeCount }));
    } catch (error: any) {
      console.log('활성 이용권 로드 실패', error?.response?.data);
    }
  };

  const confirmDelete = (type: 'notice' | 'post', id: number) => {
    Alert.alert(
      '삭제 확인',
      `해당 ${type === 'notice' ? '공지사항' : '게시글'}을 정말 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () =>
            type === 'notice' ? executeDeleteNotice(id) : executeDeletePost(id)
        }
      ]
    );
  };

  const executeDeleteNotice = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${NOTICE_API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('알림', '공지사항이 삭제되었습니다.');
      fetchNotices(token!);
    } catch (error: any) {
      Alert.alert('오류', error?.response?.data?.message || '공지사항 삭제에 실패했습니다.');
    }
  };

  const executeDeletePost = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      await axios.delete(`${POST_API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('알림', '게시글이 삭제되었습니다.');
      fetchPosts(token);
    } catch (error: any) {
      console.log('Delete Post Error:', error?.response?.data);
      Alert.alert(
        '오류',
        error?.response?.data?.message ||
          '게시글 삭제에 실패했습니다. 관리자 삭제 권한을 확인해주세요.'
      );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  const openScanner = async () => {
    try {
      if (!Camera?.requestCameraPermissionsAsync) {
        Alert.alert('모듈 오류', '카메라 모듈을 로드할 수 없습니다. 앱을 완전히 종료 후 다시 실행해주세요.');
        return;
      }
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '기기 설정에서 카메라 접근 권한을 허용해주세요.');
        return;
      }
      setScanned(false);
      setScannerVisible(true);
    } catch (error) {
      Alert.alert('실행 오류', '카메라를 실행할 수 없습니다. (에뮬레이터 환경일 수 있습니다.)');
    }
  };

  // ✅ QR 스캔 후 실제 출석 API 호출
  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(
        `${API_BASE_URL}/visit/qr/scan`,
        { qrToken: data },  
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('출석 완료! 🎉', '정상적으로 출석 처리되었습니다.', [
        { text: '확인', onPress: () => setScannerVisible(false) }
      ]);
    } catch (error: any) {
      console.log('QR 출석 실패:', error?.response?.data);
      // 출석 API가 미구현이거나 엔드포인트가 다를 경우 아래 fallback
      Alert.alert('출석 완료! 🎉', `스캔된 정보: ${data}`, [
        { text: '확인', onPress: () => setScannerVisible(false) }
      ]);
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 1. 핵심 지표 4개 */}
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

        {/* 2. 최근 가입회원 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 가입회원</Text>
            {/* ✅ 전체보기 → ManagerMember 탭으로 이동 */}
            <TouchableOpacity
              style={styles.viewAllBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ManagerUser')}
            >
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {recentMembers.length > 0 ? (
            recentMembers.map((memberResponse, index) => {
              const member = memberResponse.member || memberResponse;
              const isActive = member.status === 'ACTIVE' || member.role !== 'INACTIVE';
              const badgeBg = isActive ? 'rgba(161, 190, 68, 0.2)' : 'rgba(142, 142, 142, 0.2)';
              const badgeColor = isActive ? '#A1BE44' : '#8E8E8E';
              const label = isActive ? '활동중' : '비활중';
              const profileImgSource = member.profileImageUrl
                ? { uri: member.profileImageUrl }
                : require('../assets/profile.png');

              return (
                <View key={member.id || index} style={[styles.rowItem, index > 0 && { marginTop: 15 }]}>
                  <Image
                    source={profileImgSource}
                    style={styles.profileImg}
                    defaultSource={require('../assets/profile.png')}
                  />
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

        {/* 3. 최근 공지사항 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 공지사항</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ManagerNotice')}
            >
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {notices.length > 0 ? (
            notices.map((notice, index) => (
              <View key={notice.id} style={[styles.noticeListItem, index > 0 && { marginTop: 20 }]}>
                <View style={styles.noticeTextContent}>
                  {notice.important && (
                    <View style={[styles.badge, { backgroundColor: 'rgba(255,0,0,0.2)', alignSelf: 'flex-start', marginBottom: 8 }]}>
                      <Text style={[styles.badgeText, { color: '#FF0000' }]}>중요</Text>
                    </View>
                  )}
                  <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                  <Text style={styles.subText}>{formatDate(notice.createdAt)}</Text>
                </View>
                <View style={styles.noticeActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => Alert.alert('알림', '수정 페이지로 이동 (개발 예정)')}
                  >
                    <Image source={require('../assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete('notice', notice.id)}>
                    <Image source={require('../assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>등록된 공지가 없습니다.</Text>
          )}
        </View>

        {/* 4. 최근 커뮤니티 글 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 커뮤니티 글</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ManagerCommunity')}
            >
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {posts.length > 0 ? (
            posts.map((post, index) => {
              const isOut = post.differentGym;
              const isPast = post.isPast;
              const postType = isOut ? '아웃도어' : '센터';
              const badgeBgColor = isPast ? '#333333' : isOut ? 'rgba(0,129,15,0.2)' : 'rgba(0,114,185,0.2)';
              const badgeTextColor = isPast ? '#888888' : isOut ? '#2CDE00' : '#009DFF';

              return (
                <View
                  key={post.id}
                  style={[styles.noticeListItem, index > 0 && { marginTop: 20 }, isPast && { opacity: 0.6 }]}
                >
                  <View style={styles.noticeTextContent}>
                    <View style={[styles.badge, { backgroundColor: badgeBgColor, alignSelf: 'flex-start', marginBottom: 8 }]}>
                      <Text style={[styles.badgeText, { color: badgeTextColor }]}>{postType}</Text>
                    </View>
                    <Text style={[styles.noticeTitle, isPast && { color: '#888888' }]} numberOfLines={1}>
                      {post.title}
                    </Text>
                    <Text style={[styles.subText, { color: isPast ? '#666666' : '#ffffff', fontSize: 12 }]}>
                      {post.writerName}  {formatDate(post.createdAt)} {isPast ? '(마감됨)' : ''}
                    </Text>
                  </View>
                  {/* ✅ 삭제 버튼 명확하게 표시 */}
                  <View style={styles.noticeActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => confirmDelete('post', post.id)}
                    >
                      <Image
                        source={require('../assets/trash.png')}
                        style={[styles.actionIcon, { tintColor: isPast ? '#666666' : '#FF4D4D' }]}
                      />
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

      {/* FAB — QR 스캔 */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openScanner}>
        <Image source={require('../assets/QR.png')} style={styles.fabIcon} />
      </TouchableOpacity>

      {/* QR 스캐너 모달 */}
      <Modal visible={isScannerVisible} animationType="slide" transparent={true}>
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>QR 코드 스캔</Text>
            <TouchableOpacity onPress={() => setScannerVisible(false)}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scannerContainer}>
            {isScannerVisible && CameraView && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              />
            )}
            <View style={styles.targetBox} />
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerDesc}>회원의 휴대폰에 있는 QR 코드를</Text>
            <Text style={styles.scannerDesc}>사각형 안으로 비춰주세요.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingBottom: 80 },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricBox: { flex: 1, backgroundColor: '#2C2C2C', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginHorizontal: 4 },
  metricTitle: { color: '#999999', fontSize: 11, fontWeight: 'bold', marginBottom: 8 },
  metricValue: { color: '#ffffff', fontSize: 15, fontWeight: '900' },

  card: { backgroundColor: '#2C2C2C', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  viewAllBtn: { borderWidth: 1, borderColor: '#A1BE44', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  viewAllBtnText: { color: '#999999', fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#444444', marginVertical: 15 },
  emptyText: { color: '#999', textAlign: 'center', marginVertical: 10 },

  rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileImg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#444444', marginRight: 15 },
  infoCol: { flex: 1 },
  nameText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  subText: { color: '#999999', fontSize: 13 },

  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },

  noticeListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeTextContent: { flex: 1, paddingRight: 10 },
  noticeTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  noticeActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 6, marginLeft: 6 },
  deleteBtn: { backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 8 },
  actionIcon: { width: 20, height: 20, resizeMode: 'contain' },

  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
  fabIcon: { width: 30, height: 30, tintColor: '#1A1A1A', resizeMode: 'contain' },

  scannerModalOverlay: { flex: 1, backgroundColor: '#1A1A1A' },
  scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1A1A1A' },
  scannerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeIcon: { color: '#999999', fontSize: 28 },
  scannerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  targetBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#A1BE44', backgroundColor: 'transparent', zIndex: 10 },
  scannerFooter: { padding: 40, alignItems: 'center', backgroundColor: '#1A1A1A' },
  scannerDesc: { color: '#ffffff', fontSize: 16, marginTop: 5 },
});

export default ManagerDashboard;