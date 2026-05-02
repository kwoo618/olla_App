import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 💡 추후 App.tsx에서 posts 데이터를 통합 관리할 때 대비하여 props로 받습니다.
const ManagerCommunity = ({ posts: propsPosts, setPosts: propsSetPosts }: any) => {
  const [selectedTab, setSelectedTab] = useState('전체');
  const tabs = ['전체', '센터', '아웃도어'];

  // 임시 더미 데이터 (App.tsx에서 넘겨주지 않았을 경우 사용)
  const [localPosts, setLocalPosts] = useState([
    { 
      id: 1, 
      type: '센터', 
      title: '주말 클라이밍 같이 하실 분!', 
      desc: '이번 주 토요일 오후에 센터에서 같이 클라이밍 하실 분 구합니다.', 
      location: 'olla 클라이밍 센터', 
      date: '2026-03-28', 
      people: '2/4명', 
      postDate: '2026.03.24', 
      author: '권클라이밍',
      isJoined: false
    },
    { 
      id: 2, 
      type: '아웃도어', 
      title: '북한산 암벽 등반 모집', 
      desc: '봄 맞이 북한산 암벽등반 가실 분 모집합니다.', 
      location: '북한산 인수봉', 
      date: '2026-04-05', 
      people: '4/6명', 
      postDate: '2026.03.31', 
      author: '최강우',
      isJoined: false
    },
    { 
      id: 3, 
      type: '센터', 
      title: '지구력 특훈 파티 모집', 
      desc: '오늘 퇴근하고 지구력 벽에서 땀 뺄 분 구합니다.', 
      location: 'olla 클라이밍 센터', 
      date: '2026-04-01', 
      people: '6/6명', 
      postDate: '2026.04.01', 
      author: '박지구력',
      isJoined: true,
      status: '마감' // 임의의 상태 추가 가능
    }
  ]);

  const displayPosts = propsPosts || localPosts;
  const updatePosts = propsSetPosts || setLocalPosts;

  const filteredPosts = displayPosts.filter((post: any) => selectedTab === '전체' || post.type === selectedTab);

  // ==========================================
  // 💡 삭제 모달 로직 (관리자는 모든 글 삭제 가능)
  // ==========================================
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const confirmDelete = (id: number) => { 
    setItemToDelete(id); 
    setDeleteModalVisible(true); 
  };
  
  const executeDelete = () => {
    if (itemToDelete !== null) {
      updatePosts(displayPosts.filter((post: any) => post.id !== itemToDelete));
    }
    setDeleteModalVisible(false); 
    setItemToDelete(null);
  };
  
  const cancelDelete = () => { 
    setDeleteModalVisible(false); 
    setItemToDelete(null); 
  };

  // ==========================================
  // 💡 프로필 팝업 로직 (기존과 동일)
  // ==========================================
  const [isDetailVisible, setDetailVisible] = useState(false);
  const detailSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const openDetailModal = (authorName: string) => {
    // 실제 앱에서는 작성자 이름을 기반으로 유저 DB를 검색하여 띄웁니다.
    // 여기서는 더미 응답으로 설정합니다.
    setSelectedUser({
      name: authorName, 
      phone: '010-0000-0000', 
      age: '25', 
      height: '175', 
      weight: '70', 
      arm: '180', 
      shoe: '260',
      toggles: { showName: true, showAge: true, showPhone: false, showHeight: true, showWeight: false, showArm: true, showShoe: true }
    });
    setDetailVisible(true);
    setTimeout(() => { Animated.timing(detailSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
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
          const badgeBgColor = isOutdoor ? '#00810F' : '#0072B9';
          const badgeTextColor = isOutdoor ? '#2CDE00' : '#009DFF';

          return (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: badgeBgColor }]}>
                  <Text style={[styles.badgeText, { color: badgeTextColor }]}>{post.type}</Text>
                </View>
                <Text style={styles.postDateText}>{post.postDate}</Text>
              </View>
              
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postDesc}>{post.desc}</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.infoItemGroup}>
                  <View style={styles.infoItem}>
                    <Image source={require('./assets/point.png')} style={styles.infoIcon} />
                    <Text style={styles.infoText} numberOfLines={1}>{post.location}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Image source={require('./assets/DATE.png')} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{post.date}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Image source={require('./assets/people.png')} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{post.people}</Text>
                  </View>
                </View>
                
                {/* 💡 관리자 모드: 모든 게시글에 무조건 삭제(휴지통) 아이콘 노출 */}
                <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(post.id)}>
                  <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />
              
              <View style={styles.cardFooter}>
                {/* 프로필 조회 버튼 */}
                <TouchableOpacity style={styles.profileRow} onPress={() => openDetailModal(post.author)}>
                  {post.author === '최강우' ? (
                    <View style={styles.textProfileImg}><Text style={styles.textProfileText}>최</Text></View>
                  ) : (
                    <Image source={require('./assets/profile.png')} style={styles.profileImg} />
                  )}
                  <Text style={styles.authorText}>{post.author}</Text>
                </TouchableOpacity>
                
                {/* 💡 참여하기 버튼, 게시물 관리 텍스트 모두 제거됨 */}
              </View>
            </View>
          );
        })}
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
                       <View style={[styles.textProfileImg, { width: 80, height: 80, borderRadius: 40 }]}><Text style={[styles.textProfileText, { fontSize: 28 }]}>최</Text></View>
                    ) : (
                       <Image source={require('./assets/profile.png')} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#444444' }} />
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
  // 💡 휴지통 색상을 #A1BE44로 변경
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