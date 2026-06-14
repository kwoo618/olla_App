// ============================================================
// useManagerCommunityData.ts
// 관리자용 커뮤니티(운동 모집) 화면에서 사용하는 커스텀 훅
// - 게시글 목록 조회 / 삭제
// - 댓글 조회 / 작성 / 삭제
// - 회원 프로필 상세 조회
// - 관리자는 회원권 체크 없이 모든 기능 사용 가능
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

// API 기본 경로 상수
const BASE    = `${API_BASE_URL}`;
const POSTS   = `${API_BASE_URL}/posts`;
const MEMBERS = `${BASE}/members`;

// JWT 토큰을 AsyncStorage에서 꺼내 Authorization 헤더 객체로 반환
export const authHeader = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token}` };
};

// 숫자를 2자리 문자열로 패딩 (예: 1 → "01")
export const p = (n: number) => String(n).padStart(2, '0');

// 서버에서 받은 이미지 경로를 완전한 URL로 변환 (useMyPage와 동일한 방식으로 통일)
// - 이미 http/file/content로 시작하면 그대로 반환
// - 상대 경로면 API 도메인을 붙여서 반환
// - null/undefined/'null'/'undefined' 이면 null 반환
export const getFullImageUrl = (path: string | null | undefined): string | null => {
  if (!path || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

// 이미지 URL을 RN Image source 형태로 반환
// - URL이 있으면 { uri: ... }, 없으면 기본 프로필 이미지 require 반환
export const getProfileImage = (url: string | null | undefined) => {
  const resolved = getFullImageUrl(url);
  if (resolved) return { uri: resolved };
  return require('../assets/profile.png');
};

// 날짜 문자열을 "YYYY.MM.DD HH:mm" 형태로 포맷
export const formatCommentDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// 영문 성별 코드를 한글로 변환 (null/undefined 안전 처리 포함)
export const translateGender = (gender: string | null | undefined): string => {
  if (!gender) return '-';
  switch (gender.toUpperCase()) {
    case 'MALE':   return '남성';
    case 'FEMALE': return '여성';
    default:       return gender;
  }
};

// 응답 파싱 헬퍼: response.data.data 바로 반환
const extractData = (response: any): any => response.data.data;

// 응답 파싱 헬퍼: 페이징 응답의 content 배열 반환
const extractList = (response: any): any[] => response.data.data.content;

// 댓글/대댓글 타입 정의
export interface CommentType {
  id: number;
  content: string;
  writerId: number;
  writerName: string;
  profileImageUrl: string | null;
  createdAt: string;
  children: CommentType[]; // 대댓글 목록
}


export const useManagerCommunityData = (currentFilter: string, isFocused: boolean) => {
  // pull-to-refresh 상태
  const [refreshing, setRefreshing] = useState(false);
  // 게시글 목록 초기 로딩 여부
  const [loading, setLoading]       = useState(true);

  // 현재 로그인한 관리자 id
  const [myUserId, setMyUserId]                   = useState<number | null>(null);
  // 현재 로그인한 관리자 프로필 이미지 URL
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null);

  // 게시글 목록
  const [posts, setPosts]             = useState<any[]>([]);
  // 탭 선택 상태 (예: '전체', '센터', '아웃도어')
  const [selectedTab, setSelectedTab] = useState('전체');

  // 결과 안내 모달 표시 여부
  const [resultModalVisible, setResultModalVisible] = useState(false);
  // 결과 모달 내용 (title, message, type)
  const [resultModalConfig, setResultModalConfig]   = useState({ title: '', message: '', type: 'info' });
  // 삭제 확인 대상 게시글 id
  const [deleteTarget, setDeleteTarget]             = useState<number | null>(null);
  // 프로필 상세 보기 대상 사용자 정보
  const [selectedUser, setSelectedUser]             = useState<any>(null);
  // 상세 보기 중인 게시글
  const [selectedPost, setSelectedPost]             = useState<any>(null);

  // 선택된 게시글의 댓글 목록
  const [comments, setComments]                           = useState<CommentType[]>([]);
  // 댓글 입력창 텍스트
  const [commentInput, setCommentInput]                   = useState('');
  // 대댓글 작성 대상 ({id, name})
  const [replyingTo, setReplyingTo]                       = useState<{ id: number; name: string } | null>(null);
  // 삭제 확인 대상 댓글 id
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);

  // 결과 모달 열기
  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  // 결과 모달 닫기
  const closeResultModal = () => setResultModalVisible(false);

  // 게시글 목록 정렬: 마감(isPast) 글은 뒤로, 나머지는 최신 순(id 내림차순)
  const sortPosts = (list: any[]) =>
    [...list].sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });

  // 내 프로필(관리자 정보) 조회
  const fetchMyInfo = async () => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${MEMBERS}/me`, { headers });
      const d = extractData(res);
      if (d) {
        setMyUserId(d.id ?? d.memberId ?? null);
        // 프로필 이미지 URL 변환 적용
        setMyProfileImageUrl(getFullImageUrl(d.profileImageUrl ?? d.profileImage));
      }
    } catch (e: any) {
      console.log('내 정보 로드 실패:', e.response?.data?.message ?? e.message);
    }
  };

  // 게시글 목록 조회 (전체, 최신 100개)
  // - 마감 여부(closed/isClosed/status), 모임 일시 과거 여부로 isPast 판단
  // - 아웃도어 여부(differentGym)에 따라 type/location 분기
  // - 프로필 이미지 URL 변환 적용
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const headers = await authHeader();
      const res = await axios.get(`${POSTS}?page=0&size=100`, { headers });
      const list = extractList(res);

      const mappedList = list.map((item: any) => {
        const md = new Date(item.meetDateTime);  // 모임 일시
        const cd = new Date(item.createdAt);     // 작성 일시

        // 마감 여부: closed/isClosed/status 중 하나라도 마감이면 true
        const isClosedFlag = item.closed === true || item.isClosed === true || item.status === 'CLOSED';
        // 모임 일시가 현재보다 과거인지 확인
        const isPastDate   = !isNaN(md.getTime()) && md.getTime() < Date.now();
        const isPast       = isClosedFlag || isPastDate;

        return {
          id:       item.id,
          writerId: item.writerId,
          // 아웃도어 여부로 타입 분류
          type:     item.differentGym ? '아웃도어' : '센터',
          title:    item.title,
          desc:     item.content,
          author:   item.writerName ?? '알 수 없음',
          location: item.differentGym
            ? (item.gymPlace ?? '장소 미정')
            : 'olla 클라이밍 센터',
          // 날짜가 유효하면 포맷, 아니면 원본 문자열 사용
          date: isNaN(md.getTime())
            ? item.meetDateTime
            : `${md.getFullYear()}-${p(md.getMonth() + 1)}-${p(md.getDate())} ${p(md.getHours())}:${p(md.getMinutes())}`,
          rawMeetDateTime: item.meetDateTime,
          people:      `${item.memberCount ?? 0}/${item.maxMember}명`,
          maxMember:   item.maxMember,
          postDate: isNaN(cd.getTime())
            ? item.createdAt
            : `${cd.getFullYear()}.${p(cd.getMonth() + 1)}.${p(cd.getDate())}`,
          isPast,
          viewCount:  item.viewCount  ?? 0,
          likeCount:  item.likeCount  ?? 0,
          // liked / isLiked 두 필드 모두 대응
          isLiked:    item.liked === true || item.isLiked === true,
          // 프로필 이미지 URL 변환 적용
          profileImageUrl: getFullImageUrl(item.writerProfileImageUrl ?? item.profileImageUrl ?? item.profileImage),
        };
      });

      setPosts(sortPosts(mappedList));
    } catch (error: any) {
      showResultModal('오류', error.response?.data?.message ?? '게시글 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 내 정보와 게시글 목록을 동시에 조회
  const initData = async () => {
    await Promise.all([fetchMyInfo(), fetchPosts()]);
  };

  // 화면 포커스되거나 필터 변경 시 데이터 재조회
  useEffect(() => {
    if (isFocused) initData();
  }, [isFocused, currentFilter]);

  // pull-to-refresh 처리
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initData();
    setRefreshing(false);
  }, [currentFilter]);

  // 게시글 삭제 실행 (deleteTarget에 세팅된 id 기준)
  // - 삭제 성공 시 로컬 목록에서도 즉시 제거
  const executeDelete = async () => {
    if (deleteTarget === null) return;
    try {
      const headers = await authHeader();
      await axios.delete(`${POSTS}/${deleteTarget}`, { headers });
      showResultModal('성공', '게시글이 삭제되었습니다.', 'success');
      setPosts(prev => prev.filter(post => post.id !== deleteTarget));
    } catch (error: any) {
      showResultModal('오류', error.response?.data?.message ?? '게시글 삭제에 실패했습니다.', 'error');
    } finally {
      // 성공/실패 모두 deleteTarget 초기화
      setDeleteTarget(null);
    }
  };

  // 회원 프로필 상세 조회
  // - /members/{authorId}/profile 호출
  // - detail 중첩 객체 또는 최상위 필드 모두 대응
  // - 프로필 이미지 URL 변환 적용
  const loadUserDetail = async (authorId: number, authorName: string) => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${MEMBERS}/${authorId}/profile`, { headers });
      const d = extractData(res);

      if (!d) {
        showResultModal('프로필 조회 불가', '정보를 불러올 수 없습니다.', 'error');
        return false;
      }

      // detail 중첩 객체가 있으면 우선 사용, 없으면 최상위 필드 사용
      const detail = d.detail ?? d;
      setSelectedUser({
        name:  d.name         ?? authorName,
        phone: d.phone        ?? '-',
        // 프로필 이미지 URL 변환 적용
        profileImageUrl: getFullImageUrl(d.profileImageUrl ?? d.profileImage),
        gender: translateGender(detail.gender  ?? d.gender),
        age:    String(detail.age      ?? d.age      ?? '-'),
        height: String(detail.height   ?? d.height   ?? '-'),
        weight: String(detail.weight   ?? d.weight   ?? '-'),
        arm:    String(detail.armSpan  ?? d.armSpan  ?? '-'),
        shoe:   String(detail.footSize ?? d.footSize ?? '-'),
      });
      return true;
    } catch (error: any) {
      showResultModal('프로필 조회 불가', error.response?.data?.message ?? '해당 회원의 정보를 불러올 수 없습니다.', 'error');
      return false;
    }
  };

  // 특정 게시글의 댓글 목록 조회 (최대 100개)
  const fetchComments = async (postId: number) => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${POSTS}/${postId}/comments?page=0&size=100`, { headers });
      setComments(extractList(res));
    } catch (e: any) {
      console.log('댓글 조회 실패:', e.response?.data?.message ?? e.message);
    }
  };

  // 게시글 상세 보기: selectedPost 설정 + 댓글 목록 조회
  const loadPostDetail = async (post: any) => {
    setSelectedPost(post);
    await fetchComments(post.id);
    return true;
  };

  // 댓글(또는 대댓글) 작성
  // - 마감된 게시글에는 댓글 작성 불가
  // - replyingTo가 있으면 대댓글 (parentId 전송)
  // - 작성 후 댓글 목록 갱신
  const submitComment = async () => {
    if (!commentInput.trim() || !selectedPost) return;

    if (selectedPost.isPast) {
      showResultModal('작성 불가', '마감된 게시글에는 댓글을 작성할 수 없습니다.', 'info');
      return;
    }
    
    try {
      const headers = await authHeader();
      const payload = {
        content:  commentInput.trim(),
        parentId: replyingTo ? replyingTo.id : null, // 대댓글이면 부모 댓글 id 전송
      };
      await axios.post(`${POSTS}/${selectedPost.id}/comments`, payload, { headers });
      // 입력창 초기화 및 키보드 닫기
      setCommentInput('');
      setReplyingTo(null);
      Keyboard.dismiss();
      // 댓글 목록 갱신
      await fetchComments(selectedPost.id);
    } catch (e: any) {
      showResultModal('오류', e.response?.data?.message ?? '댓글을 작성할 수 없습니다.', 'error');
    }
  };

  // 댓글 삭제 실행 (commentDeleteTarget에 세팅된 id 기준)
  // - 삭제 후 댓글 목록 갱신
  // - iOS/Android 딜레이 차이를 고려한 setTimeout 처리
  const executeCommentDelete = async () => {
    if (commentDeleteTarget === null || !selectedPost) return;
    try {
      const headers = await authHeader();
      await axios.delete(`${POSTS}/${selectedPost.id}/comments/${commentDeleteTarget}`, { headers });
      // 댓글 목록 갱신
      await fetchComments(selectedPost.id);
      setTimeout(
        () => showResultModal('성공', '해당 댓글이 삭제되었습니다.', 'success'),
        Platform.OS === 'ios' ? 500 : 300
      );
    } catch (e: any) {
      setTimeout(
        () => showResultModal('오류', e.response?.data?.message ?? '댓글을 삭제할 수 없습니다.', 'error'),
        Platform.OS === 'ios' ? 500 : 300
      );
    } finally {
      // 성공/실패 모두 commentDeleteTarget 초기화
      setCommentDeleteTarget(null);
    }
  };

  // 훅 사용 컴포넌트에 노출할 상태와 함수들 반환
  return {
    posts, loading, refreshing, myUserId, myProfileImageUrl,
    selectedTab, setSelectedTab,
    comments, commentInput, setCommentInput, replyingTo, setReplyingTo,
    selectedUser, setSelectedUser, selectedPost, setSelectedPost,
    resultModalVisible, resultModalConfig,
    deleteTarget, setDeleteTarget,
    commentDeleteTarget, setCommentDeleteTarget,
    onRefresh, executeDelete, submitComment, executeCommentDelete,
    loadUserDetail, loadPostDetail, closeResultModal,
  };
};