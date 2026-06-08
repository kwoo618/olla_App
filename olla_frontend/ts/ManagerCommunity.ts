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

// ✅ useMyPage의 getFullImageUrl과 동일한 방식으로 통일
export const getFullImageUrl = (path: string | null | undefined): string | null => {
  if (!path || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http') || path.startsWith('file:') || path.startsWith('content:')) return path;
  const domain = API_BASE_URL.replace('/api/v1', '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${formattedPath}`;
};

export const getProfileImage = (url: string | null | undefined) => {
  const resolved = getFullImageUrl(url);
  if (resolved) return { uri: resolved };
  return require('../assets/profile.png');
};

export const formatCommentDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const translateGender = (gender: string | null | undefined): string => {
  if (!gender) return '-';
  switch (gender.toUpperCase()) {
    case 'MALE':   return '남성';
    case 'FEMALE': return '여성';
    default:       return gender;
  }
};

const extractData = (response: any): any => response.data.data;
const extractList = (response: any): any[] => response.data.data.content;

export interface CommentType {
  id: number;
  content: string;
  writerId: number;
  writerName: string;
  profileImageUrl: string | null;
  createdAt: string;
  children: CommentType[];
}


export const useManagerCommunityData = (currentFilter: string, isFocused: boolean) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]       = useState(true);

  // 내 정보
  const [myUserId, setMyUserId]                 = useState<number | null>(null);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string | null>(null);

  // 데이터 상태
  const [posts, setPosts]           = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('전체');

  // 모달 제어 상태
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig]   = useState({ title: '', message: '', type: 'info' });
  const [deleteTarget, setDeleteTarget]             = useState<number | null>(null);
  const [selectedUser, setSelectedUser]             = useState<any>(null);
  const [selectedPost, setSelectedPost]             = useState<any>(null);

  // 댓글 관련 상태
  const [comments, setComments]               = useState<CommentType[]>([]);
  const [commentInput, setCommentInput]       = useState('');
  const [replyingTo, setReplyingTo]           = useState<{ id: number; name: string } | null>(null);
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<number | null>(null);

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  const closeResultModal = () => setResultModalVisible(false);

  const sortPosts = (list: any[]) =>
    [...list].sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });

  // 내 정보 조회
  const fetchMyInfo = async () => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${MEMBERS}/me`, { headers });
      const d = extractData(res);
      if (d) {
        setMyUserId(d.id ?? d.memberId ?? null);
        // ✅ 내 프로필 이미지 URL 변환 적용
        setMyProfileImageUrl(getFullImageUrl(d.profileImageUrl ?? d.profileImage));
      }
    } catch (e: any) {
      console.log('내 정보 로드 실패:', e.response?.data?.message ?? e.message);
    }
  };

  // 게시글 목록 조회
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const headers = await authHeader();
      const res = await axios.get(`${POSTS}?page=0&size=100`, { headers });
      const list = extractList(res);

      const mappedList = list.map((item: any) => {
        const md = new Date(item.meetDateTime);
        const cd = new Date(item.createdAt);
        const isClosedFlag = item.closed === true || item.isClosed === true || item.status === 'CLOSED';
        const isPastDate   = !isNaN(md.getTime()) && md.getTime() < Date.now();
        const isPast       = isClosedFlag || isPastDate;

        return {
          id:       item.id,
          writerId: item.writerId,
          type:     item.differentGym ? '아웃도어' : '센터',
          title:    item.title,
          desc:     item.content,
          author:   item.writerName ?? '알 수 없음',
          location: item.differentGym
            ? (item.gymPlace ?? '장소 미정')
            : 'olla 클라이밍 센터',
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
          isLiked:    item.liked === true || item.isLiked === true,
          // ✅ 프로필 이미지 URL 변환 적용
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

  const initData = async () => {
    await Promise.all([fetchMyInfo(), fetchPosts()]);
  };

  useEffect(() => {
    if (isFocused) initData();
  }, [isFocused, currentFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initData();
    setRefreshing(false);
  }, [currentFilter]);

  // 게시글 삭제
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
      setDeleteTarget(null);
    }
  };

  // 회원 상세 조회
  const loadUserDetail = async (authorId: number, authorName: string) => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${MEMBERS}/${authorId}/profile`, { headers });
      const d = extractData(res);

      if (!d) {
        showResultModal('프로필 조회 불가', '정보를 불러올 수 없습니다.', 'error');
        return false;
      }

      const detail = d.detail ?? d;
      setSelectedUser({
        name:  d.name         ?? authorName,
        phone: d.phone        ?? '-',
        // ✅ 프로필 이미지 URL 변환 적용
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

  // 댓글 목록 조회
  const fetchComments = async (postId: number) => {
    try {
      const headers = await authHeader();
      const res = await axios.get(`${POSTS}/${postId}/comments?page=0&size=100`, { headers });
      setComments(extractList(res));
    } catch (e: any) {
      console.log('댓글 조회 실패:', e.response?.data?.message ?? e.message);
    }
  };

  const loadPostDetail = async (post: any) => {
    setSelectedPost(post);
    await fetchComments(post.id);
    return true;
  };

  // 댓글 작성
  const submitComment = async () => {
    if (!commentInput.trim() || !selectedPost) return;
    try {
      const headers = await authHeader();
      const payload = {
        content:  commentInput.trim(),
        parentId: replyingTo ? replyingTo.id : null,
      };
      await axios.post(`${POSTS}/${selectedPost.id}/comments`, payload, { headers });
      setCommentInput('');
      setReplyingTo(null);
      Keyboard.dismiss();
      await fetchComments(selectedPost.id);
    } catch (e: any) {
      showResultModal('오류', e.response?.data?.message ?? '댓글을 작성할 수 없습니다.', 'error');
    }
  };

  // 댓글 삭제
  const executeCommentDelete = async () => {
    if (commentDeleteTarget === null || !selectedPost) return;
    try {
      const headers = await authHeader();
      await axios.delete(`${POSTS}/${selectedPost.id}/comments/${commentDeleteTarget}`, { headers });
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
      setCommentDeleteTarget(null);
    }
  };

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