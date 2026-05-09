import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  Animated, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

// API 주소 설정
const BASE = 'http://192.168.0.8:8080/api/v1/posts';
const MEMBERS = `${BASE}/members`;

const p = (n: number) => String(n).padStart(2, '0');

const authHeader = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token}` };
};

const ManagerCommunity = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('전체');
  const tabs = ['전체', '센터', '아웃도어'];

  // 화면 진입 시 데이터 로드
  useEffect(() => {
    if (isFocused) {
      fetchPosts();
    }
  }, [isFocused]);

  // 정렬 로직 (마감된 글은 하단으로, 나머지는 최신순으로)
  const sortPosts = (list: any[]) => {
    return list.sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });
  };

  // 백엔드 API에서 커뮤니티 데이터 가져오기
  const fetchPosts = async () => {
    try {
      const headers = await authHeader();
      // 수정: 백엔드 페이징 규격에 맞춰 URL 파라미터 구성
      const response = await axios.get(`${BASE}?page=0&size=100&sort=id,desc`, { headers });
      
      // 수정: 백엔드의 다중 중첩 구조(data.data.content)를 안전하게 파싱
      const raw = response.data?.data?.data?.content || response.data?.data?.content || response.data?.data || [];
      const list = Array.isArray(raw) ? raw : [];

      const mappedList = list.map((item: any) => {
        const md = new Date(item.meetDateTime);
        const cd = new Date(item.createdAt);
        // 모임 시간이 지났는지 체크
        const isPast = md.getTime() < new Date().getTime(); 
        
        return {
          id: item.id,
          writerId: item.writerId,
          type: item.differentGym ? '아웃도어' : '센터',
          title: item.title,
          desc: item.content,
          author: item.writerName || '알 수 없음',
          location: item.differentGym ? (item.gymPlace || '장소 미정') : 'olla 클라이밍 센터',
          date: isNaN(md.getTime()) ? item.meetDateTime : `${md.getFullYear()}-${p(md.getMonth()+1)}-${p(md.getDate())} ${p(md.getHours())}:${p(md.getMinutes())}`,
          rawMeetDateTime: item.meetDateTime,
          people: `${item.memberCount||0}/${item.maxMember}명`,
          postDate: isNaN(cd.getTime()) ? item.createdAt : `${cd.getFullYear()}.${p(cd.getMonth()+1)}.${p(cd.getDate())}`,
          isPast,
        };
      });

      setPosts(sortPosts(mappedList));
    } catch (error) {
      Alert.alert('오류', '게시글 목록을 불러오지 못했습니다.');
      console.log('ManagerCommunity Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 💡 삭제 모달 로직 (관리자는 무조건 삭제 가능)
  // ==========================================
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const confirmDelete = (id: number) => { 
    setItemToDelete(id); 
    setDeleteModalVisible(true); 
  };
  
  const executeDelete = async () => {
    if (itemToDelete !== null) {
      try {
        const headers = await authHeader();
        await axios.delete(`${BASE}/${itemToDelete}`, { headers });
        Alert.alert("알림", "게시글이 삭제되었습니다.");
        fetchPosts(); // 삭제 후 목록 다시 불러오기
      } catch (error) {
        Alert.alert("오류", "게시글 삭제에 실패했습니다.");
      }
    }
    setDeleteModalVisible(false); 
    setItemToDelete(null);
  };
  
  const cancelDelete = () => { 
    setDeleteModalVisible(false); 
    setItemToDelete(null); 
  };

  // ==========================================
  // 💡 프로필 팝업 로직 (실제 API 연동)
  // ==========================================
  const [isDetailVisible, setDetailVisible] = useState(false);
  const detailSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const openDetailModal = async (authorId: number, authorName: string) => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${MEMBERS}/${authorId}/profile`, { headers });
      const d = data?.data?.data || data?.data || data; 
      
      if (!d) { 
        Alert.alert('프로필 조회 불가','정보를 불러올 수 없습니다.'); 
        return; 
      }
      
      setSelectedUser({
        name: d.name || authorName,
        phone: '-', // 타 회원 프로필 조회 시 전화번호는 주로 블라인드 처리됨
        age: d.age || '-',
        height: d.height || '-',
        weight: d.weight || '-',
        arm: d.armSpan || '-',
        shoe: d.footSize || '-',
        toggles: {
          showName: true,
          showPhone: false,
          showAge: !!d.age,
          showHeight: !!d.height,
          showWeight: !!d.weight,
          showArm: !!d.armSpan,
          showShoe: !!d.footSize,
        },
      });
      setDetailVisible(true);
      setTimeout(() => { Animated.timing(detailSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
    } catch (error) {
      Alert.alert('프로필 조회 불가', '해당 회원의 정보를 불러올 수 없습니다.');
    }
  };

  const closeDetailModal = () => {
    Animated.timing(detailSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { 
      setDetailVisible(false); 
      setSelectedUser(null); 
    });
  };

  const renderDetailRow = (label: string, value: string, isVisible: boolean, unit: string = '') => {
    if (!isVisible) return null;
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}{unit}</Text>
      </View>
    );
  };

  const filteredPosts = posts.filter((post: any) => selectedTab === '전체' || post.type === selectedTab);

  if (loading) {
    return (
      <SafeAreaView style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.background} edges={[]}>
      
      {/* 탭 네비게이션 */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
            onPress={() => setSelectedTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 커뮤니티 리스트 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filteredPosts.map((post: any) => {
          const isOutdoor = post.type === '아웃도어';
          const isPast = post.isPast; // 🔥 마감 여부

          // 마감된 글은 회색, 진행 중인 글은 고유 색상
          const badgeBgColor = isPast ? '#333333' : (isOutdoor ? '#00810F' : '#0072B9');
          const badgeTextColor = isPast ? '#888888' : (isOutdoor ? '#2CDE00' : '#009DFF');

          return (
            <View key={post.id} style={[styles.postCard, isPast && styles.postCardDimmed]}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: badgeBgColor }]}>
                  <Text style={[styles.badgeText, { color: badgeTextColor }]}>{post.type}</Text>
                </View>
                <Text style={styles.postDateText}>{post.postDate}</Text>
              </View>
              
              {/* 마감된 경우 제목/내용도 회색 톤으로 다운 */}
              <Text style={[styles.postTitle, isPast && { color: '#888888' }]}>{post.title}</Text>
              <Text style={[styles.postDesc, isPast && { color: '#666666' }]}>{post.desc}</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.infoItemGroup}>
                  <View style={styles.infoItem}>
                    <Image source={require('../assets/point.png')} style={styles.infoIcon} />
                    <Text style={styles.infoText} numberOfLines={1}>{post.location}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Image source={require('../assets/DATE.png')} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{post.date}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Image source={require('../assets/people.png')} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{post.people}</Text>
                  </View>
                </View>
                
                {/* 💡 관리자 모드: 모든 게시글에 삭제(휴지통) 아이콘 노출 */}
                <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(post.id)}>
                  <Image source={require('../assets/trash.png')} style={[styles.trashIcon, isPast && { tintColor: '#666666' }]} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />
              
              <View style={styles.cardFooter}>
                {/* 프로필 조회 버튼 */}
                <TouchableOpacity style={styles.profileRow} onPress={() => openDetailModal(post.writerId, post.author)}>
                  {post.author === '최강우' ? (
                    <View style={[styles.textProfileImg, isPast && { opacity: 0.5 }]}>
                      <Text style={styles.textProfileText}>최</Text>
                    </View>
                  ) : (
                    <Image source={require('../assets/profile.png')} style={[styles.profileImg, isPast && { opacity: 0.5 }]} />
                  )}
                  <Text style={[styles.authorText, isPast && { color: '#666666' }]}>{post.author}</Text>
                </TouchableOpacity>
            
              </View>
            </View>
          );
        })}
        {filteredPosts.length === 0 && (
          <Text style={{ color: '#999', textAlign: 'center', marginTop: 30 }}>등록된 커뮤니티 글이 없습니다.</Text>
        )}
      </ScrollView>

      {/* 삭제 모달 */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true} onRequestClose={cancelDelete}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={executeDelete}><Text style={styles.deleteBtnYesText}>예</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={cancelDelete}><Text style={styles.deleteBtnNoText}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 프로필 조회 모달 */}
      <Modal visible={isDetailVisible} transparent={true} animationType="fade" onRequestClose={closeDetailModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeDetailModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: detailSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>회원 정보 확인</Text>
                <TouchableOpacity onPress={closeDetailModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
              {selectedUser && (
                <View style={styles.detailContainer}>
                  <View style={styles.detailProfileWrapper}>
                    {selectedUser.name === '최강우' ? (
                       <View style={[styles.textProfileImg, { width: 80, height: 80, borderRadius: 40 }]}>
                         <Text style={[styles.textProfileText, { fontSize: 28 }]}>최</Text>
                       </View>
                    ) : (
                       <Image source={require('../assets/profile.png')} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#444444' }} />
                    )}
                  </View>
                  <View style={styles.detailInfoBox}>
                    {renderDetailRow('이름', selectedUser.name, selectedUser.toggles.showName)}
                    {renderDetailRow('전화번호', selectedUser.phone, selectedUser.toggles.showPhone)}
                    {renderDetailRow('나이', selectedUser.age, selectedUser.toggles.showAge, '세')}
                    {renderDetailRow('키', selectedUser.height, selectedUser.toggles.showHeight, 'cm')}
                    {renderDetailRow('몸무게', selectedUser.weight, selectedUser.toggles.showWeight, 'kg')}
                    {renderDetailRow('팔길이', selectedUser.arm, selectedUser.toggles.showArm, 'cm')}
                    {renderDetailRow('암벽화 사이즈', selectedUser.shoe, selectedUser.toggles.showShoe, 'mm')}
                  </View>
                  <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}>
                    <Text style={styles.closeFullBtnText}>닫기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  activeTabButton: { backgroundColor: '#1D1D1D' },
  tabText: { color: '#999999', fontSize: 15, fontWeight: 'bold' },
  activeTabText: { color: '#ffffff' },
  scrollContent: { paddingBottom: 80 },

  postCard: { backgroundColor: '#212121', borderColor: '#262626', borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 15 },
  postCardDimmed: { opacity: 0.6, borderColor: '#333333' }, // 🔥 마감된 게시글 투명도 조절

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  postDateText: { color: '#999999', fontSize: 12 },
  postTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  postDesc: { color: '#999999', fontSize: 14, lineHeight: 20, marginBottom: 15 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  infoItemGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  infoIcon: { width: 14, height: 14, resizeMode: 'contain', marginRight: 4, tintColor: '#999999' },
  infoText: { color: '#999999', fontSize: 12 },
  
  trashBtn: { padding: 4, marginLeft: 5 },
  trashIcon: { width: 18, height: 18, resizeMode: 'contain', tintColor: '#A1BE44' }, 
  
  divider: { height: 1, backgroundColor: '#333333', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileImg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#444444', marginRight: 10 },
  textProfileImg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#444444', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  textProfileText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  authorText: { color: '#cccccc', fontSize: 14, fontWeight: '600' },

  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteModalText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 25 },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  deleteBtnYesText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  deleteBtnNoText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeBtn: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  detailContainer: { width: '100%' },
  detailProfileWrapper: { alignSelf: 'center', marginBottom: 25 },
  detailInfoBox: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#333333' },
  detailLabel: { color: '#999999', fontSize: 15, fontWeight: 'bold' },
  detailValue: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  closeFullBtn: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  closeFullBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
});

export default ManagerCommunity;