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

// 빈 문자열이나 "null" 텍스트 방지 헬퍼 함수
const getProfileImage = (url: string | null | undefined) => {
  if (url && typeof url === 'string' && url.trim() !== '' && url !== 'null' && url !== 'undefined') {
    return { uri: url };
  }
  return require('../assets/profile.png');
};

// 날짜 포맷 함수 (YYYY.MM.DD HH:MM)
const formatCommentDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// 성별 변환 함수
const translateGender = (gender: string) => {
  if (!gender || gender === '-') return '-';
  const g = String(gender).toUpperCase();
  if (g === 'MALE' || g === 'M') return '남자';
  if (g === 'FEMALE' || g === 'F') return '여자';
  return gender;
};

interface CommentType {
  id: number;
  content: string;
  writerId: number;
  writerName: string;
  profileImageUrl?: string | null;
  writerProfileImageUrl?: string | null;
  profileImage?: string | null;
  createdAt: string;
  children: CommentType[]; 
}

const CommunityScreen = ({ route, navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const currentFilter = route?.params?.filter || 'ALL';
  const [loading, setLoading] = useState(true);

  // ─── 공통 알림 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  // ─── 작성 창 전용 내장 알림창 상태 ───
  const [createAlertVisible, setCreateAlertVisible] = useState(false);
  const [createAlertMessage, setCreateAlertMessage] = useState('');

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const showCreateAlert = (msg: string) => {
    setCreateAlertMessage(msg);
    setCreateAlertVisible(true);
  };

  const [posts, setPosts] = useState<any[]>([]);
  const [myNickname, setMyNickname] = useState('');
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null); 
  
  const [selectedTab, setSelectedTab] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [closeTarget, setCloseTarget] = useState<number | null>(null);
  const [isCreateVisible, setCreateVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: '센터' as '센터'|'아웃도어', title: '', desc: '', date: '', time: '', people: '2', location: '' });

  // ─── 댓글 모달 전용 상태 ───
  const [isCommentVisible, setCommentVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null); 
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: number, name: string} | null>(null);
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);

  // ─── 🌟 팝업창 공통 드래그 앤 드롭 치수 및 로직 🌟 ───
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN = SCREEN_HEIGHT * 0.6; 
  const CREATE_SCREEN = SCREEN_HEIGHT * 0.85; 
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95; 
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.65; // 프로필 상세 높이 설정 (65%)
  const THRESHOLD = (HALF_SCREEN + FULL_SCREEN) / 2; 
  const CLOSE_THRESHOLD = HALF_SCREEN * 0.7; 

  // 1️⃣ 댓글창 전용 애니메이션/PanResponder
  const commentHeightAnim = useRef(new Animated.Value(0)).current;
  const currentSnap = useRef(HALF_SCREEN); 

  const commentPanResponder = useRef(
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

  // 2️⃣ 작성창 전용 애니메이션/PanResponder
  const createHeightAnim = useRef(new Animated.Value(0)).current;
  const currentCreateSnap = useRef(HALF_SCREEN);

  const createPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        createHeightAnim.setOffset(currentCreateSnap.current);
        createHeightAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        createHeightAnim.setValue(-gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        createHeightAnim.flattenOffset();
        const finalHeight = currentCreateSnap.current - gestureState.dy;

        if (finalHeight > THRESHOLD) {
          currentCreateSnap.current = FULL_SCREEN;
          Animated.spring(createHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight < CLOSE_THRESHOLD) {
          closeCreateModal();
        } else {
          currentCreateSnap.current = HALF_SCREEN;
          Animated.spring(createHeightAnim, { toValue: HALF_SCREEN, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // 3️⃣ 회원 정보 상세 팝업 애니메이션 (위로 확장 불가)
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
        detailHeightAnim.setValue(Math.min(0, -gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        detailHeightAnim.flattenOffset();
        const finalHeight = currentDetailSnap.current - gestureState.dy;

        if (finalHeight < currentDetailSnap.current * 0.7) {
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
      const d = data?.data?.data || data?.data;
      if (d) {
        uName = d.name || ''; 
        uNick = d.nickname || d.name || ''; 
        uId = d.id || d.memberId || null;
        setMyNickname(uNick || uName); 
        setMyUserId(uId);
        setMyProfileImageUrl(d.profileImageUrl || d.profileImage || null); 
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
    return false; 
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
        profileImageUrl: item.writerProfileImageUrl || item.writerProfileImage || item.memberProfileImageUrl || item.profileImageUrl || item.profileImage || null, 
      };
    });

  const searchPosts = async () => {
    if (!searchKeyword.trim()) { showResultModal('알림', '검색어를 입력해주세요.', 'info'); return; }
    setIsSearching(true);
    const kw = searchKeyword.trim().toLowerCase();
    try {
      const headers = await authHeader();
      let backendRes: any[] = [];
      try {
        const { data } = await axios.get(`${POSTS}/search?keyword=${encodeURIComponent(searchKeyword)}&page=0&size=100`, { headers });
        const resList = data?.data?.data?.content ?? data?.data?.content ?? [];
        backendRes = Array.isArray(resList) ? resList : [];
      } catch (e: any) {
        console.log('백엔드 검색 오류:', e.response?.data?.message || e.message);
      }
      
      const { data: allData } = await axios.get(`${POSTS}?page=0&size=100`, { headers });
      const rawAll = allData?.data?.content ?? allData?.data?.data?.content ?? [];
      const all: any[] = Array.isArray(rawAll) ? rawAll : [];
      const filtered = all.filter(i => [i.title,i.content,i.writerName,i.gymPlace].some(v => (v||'').toLowerCase().includes(kw)));
      
      const map = new Map();
      [...backendRes, ...filtered].forEach(i => i?.id != null && map.set(i.id, i));
      
      const mappedList = mapPosts(Array.from(map.values()), '', myNickname, myUserId);
      setPosts(sortPosts(mappedList));
    } catch (e: any) {
      const errorMessage = e.response?.data?.message || '검색에 실패했습니다.';
      showResultModal('검색 실패', errorMessage, 'error');
    }
  };

  const clearSearch = () => { setSearchKeyword(''); setIsSearching(false); initData(currentFilter); };

  const updatePost = (id: number, changes: Record<string, any>) =>
    setPosts(prev => prev.map(post => post.id !== id ? post :
      { ...post, ...Object.fromEntries(Object.entries(changes).map(([k,v]) => [k, typeof v==='function' ? v(post) : v])) }
    ));

  const updatePeople = (id: number, joining: boolean) =>
    setPosts(prev => prev.map(post => {
      if (post.id !== id) return post;
      const [cur, max] = post.people.replace('명','').split('/').map(Number);
      return { ...post, isJoined: joining, people: `${joining?Math.min(cur+1,max):Math.max(cur-1,1)}/${max}명` };
    }));

  const toggleLike = async (id: number, liked: boolean) => {
    updatePost(id, { isLiked: !liked, likeCount: (post: any) => liked ? Math.max(post.likeCount-1,0) : post.likeCount+1 });
    
    try {
      const headers = await authHeader();
      await axios.post(`${POSTS}/${id}/like`, {}, { headers });
    } catch (e: any) {
      updatePost(id, { isLiked: liked, likeCount: (post: any) => liked ? post.likeCount+1 : post.likeCount-1 });
      const errorMessage = e.response?.data?.message || '요청을 처리할 수 없습니다.';
      showResultModal('오류', errorMessage, 'error');
    }
  };

  const toggleJoin = async (id: number, joined: boolean) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    if (post.isPast) {
      showResultModal('참여 불가', '이미 마감된 모집글입니다.', 'info');
      return;
    }

    const [cur, max] = post.people.replace('명','').split('/').map(Number);
    if (!joined && cur >= max) {
      showResultModal('참여 불가', '참여 인원이 마감되었습니다.', 'info');
      return;
    }

    updatePeople(id, !joined);
    try {
      const headers = await authHeader();
      if (joined) {
        await axios.delete(`${POSTS}/${id}/participants`, { headers });
      } else {
        await axios.post(`${POSTS}/${id}/participants`, {}, { headers });
      }
    } catch (e: any) {
      updatePeople(id, joined);
      const errorMessage = e.response?.data?.message || '참여 요청을 처리할 수 없습니다.';
      showResultModal('알림', errorMessage, 'error');
    }
  };

  const incrementViewCount = async (id: number) => {
    try {
      const headers = await authHeader();
      await axios.get(`${POSTS}/${id}`, { headers });
      updatePost(id, { viewCount: (post: any) => post.viewCount+1 });
    } catch {}
  };

  const executeDelete = async () => {
    const targetId = deleteTarget;
    if (targetId === null) return;
    try {
      const headers = await authHeader();
      await axios.delete(`${POSTS}/${targetId}`, { headers });
      
      setPosts(prev => prev.filter(post => post.id !== targetId));
      setDeleteTarget(null);
      
      setTimeout(() => {
        showResultModal('성공', '게시글이 삭제되었습니다.', 'success');
      }, 500);

    } catch (e: any) {
      setDeleteTarget(null);
      setTimeout(() => {
        const errorMessage = e.response?.data?.message || '삭제할 수 없습니다.';
        showResultModal('삭제 실패', errorMessage, 'error');
      }, 500);
    }
  };

  const executeClose = async () => {
    const targetId = closeTarget;
    if (targetId === null) return;
    try {
      const headers = await authHeader();
      await axios.patch(`${POSTS}/${targetId}/close`, {}, { headers });
      
      setPosts(prev => sortPosts([...prev].map(post => post.id === targetId ? { ...post, isPast: true } : post)));
      setCloseTarget(null);
      
      setTimeout(() => {
        showResultModal('성공', '모집이 마감되었습니다.', 'success');
      }, 500);

    } catch (e: any) {
      setCloseTarget(null);
      setTimeout(() => {
        const errorMessage = e.response?.data?.message || '마감 처리할 수 없습니다.';
        showResultModal('마감 실패', errorMessage, 'error');
      }, 500);
    }
  };

  const openDetailModal = async (authorId: number, authorName: string, isMine: boolean) => {
    try {
      Keyboard.dismiss(); 
      const headers = await authHeader();
      const url = isMine ? `${MEMBERS}/me` : `${MEMBERS}/${authorId}/profile`;
      const { data } = await axios.get(url, { headers });
      const d = data?.data?.data || data?.data; 
      
      if (!d) { showResultModal('프로필 조회 불가', '정보를 불러올 수 없습니다.', 'error'); return; }
      
      const detail = d.detail || d;
      const privacy = d.privacy || d;

      setSelectedUser({
        name: d.name || authorName,
        phone: d.phone || '-',
        age: detail.age || d.age || '-',
        gender: translateGender(detail.gender || d.gender || '-'),
        height: detail.height || d.height || '-',
        weight: detail.weight || d.weight || '-',
        arm: detail.armSpan || d.armSpan || '-',
        shoe: detail.footSize || d.footSize || '-',
        profileImageUrl: d.profileImageUrl || d.profileImage || null, 
        toggles: {
          showName: true,
          showPhone: isMine || privacy.isPublicPhone === true || privacy.phonePublic === true,
          showAge: true,
          showHeight: isMine || privacy.isHeightPublic === true || privacy.heightPublic === true,
          showWeight: isMine || privacy.isWeightPublic === true || privacy.weightPublic === true,
          showArm: isMine || privacy.isArmSpanPublic === true || privacy.armSpanPublic === true,
          showShoe: isMine || privacy.isFootSizePublic === true || privacy.footSizePublic === true,
        },
        isMe: isMine
      });

      setDetailVisible(true);
      currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
      detailHeightAnim.setValue(0);
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    } catch (e: any) {
      const errorMessage = e.response?.data?.message || '정보를 불러올 수 없습니다.';
      showResultModal('프로필 조회 불가', errorMessage, 'error');
    }
  };

  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => { 
      setDetailVisible(false); 
      setSelectedUser(null); 
    });
  };

  // ─── 💡 댓글 기능 로직 ───
  const fetchComments = async (postId: number) => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${POSTS}/${postId}/comments?page=0&size=100`, { headers });
      const fetchedComments = data?.data?.content ?? data?.data?.data?.content ?? [];
      setComments(fetchedComments);
    } catch (e: any) {
      console.log('댓글 조회 실패:', e.response?.data?.message || e.message);
    }
  };

  const openPostDetail = async (post: any) => {
    setSelectedPost({ ...post, viewCount: post.viewCount + 1 });
    incrementViewCount(post.id); 
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
      
      await axios.post(`${POSTS}/${selectedPost.id}/comments`, payload, { headers });
      
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
      await axios.delete(`${POSTS}/${selectedPost.id}/comments/${commentDeleteTarget}`, { headers });
      
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

  // ─── 💡 모집 글 작성/수정 로직 ───
  const openCreateModal = () => {
    setIsEditMode(false); setEditPostId(null);
    setForm({ category:'센터', title:'', desc:'', date:'', time:'', people:'2', location:'' });
    setCreateVisible(true);
    
    currentCreateSnap.current = CREATE_SCREEN;
    createHeightAnim.setValue(0);
    Animated.timing(createHeightAnim, { toValue: CREATE_SCREEN, duration: 300, useNativeDriver: false }).start();
  };

  const openEditModal = (post: any) => {
    setIsEditMode(true); setEditPostId(post.id);
    const md = new Date(post.rawMeetDateTime);
    setForm({
      category: post.differentGym ? '아웃도어' : '센터', title: post.title, desc: post.desc,
      date: isNaN(md.getTime()) ? '' : `${md.getFullYear()}/${p(md.getMonth()+1)}/${p(md.getDate())}`,
      time: isNaN(md.getTime()) ? '' : `${p(md.getHours())}:${p(md.getMinutes())}`,
      people: String(post.maxMember), location: post.gymPlace||'',
    });
    setCreateVisible(true);
    
    currentCreateSnap.current = CREATE_SCREEN;
    createHeightAnim.setValue(0);
    Animated.timing(createHeightAnim, { toValue: CREATE_SCREEN, duration: 300, useNativeDriver: false }).start();
  };

  const closeCreateModal = () => {
    Animated.timing(createHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setCreateVisible(false);
    });
  };

  const submitPost = async () => {
    const { category, title, desc, date, time, people, location } = form;
    
    let errorMsg = '';

    if (!title?.trim()) errorMsg = '제목을 적어주십시오.';
    else if (!desc?.trim()) errorMsg = '내용을 적어주십시오.';
    else if (!date?.trim()) errorMsg = '날짜를 적어주십시오.';
    else if (!time?.trim()) errorMsg = '시간을 적어주십시오.';
    else if (category === '아웃도어' && !location?.trim()) errorMsg = '아웃도어 장소 정보를 입력해주세요.';
    else if (date?.length !== 10 || time?.length !== 5) errorMsg = '날짜(YYYY/MM/DD)와 시간(HH:MM)을 올바르게 입력해주세요.';

    if (errorMsg) {
      showCreateAlert(errorMsg);
      return;
    }

// 검증 통과 후 진행할 로직...
    
    const [yr, mo, dy] = date.split('/').map(Number);
    const [hr, mn] = time.split(':').map(Number);
    
    if (mo < 1 || mo > 12) { showCreateAlert('올바른 월을 입력해주세요.'); return; }
    if (dy < 1 || dy > new Date(yr, mo, 0).getDate()) { showCreateAlert(`${mo}월은 ${new Date(yr, mo, 0).getDate()}일까지입니다.`); return; }
    if (hr > 23 || mn > 59) { showCreateAlert('올바른 시간을 입력해주세요.'); return; }
    
    const dt = new Date(yr, mo - 1, dy, hr, mn);
    if (dt < new Date()) { showCreateAlert('과거 시간으로 등록할 수 없습니다.'); return; }
    
    const max3 = new Date(); 
    max3.setMonth(max3.getMonth() + 3);
    if (dt > max3) { showCreateAlert('최대 3개월 이내 날짜만 가능합니다.'); return; }
    
    const formattedDateTime = `${yr}-${p(mo)}-${p(dy)}T${p(hr)}:${p(mn)}:00`;

    try {
      const headers = await authHeader();
      const payload = { 
        title, 
        content: desc, 
        isDifferentGym: category === '아웃도어', 
        gymPlace: category === '센터' ? 'olla 클라이밍 센터' : location.trim(), 
        meetDateTime: formattedDateTime, 
        maxMember: parseInt(people, 10) 
      };

      if (isEditMode && editPostId) {
        await axios.patch(`${POSTS}/${editPostId}`, payload, { headers });
      } else {
        await axios.post(POSTS, payload, { headers });
      }
      
      initData(currentFilter);
      closeCreateModal();
      
      setTimeout(() => {
        showResultModal('성공', isEditMode ? '게시글이 성공적으로 수정되었습니다.' : '모집 글이 성공적으로 작성되었습니다.', 'success');
      }, 500);

    } catch (e: any) {
      const errorMessage = e.response?.data?.message || '처리에 실패했습니다.';
      showCreateAlert(errorMessage);
    }
  };

  const filteredPosts = posts.filter(post => selectedTab === '전체' || post.type === selectedTab);

  if (loading) {
    return (
      <SafeAreaView style={[s.bg, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.bg} edges={[]}>
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <TextInput style={s.searchInput} placeholder="제목 / 내용 / 작성자 / 지역 검색" placeholderTextColor="#666" value={searchKeyword} onChangeText={setSearchKeyword} onSubmitEditing={searchPosts} returnKeyType="search" />
          {searchKeyword.length>0 && <TouchableOpacity onPress={clearSearch}><Text style={s.clearText}>✕</Text></TouchableOpacity>}
        </View>
        <TouchableOpacity style={s.searchBtn} onPress={searchPosts}><Text style={s.searchBtnText}>검색</Text></TouchableOpacity>
      </View>

      {isSearching && (
        <View style={s.alertBar}>
          <Text style={s.alertBlue}>"{searchKeyword}" 검색 결과</Text>
          <TouchableOpacity onPress={clearSearch}><Text style={s.clearBtn}>초기화 ✕</Text></TouchableOpacity>
        </View>
      )}

      <View style={s.tabRow}>
        {['전체','센터','아웃도어'].map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, selectedTab===tab&&s.tabActive]} onPress={() => setSelectedTab(tab)}>
            <Text style={[s.tabText, selectedTab===tab&&s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentFilter !== 'ALL' && (
        <View style={s.filterBar}>
          <Text style={s.alertGreen}>{currentFilter==='MY_WRITTEN'?'내가 쓴 게시글':'내가 참여한 게시글'}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({filter:'ALL'})}><Text style={s.clearBtn}>초기화 ✕</Text></TouchableOpacity>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
      >
        {filteredPosts.map(post => {
          const isOut = post.type==='아웃도어';
          const isPast = post.isPast;

          return (
            <TouchableOpacity 
              key={post.id} 
              style={[s.card, isPast && s.cardPast]}
              activeOpacity={0.95} 
              onPress={() => openPostDetail(post)} 
            >
              <View style={s.cardHeader}>
                <View style={[s.badge, { backgroundColor: isPast ? '#333' : (isOut ? '#00810F' : '#0072B9') }]}>
                  <Text style={[s.badgeText, { color: isPast ? '#888' : (isOut ? '#2CDE00' : '#009DFF') }]}>{post.type}</Text>
                </View>
                
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={s.statsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                      <Image 
                        source={require('../assets/Eye.png')} 
                        style={{ width: 17, height: 17, tintColor: '#999', marginRight: 4 }} 
                      />
                      <Text style={s.stat}>{post.viewCount}</Text>
                    </View>
                    <Text style={s.dateText}>{post.postDate}</Text>
                  </View>

                  {post.isMine && !isPast && (
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      <TouchableOpacity style={s.closeBtnAction} onPress={() => setCloseTarget(post.id)}>
                        <Text style={s.closeTextAction}>마감</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.editBtn} onPress={() => openEditModal(post)}>
                        <Text style={s.editText}>수정</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <Text style={[s.title, isPast && { color: '#888' }]}>{post.title}</Text>
              <Text style={[s.desc, isPast && { color: '#666' }]}>{post.desc}</Text>

              <View style={s.infoRow}>
                {([['point.png',post.location],['DATE.png',post.date],['people.png',post.people]] as [string,string][]).map(([img,val],i) => (
                  <View key={i} style={s.infoItem}>
                    <Image source={img==='point.png'?require('../assets/point.png'):img==='DATE.png'?require('../assets/DATE.png'):require('../assets/people.png')} style={s.infoIcon}/>
                    <Text style={s.infoText}>{val}</Text>
                  </View>
                ))}
              </View>

              <View style={s.divider}/>
              <View style={s.footer}>
                <TouchableOpacity style={s.profileRow} onPress={() => openDetailModal(post.writerId, post.author, post.isMine)}>
                  <Image source={getProfileImage(post.profileImageUrl)} style={[s.avatar, isPast && { opacity: 0.5 }]}/>
                  <Text style={[s.author, isPast && { color: '#666' }]}>{post.author}</Text>
                </TouchableOpacity>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity style={{ marginRight: post.isMine ? 11 : 15 }} onPress={() => openPostDetail(post)}>
                    <Image source={require('../assets/ChatText.png')} style={{ width: 22, height: 22, tintColor: '#ffffff' }} />
                  </TouchableOpacity>

                  {!post.isMine && (
                    isPast ? (
                      <View style={[s.joinBtn, s.cancelBtn]}>
                        <Text style={[s.joinText, s.cancelText]}>마감됨</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[s.joinBtn, post.isJoined && s.cancelBtn]} 
                        onPress={() => toggleJoin(post.id, post.isJoined)}
                      >
                        <Text style={[s.joinText, post.isJoined && s.cancelText]}>
                          {post.isJoined ? '취소하기' : '참여하기'}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}

                  {post.isMine && (
                    <View style={s.myActions}>
                      <TouchableOpacity style={s.trashBtn} onPress={() => setDeleteTarget(post.id)}>
                        <Image source={require('../assets/trash.png')} style={[s.trashIcon, isPast && { tintColor: '#A1BE44' }]}/>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {filteredPosts.length===0 && <Text style={s.empty}>등록된 게시글이 없습니다.</Text>}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={openCreateModal}><Text style={s.fabText}>+</Text></TouchableOpacity>

      {/* 💡 기본 화면에 떠있는 알림창 (작성창이나 댓글창이 안열려 있을때만 활성화하여 겹침 방지) */}
      {!isCreateVisible && !isCommentVisible && (
        <>
          <Modal visible={deleteTarget!==null} animationType="fade" transparent onRequestClose={() => setDeleteTarget(null)}>
            <View style={s.overlay}>
              <View style={s.alertBox}>
                <Text style={s.alertTitle}>삭제하시겠습니까?</Text>
                <View style={s.alertBtns}>
                  <TouchableOpacity style={s.btnYes} onPress={executeDelete}><Text style={s.btnYesText}>예</Text></TouchableOpacity>
                  <TouchableOpacity style={s.btnNo} onPress={() => setDeleteTarget(null)}><Text style={s.btnNoText}>아니오</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={closeTarget!==null} animationType="fade" transparent onRequestClose={() => setCloseTarget(null)}>
            <View style={s.overlay}>
              <View style={s.alertBox}>
                <Text style={s.alertTitle}>모집을 마감하시겠습니까?</Text>
                <View style={s.alertBtns}>
                  <TouchableOpacity style={s.btnYes} onPress={executeClose}><Text style={s.btnYesText}>예</Text></TouchableOpacity>
                  <TouchableOpacity style={s.btnNo} onPress={() => setCloseTarget(null)}><Text style={s.btnNoText}>아니오</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
            <View style={s.resultModalOverlay}>
              <View style={s.resultModalBox}>
                <Text style={[s.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
                  {resultModalConfig.title}
                </Text>
                <Text style={s.resultModalMessage}>{resultModalConfig.message}</Text>
                <TouchableOpacity style={s.resultModalBtn} onPress={() => { setResultModalVisible(false); resultModalConfig.onConfirm(); }}>
                  <Text style={s.resultModalBtnText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* 메인 리스트에서 열린 회원 정보 모달 */}
          <Modal visible={isDetailVisible} transparent animationType="fade" onRequestClose={closeDetailModal}>
            <View style={s.modalOverlay}>
              <TouchableWithoutFeedback onPress={closeDetailModal}>
                <View style={StyleSheet.absoluteFill} />
              </TouchableWithoutFeedback>
              <Animated.View style={[s.sheet, { height: detailHeightAnim, overflow: 'hidden' }]}>
                
                <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                  <View style={s.handle} />
                  <View style={s.sheetHeader}>
                    <Text style={s.sheetTitle}>{selectedUser?.isMe?'내 정보':'회원 정보'}</Text>
                    <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.hr} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                  {selectedUser && (
                    <View>
                      <View style={s.profileCenter}>
                        <Image source={getProfileImage(selectedUser.profileImageUrl)} style={s.profileBig} />
                        <Text style={s.profileName}>{selectedUser.name}</Text>
                      </View>
                      <View style={s.infoBox}>
                        {([['이름',selectedUser.name,selectedUser.toggles.showName,''],['성별',selectedUser.gender,true,''],['전화번호',selectedUser.phone,selectedUser.toggles.showPhone,''],['나이',selectedUser.age,selectedUser.toggles.showAge,'세'],['키',selectedUser.height,selectedUser.toggles.showHeight,'cm'],['몸무게',selectedUser.weight,selectedUser.toggles.showWeight,'kg'],['팔길이',selectedUser.arm,selectedUser.toggles.showArm,'cm'],['암벽화 사이즈',selectedUser.shoe,selectedUser.toggles.showShoe,'mm']] as [string,string,boolean,string][])
                          .filter(([,,show]) => show)
                          .map(([label,val,,unit]) => (
                            <View key={label} style={s.infoRowDetail}>
                              <Text style={s.infoLabel}>{label}</Text>
                              <Text style={s.infoVal}>{val!=='-'?val+unit:'-'}</Text>
                            </View>
                          ))}
                      </View>
                      <TouchableOpacity style={s.closeFullBtn} onPress={closeDetailModal}>
                        <Text style={s.closeFullText}>닫기</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
        </>
      )}

      {/* 🌟 새로운 댓글/상세 모달 창 (드래그 지원 + 실제 백엔드 연동) 🌟 */}
      <Modal visible={isCommentVisible} transparent animationType="fade" onRequestClose={closeCommentModal}>
        <View style={s.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeCommentModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[s.commentSheet, { height: commentHeightAnim }]}>
              
              {/* iOS 키보드 밀림 현상 방지용 하단 배경 연장 (Skirt) */}
              <View style={{ position: 'absolute', bottom: -SCREEN_HEIGHT, left: -20, right: -20, height: SCREEN_HEIGHT, backgroundColor: '#1E1E1E' }} />

              <View {...commentPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={s.handle} />
                <View style={s.sheetHeader}>
                  <Text style={s.sheetTitle}>게시글 보기</Text>
                  <TouchableOpacity onPress={closeCommentModal} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.hr} />
              </View>
              
              <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                
                {/* 💡 선택된 게시물 정보 상단 렌더링 */}
                {selectedPost && (
                  <View style={s.postDetailContainer}>
                    <View style={s.cardHeader}>
                      <View style={[s.badge, { backgroundColor: selectedPost.isPast ? '#333' : (selectedPost.type==='아웃도어' ? '#00810F' : '#0072B9') }]}>
                        <Text style={[s.badgeText, { color: selectedPost.isPast ? '#888' : (selectedPost.type==='아웃도어' ? '#2CDE00' : '#009DFF') }]}>{selectedPost.type}</Text>
                      </View>
                      <View style={s.statsRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                          <Image source={require('../assets/Eye.png')} style={{ width: 17, height: 17, tintColor: '#999', marginRight: 4 }} />
                          <Text style={s.stat}>{selectedPost.viewCount}</Text>
                        </View>
                        <Text style={s.dateText}>{selectedPost.postDate}</Text>
                      </View>
                    </View>

                    <Text style={[s.title, selectedPost.isPast && { color: '#888' }]}>{selectedPost.title}</Text>
                    <Text style={[s.desc, selectedPost.isPast && { color: '#666' }]}>{selectedPost.desc}</Text>

                    <View style={s.infoRow}>
                      <View style={s.infoItem}>
                        <Image source={require('../assets/point.png')} style={s.infoIcon}/>
                        <Text style={s.infoText}>{selectedPost.location}</Text>
                      </View>
                      <View style={s.infoItem}>
                        <Image source={require('../assets/DATE.png')} style={s.infoIcon}/>
                        <Text style={s.infoText}>{selectedPost.date}</Text>
                      </View>
                      <View style={s.infoItem}>
                        <Image source={require('../assets/people.png')} style={s.infoIcon}/>
                        <Text style={s.infoText}>{selectedPost.people}</Text>
                      </View>
                    </View>
                    <View style={[s.divider, { marginBottom: 5 }]}/>
                    <Text style={s.commentSectionTitle}>댓글 {comments.length}개</Text>
                  </View>
                )}

                {/* 💡 API를 통해 가져온 댓글 / 대댓글 렌더링 + 아바타 터치 연동 */}
                {comments.map((parent) => {
                  const isParentDeleted = parent.content === "삭제된 댓글입니다.";
                  
                  return (
                    <View key={`comment-${parent.id}`}>
                      <View style={s.commentItem}>
                        <TouchableOpacity onPress={() => openDetailModal(parent.writerId, parent.writerName, myUserId === parent.writerId)}>
                          <Image source={getProfileImage(parent.writerProfileImageUrl || parent.profileImageUrl || parent.profileImage)} style={s.commentAvatar} />
                        </TouchableOpacity>
                        <View style={s.commentContentArea}>
                          <View style={s.commentHeaderLine}>
                            <TouchableOpacity onPress={() => openDetailModal(parent.writerId, parent.writerName, myUserId === parent.writerId)}>
                              <Text style={s.commentAuthorName}>{parent.writerName}</Text>
                            </TouchableOpacity>
                            <Text style={s.commentDateText}>{formatCommentDate(parent.createdAt)}</Text>
                          </View>
                          <Text style={[s.commentBodyText, isParentDeleted && { color: '#888' }]}>{parent.content}</Text>
                          {/* 삭제된 댓글이 아닐 때만 답글 달기 표시 */}
                          {!isParentDeleted && (
                            <TouchableOpacity onPress={() => setReplyingTo({ id: parent.id, name: parent.writerName })}>
                              <Text style={s.commentReplyBtnText}>답글 달기</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        {/* 본인 댓글 삭제 (백엔드 연동) */}
                        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                          {myUserId === parent.writerId && !isParentDeleted && (
                            <TouchableOpacity style={s.commentDeletePngBtn} onPress={() => setCommentDeleteTarget(parent.id)}>
                              <Image source={require('../assets/trash.png')} style={s.commentTrashIcon} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* 대댓글 렌더링 */}
                      {parent.children?.map((child) => {
                        const isChildDeleted = child.content === "삭제된 댓글입니다.";
                        return (
                          <View key={`reply-${child.id}`} style={[s.commentItem, s.childCommentItem]}>
                            <TouchableOpacity onPress={() => openDetailModal(child.writerId, child.writerName, myUserId === child.writerId)}>
                              <Image source={getProfileImage(child.writerProfileImageUrl || child.profileImageUrl || child.profileImage)} style={s.commentAvatar} />
                            </TouchableOpacity>
                            <View style={s.commentContentArea}>
                              <View style={s.commentHeaderLine}>
                                <TouchableOpacity onPress={() => openDetailModal(child.writerId, child.writerName, myUserId === child.writerId)}>
                                  <Text style={s.commentAuthorName}>{child.writerName}</Text>
                                </TouchableOpacity>
                                <Text style={s.commentDateText}>{formatCommentDate(child.createdAt)}</Text>
                              </View>
                              <Text style={[s.commentBodyText, isChildDeleted && { color: '#888' }]}>{child.content}</Text>
                            </View>

                            <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                              {myUserId === child.writerId && !isChildDeleted && (
                                <TouchableOpacity style={s.commentDeletePngBtn} onPress={() => setCommentDeleteTarget(child.id)}>
                                  <Image source={require('../assets/trash.png')} style={s.commentTrashIcon} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
                {comments.length === 0 && <Text style={s.empty}>등록된 댓글이 없습니다.</Text>}
              </ScrollView>

              {/* 하단 댓글 입력창 */}
              <View style={s.commentInputWrapper}>
                {replyingTo && (
                  <View style={s.replyingToIndicator}>
                    <Text style={s.replyingToIndicatorText}>{replyingTo.name}님에게 답글 남기는 중</Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}><Text style={s.replyingCancelText}>✕</Text></TouchableOpacity>
                  </View>
                )}
                <View style={s.commentInputRow}>
                  <Image source={getProfileImage(myProfileImageUrl)} style={s.commentInputAvatar} />
                  <TextInput
                    style={s.commentTextInput}
                    placeholder="댓글을 작성해주세요."
                    placeholderTextColor="#666"
                    value={commentInput}
                    onChangeText={setCommentInput}
                    multiline
                  />
                  <TouchableOpacity onPress={submitComment}>
                    <Text style={[s.commentSubmitBtn, commentInput.trim() && { color: '#A1BE44' }]}>등록</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>

          {/* 💡 iOS 버그 방지용 (댓글 모달 내부에서 최상위 Absolute 뷰로 띄움) */}
          <Modal 
            visible={commentDeleteTarget !== null} 
            animationType="fade" 
            transparent={true} 
            onRequestClose={() => setCommentDeleteTarget(null)}
          >
            <View style={s.overlay}>
              <View style={s.alertBox}>
                <Text style={s.alertTitle}>해당 댓글을 삭제하시겠습니까?</Text>
                <View style={s.alertBtns}>
                  <TouchableOpacity style={s.btnYes} onPress={executeCommentDelete}><Text style={s.btnYesText}>예</Text></TouchableOpacity>
                  <TouchableOpacity style={s.btnNo} onPress={() => setCommentDeleteTarget(null)}><Text style={s.btnNoText}>아니오</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {resultModalVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <View style={s.resultModalOverlay}>
                <View style={s.resultModalBox}>
                  <Text style={[s.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
                    {resultModalConfig.title}
                  </Text>
                  <Text style={s.resultModalMessage}>{resultModalConfig.message}</Text>
                  <TouchableOpacity style={s.resultModalBtn} onPress={() => { setResultModalVisible(false); resultModalConfig.onConfirm(); }}>
                    <Text style={s.resultModalBtnText}>확인</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 💡 댓글 창 내부에서 열린 프로필 창 (iOS 모달 겹침 버그 원천 차단) */}
          {isDetailVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <View style={s.modalOverlay}>
                <TouchableWithoutFeedback onPress={closeDetailModal}>
                  <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
                <Animated.View style={[s.sheet, { height: detailHeightAnim, overflow: 'hidden' }]}>
                  
                  <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                    <View style={s.handle} />
                    <View style={s.sheetHeader}>
                      <Text style={s.sheetTitle}>{selectedUser?.isMe?'내 정보':'회원 정보'}</Text>
                      <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={s.closeBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={s.hr} />
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                    {selectedUser && (
                      <View>
                        <View style={s.profileCenter}>
                          <Image source={getProfileImage(selectedUser.profileImageUrl)} style={s.profileBig} />
                          <Text style={s.profileName}>{selectedUser.name}</Text>
                        </View>
                        <View style={s.infoBox}>
                          {([['이름',selectedUser.name,selectedUser.toggles.showName,''],['성별',selectedUser.gender,true,''],['전화번호',selectedUser.phone,selectedUser.toggles.showPhone,''],['나이',selectedUser.age,selectedUser.toggles.showAge,'세'],['키',selectedUser.height,selectedUser.toggles.showHeight,'cm'],['몸무게',selectedUser.weight,selectedUser.toggles.showWeight,'kg'],['팔길이',selectedUser.arm,selectedUser.toggles.showArm,'cm'],['암벽화 사이즈',selectedUser.shoe,selectedUser.toggles.showShoe,'mm']] as [string,string,boolean,string][])
                            .filter(([,,show]) => show)
                            .map(([label,val,,unit]) => (
                              <View key={label} style={s.infoRowDetail}>
                                <Text style={s.infoLabel}>{label}</Text>
                                <Text style={s.infoVal}>{val!=='-'?val+unit:'-'}</Text>
                              </View>
                            ))}
                        </View>
                        <TouchableOpacity style={s.closeFullBtn} onPress={closeDetailModal}>
                          <Text style={s.closeFullText}>닫기</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </Animated.View>
              </View>
            </View>
          )}

        </View>
      </Modal>

      {/* 🌟 작성/수정 창 (드래그 지원 추가) 🌟 */}
      <Modal visible={isCreateVisible} transparent animationType="fade" onRequestClose={closeCreateModal}>
        <View style={s.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeCreateModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[s.sheet, { height: createHeightAnim, maxHeight: '100%' }]}>
              
              {/* iOS 키보드 밀림 현상 방지용 하단 배경 연장 (Skirt) */}
              <View style={{ position: 'absolute', bottom: -SCREEN_HEIGHT, left: -20, right: -20, height: SCREEN_HEIGHT, backgroundColor: '#1E1E1E' }} />

              <View {...createPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={s.handle} />
                <View style={s.sheetHeader}>
                  <Text style={s.sheetTitle}>{isEditMode ? '게시글 수정' : '모집 글 작성'}</Text>
                  <TouchableOpacity onPress={closeCreateModal} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.hr} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:80}}>
                <TouchableOpacity activeOpacity={1} style={s.formBox}>
                  <Text style={s.label}>카테고리</Text>
                  <View style={s.catRow}>
                    {(['센터','아웃도어'] as const).map(c => (
                      <TouchableOpacity key={c} style={[s.catBtn,form.category===c&&s.catBtnActive]} onPress={() => setForm(f=>({...f,category:c}))}>
                        <Text style={[s.catText,form.category===c&&s.catTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.innerHr}/>

                  <Text style={s.label}>제목</Text>
                  <View style={s.inputWrap}><TextInput style={s.input} placeholder="모집 제목을 작성하세요." placeholderTextColor="#666" value={form.title} onChangeText={v=>setForm(f=>({...f,title:v}))}/></View>

                  <Text style={s.label}>내용</Text>
                  <View style={s.inputWrap}><TextInput style={[s.input,{minHeight:45,textAlignVertical:'top'}]} placeholder="모집 내용을 입력하세요." placeholderTextColor="#666" multiline value={form.desc} onChangeText={v=>setForm(f=>({...f,desc:v}))}/></View>

                  <View style={{flexDirection:'row'}}>
                    <View style={{flex:1,marginRight:8}}>
                      <Text style={s.label}>날짜</Text>
                      <View style={s.inputWrap}><TextInput style={s.input} placeholder="YYYY/MM/DD" placeholderTextColor="#666" value={form.date} onChangeText={v=>{const n=v.replace(/\D/g,'');setForm(f=>({...f,date:n.length>6?`${n.slice(0,4)}/${n.slice(4,6)}/${n.slice(6,8)}`:n.length>4?`${n.slice(0,4)}/${n.slice(4)}`:n}));}} keyboardType="numeric" maxLength={10}/></View>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={s.label}>시간</Text>
                      <View style={s.inputWrap}><TextInput style={s.input} placeholder="00:00" placeholderTextColor="#666" value={form.time} onChangeText={v=>{const n=v.replace(/\D/g,'');setForm(f=>({...f,time:n.length>2?`${n.slice(0,2)}:${n.slice(2,4)}`:n}));}} keyboardType="numeric" maxLength={5}/></View>
                    </View>
                  </View>

                  <Text style={s.label}>모집인원</Text>
                  <View style={s.counterRow}>
                    <TouchableOpacity style={s.counterBtn} onPress={() => setForm(f=>({...f,people:String(Math.max(2,parseInt(f.people||'2')-1))}))}><Text style={s.counterBtnText}>-</Text></TouchableOpacity>
                    <View style={{flexDirection:'row',alignItems:'center',marginHorizontal:15}}>
                      <TextInput style={s.counterInput} value={form.people} onChangeText={v=>setForm(f=>({...f,people:v.replace(/\D/g,'')}))} onBlur={()=>{const n=parseInt(form.people);setForm(f=>({...f,people:String(isNaN(n)||n<2?2:n)}));}} keyboardType="numeric"/>
                      <Text style={s.counterUnit}>명</Text>
                    </View>
                    <TouchableOpacity style={s.counterBtn} onPress={() => setForm(f=>({...f,people:String(parseInt(f.people||'2')+1)}))}><Text style={s.counterBtnText}>+</Text></TouchableOpacity>
                  </View>

                  {form.category==='아웃도어' && (
                    <><View style={s.innerHr}/>
                    <Text style={s.label}>장소정보</Text>
                    <View style={s.inputWrap}><TextInput style={s.input} placeholder="위치" placeholderTextColor="#666" value={form.location} onChangeText={v=>setForm(f=>({...f,location:v}))}/></View></>
                  )}

                  <TouchableOpacity style={s.submitBtn} onPress={submitPost}>
                    <Text style={s.submitText}>{isEditMode?'게시글 수정':'모집 글 게시'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>

          {/* iOS 작성창 모달 겹침 버그 방지용 내장 알림 */}
          {createAlertVisible && (
            <View style={s.innerAlertOverlay}>
              <View style={s.resultModalBox}>
                <Text style={[s.resultModalTitle, { color: '#FF4D4D' }]}>알림</Text>
                <Text style={s.resultModalMessage}>{createAlertMessage}</Text>
                <TouchableOpacity style={s.resultModalBtn} onPress={() => setCreateAlertVisible(false)}>
                  <Text style={s.resultModalBtnText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  bg:{flex:1,backgroundColor:'#1A1A1A',paddingHorizontal:20,paddingTop:10},
  
  searchRow:{flexDirection:'row',marginBottom:12,alignItems:'center'},
  searchBox:{flex:1,backgroundColor:'#262626',borderRadius:10,flexDirection:'row',alignItems:'center',paddingHorizontal:12},
  searchInput:{flex:1,color:'#fff',fontSize:16,paddingVertical:12}, 
  clearText:{color:'#999',fontSize:18,padding:5}, 
  searchBtn:{backgroundColor:'#A1BE44',borderRadius:10,paddingHorizontal:16,paddingVertical:10,marginLeft:10},
  searchBtnText:{color:'#000',fontSize:16,fontWeight:'bold'}, 
  
  alertBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'rgba(0,114,185,0.1)',paddingHorizontal:16,paddingVertical:10,borderRadius:8,marginBottom:10,borderWidth:1,borderColor:'#0072B9'},
  alertBlue:{color:'#009DFF',fontSize:16,fontWeight:'bold'}, 
  filterBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'rgba(161,190,68,0.1)',paddingHorizontal:16,paddingVertical:10,borderRadius:8,marginBottom:15,borderWidth:1,borderColor:'#A1BE44'},
  alertGreen:{color:'#A1BE44',fontSize:16,fontWeight:'bold'}, 
  clearBtn:{color:'#fff',fontSize:14,opacity:0.8}, 
  
  tabRow:{flexDirection:'row',backgroundColor:'#3A3A3A',borderRadius:24,padding:4,marginBottom:20},
  tab:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:20},
  tabActive:{backgroundColor:'#1D1D1D'},
  tabText:{color:'#999',fontSize:17,fontWeight:'bold'}, 
  tabTextActive:{color:'#fff'},
  
  scroll:{paddingBottom:80},
  empty:{color:'#999',fontSize:16,textAlign:'center',marginTop:30}, 
  
  card:{backgroundColor:'#212121',borderColor:'#262626',borderWidth:1.5,borderRadius:16,padding:20,marginBottom:15},
  cardPast:{opacity:0.4,borderColor:'#333'}, 
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  badge:{paddingHorizontal:14,paddingVertical:6,borderRadius:8}, 
  badgeText:{fontSize:14,fontWeight:'bold'}, 
  
  statsRow:{flexDirection:'row',alignItems:'center'},
  stat:{color:'#999',fontSize:14,fontWeight:'500',marginRight:10}, 
  dateText:{color:'#999',fontSize:14}, 
  
  title:{color:'#fff',fontSize:20,fontWeight:'bold',marginBottom:6}, 
  desc:{color:'#999',fontSize:16,lineHeight:22,marginBottom:15}, 
  
  infoRow:{flexDirection:'row',alignItems:'center',marginBottom:15,flexWrap:'wrap'},
  infoItem:{flexDirection:'row',alignItems:'center',marginRight:10,marginBottom:4,flexShrink:1},
  infoIcon:{width:14,height:14,resizeMode:'contain',marginRight:4,tintColor:'#999'}, 
  infoText:{color:'#999',fontSize:13,flexShrink:1}, 
  
  divider:{height:1,backgroundColor:'#333',marginBottom:15},
  footer:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  profileRow:{flexDirection:'row',alignItems:'center'},
  avatar:{width:36,height:36,borderRadius:18,backgroundColor:'#444',marginRight:10}, 
  author:{color:'#ccc',fontSize:16,fontWeight:'600'}, 
  
  joinBtn:{backgroundColor:'#A1BE44',paddingHorizontal:20,paddingVertical:10,borderRadius:12},
  joinText:{color:'#000',fontSize:16,fontWeight:'bold'}, 
  cancelBtn:{backgroundColor:'#333'},
  cancelText:{color:'#fff'},
  
  myActions:{flexDirection:'row',alignItems:'center'},
  
  closeBtnAction:{backgroundColor:'#333',paddingHorizontal:14,paddingVertical:7,borderRadius:8,marginRight:6},
  closeTextAction:{color:'#fff',fontSize:13,fontWeight:'bold'},
  
  editBtn:{backgroundColor:'#333',paddingHorizontal:14,paddingVertical:7,borderRadius:8},
  editText:{color:'#A1BE44',fontSize:13,fontWeight:'bold'}, 

  trashBtn:{padding:6},
  trashIcon:{width:20,height:20,resizeMode:'contain',tintColor:'#A1BE44'}, 
  
  fab:{position:'absolute',right:20,bottom:20,width:60,height:60,borderRadius:30,backgroundColor:'#A1BE44',justifyContent:'center',alignItems:'center',elevation:5},
  fabText:{color:'#000',fontSize:36,marginTop:-4}, 
  
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',alignItems:'center'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'},
  // 💡 기존 overflow: 'hidden' 속성 제거 (배경 연장을 자연스럽게 보여주기 위함)
  sheet:{backgroundColor:'#1E1E1E',borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20,paddingBottom:40,width:'100%'},
  handle:{width:40,height:4,backgroundColor:'#333',borderRadius:2,marginTop:12,marginBottom:20,alignSelf:'center'},
  sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:15},
  sheetTitle:{color:'#fff',fontSize:23,fontWeight:'bold'}, 
  closeBtn:{color:'#999',fontSize:28,paddingHorizontal:10}, 
  hr:{height:1,backgroundColor:'#333',marginBottom:20},
  
  alertBox:{width:300,backgroundColor:'#212121',borderRadius:16,padding:25,alignItems:'center'},
  alertTitle:{color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:25}, 
  alertBtns:{flexDirection:'row',width:'100%'},
  btnYes:{flex:1,backgroundColor:'#A1BE44',paddingVertical:12,borderRadius:8,alignItems:'center',marginRight:5},
  btnYesText:{color:'#fff',fontSize:18,fontWeight:'bold'}, 
  btnNo:{flex:1,backgroundColor:'#262626',paddingVertical:12,borderRadius:8,alignItems:'center',marginLeft:5},
  btnNoText:{color:'#fff',fontSize:18,fontWeight:'bold'}, 
  
  profileCenter:{alignSelf:'center',alignItems:'center',marginBottom:25},
  profileBig:{width:80,height:80,borderRadius:40,backgroundColor:'#444'},
  profileName:{color:'#fff',fontSize:18,fontWeight:'bold',marginTop:12}, 
  infoBox:{backgroundColor:'#262626',borderRadius:16,padding:20,marginBottom:20},
  infoRowDetail:{flexDirection:'row',justifyContent:'space-between',paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:'#333'},
  infoLabel:{color:'#999',fontSize:17,fontWeight:'bold'}, 
  infoVal:{color:'#fff',fontSize:17,fontWeight:'bold'}, 
  closeFullBtn:{width:'100%',backgroundColor:'#A1BE44',borderRadius:12,paddingVertical:16,alignItems:'center'},
  closeFullText:{color:'#000',fontSize:18,fontWeight:'bold'}, 
  
  formBox:{backgroundColor:'#262626',borderWidth:1,borderColor:'#555',borderRadius:16,padding:20,marginTop:5},
  label:{color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:10}, 
  innerHr:{height:1,backgroundColor:'#444',marginVertical:15},
  catRow:{flexDirection:'row',justifyContent:'space-between'},
  catBtn:{flex:1,borderWidth:1,borderColor:'#555',borderRadius:10,paddingVertical:12,alignItems:'center',marginHorizontal:4},
  catBtnActive:{borderColor:'#A1BE44'},
  catText:{color:'#999',fontSize:16,fontWeight:'bold'}, 
  catTextActive:{color:'#A1BE44'},
  
  inputWrap:{backgroundColor:'#000',borderRadius:10,paddingHorizontal:15,paddingVertical:12,marginBottom:15},
  input:{color:'#fff',fontSize:17,padding:0}, 
  
  counterRow:{flexDirection:'row',alignItems:'center',marginBottom:5},
  counterBtn:{width:45,height:45,backgroundColor:'#333',borderRadius:22.5,alignItems:'center',justifyContent:'center'}, 
  counterBtnText:{color:'#fff',fontSize:24,fontWeight:'bold'}, 
  counterInput:{color:'#fff',fontSize:24,fontWeight:'bold',textAlign:'center',minWidth:20,padding:0}, 
  counterUnit:{color:'#999',fontSize:18,fontWeight:'bold',marginLeft:2}, 
  
  submitBtn:{width:'100%',backgroundColor:'#A1BE44',borderRadius:12,paddingVertical:16,alignItems:'center',marginTop:20},
  submitText:{color:'#000',fontSize:18,fontWeight:'bold'}, 

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  innerAlertOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 9999 },
  resultModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, 
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 

  // ─── 💡 기존 overflow: 'hidden' 속성 제거
  commentSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, width: '100%' },
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
  
  commentDeletePngBtn: { padding: 4, marginTop: 4 }, 
  commentTrashIcon: { width: 18, height: 18, resizeMode: 'contain', tintColor: '#FF0000' },
  
  commentInputWrapper: { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12, backgroundColor: '#1E1E1E' },
  replyingToIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginBottom: 10 },
  replyingToIndicatorText: { color: '#A1BE44', fontSize: 13, fontWeight: 'bold' },
  replyingCancelText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center' },
  commentInputAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444', marginRight: 10 },
  commentTextInput: { flex: 1, backgroundColor: '#000000', color: '#ffffff', fontSize: 15, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, maxHeight: 100 },
  commentSubmitBtn: { color: '#666666', fontSize: 16, fontWeight: 'bold', marginLeft: 12, paddingVertical: 10 },
});

export default CommunityScreen;