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

export const getFullImageUrl = (path: string | null | undefined): string | null => {
  if (!path || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
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

export const getToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
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

// 활성 회원권 판단 헬퍼 (MYScreen.ts 로직과 동일)
const getTodayDate = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
};
const isStarted = (startDate: string): boolean => {
  if (!startDate) return true;
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  return start <= getTodayDate();
};
// 기간권 보유자만 true — 일일권(COUNT/횟수/일일)은 false
const checkActiveMembership = (dataList: any[]): boolean => {
  if (!Array.isArray(dataList) || dataList.length === 0) return false;
  const activeList = dataList.filter(m => {
  const status = String(m.membershipStatus || m.status || '').toUpperCase();
  if (status === 'DELETED' || status === 'INACTIVE') return false;
    return isStarted(m.startDate);
  });
  return activeList.some(m => {
    const t = String(m.membershipType ?? '').toUpperCase();
    const isCountType = t.includes('COUNT') || t.includes('횟수') || t.includes('일일');
    if (isCountType) return false;
    if (!m.endDate) return false;
    const end = new Date(m.endDate); end.setHours(23, 59, 59, 999);
    return end.getTime() >= Date.now();
  });
};

export const useCommunityData = (currentFilter: string, isFocused: boolean) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });
  const [createAlertVisible, setCreateAlertVisible] = useState(false);
  const [createAlertMessage, setCreateAlertMessage] = useState('');

  const [posts, setPosts] = useState<any[]>([]);
  const [myNickname, setMyNickname] = useState('');
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null);
  // ✅ 회원권 보유 여부
  const [hasMembership, setHasMembership] = useState(false);

  const [selectedTab, setSelectedTab] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [closeTarget, setCloseTarget] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: '센터' as '센터'|'아웃도어', title: '', desc: '', date: '', time: '', people: '2', location: '' });

  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [tempHour, setTempHour] = useState('12');
  const [tempMinute, setTempMinute] = useState('00');

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: number, name: string} | null>(null);
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);
  const [isPostLoading, setIsPostLoading] = useState(false);

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
    Keyboard.dismiss();
    setCreateAlertMessage(msg);
    setCreateAlertVisible(true);
  };

  // ✅ 회원권 없으면 차단 (비로그인 + 회원권 없는 로그인 유저 모두 차단)
  const checkHasMembershipOrAlert = (): boolean => {
    if (myUserId === null) {
      showResultModal('회원 전용', '해당 기능은 회원만 사용할 수 있습니다.', 'info');
      return false;
    }
    if (!hasMembership) {
      showResultModal('이용권 필요', '해당 기능은 이용권 보유 회원만 사용할 수 있습니다.', 'info');
      return false;
    }
    return true;
  };

  const initData = async (filterToUse: string) => {
    let uName = '', uNick = '', uId = null;
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${MEMBERS}/me`, { headers });
      const d = data.data;
      if (d) {
        uName = d.name || '';
        uNick = d.nickname || d.name || '';
        uId = d.id || d.memberId || null;
        setMyNickname(uNick || uName);
        setMyUserId(uId);
        setMyProfileImageUrl(getFullImageUrl(d.profileImageUrl || d.profileImage));
      }
    } catch (e: any) {
      const isNetworkError = e?.response || e?.request;
      if (!isNetworkError) {
        // AsyncStorage나 기타 네이티브 에러 → 조용히 무시
      }
      // myUserId는 null 유지 (비회원 처리)
    }

    // ✅ 회원권 조회 (로그인 성공한 경우에만)
    if (uId !== null) {
      try {
        const headers = await authHeader();
        const memRes = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });
        const rawData = memRes.data.data;
        const dataList: any[] = Array.isArray(rawData) ? rawData : (rawData?.content || []);
        setHasMembership(checkActiveMembership(dataList));
      } catch (e) {
        setHasMembership(false);
      }
    } else {
      setHasMembership(false);
    }

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

      const resData = data.data || {};
      let list = Array.isArray(resData) ? resData : (resData.content || []);

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
      const safeMeetDate = item.meetDateTime ? String(item.meetDateTime).replace(' ', 'T') : '';
      const safeCreateDate = item.createdAt ? String(item.createdAt).replace(' ', 'T') : '';

      const md = new Date(safeMeetDate);
      const cd = new Date(safeCreateDate);
      const author = item.writerName || '알 수 없음';
      const isMine = checkIsMine(item.writerId, author, uId, uName, uNick);
      const isClosedFlag = item.isClosed === true || item.closed === true || item.status === 'CLOSED';
      const isPastDate = !isNaN(md.getTime()) && md.getTime() < new Date().getTime();
      const isPast = isClosedFlag || isPastDate;
      const isDiffGym = item.isDifferentGym === true || item.differentGym === true;

      return {
        id: item.id, writerId: item.writerId,
        type: isDiffGym ? '아웃도어' : '센터',
        title: item.title, desc: item.content, author, isMine, isPast,
        location: isDiffGym ? (item.gymPlace || '장소 미정') : 'olla 클라이밍 센터',
        date: isNaN(md.getTime()) ? item.meetDateTime : `${md.getFullYear()}-${p(md.getMonth()+1)}-${p(md.getDate())} ${p(md.getHours())}:${p(md.getMinutes())}`,
        rawMeetDateTime: item.meetDateTime,
        people: `${item.memberCount||0}/${item.maxMember}명`, maxMember: item.maxMember,
        postDate: isNaN(cd.getTime()) ? item.createdAt : `${cd.getFullYear()}.${p(cd.getMonth()+1)}.${p(cd.getDate())}`,
        isJoined: item.applied === true || item.isApplied === true,
        viewCount: item.viewCount||0, likeCount: item.likeCount||0, isLiked: item.liked === true || item.isLiked === true,
        differentGym: isDiffGym, gymPlace: item.gymPlace,
        profileImageUrl: getFullImageUrl(item.writerProfileImageUrl || item.profileImageUrl || item.profileImage),
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
        const resData1 = data.data || {};
        backendRes = Array.isArray(resData1) ? resData1 : (resData1.content || []);
      } catch (e) {}

      const { data: allData } = await axios.get(`${POSTS}?page=0&size=100`, { headers });
      const resData2 = allData?.data || {};
      const all: any[] = Array.isArray(resData2) ? resData2 : (resData2.content || []);

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

  // ✅ 좋아요: 회원권 체크
  const toggleLike = async (id: number, liked: boolean) => {
    if (!checkHasMembershipOrAlert()) return;

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

  // ✅ 참여하기: 회원권 체크
  const toggleJoin = async (id: number, joined: boolean) => {
    if (!joined && !checkHasMembershipOrAlert()) return;

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

      const detail = d.detail || {};

      setSelectedUser({
        name: d.name || authorName,
        phone: d.phone || '-',
        age: detail.age || d.age || '-',
        gender: translateGender(detail.gender || d.gender || '-'),
        height: detail.height || d.height || '-',
        weight: detail.weight || d.weight || '-',
        arm: detail.armSpan || d.armSpan || '-',
        shoe: detail.footSize || d.footSize || '-',
        profileImageUrl: getFullImageUrl(d.profileImageUrl || d.profileImage),
        isMe: isMine,
        // toggles 제거하고 모든 필드 항상 표시
      });
      return true;
    } catch (e: any) {
      showResultModal('프로필 조회 불가', e.response?.data?.message || e.message, 'error');
      return false;
    }
  };

  const loadPostDetail = async (post: any) => {
    if (isPostLoading) return false;
    // 마감된 게시글은 처리하지 않음
    if (post.isPast) return false;
    setIsPostLoading(true);

    setSelectedPost({ ...post, viewCount: post.viewCount + 1 });
    try {
      const headers = await authHeader();
      // 마감 아닐 때만 조회수 올리도록 API 호출
      await axios.get(`${POSTS}/${post.id}`, { headers });
      updatePost(post.id, { viewCount: (p: any) => p.viewCount + 1 });
      const { data } = await axios.get(`${POSTS}/${post.id}/comments?page=0&size=100`, { headers });
      setComments(data.data.content ?? []);
      return true;
    } catch (e) {
      return false;
    } finally {
      setIsPostLoading(false);
    }
  };

  // 댓글 작성 - 회원권 체크
  const submitComment = async () => {
    if (!checkHasMembershipOrAlert()) return;

    if (selectedPost?.isPast) {
      showResultModal('작성 불가', '마감된 게시글에는 댓글을 작성할 수 없습니다.', 'info');
      return;
    }

    const trimmed = commentInput.trim();
    if (!trimmed || !selectedPost) return;

    const postId = selectedPost.id;
    const parentId = replyingTo ? replyingTo.id : null;

    try {
      const headers = await authHeader();
      const payload = { content: trimmed, parentId };

      setCommentInput('');
      setReplyingTo(null);
      Keyboard.dismiss();

      await axios.post(`${POSTS}/${postId}/comments`, payload, { headers });

      const { data } = await axios.get(`${POSTS}/${postId}/comments?page=0&size=100`, { headers });
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

  const openCalendar = () => { Keyboard.dismiss(); setCalendarVisible(true); };
  const closeCalendar = () => setCalendarVisible(false);

  const openTimePicker = () => {
    Keyboard.dismiss();
    if (form.time) {
      const [h, m] = form.time.split(':');
      setTempHour(h);
      setTempMinute(m);
    } else {
      const now = new Date();
      const isToday = !form.date || form.date === getToday();

      if (isToday) {
        let h = now.getHours();
        let m = Math.ceil(now.getMinutes() / 10) * 10;
        if (m >= 60) {
          h = (h + 1) % 24;
          m = 0;
        }
        setTempHour(p(h));
        setTempMinute(p(m));
      } else {
        setTempHour('12');
        setTempMinute('00');
      }
    }
    setTimePickerVisible(true);
  };
  const closeTimePicker = () => setTimePickerVisible(false);

  const confirmTimeSelection = () => {
    const isToday = !form.date || form.date === getToday();
    if (isToday) {
      const now = new Date();
      const selH = parseInt(tempHour);
      const selM = parseInt(tempMinute);
      if (selH < now.getHours() || (selH === now.getHours() && selM < now.getMinutes())) {
        showCreateAlert('과거 시간은 선택할 수 없습니다.');
        return;
      }
    }
    setForm(f => ({ ...f, time: `${tempHour}:${tempMinute}` }));
    closeTimePicker();
  };

  const setupCreateForm = () => {
    setIsEditMode(false); setEditPostId(null);
    setForm({ category:'센터', title:'', desc:'', date: '', time: '', people:'2', location:'' });
  };

  const setupEditForm = (post: any) => {
    setIsEditMode(true); setEditPostId(post.id);
    const md = new Date(post.rawMeetDateTime);
    setForm({
      category: post.differentGym ? '아웃도어' : '센터', title: post.title, desc: post.desc,
      date: isNaN(md.getTime()) ? '' : `${md.getFullYear()}-${p(md.getMonth()+1)}-${p(md.getDate())}`,
      time: isNaN(md.getTime()) ? '' : `${p(md.getHours())}:${p(md.getMinutes())}`,
      people: String(post.maxMember), location: post.gymPlace||'',
    });
  };

  // ✅ 글 작성/수정: 회원권 체크
  const submitPost = async (onSuccess: () => void) => {
    if (!checkHasMembershipOrAlert()) return;

    const { category, title, desc, date, time, people, location } = form;
    let errorMsg = '';

    if (!title?.trim()) errorMsg = '제목을 적어주십시오.';
    else if (!desc?.trim()) errorMsg = '내용을 적어주십시오.';
    else if (!date?.trim()) errorMsg = '날짜를 선택해주십시오.';
    else if (!time?.trim()) errorMsg = '시간을 선택해주십시오.';
    else if (category === '아웃도어' && !location?.trim()) errorMsg = '아웃도어 장소 정보를 입력해주세요.';

    if (errorMsg) return showCreateAlert(errorMsg);

    const [yr, mo, dy] = date.split('-').map(Number);
    const [hr, mn] = time.split(':').map(Number);

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
      onSuccess();
      setTimeout(() => showResultModal('성공', isEditMode ? '게시글이 성공적으로 수정되었습니다.' : '모집 글이 성공적으로 작성되었습니다.', 'success'), 500);
    } catch (e: any) {
      showCreateAlert(e.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  return {
    posts, loading, refreshing, myUserId, myProfileImageUrl,
    hasMembership,
    selectedTab, setSelectedTab, searchKeyword, setSearchKeyword, isSearching, form, setForm,
    comments, commentInput, setCommentInput, replyingTo, setReplyingTo,
    selectedUser, selectedPost, setSelectedPost, isEditMode,
    resultModalVisible, resultModalConfig, createAlertVisible, setCreateAlertVisible, createAlertMessage,
    deleteTarget, setDeleteTarget, closeTarget, setCloseTarget, commentDeleteTarget, setCommentDeleteTarget,
    isCalendarVisible, openCalendar, closeCalendar,
    isTimePickerVisible, tempHour, setTempHour, tempMinute, setTempMinute, openTimePicker, closeTimePicker, confirmTimeSelection,
    onRefresh, searchPosts, clearSearch, toggleLike, toggleJoin, executeDelete, executeClose, isPostLoading,
    submitPost, submitComment, executeCommentDelete, loadUserDetail, loadPostDetail, setupCreateForm, setupEditForm, closeResultModal
  };
};