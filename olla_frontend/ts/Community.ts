// ============================================================
// useCommunityData.ts
// 커뮤니티(운동 모집) 화면에서 사용하는 커스텀 훅
// - 게시글 목록 조회 / 작성 / 수정 / 삭제 / 마감
// - 댓글 조회 / 작성 / 삭제
// - 좋아요 / 참여하기 토글
// - 회원권 보유 여부에 따른 기능 접근 제어
// - 검색 / 유저 프로필 조회
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';
import {
  getPosts, getMyPosts, getMyAppliedPosts, searchPosts as searchPostsApi,
  getPostDetail, createPost, updatePost as updatePostApi, deletePost, closePost,
  toggleLike as toggleLikeApi, joinPost, cancelJoinPost,
  getComments, createComment, deleteComment,
} from '../src/constants/api/community';
import { getMyProfile, fetchHasMembership, getOtherMemberProfile } from '../src/constants/api/member';
import { API_BASE_URL } from '../src/constants/Config';

// 숫자를 2자리 문자열로 패딩 (예: 1 → "01")
export const p = (n: number) => String(n).padStart(2, '0');

// 서버에서 받은 이미지 경로를 완전한 URL로 변환
// - 이미 http/file/content 로 시작하면 그대로 반환
// - 상대 경로면 API 도메인을 붙여서 반환
// - null/undefined/'null'/'undefined' 이면 null 반환
export const getFullImageUrl = (path: string | null | undefined): string | null => {
  if (!path || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

// 날짜 문자열을 "YYYY.MM.DD HH:mm" 형태로 포맷
export const formatCommentDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// 영문 성별 코드를 한글로 변환 (MALE/M → 남자, FEMALE/F → 여자)
export const translateGender = (gender: string) => {
  if (!gender || gender === '-') return '-';
  const g = String(gender).toUpperCase();
  if (g === 'MALE' || g === 'M') return '남자';
  if (g === 'FEMALE' || g === 'F') return '여자';
  return gender;
};

// 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환 (타임존 보정 포함)
export const getToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

// 댓글/대댓글 타입 정의
export interface CommentType {
  id: number;
  content: string;
  writerId: number;
  writerName: string;
  profileImageUrl?: string | null;
  writerProfileImageUrl?: string | null;
  profileImage?: string | null;
  createdAt: string;
  children: CommentType[]; // 대댓글 목록
}

export const useCommunityData = (currentFilter: string, isFocused: boolean) => {
  // pull-to-refresh 상태
  const [refreshing, setRefreshing] = useState(false);
  // 게시글 목록 초기 로딩 여부
  const [loading, setLoading] = useState(true);

  // 결과 안내 모달 상태
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  // 게시글 작성/수정 폼 내부 유효성 오류 알림 상태
  const [createAlertVisible, setCreateAlertVisible] = useState(false);
  const [createAlertMessage, setCreateAlertMessage] = useState('');

  // 게시글 목록
  const [posts, setPosts] = useState<any[]>([]);

  // 현재 로그인한 사용자 정보
  const [myNickname, setMyNickname] = useState('');
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null);

  // 기간 회원권 보유 여부 (true면 모든 기능 사용 가능)
  const [hasMembership, setHasMembership] = useState(false);

  // 탭 선택 상태 (예: '전체', '센터', '아웃도어')
  const [selectedTab, setSelectedTab] = useState('전체');

  // 검색어 및 검색 진행 여부
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 삭제 확인 대상 게시글 id
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  // 마감 확인 대상 게시글 id
  const [closeTarget, setCloseTarget] = useState<number | null>(null);

  // 수정 모드 여부 및 수정 대상 게시글 id
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPostId, setEditPostId] = useState<number | null>(null);

  // 게시글 작성/수정 폼 상태
  const [form, setForm] = useState({ category: '센터' as '센터'|'아웃도어', title: '', desc: '', date: '', time: '', people: '2', location: '' });

  // 날짜 선택 캘린더 표시 여부
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  // 시간 선택 피커 표시 여부
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  // 시간 선택 피커에서 임시로 선택 중인 시/분
  const [tempHour, setTempHour] = useState('12');
  const [tempMinute, setTempMinute] = useState('00');

  // 프로필 조회를 위해 선택된 사용자 정보
  const [selectedUser, setSelectedUser] = useState<any>(null);
  // 상세보기 중인 게시글
  const [selectedPost, setSelectedPost] = useState<any>(null);
  // 선택된 게시글의 댓글 목록
  const [comments, setComments] = useState<CommentType[]>([]);
  // 댓글 입력창 텍스트
  const [commentInput, setCommentInput] = useState('');
  // 대댓글 작성 대상 ({id, name})
  const [replyingTo, setReplyingTo] = useState<{id: number, name: string} | null>(null);
  // 삭제 확인 대상 댓글 id
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);
  // 게시글 상세 로딩 중 여부 (중복 요청 방지)
  const [isPostLoading, setIsPostLoading] = useState(false);

  // 결과 모달 열기
  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  // 결과 모달 닫기 + onConfirm 실행
  const closeResultModal = () => {
    setResultModalVisible(false);
    resultModalConfig.onConfirm();
  };

  // 폼 유효성 오류 알림 표시 (작성/수정 폼 내부용 별도 알림)
  const showCreateAlert = (msg: string) => {
    Keyboard.dismiss();
    setCreateAlertMessage(msg);
    setCreateAlertVisible(true);
  };

  // 회원권 보유 여부를 확인하고, 없으면 모달 안내 후 false 반환
  // - 비로그인: "회원 전용" 안내
  // - 회원권 없는 로그인 유저: "이용권 필요" 안내
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

  // 초기 데이터 로드: 내 프로필 → 회원권 → 게시글 순으로 조회
  const initData = async (filterToUse: string) => {
    let uName = '', uNick = '', uId = null;
    try {
      const { data } = await getMyProfile();
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
      // 네트워크 에러가 아닌 경우(AsyncStorage 등) 조용히 무시
      const isNetworkError = e?.response || e?.request;
      if (!isNetworkError) {
        // AsyncStorage나 기타 네이티브 에러 → 조용히 무시
      }
      // myUserId는 null 유지 (비회원 처리)
    }

    // 로그인된 경우에만 회원권 조회
    if (uId !== null) {
      setHasMembership(await fetchHasMembership());
    } else {
      // 비로그인이면 회원권 없음 처리
      setHasMembership(false);
    }

    await fetchPosts(uName, uNick, uId, filterToUse);
  };

  // 화면 포커스되거나 필터 변경 시 데이터 재조회
  useEffect(() => {
    if (isFocused) initData(currentFilter);
  }, [isFocused, currentFilter]);

  // pull-to-refresh 처리
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initData(currentFilter);
    setRefreshing(false);
  }, [currentFilter]);

  // 게시글 목록 정렬: 마감(isPast)된 글은 뒤로, 나머지는 최신 순(id 내림차순)
  const sortPosts = (list: any[]) => {
    return [...list].sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });
  };

  // 게시글 작성자가 현재 로그인 유저인지 확인 (id 기준 비교)
  const checkIsMine = (writerId: number | null, writerName: string, uId: number | null, uName: string, uNick: string): boolean => {
    return (uId !== null && writerId !== null && writerId !== undefined) ? Number(writerId) === Number(uId) : false;
  };

  // 게시글 목록을 서버에서 불러오는 함수
  // - 필터에 따라 내가 쓴 글 / 내가 참여 신청한 글 / 전체 글로 구분
  const fetchPosts = async (uName: string, uNick: string, uId: number | null, filterToUse: string) => {
    try {
      setLoading(true);
      const params = { page: 0, size: 100 };
      const { data } =
        filterToUse === 'MY_WRITTEN' ? await getMyPosts(params) :
        filterToUse === 'MY_APPLIED' ? await getMyAppliedPosts(params) :
        await getPosts(params);

      const resData = data.data || {};
      let list = Array.isArray(resData) ? resData : (resData.content || []);

      // "내가 참여 신청한 글" 필터에서 내가 작성한 글은 제외
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

  // 서버 응답 데이터를 화면에서 사용하기 쉬운 형태로 가공
  // - 날짜 파싱 / 작성자 판단 / 마감 여부 / 아웃도어 여부 등 처리
  const mapPosts = (list: any[], uName: string, uNick: string, uId: number | null) =>
    list.map(item => {
      // 날짜 문자열 내 공백을 T로 교체해 ISO 형식으로 맞춤
      const safeMeetDate = item.meetDateTime ? String(item.meetDateTime).replace(' ', 'T') : '';
      const safeCreateDate = item.createdAt ? String(item.createdAt).replace(' ', 'T') : '';

      const md = new Date(safeMeetDate); // 모임 일시
      const cd = new Date(safeCreateDate); // 작성 일시
      const author = item.writerName || '알 수 없음';
      const isMine = checkIsMine(item.writerId, author, uId, uName, uNick);

      // 마감 여부: isClosed/closed/status 중 하나라도 마감이면 true
      const isClosedFlag = item.isClosed === true || item.closed === true || item.status === 'CLOSED';
      // 모임 일시가 현재보다 과거인지 확인
      const isPastDate = !isNaN(md.getTime()) && md.getTime() < new Date().getTime();
      const isPast = isClosedFlag || isPastDate;

      // 아웃도어 여부: isDifferentGym 또는 differentGym 필드
      const isDiffGym = item.isDifferentGym === true || item.differentGym === true;

      return {
        id: item.id, writerId: item.writerId,
        type: isDiffGym ? '아웃도어' : '센터',
        title: item.title, desc: item.content, author, isMine, isPast,
        location: isDiffGym ? (item.gymPlace || '장소 미정') : 'olla 클라이밍 센터',
        // 날짜가 유효하면 포맷, 아니면 원본 문자열 사용
        date: isNaN(md.getTime()) ? item.meetDateTime : `${md.getFullYear()}-${p(md.getMonth()+1)}-${p(md.getDate())} ${p(md.getHours())}:${p(md.getMinutes())}`,
        rawMeetDateTime: item.meetDateTime,
        people: `${item.memberCount||0}/${item.maxMember}명`, maxMember: item.maxMember,
        postDate: isNaN(cd.getTime()) ? item.createdAt : `${cd.getFullYear()}.${p(cd.getMonth()+1)}.${p(cd.getDate())}`,
        // 참여 여부: applied 또는 isApplied 중 하나라도 true면 참여 중
        isJoined: item.applied === true || item.isApplied === true,
        viewCount: item.viewCount||0, likeCount: item.likeCount||0,
        isLiked: item.liked === true || item.isLiked === true,
        differentGym: isDiffGym, gymPlace: item.gymPlace,
        profileImageUrl: getFullImageUrl(item.writerProfileImageUrl || item.profileImageUrl || item.profileImage),
      };
    });

  // 키워드로 게시글 검색
  // - 백엔드 검색 API 호출 + 전체 목록에서 프론트 클라이언트 필터링 병행
  // - 두 결과를 합쳐 중복 제거 후 표시
  const searchPosts = async () => {
    if (!searchKeyword.trim()) { showResultModal('알림', '검색어를 입력해주세요.', 'info'); return; }
    setIsSearching(true);
    const kw = searchKeyword.trim().toLowerCase();
    try {
      let backendRes: any[] = [];
      try {
        // 서버 측 키워드 검색
        const { data } = await searchPostsApi(searchKeyword, { page: 0, size: 100 });
        const resData1 = data.data || {};
        backendRes = Array.isArray(resData1) ? resData1 : (resData1.content || []);
      } catch (e) {}

      // 전체 목록 가져와서 클라이언트 필터링
      const { data: allData } = await getPosts({ page: 0, size: 100 });
      const resData2 = allData?.data || {};
      const all: any[] = Array.isArray(resData2) ? resData2 : (resData2.content || []);

      // 제목/내용/작성자/장소 중 하나라도 키워드 포함이면 검색 결과에 포함
      const filtered = all.filter(i => [i.title,i.content,i.writerName,i.gymPlace].some(v => (v||'').toLowerCase().includes(kw)));

      // id 기준으로 중복 제거 (Map 활용)
      const map = new Map();
      [...backendRes, ...filtered].forEach(i => i?.id != null && map.set(i.id, i));
      setPosts(sortPosts(mapPosts(Array.from(map.values()), '', myNickname, myUserId)));
    } catch (e: any) {
      showResultModal('검색 실패', e.response?.data?.message || '검색에 실패했습니다.', 'error');
    }
  };

  // 검색 초기화: 키워드 비우고 원래 목록으로 복귀
  const clearSearch = () => { setSearchKeyword(''); setIsSearching(false); initData(currentFilter); };

  // 특정 게시글의 일부 필드를 업데이트하는 헬퍼
  // - changes의 value가 함수이면 현재 post를 인자로 실행한 결과를 사용
  const updatePost = (id: number, changes: Record<string, any>) =>
    setPosts(prev => prev.map(post => post.id !== id ? post :
      { ...post, ...Object.fromEntries(Object.entries(changes).map(([k,v]) => [k, typeof v==='function' ? v(post) : v])) }
    ));

  // 참여/취소에 따라 게시글의 참여 인원 수를 즉시 반영하는 헬퍼
  const updatePeople = (id: number, joining: boolean) =>
    setPosts(prev => prev.map(post => {
      if (post.id !== id) return post;
      const [cur, max] = post.people.replace('명','').split('/').map(Number);
      // 참여 시 +1(최대치 초과 방지), 취소 시 -1(최소 1명 유지)
      return { ...post, isJoined: joining, people: `${joining?Math.min(cur+1,max):Math.max(cur-1,1)}/${max}명` };
    }));

  // 좋아요 토글 (회원권 체크 필수)
  // - 낙관적 업데이트(Optimistic Update): 먼저 UI 반영 후 서버 요청
  // - 서버 실패 시 원래 상태로 롤백
  const toggleLike = async (id: number, liked: boolean) => {
    if (!checkHasMembershipOrAlert()) return;

    // 즉시 UI 반영
    updatePost(id, { isLiked: !liked, likeCount: (post: any) => liked ? Math.max(post.likeCount - 1, 0) : post.likeCount + 1 });
    // 상세 보기 중인 게시글이 같은 경우 selectedPost도 업데이트
    if (selectedPost && selectedPost.id === id) {
      setSelectedPost((prev: any) => ({ ...prev, isLiked: !liked, likeCount: Math.max((prev.likeCount || 0) + (liked ? -1 : 1), 0) }));
    }
    showResultModal('알림', !liked ? '해당 게시물에 좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.', 'success');

    try {
      await toggleLikeApi(id);
    } catch (e: any) {
      // 서버 실패 시 롤백
      updatePost(id, { isLiked: liked, likeCount: (post: any) => liked ? post.likeCount + 1 : Math.max(post.likeCount - 1, 0) });
      showResultModal('오류', e?.response?.data?.message || '요청을 처리할 수 없습니다.', 'error');
    }
  };

  // 참여하기/취소 토글 (참여 시 회원권 체크 필수)
  // - 마감된 글 / 인원 초과 시 참여 불가 안내
  // - 낙관적 업데이트 후 서버 요청, 실패 시 롤백
  const toggleJoin = async (id: number, joined: boolean) => {
    // 취소는 회원권 체크 불필요, 참여만 체크
    if (!joined && !checkHasMembershipOrAlert()) return;

    const post = posts.find(p => p.id === id);
    if (!post) return;
    if (post.isPast) return showResultModal('참여 불가', '이미 마감된 모집글입니다.', 'info');
    const [cur, max] = post.people.replace('명','').split('/').map(Number);
    if (!joined && cur >= max) return showResultModal('참여 불가', '참여 인원이 마감되었습니다.', 'info');

    // 즉시 UI 반영
    updatePeople(id, !joined);
    try {
      if (joined) await cancelJoinPost(id);
      else await joinPost(id);
    } catch (e: any) {
      // 서버 실패 시 롤백
      updatePeople(id, joined);
      showResultModal('알림', e.response?.data?.message || '참여 요청을 처리할 수 없습니다.', 'error');
    }
  };

  // 게시글 삭제 실행 (deleteTarget에 세팅된 id 기준)
  const executeDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deletePost(deleteTarget);
      
      // 삭제 성공 시 로컬 목록에서도 제거
      setPosts(prev => prev.filter(post => post.id !== deleteTarget));
      setDeleteTarget(null);
      setTimeout(() => showResultModal('성공', '게시글이 삭제되었습니다.', 'success'), 500);
    } catch (e: any) {
      setDeleteTarget(null);
      setTimeout(() => showResultModal('삭제 실패', e.response?.data?.message || '삭제할 수 없습니다.', 'error'), 500);
    }
  };

  // 게시글 마감 실행 (closeTarget에 세팅된 id 기준)
  const executeClose = async () => {
    if (closeTarget === null) return;
    try {
      await closePost(closeTarget);
      // 마감 성공 시 해당 글의 isPast를 true로 변경 후 재정렬
      setPosts(prev => sortPosts([...prev].map(post => post.id === closeTarget ? { ...post, isPast: true } : post)));
      setCloseTarget(null);
      setTimeout(() => showResultModal('성공', '모집이 마감되었습니다.', 'success'), 500);
    } catch (e: any) {
      setCloseTarget(null);
      setTimeout(() => showResultModal('마감 실패', e.response?.data?.message || '마감 처리할 수 없습니다.', 'error'), 500);
    }
  };

  // 사용자 프로필 상세 정보 불러오기
  // - 본인이면 /members/me, 타인이면 /members/{id}/profile 사용
  const loadUserDetail = async (authorId: number, authorName: string, isMine: boolean) => {
    try {
      Keyboard.dismiss();
      const { data } = isMine ? await getMyProfile() : await getOtherMemberProfile(authorId);
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

  // 게시글 상세 정보 및 댓글 불러오기
  // - 마감된 글은 처리하지 않음
  // - 중복 요청 방지를 위해 isPostLoading 플래그 사용
  // - 조회수 카운트 API 호출 포함
  const loadPostDetail = async (post: any) => {
    if (isPostLoading) return false;
    // 마감된 게시글은 처리하지 않음
    if (post.isPast) return false;
    setIsPostLoading(true);

    // 조회수를 미리 +1 표시 
    setSelectedPost({ ...post, viewCount: post.viewCount + 1 });
    try {
      // 조회수 올리기
      await getPostDetail(post.id);
      updatePost(post.id, { viewCount: (p: any) => p.viewCount + 1 });
      // 댓글 목록 조회
      const { data } = await getComments(post.id, { page: 0, size: 100 });
      setComments(data.data.content ?? []);
      return true;
    } catch (e) {
      return false;
    } finally {
      setIsPostLoading(false);
    }
  };

  // 댓글(또는 대댓글) 작성 (회원권 체크 필수)
  // - 마감된 게시글에는 댓글 작성 불가
  // - replyingTo가 있으면 대댓글 (parentId 전송)
  const submitComment = async () => {
    if (!checkHasMembershipOrAlert()) return;

    if (selectedPost?.isPast) {
      showResultModal('작성 불가', '마감된 게시글에는 댓글을 작성할 수 없습니다.', 'info');
      return;
    }

    const trimmed = commentInput.trim();
    if (!trimmed || !selectedPost) return;

    const postId = selectedPost.id;
    const parentId = replyingTo ? replyingTo.id : null; // 대댓글이면 부모 댓글 id 전송

    try {
      // 입력창 초기화 및 키보드 닫기
      setCommentInput('');
      setReplyingTo(null);
      Keyboard.dismiss();

      await createComment(postId, trimmed, parentId);

      // 댓글 목록 갱신
      const { data } = await getComments(postId, { page: 0, size: 100 });
      setComments(data.data.content ?? []);
    } catch (e: any) {
      showResultModal('오류', e.response?.data?.message || '댓글을 작성할 수 없습니다.', 'error');
    }
  };

  // 댓글 삭제 실행 (commentDeleteTarget에 세팅된 id 기준)
  // - iOS/Android 딜레이 차이를 고려한 setTimeout 처리
  const executeCommentDelete = async () => {
    if (commentDeleteTarget === null || !selectedPost) return;
    try {
      await deleteComment(selectedPost.id, commentDeleteTarget);
      setCommentDeleteTarget(null);
      // 댓글 목록 갱신
      const { data } = await getComments(selectedPost.id, { page: 0, size: 100 });
      setComments(data.data.content ?? []);
      setTimeout(() => showResultModal('성공', '해당 댓글이 삭제되었습니다.', 'success'), Platform.OS === 'ios' ? 500 : 300);
    } catch (e: any) {
      setCommentDeleteTarget(null);
      setTimeout(() => showResultModal('오류', e.response?.data?.message || '댓글을 삭제할 수 없습니다.', 'error'), Platform.OS === 'ios' ? 500 : 300);
    }
  };

  // 캘린더 열기/닫기
  const openCalendar = () => { Keyboard.dismiss(); setCalendarVisible(true); };
  const closeCalendar = () => setCalendarVisible(false);

  // 시간 피커 열기
  // - 이미 선택된 시간이 있으면 그 값으로 초기화
  // - 없으면 오늘인 경우 현재 시각 기준 가장 가까운 10분 단위, 다른 날이면 12:00으로 초기화
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
        let m = Math.ceil(now.getMinutes() / 10) * 10; // 현재 분 기준 올림 10분 단위
        if (m >= 60) { h = (h + 1) % 24; m = 0; }
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

  // 시간 선택 확정
  // - 오늘인 경우 과거 시간 선택 불가 안내
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

  // 신규 게시글 작성 폼 초기화
  const setupCreateForm = () => {
    setIsEditMode(false); setEditPostId(null);
    setForm({ category:'센터', title:'', desc:'', date: '', time: '', people:'2', location:'' });
  };

  // 기존 게시글 수정 폼 세팅 (게시글 데이터를 폼에 채워넣기)
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

  // 게시글 작성 또는 수정 제출 (회원권 체크 필수)
  // - 각 필드 유효성 검사 (제목/내용/날짜/시간/장소)
  // - 과거 날짜 및 3개월 초과 날짜 제한
  // - isEditMode 여부에 따라 PATCH / POST 분기
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
    // 최대 3개월 이내 날짜만 허용
    const max3 = new Date(); max3.setMonth(max3.getMonth() + 3);
    if (dt > max3) return showCreateAlert('최대 3개월 이내 날짜만 가능합니다.');

    const formattedDateTime = `${yr}-${p(mo)}-${p(dy)}T${p(hr)}:${p(mn)}:00`;

    try {
      const payload = { title, content: desc, isDifferentGym: category === '아웃도어', gymPlace: category === '센터' ? 'olla 클라이밍 센터' : location.trim(), meetDateTime: formattedDateTime, maxMember: parseInt(people, 10) };
      // 수정 모드면 PATCH, 신규면 POST
      if (isEditMode && editPostId) await updatePostApi(editPostId, payload);
      else await createPost(payload);

      initData(currentFilter);
      onSuccess();
      setTimeout(() => showResultModal('성공', isEditMode ? '게시글이 성공적으로 수정되었습니다.' : '모집 글이 성공적으로 작성되었습니다.', 'success'), 500);
    } catch (e: any) {
      showCreateAlert(e.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  // 훅 사용 컴포넌트에 노출할 상태와 함수들 반환
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