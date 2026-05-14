import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  Animated, 
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView, 
  Platform, 
  Keyboard, 
  Dimensions, 
  PanResponder, 
  TouchableWithoutFeedback,
  TextInput
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

// 💡 빈 문자열이나 "null" 텍스트 방지 헬퍼 함수
const getProfileImage = (url: string | null | undefined) => {
  if (url && typeof url === 'string' && url.trim() !== '' && url !== 'null' && url !== 'undefined') {
    return { uri: url };
  }
  return require('../assets/profile.png');
};

// 💡 날짜 포맷 함수 (YYYY.MM.DD HH:MM)
const formatCommentDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

interface CommentType {
  id: number;
  content: string;
  writerId: number;
  writerName: string;
  profileImageUrl: string | null;
  createdAt: string;
  children: CommentType[]; // 대댓글 리스트
}

const ManagerCommunity = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('전체');
  const tabs = ['전체', '센터', '아웃도어'];

  const [myNickname, setMyNickname] = useState('관리자');
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null); 

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  const initData = async () => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${MEMBERS_API}/me`, { headers });
      const d = data?.data?.data;
      if (d) {
        setMyNickname(d.nickname || d.name || '관리자');
        setMyUserId(d.id || d.memberId || null);
        setMyProfileImageUrl(d.profileImageUrl || d.profileImage || null);
      }
    } catch (e: any) {
      console.log('ManagerCommunity Me Fetch Error:', e.message);
    }
    await fetchPosts();
  };

  useEffect(() => {
    if (isFocused) {
      initData(); 
    }
  }, [isFocused]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initData(); 
    setRefreshing(false);
  }, []);

  const sortPosts = (list: any[]) => {
    return list.sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });
  };

  const fetchPosts = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true); 
      const headers = await authHeader();
      const response = await axios.get(`${POSTS_API}?page=0&size=100&sort=id,desc`, { headers });
      
      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
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
          viewCount: item.viewCount || 0,
          likeCount: item.likeCount || 0,
          isLiked: item.liked === true || item.isLiked === true,
          profileImageUrl: item.writerProfileImageUrl || item.profileImageUrl || null,
        };
      });

      setPosts(sortPosts(mappedList));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '게시글 목록을 불러오지 못했습니다.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      if (!isRefresh) setLoading(false); 
    }
  };

  const updatePostState = (id: number, changes: Record<string, any>) =>
    setPosts(prev => prev.map(post => post.id !== id ? post :
      { ...post, ...Object.fromEntries(Object.entries(changes).map(([k,v]) => [k, typeof v==='function' ? v(post) : v])) }
    ));

  const toggleLike = async (id: number, liked: boolean) => {
    updatePostState(id, {
      isLiked: !liked,
      likeCount: (post: any) => liked ? Math.max(post.likeCount - 1, 0) : post.likeCount + 1
    });

    if (liked) {
      showResultModal('좋아요 취소', '좋아요가 취소되었습니다.', 'info');
    } else {
      showResultModal('좋아요', '게시글에 좋아요를 눌렀습니다.', 'success');
    }

    try {
      const headers = await authHeader();
      await axios.post(`${POSTS_API}/${id}/like`, {}, { headers });
    } catch (e: any) {
      updatePostState(id, {
        isLiked: liked,
        likeCount: (post: any) => liked ? post.likeCount + 1 : Math.max(post.likeCount - 1, 0)
      });
      const errorMessage = e.response?.data?.message || '좋아요 요청을 처리할 수 없습니다.';
      showResultModal('오류', errorMessage, 'error');
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
        await axios.delete(`${POSTS_API}/${itemToDelete}`, { headers });
        showResultModal('성공', '게시글이 삭제되었습니다.', 'success');
        fetchPosts(true); 
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || '게시글 삭제에 실패했습니다.';
        showResultModal('오류', errorMessage, 'error');
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
      const response = await axios.get(`${MEMBERS_API}/${authorId}/profile`, { headers });
      
      const d = response.data?.data?.data; 
      
      if (!d) { 
        showResultModal('프로필 조회 불가', '정보를 불러올 수 없습니다.', 'error'); 
        return; 
      }

      const detail = d.detail || {};
      
      setSelectedUser({
        name: d.name || authorName,
        phone: '-', 
        profileImageUrl: d.profileImageUrl || d.profileImage,
        age: detail.age || d.age || '-',
        height: detail.height || d.height || '-',
        weight: detail.weight || d.weight || '-',
        arm: detail.armSpan || d.armSpan || '-',
        shoe: detail.footSize || d.footSize || '-',
        toggles: {
          showName: true,
          showPhone: false,
          showAge: !!(detail.age || d.age),
          showHeight: !!(detail.height || d.height),
          showWeight: !!(detail.weight || d.weight),
          showArm: !!(detail.armSpan || d.armSpan),
          showShoe: !!(detail.footSize || d.footSize),
        },
      });
      setDetailVisible(true);
      setTimeout(() => { Animated.timing(detailSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '해당 회원의 정보를 불러올 수 없습니다.';
      showResultModal('프로필 조회 불가', errorMessage, 'error');
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

  // ─── 💡 댓글/게시물 상세 기능 로직 ───
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN = SCREEN_HEIGHT * 0.6; 
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95; 
  const THRESHOLD = (HALF_SCREEN + FULL_SCREEN) / 2; 
  const CLOSE_THRESHOLD = HALF_SCREEN * 0.7; 

  const [isCommentVisible, setCommentVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null); 
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: number, name: string} | null>(null);
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);

  const commentHeightAnim = useRef(new Animated.Value(0)).current;
  const currentSnap = useRef(HALF_SCREEN);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        commentHeightAnim.setOffset(currentSnap.current);
        commentHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        commentHeightAnim.setValue(-gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        commentHeightAnim.flattenOffset();
        const finalHeight = currentSnap.current - gestureState.dy;

        if (finalHeight > THRESHOLD) {
          currentSnap.current = FULL_SCREEN;
          Animated.spring(commentHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight < CLOSE_THRESHOLD) {
          closeCommentModal();
        } else {
          currentSnap.current = HALF_SCREEN;
          Animated.spring(commentHeightAnim, { toValue: HALF_SCREEN, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  const fetchComments = async (postId: number) => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${POSTS_API}/${postId}/comments?page=0&size=100`, { headers });
      const fetchedComments = data?.data?.content ?? data?.data?.data?.content ?? [];
      setComments(fetchedComments);
    } catch (e: any) {
      console.log('댓글 조회 실패:', e.response?.data?.message || e.message);
    }
  };

  const openPostDetail = async (post: any) => {
    setSelectedPost(post);
    // 💡 관리자는 조회수를 올리지 않습니다. (increment API 미호출)
    await fetchComments(post.id);
    
    setCommentVisible(true);
    currentSnap.current = HALF_SCREEN;
    commentHeightAnim.setValue(0);
    Animated.timing(commentHeightAnim, { toValue: HALF_SCREEN, duration: 300, useNativeDriver: false }).start();
  };

  const closeCommentModal = () => {
    Animated.timing(commentHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setCommentVisible(false);
      setReplyingTo(null);
      setCommentInput('');
      setSelectedPost(null);
    });
  };

  const submitComment = async () => {
    if (!commentInput.trim() || !selectedPost) return;
    try {
      const headers = await authHeader();
      const payload = {
        content: commentInput.trim(),
        parentId: replyingTo ? replyingTo.id : null
      };
      await axios.post(`${POSTS_API}/${selectedPost.id}/comments`, payload, { headers });
      
      setCommentInput('');
      setReplyingTo(null);
      Keyboard.dismiss();
      
      await fetchComments(selectedPost.id);
    } catch (e: any) {
      const errorMessage = e.response?.data?.message || '댓글을 작성할 수 없습니다.';
      showResultModal('오류', errorMessage, 'error');
    }
  };

  const executeCommentDelete = async () => {
    if (commentDeleteTarget === null || !selectedPost) return;
    try {
      const headers = await authHeader();
      await axios.delete(`${POSTS_API}/${selectedPost.id}/comments/${commentDeleteTarget}`, { headers });
      
      setCommentDeleteTarget(null);
      await fetchComments(selectedPost.id);
      
      setTimeout(() => {
        showResultModal('성공', '해당 댓글이 삭제되었습니다.', 'success');
      }, Platform.OS === 'ios' ? 500 : 300);
    } catch (e: any) {
      setCommentDeleteTarget(null);
      setTimeout(() => {
        const errorMessage = e.response?.data?.message || '댓글을 삭제할 수 없습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, Platform.OS === 'ios' ? 500 : 300);
    }
  };

  const filteredPosts = posts.filter((post: any) => selectedTab === '전체' || post.type === selectedTab);

  // 💡 iOS 모달 겹침 방지: 프로필 컴포넌트를 독립적인 함수로 분리하여 필요시 뷰로 덮어씌움
  const ProfileModalUI = () => (
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
                <Image source={getProfileImage(selectedUser.profileImageUrl)} style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#444444' }} /> 
              </View>
              <View style={styles.detailInfoBox}>
                {renderDetailRow('이름', selectedUser.name, selectedUser.toggles?.showName ?? true)}
                {renderDetailRow('전화번호', selectedUser.phone, selectedUser.toggles?.showPhone ?? true)}
                {renderDetailRow('나이', selectedUser.age, selectedUser.toggles?.showAge ?? true, '세')}
                {renderDetailRow('키', selectedUser.height, selectedUser.toggles?.showHeight ?? true, 'cm')}
                {renderDetailRow('몸무게', selectedUser.weight, selectedUser.toggles?.showWeight ?? true, 'kg')}
                {renderDetailRow('팔길이', selectedUser.arm, selectedUser.toggles?.showArm ?? true, 'cm')}
                {renderDetailRow('암벽화 사이즈', selectedUser.shoe, selectedUser.toggles?.showShoe ?? true, 'mm')}
              </View>
              <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}>
                <Text style={styles.closeFullBtnText}>닫기</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.background} edges={[]}>
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
      >
      
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

        {filteredPosts.map((post: any) => {
          const isOutdoor = post.type === '아웃도어';
          const isPast = post.isPast; 

          const badgeBgColor = isPast ? '#333333' : (isOutdoor ? '#00810F' : '#0072B9');
          const badgeTextColor = isPast ? '#888888' : (isOutdoor ? '#2CDE00' : '#009DFF');

          return (
            // 💡 게시글 카드 전체를 터치하면 댓글/상세 모달이 열립니다.
            <TouchableOpacity 
              key={post.id} 
              style={[styles.postCard, isPast && styles.postCardDimmed]}
              activeOpacity={0.95} 
              onPress={() => openPostDetail(post)} 
            >
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: badgeBgColor }]}>
                  <Text style={[styles.badgeText, { color: badgeTextColor }]}>{post.type}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={styles.statsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                      <Image 
                        source={require('../assets/Eye.png')} 
                        style={{ width: 17, height: 17, tintColor: '#999', marginRight: 4 }} 
                      />
                      <Text style={styles.statTopText}>{post.viewCount}</Text>
                    </View>
                    <Text style={styles.postDateText}>{post.postDate}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.postTitle, isPast && { color: '#888888' }]}>{post.title}</Text>
              <Text style={[styles.postDesc, isPast && { color: '#666666' }]}>{post.desc}</Text>
              
              <View style={styles.infoRow}>
                {([['point.png',post.location],['DATE.png',post.date],['people.png',post.people]] as [string,string][]).map(([img,val],i) => (
                  <View key={i} style={styles.infoItem}>
                    <Image source={img==='point.png'?require('../assets/point.png'):img==='DATE.png'?require('../assets/DATE.png'):require('../assets/people.png')} style={styles.infoIcon}/>
                    <Text style={styles.infoText}>{val}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />
              
              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.profileRow} onPress={() => openDetailModal(post.writerId, post.author)}>
                  <Image source={getProfileImage(post.profileImageUrl)} style={[styles.profileImg, isPast && { opacity: 0.5 }]} />
                  <Text style={[styles.authorText, isPast && { color: '#666666' }]}>{post.author}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity style={{ marginRight: 20 }} onPress={() => toggleLike(post.id, post.isLiked)}>
                    <Text style={[styles.statBottomText, post.isLiked && {color:'#FF4D4D'}, { marginRight: 0 }]}>
                      {post.isLiked ? '♥' : '♡'} {post.likeCount}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ marginRight: 10 }} onPress={() => openPostDetail(post)}>
                    <Image source={require('../assets/ChatText.png')} style={{ width: 22, height: 22, tintColor: '#ffffff' }} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(post.id)}>
                    <Image source={require('../assets/trash.png')} style={[styles.trashIcon, isPast && { tintColor: '#666666' }]} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {filteredPosts.length === 0 && (
          <Text style={{ color: '#999', textAlign: 'center', marginTop: 30, fontSize: 16 }}>등록된 커뮤니티 글이 없습니다.</Text> 
        )}
      </ScrollView>

      {/* 💡 기본 화면에 떠있는 모달들 (댓글 창이 열려 있지 않을 때만 렌더링) */}
      {!isCommentVisible && (
        <>
          {/* 커스텀 알림 결과 모달 */}
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

          {/* 게시글 삭제 확인 모달 */}
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

          {/* 메인 리스트에서 열린 프로필 정보 모달 */}
          <Modal visible={isDetailVisible} transparent={true} animationType="fade" onRequestClose={closeDetailModal}>
            <ProfileModalUI />
          </Modal>
        </>
      )}

      {/* 🌟 새로운 댓글/대댓글 모달 창 (게시글 상세 포함) 🌟 */}
      <Modal visible={isCommentVisible} transparent animationType="fade" onRequestClose={closeCommentModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeCommentModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[styles.commentSheet, { height: commentHeightAnim }]}>
              
              <View {...panResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>게시글 보기</Text>
                  <TouchableOpacity onPress={closeCommentModal} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horizontalDivider} />
              </View>
              
              <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                
                {/* 💡 선택된 게시물 정보 상단 렌더링 */}
                {selectedPost && (
                  <View style={styles.postDetailContainer}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.badge, { backgroundColor: selectedPost.isPast ? '#333' : (selectedPost.type==='아웃도어' ? '#00810F' : '#0072B9') }]}>
                        <Text style={[styles.badgeText, { color: selectedPost.isPast ? '#888' : (selectedPost.type==='아웃도어' ? '#2CDE00' : '#009DFF') }]}>{selectedPost.type}</Text>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                          <Image source={require('../assets/Eye.png')} style={{ width: 17, height: 17, tintColor: '#999', marginRight: 4 }} />
                          <Text style={styles.statTopText}>{selectedPost.viewCount}</Text>
                        </View>
                        <Text style={styles.postDateText}>{selectedPost.postDate}</Text>
                      </View>
                    </View>

                    <Text style={[styles.postTitle, selectedPost.isPast && { color: '#888888' }]}>{selectedPost.title}</Text>
                    <Text style={[styles.postDesc, selectedPost.isPast && { color: '#666666' }]}>{selectedPost.desc}</Text>

                    <View style={styles.infoRow}>
                      <View style={styles.infoItem}>
                        <Image source={require('../assets/point.png')} style={styles.infoIcon}/>
                        <Text style={styles.infoText}>{selectedPost.location}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Image source={require('../assets/DATE.png')} style={styles.infoIcon}/>
                        <Text style={styles.infoText}>{selectedPost.date}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Image source={require('../assets/people.png')} style={styles.infoIcon}/>
                        <Text style={styles.infoText}>{selectedPost.people}</Text>
                      </View>
                    </View>
                    <View style={[styles.divider, { marginBottom: 5 }]}/>
                    <Text style={styles.commentSectionTitle}>댓글 {comments.length}개</Text>
                  </View>
                )}

                {comments.map((parent) => {
                  const isParentDeleted = parent.content === "삭제된 댓글입니다.";
                  
                  return (
                    <View key={`comment-${parent.id}`}>
                      <View style={styles.commentItem}>
                        <TouchableOpacity onPress={() => openDetailModal(parent.writerId, parent.writerName)}>
                          <Image source={getProfileImage(parent.profileImageUrl)} style={styles.commentAvatar} />
                        </TouchableOpacity>
                        <View style={styles.commentContentArea}>
                          <View style={styles.commentHeaderLine}>
                            <TouchableOpacity onPress={() => openDetailModal(parent.writerId, parent.writerName)}>
                              <Text style={styles.commentAuthorName}>{parent.writerName}</Text>
                            </TouchableOpacity>
                            <Text style={styles.commentDateText}>{formatCommentDate(parent.createdAt)}</Text>
                          </View>
                          {/* 💡 삭제 문구 변환 없이 원래 응답 노출 */}
                          <Text style={[styles.commentBodyText, isParentDeleted && { color: '#888' }]}>{parent.content}</Text>
                          
                          {!isParentDeleted && (
                            <TouchableOpacity onPress={() => setReplyingTo({ id: parent.id, name: parent.writerName })}>
                              <Text style={styles.commentReplyBtnText}>답글 달기</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        {/* 💡 관리자 전용 삭제 버튼 (이미 삭제된 댓글이 아닐 경우 노출) */}
                        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                          {!isParentDeleted && (
                            <TouchableOpacity style={styles.commentAdminDeletePngBtn} onPress={() => setCommentDeleteTarget(parent.id)}>
                              <Image source={require('../assets/trash.png')} style={styles.commentAdminTrashIcon} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {parent.children?.map((child) => {
                        const isChildDeleted = child.content === "삭제된 댓글입니다.";

                        return (
                          <View key={`reply-${child.id}`} style={[styles.commentItem, styles.childCommentItem]}>
                            <TouchableOpacity onPress={() => openDetailModal(child.writerId, child.writerName)}>
                              <Image source={getProfileImage(child.profileImageUrl)} style={styles.commentAvatar} />
                            </TouchableOpacity>
                            <View style={styles.commentContentArea}>
                              <View style={styles.commentHeaderLine}>
                                <TouchableOpacity onPress={() => openDetailModal(child.writerId, child.writerName)}>
                                  <Text style={styles.commentAuthorName}>{child.writerName}</Text>
                                </TouchableOpacity>
                                <Text style={styles.commentDateText}>{formatCommentDate(child.createdAt)}</Text>
                              </View>
                              <Text style={[styles.commentBodyText, isChildDeleted && { color: '#888' }]}>{child.content}</Text>
                            </View>

                            <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                              {!isChildDeleted && (
                                <TouchableOpacity style={styles.commentAdminDeletePngBtn} onPress={() => setCommentDeleteTarget(child.id)}>
                                  <Image source={require('../assets/trash.png')} style={styles.commentAdminTrashIcon} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
                {comments.length === 0 && <Text style={{color:'#999',fontSize:16,textAlign:'center',marginTop:30}}>등록된 댓글이 없습니다.</Text>}
              </ScrollView>

              {/* 하단 댓글 입력창 */}
              <View style={styles.commentInputWrapper}>
                {replyingTo && (
                  <View style={styles.replyingToIndicator}>
                    <Text style={styles.replyingToIndicatorText}>{replyingTo.name}님에게 답글 남기는 중</Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}><Text style={styles.replyingCancelText}>✕</Text></TouchableOpacity>
                  </View>
                )}
                <View style={styles.commentInputRow}>
                  <Image source={getProfileImage(myProfileImageUrl)} style={styles.commentInputAvatar} />
                  <TextInput
                    style={styles.commentTextInput}
                    placeholder="댓글을 작성해주세요."
                    placeholderTextColor="#666"
                    value={commentInput}
                    onChangeText={setCommentInput}
                    multiline
                  />
                  <TouchableOpacity onPress={submitComment}>
                    <Text style={[styles.commentSubmitBtn, commentInput.trim() && { color: '#A1BE44' }]}>등록</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>

          {/* 💡 iOS 모달 겹침 버그 방지용 (내부 Absolute 뷰로 렌더링) */}
          {commentDeleteTarget !== null && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <View style={styles.deleteModalOverlay}>
                <View style={styles.deleteModalBox}>
                  <Text style={styles.deleteModalText}>해당 댓글을 삭제하시겠습니까?</Text>
                  <View style={styles.deleteBtnRow}>
                    <TouchableOpacity style={styles.deleteBtnYes} onPress={executeCommentDelete}><Text style={styles.deleteBtnYesText}>예</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtnNo} onPress={() => setCommentDeleteTarget(null)}><Text style={styles.deleteBtnNoText}>아니오</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {resultModalVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
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
            </View>
          )}

          {isDetailVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <ProfileModalUI />
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 }, 
  activeTabButton: { backgroundColor: '#1D1D1D' },
  tabText: { color: '#999999', fontSize: 17, fontWeight: 'bold' }, 
  activeTabText: { color: '#ffffff' },
  scrollContent: { paddingBottom: 80 },

  postCard: { backgroundColor: '#212121', borderColor: '#262626', borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 15 },
  postCardDimmed: { opacity: 0.6, borderColor: '#333333' }, 

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 }, 
  badgeText: { fontSize: 14, fontWeight: 'bold' }, 
  
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statTopText: { color: '#999', fontSize: 14, fontWeight: '500', marginRight: 10 },
  postDateText: { color: '#999999', fontSize: 14 }, 
  
  postTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 6 }, 
  postDesc: { color: '#999999', fontSize: 16, lineHeight: 22, marginBottom: 15 }, 
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 4, flexShrink: 1 }, 
  infoIcon: { width: 14, height: 14, resizeMode: 'contain', marginRight: 4, tintColor: '#999999' }, 
  infoText: { color: '#999999', fontSize: 13, flexShrink: 1 }, 
  
  statBottomText: { color: '#999', fontSize: 14, fontWeight: '500' },

  trashBtn: { padding: 10, marginRight: -8 }, 
  trashIcon: { width: 22, height: 22, resizeMode: 'contain', tintColor: '#A1BE44' }, 
  
  divider: { height: 1, backgroundColor: '#333333', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  profileImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444444', marginRight: 10 }, 
  textProfileImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444444', marginRight: 10, justifyContent: 'center', alignItems: 'center' }, 
  textProfileText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }, 
  authorText: { color: '#cccccc', fontSize: 16, fontWeight: '600' }, 

  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' }, 
  deleteModalText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25 }, 
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginRight: 5 }, 
  deleteBtnYesText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginLeft: 5 }, 
  deleteBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' }, 
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 }, 
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  detailContainer: { width: '100%' },
  detailProfileWrapper: { alignSelf: 'center', marginBottom: 25 },
  detailInfoBox: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#333333' }, 
  detailLabel: { color: '#999999', fontSize: 17, fontWeight: 'bold' }, 
  detailValue: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' }, 
  closeFullBtn: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center' }, 
  closeFullBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, 
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, 
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, 
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 

  commentSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, width: '100%', overflow: 'hidden' },
  postDetailContainer: { paddingBottom: 10, paddingTop: 10 },
  commentSectionTitle: { color: '#A1BE44', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  commentItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  childCommentItem: { marginLeft: 45, borderLeftWidth: 1.5, borderLeftColor: '#444', paddingLeft: 12 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444', marginRight: 12 },
  commentContentArea: { flex: 1, justifyContent: 'center' },
  commentHeaderLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  commentAuthorName: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginRight: 8 },
  commentDateText: { color: '#999999', fontSize: 13 },
  commentBodyText: { color: '#ffffff', fontSize: 16, lineHeight: 22, marginBottom: 6 },
  commentReplyBtnText: { color: '#888888', fontSize: 13, fontWeight: 'bold' },
  
  commentStatText: { color: '#999', fontSize: 14, fontWeight: '500' },
  
  commentAdminDeletePngBtn: { padding: 4, marginTop: 4 }, 
  commentAdminTrashIcon: { width: 18, height: 18, resizeMode: 'contain', tintColor: '#FF0000' },
  
  commentInputWrapper: { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12, backgroundColor: '#1E1E1E' },
  replyingToIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginBottom: 10 },
  replyingToIndicatorText: { color: '#A1BE44', fontSize: 13, fontWeight: 'bold' },
  replyingCancelText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center' },
  commentInputAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444', marginRight: 10 },
  commentTextInput: { flex: 1, backgroundColor: '#000000', color: '#ffffff', fontSize: 15, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, maxHeight: 100 },
  commentSubmitBtn: { color: '#666666', fontSize: 16, fontWeight: 'bold', marginLeft: 12, paddingVertical: 10 },
});

export default ManagerCommunity;