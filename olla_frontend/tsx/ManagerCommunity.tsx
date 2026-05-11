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
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../src/constants/Config';

const POSTS_API = `${API_BASE_URL}/posts`;
const MEMBERS_API = `${API_BASE_URL}/members`;

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

  // ─── 커스텀 알림 모달 상태 추가 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  useEffect(() => {
    if (isFocused) {
      fetchPosts();
    }
  }, [isFocused]);

  const sortPosts = (list: any[]) => {
    return list.sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });
  };

  const fetchPosts = async () => {
    try {
      const headers = await authHeader();
      // 💡 POSTS_API 사용
      const response = await axios.get(`${POSTS_API}?page=0&size=100&sort=id,desc`, { headers });
      
      const raw = response.data?.data?.data?.content || response.data?.data?.content || response.data?.data || [];
      const list = Array.isArray(raw) ? raw : [];

      const mappedList = list.map((item: any) => {
        const md = new Date(item.meetDateTime);
        const cd = new Date(item.createdAt);
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
      showResultModal('오류', '게시글 목록을 불러오지 못했습니다.', 'error');
      console.log('ManagerCommunity Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

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
        // 💡 POSTS_API 사용
        await axios.delete(`${POSTS_API}/${itemToDelete}`, { headers });
        showResultModal('성공', '게시글이 삭제되었습니다.', 'success');
        fetchPosts(); 
      } catch (error) {
        showResultModal('오류', '게시글 삭제에 실패했습니다.', 'error');
      }
    }
    setDeleteModalVisible(false); 
    setItemToDelete(null);
  };
  
  const cancelDelete = () => { 
    setDeleteModalVisible(false); 
    setItemToDelete(null); 
  };

  const [isDetailVisible, setDetailVisible] = useState(false);
  const detailSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const openDetailModal = async (authorId: number, authorName: string) => {
    try {
      const headers = await authHeader();
      // 💡 MEMBERS_API 사용
      const { data } = await axios.get(`${MEMBERS_API}/${authorId}/profile`, { headers });
      const d = data?.data?.data || data?.data || data; 
      
      if (!d) { 
        showResultModal('프로필 조회 불가', '정보를 불러올 수 없습니다.', 'error'); 
        return; 
      }
      
      setSelectedUser({
        name: d.name || authorName,
        phone: '-', // 개인정보 보호
        profileImageUrl: d.profileImageUrl,
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
      showResultModal('프로필 조회 불가', '해당 회원의 정보를 불러올 수 없습니다.', 'error');
      console.log('Profile Fetch Error:', error);
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filteredPosts.map((post: any) => {
          const isOutdoor = post.type === '아웃도어';
          const isPast = post.isPast; 

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
              </View>

              <View style={styles.divider} />
              
              <View style={styles.cardFooter}>
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

                <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(post.id)}>
                  <Image source={require('../assets/trash.png')} style={[styles.trashIcon, isPast && { tintColor: '#666666' }]} />
                </TouchableOpacity>
            
              </View>
            </View>
          );
        })}
        {filteredPosts.length === 0 && (
          <Text style={{ color: '#999', textAlign: 'center', marginTop: 30, fontSize: 16 }}>등록된 커뮤니티 글이 없습니다.</Text> // 💡 16 추가
        )}
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

      {/* 삭제 확인 모달 */}
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

      {/* 프로필 정보 바텀시트 모달 */}
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
                    {selectedUser.profileImageUrl ? (
                       <Image source={{ uri: selectedUser.profileImageUrl }} style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#444444' }} /> // 💡 80 -> 90
                    ) : selectedUser.name === '최강우' ? (
                       <View style={[styles.textProfileImg, { width: 90, height: 90, borderRadius: 45 }]}>
                         <Text style={[styles.textProfileText, { fontSize: 32 }]}>최</Text>
                       </View> // 💡 80 -> 90, 28 -> 32
                    ) : (
                       <Image source={require('../assets/profile.png')} style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#444444' }} /> // 💡 80 -> 90
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

// ─────────────────────────── 스타일 (글씨 크기 및 여백 확대 적용) ───────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 }, // 💡 10 -> 12
  activeTabButton: { backgroundColor: '#1D1D1D' },
  tabText: { color: '#999999', fontSize: 17, fontWeight: 'bold' }, // 💡 15 -> 17
  activeTabText: { color: '#ffffff' },
  scrollContent: { paddingBottom: 80 },

  postCard: { backgroundColor: '#212121', borderColor: '#262626', borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 15 },
  postCardDimmed: { opacity: 0.6, borderColor: '#333333' }, 

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 }, // 💡 12, 4 -> 14, 6
  badgeText: { fontSize: 14, fontWeight: 'bold' }, // 💡 12 -> 14
  postDateText: { color: '#999999', fontSize: 14 }, // 💡 12 -> 14
  postTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 6 }, // 💡 18 -> 20
  postDesc: { color: '#999999', fontSize: 16, lineHeight: 22, marginBottom: 15 }, // 💡 14 -> 16, 행간 조절
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  infoItemGroup: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginVertical: 4 }, // 💡 여백 확대
  infoIcon: { width: 16, height: 16, resizeMode: 'contain', marginRight: 6, tintColor: '#999999' }, // 💡 14 -> 16
  infoText: { color: '#999999', fontSize: 14 }, // 💡 12 -> 14
  
  trashBtn: { padding: 10, marginRight: -8 }, // 💡 8 -> 10
  trashIcon: { width: 22, height: 22, resizeMode: 'contain', tintColor: '#A1BE44' }, // 💡 20 -> 22
  
  divider: { height: 1, backgroundColor: '#333333', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  profileImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444444', marginRight: 10 }, // 💡 32 -> 36
  textProfileImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444444', marginRight: 10, justifyContent: 'center', alignItems: 'center' }, // 💡 32 -> 36
  textProfileText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }, // 💡 14 -> 16
  authorText: { color: '#cccccc', fontSize: 16, fontWeight: '600' }, // 💡 14 -> 16

  // 삭제 모달 스타일 (통일)
  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' }, // 💡 300 -> 320
  deleteModalText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25 }, // 💡 16 -> 18
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginRight: 5 }, // 💡 12 -> 16
  deleteBtnYesText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginLeft: 5 }, // 💡 12 -> 16
  deleteBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18

  // 바텀 시트 (회원 정보 모달)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' }, // 💡 20 -> 23
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 }, // 💡 24 -> 28
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  detailContainer: { width: '100%' },
  detailProfileWrapper: { alignSelf: 'center', marginBottom: 25 },
  detailInfoBox: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#333333' }, // 💡 12 -> 14
  detailLabel: { color: '#999999', fontSize: 17, fontWeight: 'bold' }, // 💡 15 -> 17
  detailValue: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' }, // 💡 15 -> 17
  closeFullBtn: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center' }, // 💡 16 -> 18
  closeFullBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18

  // ─── 커스텀 알림 모달 전용 스타일 (통일) ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, // 💡 300 -> 320
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, // 💡 18 -> 20
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, // 💡 15 -> 17
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, // 💡 14 -> 16
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
});

export default ManagerCommunity;