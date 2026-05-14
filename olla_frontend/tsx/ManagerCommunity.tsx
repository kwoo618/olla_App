import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, 
  Animated, TextInput, RefreshControl, KeyboardAvoidingView, Platform, 
  Keyboard, Dimensions, PanResponder, TouchableWithoutFeedback, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../src/constants/Config';

const BASE = `${API_BASE_URL}`;
const POSTS = `${API_BASE_URL}/posts`;
const MEMBERS = `${BASE}/members`;

const authHeader = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token}` };
};

const p = (n: number) => String(n).padStart(2, '0');

// ─── 댓글 임시 타입 정의 ───
interface CommentType {
  id: number;
  author: string;
  date: string;
  content: string;
  likes: number;
  isLiked: boolean;
  parentId: number | null; 
  isMine?: boolean; // 💡 내가 쓴 댓글인지 판별하는 속성 추가
}

const ManagerCommunity = ({ route, navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const currentFilter = route?.params?.filter || 'ALL';
  const [loading, setLoading] = useState(true);

  // ─── 공통 알림 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  // ─── 작성 창 전용 내장 알림창 상태 ───
  const [createAlertVisible, setCreateAlertVisible] = useState(false);
  const [createAlertMessage, setCreateAlertMessage] = useState('');

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  const showCreateAlert = (msg: string) => {
    setCreateAlertMessage(msg);
    setCreateAlertVisible(true);
  };

  const [posts, setPosts] = useState<any[]>([]);
  const [myNickname, setMyNickname] = useState('관리자');
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState('전체');
  const tabs = ['전체', '센터', '아웃도어'];

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // ─── 댓글 모달 전용 상태 ───
  const [isCommentVisible, setCommentVisible] = useState(false);
  const [selectedCommentPostId, setSelectedCommentPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: number, name: string} | null>(null);
  
  // 댓글 삭제용 확인 모달 상태
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);

  // ─── 🌟 팝업창 공통 드래그 앤 드롭 치수 및 로직 🌟 ───
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN = SCREEN_HEIGHT * 0.6; 
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95; 
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.55; // 💡 회원 상세 정보 팝업 높이 지정 (50%)
  const THRESHOLD = (HALF_SCREEN + FULL_SCREEN) / 2; 

  // 1️⃣ 댓글창 전용 애니메이션/PanResponder (확장 가능)
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
        const CLOSE_THRESHOLD = HALF_SCREEN * 0.7;

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

  // 2️⃣ 회원 정보 상세 팝업 애니메이션 (위로 확장 불가, 아래로 닫기만 가능)
  const [isDetailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const detailHeightAnim = useRef(new Animated.Value(0)).current;
  const currentDetailSnap = useRef(DETAIL_MODAL_HEIGHT);

  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        detailHeightAnim.setOffset(currentDetailSnap.current);
        detailHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // 💡 위로 드래그(dy < 0)할 때는 크기가 커지지 않도록 0으로 제한
        detailHeightAnim.setValue(Math.min(0, -gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        detailHeightAnim.flattenOffset();
        const finalHeight = currentDetailSnap.current - gestureState.dy;
        const CLOSE_THRESHOLD = currentDetailSnap.current * 0.7;

        if (finalHeight < CLOSE_THRESHOLD) {
          closeDetailModal();
        } else {
          Animated.spring(detailHeightAnim, { toValue: currentDetailSnap.current, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  useEffect(() => { 
    if (isFocused) {
      initData(currentFilter); 
    }
  }, [isFocused, currentFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initData(currentFilter);
    setRefreshing(false);
  }, [currentFilter]);

  const initData = async (filterToUse: string) => {
    let uName = '', uNick = '', uId = null;
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${MEMBERS}/me`, { headers });
      const d = data?.data?.data;
      if (d) {
        uName = d.name || ''; 
        uNick = d.nickname || d.name || '관리자'; 
        uId = d.id || d.memberId || null;
        setMyNickname(uNick || uName); setMyUserId(uId);
      }
    } catch (e: any) {
      console.log('내 정보 로드 실패:', e.response?.data?.message || e.message);
    }
    await fetchPosts(uName, uNick, uId, filterToUse);
  };

  const sortPosts = (list: any[]) => {
    return [...list].sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });
  };

  const checkIsMine = (writerId: number | null, writerName: string, uId: number | null, uName: string, uNick: string): boolean => {
    if (uId !== null && writerId !== null && writerId !== undefined) {
      return Number(writerId) === Number(uId);
    }
    return writerName === uName || writerName === uNick;
  };

  const fetchPosts = async (uName: string, uNick: string, uId: number | null, filterToUse: string) => {
    try {
      setLoading(true);
      const headers = await authHeader();
      const urlMap: any = { MY_WRITTEN: `${POSTS}/me`, MY_APPLIED: `${POSTS}/me/applied` };
      const url = `${urlMap[filterToUse] || POSTS}?page=0&size=100`;
      
      const { data } = await axios.get(url, { headers });
      let list = [];
      if (data?.data?.content) list = data.data.content;
      else if (data?.data?.data?.content) list = data.data.data.content;
      else if (Array.isArray(data?.data)) list = data.data;
      else if (Array.isArray(data?.data?.data)) list = data.data.data;

      if (filterToUse === 'MY_APPLIED') {
        list = list.filter((item: any) => {
          const isMine = checkIsMine(item.writerId, item.writerName || '', uId, uName, uNick);
          return !isMine;
        });
      }

      if (Array.isArray(list)) {
        const mappedList = mapPosts(list, uName, uNick, uId);
        setPosts(sortPosts(mappedList));
      }
    } catch (e: any) {
      const errorMessage = e.response?.data?.message || '게시글을 가져오지 못했습니다.';
      showResultModal('불러오기 실패', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const mapPosts = (list: any[], uName: string, uNick: string, uId: number | null) =>
    list.map(item => {
      const md = new Date(item.meetDateTime);
      const cd = new Date(item.createdAt);
      const author = item.writerName || '알 수 없음';
      const isMine = checkIsMine(item.writerId, author, uId, uName, uNick);
      
      const isClosedFlag = 
        item.isClosed === true || 
        item.isClosed === 'true' || 
        item.closed === true || 
        item.closed === 'true' || 
        item.is_closed === 1 || 
        item.is_closed === true ||
        item.status === 'CLOSED';
        
      const isPastDate = !isNaN(md.getTime()) && md.getTime() < new Date().getTime();
      const isPast = isClosedFlag || isPastDate;

      return {
        id: item.id, writerId: item.writerId,
        type: item.differentGym ? '아웃도어' : '센터',
        title: item.title, desc: item.content, author, isMine, isPast,
        location: item.differentGym ? (item.gymPlace || '장소 미정') : 'olla 클라이밍 센터',
        date: isNaN(md.getTime()) ? item.meetDateTime : `${md.getFullYear()}-${p(md.getMonth()+1)}-${p(md.getDate())} ${p(md.getHours())}:${p(md.getMinutes())}`,
        rawMeetDateTime: item.meetDateTime,
        people: `${item.memberCount||0}/${item.maxMember}명`, maxMember: item.maxMember,
        postDate: isNaN(cd.getTime()) ? item.createdAt : `${cd.getFullYear()}.${p(cd.getMonth()+1)}.${p(cd.getDate())}`,
        isJoined: item.applied === true || item.isApplied === true, 
        viewCount: item.viewCount||0,
        likeCount: item.likeCount||0, isLiked: item.liked === true || item.isLiked === true,
        differentGym: item.differentGym, gymPlace: item.gymPlace,
      };
    });

  const updatePost = (id: number, changes: Record<string, any>) =>
    setPosts(prev => prev.map(post => post.id !== id ? post :
      { ...post, ...Object.fromEntries(Object.entries(changes).map(([k,v]) => [k, typeof v==='function' ? v(post) : v])) }
    ));

  const toggleLike = async (id: number, liked: boolean) => {
    updatePost(id, { isLiked: !liked, likeCount: (post: any) => liked ? Math.max(post.likeCount-1,0) : post.likeCount+1 });
    
    if (liked) {
      showResultModal('좋아요 취소', '좋아요가 취소되었습니다.', 'info');
    } else {
      showResultModal('좋아요', '게시글에 좋아요를 눌렀습니다.', 'success');
    }

    try {
      const headers = await authHeader();
      await axios.post(`${POSTS}/${id}/like`, {}, { headers });
    } catch (e: any) {
      updatePost(id, { isLiked: liked, likeCount: (post: any) => liked ? post.likeCount+1 : post.likeCount-1 });
      const errorMessage = e.response?.data?.message || '좋아요 요청을 처리할 수 없습니다.';
      showResultModal('오류', errorMessage, 'error');
    }
  };

  const confirmDelete = (id: number) => { 
    setDeleteTarget(id); 
  };
  
  const executeDelete = async () => {
    if (deleteTarget !== null) {
      try {
        const headers = await authHeader();
        await axios.delete(`${POSTS}/${deleteTarget}`, { headers });
        showResultModal('성공', '게시글이 삭제되었습니다.', 'success');
        fetchPosts(myNickname, myNickname, myUserId, currentFilter); 
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || '게시글 삭제에 실패했습니다.';
        showResultModal('오류', errorMessage, 'error');
      }
    }
    setDeleteTarget(null);
  };

  const openDetailModal = async (authorId: number, authorName: string) => {
    try {
      const headers = await authHeader();
      const response = await axios.get(`${MEMBERS}/${authorId}/profile`, { headers });
      
      const d = response.data?.data?.data; 
      
      if (!d) { 
        showResultModal('프로필 조회 불가', '정보를 불러올 수 없습니다.', 'error'); 
        return; 
      }
      
      setSelectedUser({
        name: d.name || authorName,
        phone: d.phone || '-', 
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
      currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
      detailHeightAnim.setValue(0);
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '해당 회원의 정보를 불러올 수 없습니다.';
      showResultModal('프로필 조회 불가', errorMessage, 'error');
    }
  };

  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => { 
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

  const openCommentModal = (postId: number) => {
    setSelectedCommentPostId(postId);
    const dummyComments: CommentType[] = [
      { id: 1, author: '권클라이밍', date: '2026.05.13', content: '같이 가고 싶습니다!', likes: 2, isLiked: false, parentId: null },
      { id: 2, author: '김초보', date: '2026.05.14', content: '저도 참여할게요!', likes: 5, isLiked: true, parentId: null },
      { id: 3, author: '이중수', date: '2026.05.14', content: '환영합니다~', likes: 0, isLiked: false, parentId: 2 }, 
    ];
    setComments(dummyComments);
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
    });
  };

  const toggleCommentLike = (commentId: number) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 };
      }
      return c;
    }));
  };

  const submitComment = () => {
    if (!commentInput.trim()) return;
    
    const newComment: CommentType = {
      id: Date.now(), 
      author: myNickname || '관리자', 
      date: new Date().toISOString().split('T')[0].replace(/-/g, '.'), 
      content: commentInput.trim(),
      likes: 0,
      isLiked: false,
      parentId: replyingTo ? replyingTo.id : null 
    };

    setComments(prev => [...prev, newComment]);
    setCommentInput('');
    setReplyingTo(null); 
    Keyboard.dismiss(); 
  };

  const executeCommentDelete = () => {
    if (commentDeleteTarget !== null) {
      setComments(prev => prev.filter(c => c.id !== commentDeleteTarget && c.parentId !== commentDeleteTarget));
      showResultModal('성공', '해당 댓글이 삭제되었습니다.', 'success');
    }
    setCommentDeleteTarget(null);
  };

  const sortCommentsLogic = (list: CommentType[]) => {
    return [...list].sort((a, b) => {
      if (b.likes !== a.likes) return b.likes - a.likes; 
      return new Date(b.date).getTime() - new Date(a.date).getTime(); 
    });
  };

  const parentComments = sortCommentsLogic(comments.filter(c => c.parentId === null));
  const getChildComments = (parentId: number) => sortCommentsLogic(comments.filter(c => c.parentId === parentId));

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
            <View key={post.id} style={[styles.postCard, isPast && styles.postCardDimmed]}>
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
                  {post.author === '최강우' ? (
                    <View style={[styles.textProfileImg, isPast && { opacity: 0.5 }]}>
                      <Text style={styles.textProfileText}>최</Text>
                    </View>
                  ) : (
                    <Image source={require('../assets/profile.png')} style={[styles.profileImg, isPast && { opacity: 0.5 }]} />
                  )}
                  <Text style={[styles.authorText, isPast && { color: '#666666' }]}>{post.author}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  
                  <TouchableOpacity style={{ marginRight: 20 }} onPress={() => toggleLike(post.id, post.isLiked)}>
                    <Text style={[styles.statBottomText, post.isLiked && {color:'#FF4D4D'}, { marginRight: 0 }]}>
                      {post.isLiked ? '♥' : '♡'} {post.likeCount}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ marginRight: 10 }} onPress={() => openCommentModal(post.id)}>
                    <Image source={require('../assets/ChatText.png')} style={{ width: 22, height: 22, tintColor: '#ffffff' }} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(post.id)}>
                    <Image source={require('../assets/trash.png')} style={[styles.trashIcon, isPast && { tintColor: '#666666' }]} />
                  </TouchableOpacity>
                </View>
            
              </View>
            </View>
          );
        })}
        {filteredPosts.length === 0 && (
          <Text style={{ color: '#999', textAlign: 'center', marginTop: 30, fontSize: 16 }}>등록된 커뮤니티 글이 없습니다.</Text> 
        )}
      </ScrollView>

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
      <Modal visible={deleteTarget !== null} animationType="fade" transparent={true} onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={executeDelete}><Text style={styles.deleteBtnYesText}>예</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={() => setDeleteTarget(null)}><Text style={styles.deleteBtnNoText}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 댓글 삭제 확인 모달 (관리자 전용) */}
      <Modal visible={commentDeleteTarget !== null} animationType="fade" transparent={true} onRequestClose={() => setCommentDeleteTarget(null)}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>해당 댓글을 삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={executeCommentDelete}><Text style={styles.deleteBtnYesText}>예</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={() => setCommentDeleteTarget(null)}><Text style={styles.deleteBtnNoText}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🌟 프로필 정보 바텀시트 모달 (드래그 추가 및 확장 방지) 🌟 */}
      <Modal visible={isDetailVisible} transparent={true} animationType="fade" onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeDetailModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: detailHeightAnim, overflow: 'hidden' }]}>
            
            <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>회원 정보 확인</Text>
                <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {selectedUser && (
                <View style={styles.detailContainer}>
                  <View style={styles.detailProfileWrapper}>
                    {selectedUser.profileImageUrl ? (
                       <Image source={{ uri: selectedUser.profileImageUrl }} style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#444444' }} /> 
                    ) : selectedUser.name === '최강우' ? (
                       <View style={[styles.textProfileImg, { width: 90, height: 90, borderRadius: 45 }]}>
                         <Text style={[styles.textProfileText, { fontSize: 32 }]}>최</Text>
                       </View> 
                    ) : (
                       <Image source={require('../assets/profile.png')} style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#444444' }} /> 
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
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* 🌟 새로운 댓글/대댓글 모달 창 (드래그 지원 + 관리자 전용 삭제) 🌟 */}
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
                  <Text style={styles.sheetTitle}>댓글</Text>
                  <TouchableOpacity onPress={closeCommentModal} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horizontalDivider} />
              </View>
              
              <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {parentComments.map(parent => (
                  <View key={parent.id}>
                    <View style={styles.commentItem}>
                      <Image source={require('../assets/profile.png')} style={styles.commentAvatar} />
                      <View style={styles.commentContentArea}>
                        <View style={styles.commentHeaderLine}>
                          <Text style={styles.commentAuthorName}>{parent.author}</Text>
                          <Text style={styles.commentDateText}>{parent.date}</Text>
                        </View>
                        <Text style={styles.commentBodyText}>{parent.content}</Text>
                        <TouchableOpacity onPress={() => setReplyingTo({ id: parent.id, name: parent.author })}>
                          <Text style={styles.commentReplyBtnText}>답글 달기</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                        <TouchableOpacity style={{ paddingBottom: 8 }} onPress={() => toggleCommentLike(parent.id)}>
                          <Text style={[styles.commentStatText, parent.isLiked && { color: '#FF4D4D' }]}>{parent.isLiked ? '♥' : '♡'} {parent.likes}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.commentAdminDeletePngBtn} onPress={() => setCommentDeleteTarget(parent.id)}>
                          <Image source={require('../assets/trash.png')} style={styles.commentAdminTrashIcon} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {getChildComments(parent.id).map(child => (
                      <View key={child.id} style={[styles.commentItem, styles.childCommentItem]}>
                        <Image source={require('../assets/profile.png')} style={styles.commentAvatar} />
                        <View style={styles.commentContentArea}>
                          <View style={styles.commentHeaderLine}>
                            <Text style={styles.commentAuthorName}>{child.author}</Text>
                            <Text style={styles.commentDateText}>{child.date}</Text>
                          </View>
                          <Text style={styles.commentBodyText}>{child.content}</Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                          <TouchableOpacity style={{ paddingBottom: 8 }} onPress={() => toggleCommentLike(child.id)}>
                            <Text style={[styles.commentStatText, child.isLiked && { color: '#FF4D4D' }]}>{child.isLiked ? '♥' : '♡'} {child.likes}</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity style={styles.commentAdminDeletePngBtn} onPress={() => setCommentDeleteTarget(child.id)}>
                            <Image source={require('../assets/trash.png')} style={styles.commentAdminTrashIcon} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
                {comments.length === 0 && <Text style={{color:'#999',fontSize:16,textAlign:'center',marginTop:30}}>등록된 댓글이 없습니다.</Text>}
              </ScrollView>

              <View style={styles.commentInputWrapper}>
                {replyingTo && (
                  <View style={styles.replyingToIndicator}>
                    <Text style={styles.replyingToIndicatorText}>{replyingTo.name}님에게 답글 남기는 중</Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}><Text style={styles.replyingCancelText}>✕</Text></TouchableOpacity>
                  </View>
                )}
                <View style={styles.commentInputRow}>
                  <Image source={require('../assets/profile.png')} style={styles.commentInputAvatar} />
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