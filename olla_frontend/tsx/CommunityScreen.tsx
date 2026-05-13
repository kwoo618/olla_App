import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Keyboard, Dimensions, PanResponder, TouchableWithoutFeedback } from 'react-native';
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

const CommunityScreen = ({ route, navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const currentFilter = route?.params?.filter || 'ALL';

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
  const [myNickname, setMyNickname] = useState('');
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [closeTarget, setCloseTarget] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isCreateVisible, setCreateVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: '센터' as '센터'|'아웃도어', title: '', desc: '', date: '', time: '', people: '2', location: '' });

  // ─── 댓글 모달 전용 상태 ───
  const [isCommentVisible, setCommentVisible] = useState(false);
  const [selectedCommentPostId, setSelectedCommentPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: number, name: string} | null>(null);
  
  // 💡 본인 댓글 삭제 확인 모달 상태
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);

  const detailAnim = useRef(new Animated.Value(800)).current;
  const createAnim = useRef(new Animated.Value(800)).current;

  // ─── 댓글창 드래그 앤 드롭 (점프/튕김 현상 완벽 해결) ───
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN = SCREEN_HEIGHT * 0.6; 
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95; 
  const THRESHOLD = (HALF_SCREEN + FULL_SCREEN) / 2; 
  const CLOSE_THRESHOLD = HALF_SCREEN * 0.7; 

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
        uNick = d.nickname || d.name || ''; 
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
      const headers = await authHeader();
      const url = isMine ? `${MEMBERS}/me` : `${MEMBERS}/${authorId}/profile`;
      const { data } = await axios.get(url, { headers });
      const d = data?.data?.data; 
      
      if (!d) { showResultModal('프로필 조회 불가', '정보를 불러올 수 없습니다.', 'error'); return; }
      
      if (isMine) {
        const detail = d.detail || {};
        const privacy = d.privacy || {};
        setSelectedUser({
          name: d.name || authorName,
          phone: d.phone || '-',
          age: detail.age || '-',
          height: detail.height || '-',
          weight: detail.weight || '-',
          arm: detail.armSpan || '-',
          shoe: detail.footSize || '-',
          toggles: {
            showName: true,
            showPhone: privacy.phonePublic !== false,
            showAge: true,
            showHeight: privacy.heightPublic !== false,
            showWeight: privacy.weightPublic !== false,
            showArm: privacy.armSpanPublic !== false,
            showShoe: privacy.footSizePublic !== false,
          },
          isMe: true
        });
      } else {
        setSelectedUser({
          name: d.name || authorName,
          phone: '-', 
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
          isMe: false
        });
      }
      setTimeout(() => Animated.timing(detailAnim,{toValue:0,duration:300,useNativeDriver:true}).start(), 50);
    } catch (e: any) {
      const errorMessage = e.response?.data?.message || '정보를 불러올 수 없습니다.';
      showResultModal('프로필 조회 불가', errorMessage, 'error');
    }
  };

  const closeDetailModal = () =>
    Animated.timing(detailAnim,{toValue:800,duration:250,useNativeDriver:true}).start(() => setSelectedUser(null));

  // ─── 💡 댓글 기능 로직 ───
  const openCommentModal = (postId: number) => {
    setSelectedCommentPostId(postId);
    const dummyComments: CommentType[] = [
      // 💡 더미 데이터 생성 시 내 닉네임과 일치하면 isMine을 true로 줌
      { id: 1, author: '권클라이밍', date: '2026.05.13', content: '같이 가고 싶습니다!', likes: 2, isLiked: false, parentId: null, isMine: (myNickname || '나') === '권클라이밍' },
      { id: 2, author: '김초보', date: '2026.05.14', content: '저도 참여할게요!', likes: 5, isLiked: true, parentId: null, isMine: (myNickname || '나') === '김초보' },
      { id: 3, author: '이중수', date: '2026.05.14', content: '환영합니다~', likes: 0, isLiked: false, parentId: 2, isMine: (myNickname || '나') === '이중수' }, 
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
      author: myNickname || '나', 
      date: new Date().toISOString().split('T')[0].replace(/-/g, '.'), 
      content: commentInput.trim(),
      likes: 0,
      isLiked: false,
      parentId: replyingTo ? replyingTo.id : null,
      isMine: true // 💡 내가 방금 쓴 댓글이므로 isMine은 true
    };

    setComments(prev => [...prev, newComment]);
    setCommentInput('');
    setReplyingTo(null); 
    Keyboard.dismiss(); 
  };

  // 💡 본인 댓글 삭제 실행
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

  const openCreateModal = () => {
    setIsEditMode(false); setEditPostId(null);
    setForm({ category:'센터', title:'', desc:'', date:'', time:'', people:'2', location:'' });
    setCreateVisible(true);
    setTimeout(() => Animated.timing(createAnim,{toValue:0,duration:300,useNativeDriver:true}).start(), 50);
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
    setTimeout(() => Animated.timing(createAnim,{toValue:0,duration:300,useNativeDriver:true}).start(), 50);
  };

  const closeCreateModal = () =>
    Animated.timing(createAnim,{toValue:800,duration:250,useNativeDriver:true}).start(() => setCreateVisible(false));

  const submitPost = async () => {
    const { category, title, desc, date, time, people, location } = form;
    
    if (!title.trim() || !desc.trim() || !date.trim() || !time.trim()) { 
      showCreateAlert('내용을 적어주십시오.'); 
      return; 
    }
    if (category === '아웃도어' && (!location || !location.trim())) {
      showCreateAlert('아웃도어 장소 정보를 입력해주세요.');
      return;
    }
    if (date.length !== 10 || time.length !== 5) { 
      showCreateAlert('날짜(YYYY/MM/DD)와 시간(HH:MM)을 올바르게 입력해주세요.'); 
      return; 
    }
    
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

  return (
    <View style={s.bg}>
      {/* 검색 */}
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

      {/* 게시글 목록 */}
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
              onPress={() => incrementViewCount(post.id)}
            >
              <View style={s.cardHeader}>
                <View style={[s.badge, { backgroundColor: isPast ? '#333' : (isOut ? '#00810F' : '#0072B9') }]}>
                  <Text style={[s.badgeText, { color: isPast ? '#888' : (isOut ? '#2CDE00' : '#009DFF') }]}>{post.type}</Text>
                </View>
                
                {/* 우측 상단 묶음 영역 */}
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

                  {/* 내 게시글일 경우 마감/수정 버튼이 게시일 아래에 위치 */}
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

              {/* 장소/날짜 정보 부분 */}
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
                  <Image source={require('../assets/profile.png')} style={[s.avatar, isPast && { opacity: 0.5 }]}/>
                  <Text style={[s.author, isPast && { color: '#666' }]}>{post.author}</Text>
                </TouchableOpacity>
                
                {/* 우측 하단 액션 묶음 */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  
                  {/* 좋아요 버튼 */}
                  <TouchableOpacity style={{ marginRight: 20 }} onPress={() => toggleLike(post.id,post.isLiked)}>
                    <Text style={[s.stat, post.isLiked&&{color:'#FF4D4D'}, { marginRight: 0 }]}>{post.isLiked?'♥':'♡'} {post.likeCount}</Text>
                  </TouchableOpacity>

                  {/* 댓글 버튼 추가 */}
                  <TouchableOpacity style={{ marginRight: post.isMine ? 11 : 15 }} onPress={() => openCommentModal(post.id)}>
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

      {/* 삭제 확인 모달 */}
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

      {/* 수동 마감 확인 모달 */}
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

      {/* 💡 본인 댓글 삭제 확인 모달 */}
      <Modal visible={commentDeleteTarget !== null} animationType="fade" transparent onRequestClose={() => setCommentDeleteTarget(null)}>
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

      {/* 일반 공통 알림 결과 모달 */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={s.resultModalOverlay}>
          <View style={s.resultModalBox}>
            <Text style={[s.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={s.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={s.resultModalBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={s.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 회원 정보 상세 보기 */}
      <Modal visible={selectedUser!==null} transparent animationType="fade" onRequestClose={closeDetailModal}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeDetailModal}>
          <Animated.View style={[s.sheet,{transform:[{translateY:detailAnim}]}]}>
            <TouchableOpacity activeOpacity={1} style={{width:'100%'}}>
              <View style={s.handle}/><View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>{selectedUser?.isMe?'내 정보':'회원 정보'}</Text>
                <TouchableOpacity onPress={closeDetailModal}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
              </View><View style={s.hr}/>
              {selectedUser && (
                <View>
                  <View style={s.profileCenter}>
                    <Image source={require('../assets/profile.png')} style={s.profileBig}/>
                    <Text style={s.profileName}>{selectedUser.name}</Text>
                  </View>
                  <View style={s.infoBox}>
                    {([['이름',selectedUser.name,selectedUser.toggles.showName,''],['전화번호',selectedUser.phone,selectedUser.toggles.showPhone,''],['나이',selectedUser.age,selectedUser.toggles.showAge,'세'],['키',selectedUser.height,selectedUser.toggles.showHeight,'cm'],['몸무게',selectedUser.weight,selectedUser.toggles.showWeight,'kg'],['팔길이',selectedUser.arm,selectedUser.toggles.showArm,'cm'],['암벽화 사이즈',selectedUser.shoe,selectedUser.toggles.showShoe,'mm']] as [string,string,boolean,string][])
                      .filter(([,,show]) => show)
                      .map(([label,val,,unit]) => (
                        <View key={label} style={s.infoRowDetail}>
                          <Text style={s.infoLabel}>{label}</Text>
                          <Text style={s.infoVal}>{val!=='-'?val+unit:'-'}</Text>
                        </View>
                      ))}
                  </View>
                  <TouchableOpacity style={s.closeFullBtn} onPress={closeDetailModal}><Text style={s.closeFullText}>닫기</Text></TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 🌟 새로운 댓글/대댓글 모달 창 (드래그 지원 + 본인 전용 삭제 기능) 🌟 */}
      <Modal visible={isCommentVisible} transparent animationType="fade" onRequestClose={closeCommentModal}>
        <View style={s.modalOverlay}>
          {/* 바깥쪽 어두운 배경을 클릭했을 때만 창이 꺼지도록 분리 */}
          <TouchableWithoutFeedback onPress={closeCommentModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[s.commentSheet, { height: commentHeightAnim }]}>
              
              <View {...panResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={s.handle} />
                <View style={s.sheetHeader}>
                  <Text style={s.sheetTitle}>댓글</Text>
                  <TouchableOpacity onPress={closeCommentModal} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.hr} />
              </View>
              
              <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {parentComments.map(parent => (
                  <View key={parent.id}>
                    {/* 부모 댓글 렌더링 */}
                    <View style={s.commentItem}>
                      <Image source={require('../assets/profile.png')} style={s.commentAvatar} />
                      <View style={s.commentContentArea}>
                        <View style={s.commentHeaderLine}>
                          <Text style={s.commentAuthorName}>{parent.author}</Text>
                          <Text style={s.commentDateText}>{parent.date}</Text>
                        </View>
                        <Text style={s.commentBodyText}>{parent.content}</Text>
                        <TouchableOpacity onPress={() => setReplyingTo({ id: parent.id, name: parent.author })}>
                          <Text style={s.commentReplyBtnText}>답글 달기</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* 💡 우측 하단 좋아요 & 삭제 컨테이너 */}
                      <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                        {/* 좋아요 버튼 (본인 댓글이면 삭제버튼이 있으므로 아래 여백을 줌) */}
                        <TouchableOpacity style={{ paddingBottom: parent.isMine ? 8 : 0 }} onPress={() => toggleCommentLike(parent.id)}>
                          <Text style={[s.commentStatText, parent.isLiked && { color: '#FF4D4D' }]}>{parent.isLiked ? '♥' : '♡'} {parent.likes}</Text>
                        </TouchableOpacity>
                        
                        {/* 본인 댓글인 경우에만 삭제 버튼 노출 */}
                        {parent.isMine && (
                          <TouchableOpacity style={s.commentDeletePngBtn} onPress={() => setCommentDeleteTarget(parent.id)}>
                            <Image source={require('../assets/trash.png')} style={s.commentTrashIcon} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* 대댓글 렌더링 (들여쓰기 적용) */}
                    {getChildComments(parent.id).map(child => (
                      <View key={child.id} style={[s.commentItem, s.childCommentItem]}>
                        <Image source={require('../assets/profile.png')} style={s.commentAvatar} />
                        <View style={s.commentContentArea}>
                          <View style={s.commentHeaderLine}>
                            <Text style={s.commentAuthorName}>{child.author}</Text>
                            <Text style={s.commentDateText}>{child.date}</Text>
                          </View>
                          <Text style={s.commentBodyText}>{child.content}</Text>
                        </View>

                        {/* 💡 우측 하단 좋아요 & 삭제 컨테이너 */}
                        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                          {/* 좋아요 버튼 (본인 댓글이면 삭제버튼이 있으므로 아래 여백을 줌) */}
                          <TouchableOpacity style={{ paddingBottom: child.isMine ? 8 : 0 }} onPress={() => toggleCommentLike(child.id)}>
                            <Text style={[s.commentStatText, child.isLiked && { color: '#FF4D4D' }]}>{child.isLiked ? '♥' : '♡'} {child.likes}</Text>
                          </TouchableOpacity>
                          
                          {/* 본인 댓글인 경우에만 삭제 버튼 노출 */}
                          {child.isMine && (
                            <TouchableOpacity style={s.commentDeletePngBtn} onPress={() => setCommentDeleteTarget(child.id)}>
                              <Image source={require('../assets/trash.png')} style={s.commentTrashIcon} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
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
                  <Image source={require('../assets/profile.png')} style={s.commentInputAvatar} />
                  <TextInput
                    style={s.commentTextInput}
                    placeholder="댓글을 작성해주세요."
                    placeholderTextColor="#666"
                    value={commentInput}
                    onChangeText={setCommentInput}
                    multiline
                  />
                  <TouchableOpacity onPress={submitComment}>
                    {/* 💡 입력 내용이 있으면 등록 버튼이 다시 메인 컬러(연두색)로 빛납니다! */}
                    <Text style={[s.commentSubmitBtn, commentInput.trim() && { color: '#A1BE44' }]}>등록</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 작성/수정 창 */}
      <Modal visible={isCreateVisible} transparent animationType="fade" onRequestClose={closeCreateModal}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeCreateModal}>
          <Animated.View style={[s.sheet,{transform:[{translateY:createAnim}],maxHeight:'90%'}]}>
            <TouchableOpacity activeOpacity={1} style={{width:'100%'}}>
              <View style={s.handle}/><View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>{isEditMode?'게시글 수정':'모집 글 작성'}</Text>
                <TouchableOpacity onPress={closeCreateModal}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
              </View><View style={s.hr}/>
            </TouchableOpacity>
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

          {/* iOS 모달 겹침 버그 방지용 알림 */}
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
        </TouchableOpacity>
      </Modal>
    </View>
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

  // ─── 💡 댓글 모달 전용 스타일 (드래그 지원) ───
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
  
  // 댓글 내 좋아요 숫자 스타일
  commentStatText: { color: '#999', fontSize: 14, fontWeight: '500' },
  
  // 💡 본인 전용: PNG 삭제 버튼 스타일 (빨간색 휴지통, 배경 없음)
  commentDeletePngBtn: { padding: 4, marginTop: 4 }, // 좋아요 아래 공간 확보
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