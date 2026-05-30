import { useState, useEffect, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

const BASE = `${API_BASE_URL}`;
const POSTS = `${API_BASE_URL}/posts`;
const MEMBERS = `${BASE}/members`;

export const authHeader = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token}` };
};

export const p = (n: number) => String(n).padStart(2, '0');

export const getProfileImage = (url: string | null | undefined) => {
  if (url && typeof url === 'string' && url.trim() !== '' && url !== 'null' && url !== 'undefined') {
    return { uri: url };
  }
  return require('../assets/profile.png');
};

export const formatCommentDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const translateGender = (gender: string) => {
  if (!gender || gender === '-') return '-';
  const g = String(gender).toUpperCase();
  if (g === 'MALE' || g === 'M') return '남자';
  if (g === 'FEMALE' || g === 'F') return '여자';
  return gender;
};

export interface CommentType {
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

export const useCommunityData = (currentFilter: string, isFocused: boolean) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });
  const [createAlertVisible, setCreateAlertVisible] = useState(false);
  const [createAlertMessage, setCreateAlertMessage] = useState('');

  // 유저 및 게시글 상태
  const [posts, setPosts] = useState<any[]>([]);
  const [myNickname, setMyNickname] = useState('');
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null); 
  
  const [selectedTab, setSelectedTab] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [closeTarget, setCloseTarget] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: '센터' as '센터'|'아웃도어', title: '', desc: '', date: '', time: '', people: '2', location: '' });

  // 상세/댓글 상태
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null); 
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: number, name: string} | null>(null);
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const closeResultModal = () => {
    setResultModalVisible(false);
    resultModalConfig.onConfirm();
  };

  const showCreateAlert = (msg: string) => {
    setCreateAlertMessage(msg);
    setCreateAlertVisible(true);
  };

  const initData = async (filterToUse: string) => {
    let uName = '', uNick = '', uId = null;
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${MEMBERS}/me`, { headers });
      const d = data.data
      if (d) {
        uName = d.name || ''; 
        uNick = d.nickname || d.name || ''; 
        uId = d.id || d.memberId || null;
        setMyNickname(uNick || uName); 
        setMyUserId(uId);
        setMyProfileImageUrl(d.profileImageUrl || d.profileImage || null); 
      }
    } catch (e: any) {}
    await fetchPosts(uName, uNick, uId, filterToUse);
  };

  useEffect(() => { 
    if (isFocused) initData(currentFilter); 
  }, [isFocused, currentFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initData(currentFilter);
    setRefreshing(false);
  }, [currentFilter]);

  const sortPosts = (list: any[]) => {
    return [...list].sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });
  };

  const checkIsMine = (writerId: number | null, writerName: string, uId: number | null, uName: string, uNick: string): boolean => {
    return (uId !== null && writerId !== null && writerId !== undefined) ? Number(writerId) === Number(uId) : false; 
  };

  const fetchPosts = async (uName: string, uNick: string, uId: number | null, filterToUse: string) => {
    try {
      setLoading(true);
      const headers = await authHeader();
      const urlMap: any = { MY_WRITTEN: `${POSTS}/me`, MY_APPLIED: `${POSTS}/me/applied` };
      const url = `${urlMap[filterToUse] || POSTS}?page=0&size=100`;
      
      const { data } = await axios.get(url, { headers });
      let list = data.data.content ?? [];

      if (filterToUse === 'MY_APPLIED') {
        list = list.filter((item: any) => !checkIsMine(item.writerId, item.writerName || '', uId, uName, uNick));
      }

      setPosts(sortPosts(mapPosts(list, uName, uNick, uId)));
    } catch (e: any) {
      showResultModal('불러오기 실패', e.response?.data?.message || '게시글을 가져오지 못했습니다.', 'error');
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
      const isClosedFlag = item.isClosed === true || item.closed === true || item.status === 'CLOSED';
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
        viewCount: item.viewCount||0, likeCount: item.likeCount||0, isLiked: item.liked === true || item.isLiked === true,
        differentGym: item.differentGym, gymPlace: item.gymPlace,
        profileImageUrl: item.writerProfileImageUrl || item.profileImageUrl || item.profileImage || null, 
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
        backendRes = Array.isArray(data.data.content) ? data.data.content : [];
      } catch (e) {}
      
      const { data: allData } = await axios.get(`${POSTS}?page=0&size=100`, { headers });
      const all: any[] = Array.isArray(allData?.data?.content) ? allData.data.content : [];
      const filtered = all.filter(i => [i.title,i.content,i.writerName,i.gymPlace].some(v => (v||'').toLowerCase().includes(kw)));
      
      const map = new Map();
      [...backendRes, ...filtered].forEach(i => i?.id != null && map.set(i.id, i));
      setPosts(sortPosts(mapPosts(Array.from(map.values()), '', myNickname, myUserId)));
    } catch (e: any) {
      showResultModal('검색 실패', e.response?.data?.message || '검색에 실패했습니다.', 'error');
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
    updatePost(id, { isLiked: !liked, likeCount: (post: any) => liked ? Math.max(post.likeCount - 1, 0) : post.likeCount + 1 });
    if (selectedPost && selectedPost.id === id) {
      setSelectedPost((prev: any) => ({ ...prev, isLiked: !liked, likeCount: Math.max((prev.likeCount || 0) + (liked ? -1 : 1), 0) }));
    }
    showResultModal('알림', !liked ? '해당 게시물에 좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.', 'success');
    
    try {
      const headers = await authHeader();
      await axios.post(`${POSTS}/${id}/like`, {}, { headers });
    } catch (e: any) {
      updatePost(id, { isLiked: liked, likeCount: (post: any) => liked ? post.likeCount + 1 : Math.max(post.likeCount - 1, 0) });
      showResultModal('오류', e?.response?.data?.message || '요청을 처리할 수 없습니다.', 'error');
    }
  };

  const toggleJoin = async (id: number, joined: boolean) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    if (post.isPast) return showResultModal('참여 불가', '이미 마감된 모집글입니다.', 'info');
    const [cur, max] = post.people.replace('명','').split('/').map(Number);
    if (!joined && cur >= max) return showResultModal('참여 불가', '참여 인원이 마감되었습니다.', 'info');

    updatePeople(id, !joined);
    try {
      const headers = await authHeader();
      if (joined) await axios.delete(`${POSTS}/${id}/participants`, { headers });
      else await axios.post(`${POSTS}/${id}/participants`, {}, { headers });
    } catch (e: any) {
      updatePeople(id, joined);
      showResultModal('알림', e.response?.data?.message || '참여 요청을 처리할 수 없습니다.', 'error');
    }
  };

  const executeDelete = async () => {
    if (deleteTarget === null) return;
    try {
      const headers = await authHeader();
      await axios.delete(`${POSTS}/${deleteTarget}`, { headers });
      setPosts(prev => prev.filter(post => post.id !== deleteTarget));
      setDeleteTarget(null);
      setTimeout(() => showResultModal('성공', '게시글이 삭제되었습니다.', 'success'), 500);
    } catch (e: any) {
      setDeleteTarget(null);
      setTimeout(() => showResultModal('삭제 실패', e.response?.data?.message || '삭제할 수 없습니다.', 'error'), 500);
    }
  };

  const executeClose = async () => {
    if (closeTarget === null) return;
    try {
      const headers = await authHeader();
      await axios.patch(`${POSTS}/${closeTarget}/close`, {}, { headers });
      setPosts(prev => sortPosts([...prev].map(post => post.id === closeTarget ? { ...post, isPast: true } : post)));
      setCloseTarget(null);
      setTimeout(() => showResultModal('성공', '모집이 마감되었습니다.', 'success'), 500);
    } catch (e: any) {
      setCloseTarget(null);
      setTimeout(() => showResultModal('마감 실패', e.response?.data?.message || '마감 처리할 수 없습니다.', 'error'), 500);
    }
  };

  const loadUserDetail = async (authorId: number, authorName: string, isMine: boolean) => {
    try {
      Keyboard.dismiss(); 
      const headers = await authHeader();
      const url = isMine ? `${MEMBERS}/me` : `${MEMBERS}/${authorId}/profile`;
      const { data } = await axios.get(url, { headers });
      const d = data.data; 
      if (!d) throw new Error('정보를 불러올 수 없습니다.');
      
      const detail = d.detail || d;
      const privacy = d.privacy || d;

      setSelectedUser({
        name: d.name || authorName, phone: d.phone || '-', age: detail.age || d.age || '-',
        gender: translateGender(detail.gender || d.gender || '-'),
        height: detail.height || d.height || '-', weight: detail.weight || d.weight || '-',
        arm: detail.armSpan || d.armSpan || '-', shoe: detail.footSize || d.footSize || '-',
        profileImageUrl: d.profileImageUrl || d.profileImage || null, 
        toggles: {
          showName: true, showPhone: isMine || privacy.isPublicPhone || privacy.phonePublic,
          showAge: true, showHeight: isMine || privacy.isHeightPublic || privacy.heightPublic,
          showWeight: isMine || privacy.isWeightPublic || privacy.weightPublic,
          showArm: isMine || privacy.isArmSpanPublic || privacy.armSpanPublic,
          showShoe: isMine || privacy.isFootSizePublic || privacy.footSizePublic,
        },
        isMe: isMine
      });
      return true; // 성공 시 UI 애니메이션 실행을 위해 true 반환
    } catch (e: any) {
      showResultModal('프로필 조회 불가', e.response?.data?.message || e.message, 'error');
      return false;
    }
  };

  const loadPostDetail = async (post: any) => {
    setSelectedPost({ ...post, viewCount: post.viewCount + 1 });
    try {
      const headers = await authHeader();
      await axios.get(`${POSTS}/${post.id}`, { headers });
      updatePost(post.id, { viewCount: (p: any) => p.viewCount + 1 });
      const { data } = await axios.get(`${POSTS}/${post.id}/comments?page=0&size=100`, { headers });
      setComments(data.data.content ?? []);
      return true;
    } catch (e) { return false; }
  };

  const submitComment = async () => {
    if (!commentInput.trim() || !selectedPost) return;
    try {
      const headers = await authHeader();
      const payload = { content: commentInput.trim(), parentId: replyingTo ? replyingTo.id : null };
      await axios.post(`${POSTS}/${selectedPost.id}/comments`, payload, { headers });
      setCommentInput(''); setReplyingTo(null); Keyboard.dismiss();
      const { data } = await axios.get(`${POSTS}/${selectedPost.id}/comments?page=0&size=100`, { headers });
      setComments(data.data.content ?? []);
    } catch (e: any) {
      showResultModal('오류', e.response?.data?.message || '댓글을 작성할 수 없습니다.', 'error');
    }
  };

  const executeCommentDelete = async () => {
    if (commentDeleteTarget === null || !selectedPost) return;
    try {
      const headers = await authHeader();
      await axios.delete(`${POSTS}/${selectedPost.id}/comments/${commentDeleteTarget}`, { headers });
      setCommentDeleteTarget(null);
      const { data } = await axios.get(`${POSTS}/${selectedPost.id}/comments?page=0&size=100`, { headers });
      setComments(data.data.content ?? []);
      setTimeout(() => showResultModal('성공', '해당 댓글이 삭제되었습니다.', 'success'), Platform.OS === 'ios' ? 500 : 300);
    } catch (e: any) {
      setCommentDeleteTarget(null);
      setTimeout(() => showResultModal('오류', e.response?.data?.message || '댓글을 삭제할 수 없습니다.', 'error'), Platform.OS === 'ios' ? 500 : 300);
    }
  };

  const setupCreateForm = () => {
    setIsEditMode(false); setEditPostId(null);
    setForm({ category:'센터', title:'', desc:'', date:'', time:'', people:'2', location:'' });
  };

  const setupEditForm = (post: any) => {
    setIsEditMode(true); setEditPostId(post.id);
    const md = new Date(post.rawMeetDateTime);
    setForm({
      category: post.differentGym ? '아웃도어' : '센터', title: post.title, desc: post.desc,
      date: isNaN(md.getTime()) ? '' : `${md.getFullYear()}/${p(md.getMonth()+1)}/${p(md.getDate())}`,
      time: isNaN(md.getTime()) ? '' : `${p(md.getHours())}:${p(md.getMinutes())}`,
      people: String(post.maxMember), location: post.gymPlace||'',
    });
  };

  const submitPost = async (onSuccess: () => void) => {
    const { category, title, desc, date, time, people, location } = form;
    let errorMsg = '';

    if (!title?.trim()) errorMsg = '제목을 적어주십시오.';
    else if (!desc?.trim()) errorMsg = '내용을 적어주십시오.';
    else if (!date?.trim()) errorMsg = '날짜를 적어주십시오.';
    else if (!time?.trim()) errorMsg = '시간을 적어주십시오.';
    else if (category === '아웃도어' && !location?.trim()) errorMsg = '아웃도어 장소 정보를 입력해주세요.';
    else if (date?.length !== 10 || time?.length !== 5) errorMsg = '날짜(YYYY/MM/DD)와 시간(HH:MM)을 올바르게 입력해주세요.';

    if (errorMsg) return showCreateAlert(errorMsg);
    
    const [yr, mo, dy] = date.split('/').map(Number);
    const [hr, mn] = time.split(':').map(Number);
    
    if (mo < 1 || mo > 12) return showCreateAlert('올바른 월을 입력해주세요.');
    if (dy < 1 || dy > new Date(yr, mo, 0).getDate()) return showCreateAlert(`${mo}월은 ${new Date(yr, mo, 0).getDate()}일까지입니다.`);
    if (hr > 23 || mn > 59) return showCreateAlert('올바른 시간을 입력해주세요.');
    
    const dt = new Date(yr, mo - 1, dy, hr, mn);
    if (dt < new Date()) return showCreateAlert('과거 시간으로 등록할 수 없습니다.');
    const max3 = new Date(); max3.setMonth(max3.getMonth() + 3);
    if (dt > max3) return showCreateAlert('최대 3개월 이내 날짜만 가능합니다.');
    
    const formattedDateTime = `${yr}-${p(mo)}-${p(dy)}T${p(hr)}:${p(mn)}:00`;

    try {
      const headers = await authHeader();
      const payload = { title, content: desc, isDifferentGym: category === '아웃도어', gymPlace: category === '센터' ? 'olla 클라이밍 센터' : location.trim(), meetDateTime: formattedDateTime, maxMember: parseInt(people, 10) };
      if (isEditMode && editPostId) await axios.patch(`${POSTS}/${editPostId}`, payload, { headers });
      else await axios.post(POSTS, payload, { headers });
      
      initData(currentFilter);
      onSuccess(); // UI의 closeModal 실행
      setTimeout(() => showResultModal('성공', isEditMode ? '게시글이 성공적으로 수정되었습니다.' : '모집 글이 성공적으로 작성되었습니다.', 'success'), 500);
    } catch (e: any) {
      showCreateAlert(e.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  return {
    posts, loading, refreshing, myUserId, myProfileImageUrl,
    selectedTab, setSelectedTab, searchKeyword, setSearchKeyword, isSearching, form, setForm,
    comments, commentInput, setCommentInput, replyingTo, setReplyingTo,
    selectedUser, selectedPost, setSelectedPost, isEditMode,
    resultModalVisible, resultModalConfig, createAlertVisible, setCreateAlertVisible, createAlertMessage,
    deleteTarget, setDeleteTarget, closeTarget, setCloseTarget, commentDeleteTarget, setCommentDeleteTarget,
    onRefresh, searchPosts, clearSearch, toggleLike, toggleJoin, executeDelete, executeClose,
    submitPost, submitComment, executeCommentDelete, loadUserDetail, loadPostDetail, setupCreateForm, setupEditForm, closeResultModal
  };
};