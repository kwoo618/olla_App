import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 💡 API URL 세팅 (posts는 vi, 관리자는 v1)
const API_BASE_URL_V1 = 'http://192.168.0.23:8080/api/v1';
const API_BASE_URL_VI = 'http://192.168.0.23:8080/api/vi';

const POST_API_URL = `${API_BASE_URL_VI}/posts`;
const NOTICE_API_URL = `${API_BASE_URL_V1}/admin/notices`;
// 이전 curl 로그에서 확인된 실제 회원 조회 API 주소 반영
const MEMBER_API_URL = `${API_BASE_URL_V1}/admin/memberships/members`; 
const MEMBERSHIP_API_URL = `${API_BASE_URL_V1}/admin/memberships`; 
const VISIT_TODAY_API_URL = `${API_BASE_URL_V1}/admin/visits/today`; // 방금 주신 금일 방문자 API

const ManagerDashboard = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);

  // 💡 최상단 4개 지표를 관리할 State
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    activeMemberships: 0,
    todayVisitors: 0,
    totalPosts: 0
  });

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  // 1. 관리자 권한 체크 및 전체 데이터 병렬 로드
  const checkAdminAndFetchData = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('userToken');

      if (!token || role !== 'ADMIN') {
        Alert.alert("권한 오류", "관리자만 접근할 수 있는 페이지입니다.");
        navigation.goBack();
        return;
      }

      // 여러 API를 동시에 호출하되, 하나가 실패해도 다른 지표는 보이도록 개별 에러 처리된 함수들 사용
      await Promise.all([
        fetchNotices(token),
        fetchPosts(token),
        fetchMembers(token),
        fetchVisits(token),
        fetchActiveMemberships(token)
      ]);

    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. 공지사항 데이터 불러오기
  const fetchNotices = async (token: string) => {
    try {
      // 프론트엔드 최적화: 서버에 "최신순으로 딱 2개만 줘!" 라고 요청
      const response = await axios.get(NOTICE_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 2, sort: 'id,desc' } 
      });
      const noticeList = response.data?.data?.content || response.data?.data || [];
      setNotices(noticeList);
    } catch (error) {
      console.error("공지사항 로드 실패", error);
    }
  };

  // 3. 커뮤니티 게시글 & 총 게시글 수 불러오기
  const fetchPosts = async (token: string) => {
    try {
      const response = await axios.get(POST_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 2, sort: 'id,desc' }
      });
      const postList = response.data?.data?.content || response.data?.data || [];
      const totalElements = response.data?.data?.totalElements ?? postList.length;

      setPosts(postList);
      setMetrics(prev => ({ ...prev, totalPosts: totalElements }));
    } catch (error) {
      console.error("게시글 로드 실패", error);
    }
  };

  // 4. 총 회원 수 & 최근 가입 회원 불러오기
  const fetchMembers = async (token: string) => {
    try {
      // 가장 최근 가입한 2명만 효율적으로 가져옴
      const response = await axios.get(MEMBER_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 2, sort: 'id,desc' }
      });
      
      const memberList = response.data?.data?.content || response.data?.data || [];
      const totalElements = response.data?.data?.totalElements ?? memberList.length;

      setRecentMembers(memberList);
      setMetrics(prev => ({ ...prev, totalMembers: totalElements }));
    } catch (error) {
      console.error("회원 데이터 로드 실패", error);
    }
  };

  // 5. 💡 금일 방문자 데이터 불러오기 (제공해주신 응답 구조 반영)
  const fetchVisits = async (token: string) => {
    try {
      const response = await axios.get(VISIT_TODAY_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // JSON 구조에서 data.totalVisitsToday 값을 쏙 빼옴
      const todayCount = response.data?.data?.totalVisitsToday || 0;
      
      setMetrics(prev => ({ ...prev, todayVisitors: todayCount }));
    } catch (error) {
      console.error("방문자 데이터 로드 실패", error);
    }
  };

  /* 5. 금일 방문자 데이터 불러오기 (중복 제거 버전)
  const fetchVisits = async (token: string) => {
    try {
      const response = await axios.get(VISIT_TODAY_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const visitLogs = response.data?.data?.visitLogs || [];
      
      // 💡 Set을 이용해 memberName의 중복을 제거한 진짜 순수 방문자 수 계산
      const uniqueVisitors = new Set(visitLogs.map((log: any) => log.memberName));
      const todayCount = uniqueVisitors.size; 
      
      setMetrics(prev => ({ ...prev, todayVisitors: todayCount }));
    } catch (error) {
      console.error("방문자 데이터 로드 실패", error);
    }
  };
  */

  // 6. 활성 이용권 데이터 불러오기
  const fetchActiveMemberships = async (token: string) => {
    try {
      // (만약 /active 경로가 없다면 이 부분은 백엔드 구현에 맞게 경로를 수정해 주세요)
      const response = await axios.get(`${MEMBERSHIP_API_URL}/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const activeCount = response.data?.data?.totalElements 
                          ?? response.data?.data?.length 
                          ?? (typeof response.data?.data === 'number' ? response.data.data : 0);
      
      setMetrics(prev => ({ ...prev, activeMemberships: activeCount }));
    } catch (error) {
      // 활성 이용권 API가 없거나 에러가 나면 0으로 조용히 덮어둡니다.
      console.log("활성 이용권 로드 실패 (API를 확인해주세요)");
    }
  };

  // 삭제 로직 공통 래퍼 (Alert 모달)
  const confirmDelete = (type: 'notice' | 'post', id: number) => {
    Alert.alert(
      "삭제 확인",
      `해당 ${type === 'notice' ? '공지사항' : '게시글'}을 정말 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        { 
          text: "삭제", 
          style: "destructive", 
          onPress: () => type === 'notice' ? executeDeleteNotice(id) : executeDeletePost(id) 
        }
      ]
    );
  };

  // 공지사항 삭제 API
  const executeDeleteNotice = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${NOTICE_API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("알림", "공지사항이 삭제되었습니다.");
      fetchNotices(token!);
    } catch (error) {
      Alert.alert("오류", "공지사항 삭제에 실패했습니다.");
    }
  };

  // 커뮤니티 삭제 API
  const executeDeletePost = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${POST_API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("알림", "게시글이 삭제되었습니다.");
      fetchPosts(token!);
    } catch (error) {
      Alert.alert("오류", "게시글 삭제에 실패했습니다.");
    }
  };

  // 날짜 포맷팅 함수 (YYYY-MM-DD)
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
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
        
        {/* 1. 최상단 4개 핵심 지표 카드 */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>총 회원 수</Text>
            <Text style={styles.metricValue}>{metrics.totalMembers}명</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>활성이용권</Text>
            <Text style={styles.metricValue}>{metrics.activeMemberships}개</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>금일 방문자</Text>
            {/* 💡 제공받은 데이터의 totalVisitsToday가 연결됨 */}
            <Text style={styles.metricValue}>{metrics.todayVisitors}명</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>커뮤니티 글</Text>
            <Text style={styles.metricValue}>{metrics.totalPosts}개</Text>
          </View>
        </View>

        {/* 2. 최근 가입회원 카드 (백엔드 연동 반영) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 가입회원</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          
{recentMembers.length > 0 ? (
            recentMembers.map((memberResponse, index) => {
              // AdminMemberResponse 구조 (member, activeMembership 정보 포함)
              const member = memberResponse.member || memberResponse; 
              
              const isActive = member.status === 'ACTIVE' || member.role !== 'INACTIVE';
              const badgeBg = isActive ? 'rgba(161, 190, 68, 0.2)' : 'rgba(142, 142, 142, 0.2)';
              const badgeColor = isActive ? '#A1BE44' : '#8E8E8E';
              
              // 💡 이 부분이 핵심입니다! 동료의 데이터 구조에 질문자님의 '출석/미출석' 텍스트를 적용했습니다.
              const label = isActive ? '출석' : '미출석'; 
              
              const profileImgSource = member.profileImageUrl 
                ? { uri: member.profileImageUrl } 
                : require('./assets/profile.png');

              return (
                <View key={member.id || index} style={[styles.rowItem, index > 0 && { marginTop: 15 }]}>
                  <Image source={profileImgSource} style={styles.profileImg} defaultSource={require('./assets/profile.png')} />
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
            <Text style={{ color: '#999', textAlign: 'center', marginVertical: 10 }}>가입 회원이 없습니다.</Text>
          )}
        </View>

        {/* 3. 공지사항 카드 */}
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
                  {notice.important && (
                    <View style={[styles.badge, { backgroundColor: 'rgba(255, 0, 0, 0.2)', alignSelf: 'flex-start', marginBottom: 8 }]}>
                      <Text style={[styles.badgeText, { color: '#FF0000' }]}>중요</Text>
                    </View>
                  )}
                  <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                  <Text style={styles.subText}>{formatDate(notice.createdAt)}</Text>
                </View>
                
                <View style={styles.noticeActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("알림", "수정 페이지로 이동 (개발 예정)")}>
                    <Image source={require('./assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete('notice', notice.id)}>
                    <Image source={require('./assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: '#999', textAlign: 'center', marginVertical: 10 }}>등록된 공지가 없습니다.</Text>
          )}
        </View>

        {/* 4. 최근 커뮤니티 글 카드 */}
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
              const isOutdoor = post.differentGym;
              const badgeBgColor = isOutdoor ? '#00810F' : '#0072B9';
              const badgeTextColor = isOutdoor ? '#2CDE00' : '#009DFF';

              return (
                <View key={post.id} style={[styles.noticeListItem, index > 0 && { marginTop: 20 }]}>
                  <View style={styles.noticeTextContent}>
                    <View style={[styles.badge, { backgroundColor: badgeBgColor, alignSelf: 'flex-start', marginBottom: 8 }]}>
                      <Text style={[styles.badgeText, { color: badgeTextColor }]}>{isOutdoor ? '아웃도어' : '센터'}</Text>
                    </View>
                    <Text style={styles.noticeTitle} numberOfLines={1}>{post.title}</Text>
                    <Text style={[styles.subText, { color: '#ffffff', fontSize: 12 }]}>
                      {post.writerName}  {formatDate(post.createdAt)}
                    </Text>
                  </View>
                  
                  <View style={styles.noticeActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete('post', post.id)}>
                      <Image source={require('./assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
             <Text style={{ color: '#999', textAlign: 'center', marginVertical: 10 }}>등록된 게시글이 없습니다.</Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingBottom: 50 },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricTitle: {
    color: '#999999',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  viewAllBtn: {
    borderWidth: 1,
    borderColor: '#A1BE44',
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20, 
  },
  viewAllBtnText: {
    color: '#999999',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#444444',
    marginVertical: 15,
  },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444444',
    marginRight: 15,
  },
  infoCol: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  nameText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    color: '#999999',
    fontSize: 13,
  },

  // 💡 상태 표시 배지 디자인 수정 (좌우 호, 위아래 직선 + 고정 길이)
  badge: {
    width: 65,            // 💡 고정 너비를 주어서 글자 수와 상관없이 길이를 통일합니다!
    paddingVertical: 4,   // 위아래 여백
    alignItems: 'center', // 💡 글씨를 도형의 정중앙에 오도록 맞춥니다.
    borderRadius: 20,     // 알약 형태(Pill) 생성
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',  // 텍스트 중앙 정렬
  },

  noticeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noticeTextContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingRight: 10, 
  },
  noticeTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  noticeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 6,
  },
  actionIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
});

export default ManagerDashboard;