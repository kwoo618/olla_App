// /posts/**, /posts/{id}/comments/** 엔드포인트 모음
import apiClient from './apiClient';

// ── 게시글 목록/검색 ──
export const getPosts = (params: any) => apiClient.get('/posts', { params });

export const getMyPosts = (params: any) => apiClient.get('/posts/me', { params });

export const getMyAppliedPosts = (params: any) =>
  apiClient.get('/posts/me/applied', { params });

export const searchPosts = (keyword: string, params: any) =>
  apiClient.get('/posts/search', { params: { keyword, ...params } });

// ── 게시글 CRUD ──
export const getPostDetail = (postId: number) => apiClient.get(`/posts/${postId}`);

export const createPost = (requestBody: any) => apiClient.post('/posts', requestBody);

export const updatePost = (postId: number, requestBody: any) =>
  apiClient.patch(`/posts/${postId}`, requestBody);

export const deletePost = (postId: number) => apiClient.delete(`/posts/${postId}`);

export const closePost = (postId: number) =>
  apiClient.patch(`/posts/${postId}/close`, {});

// ── 좋아요/참여 ──
export const toggleLike = (postId: number) =>
  apiClient.post(`/posts/${postId}/like`, {});

export const joinPost = (postId: number) =>
  apiClient.post(`/posts/${postId}/participants`, {});

export const cancelJoinPost = (postId: number) =>
  apiClient.delete(`/posts/${postId}/participants`);

// ── 댓글 ──
export const getComments = (postId: number, params: any) =>
  apiClient.get(`/posts/${postId}/comments`, { params });

export const createComment = (postId: number, content: string, parentId: number | null) =>
  apiClient.post(`/posts/${postId}/comments`, { content, parentId });

export const deleteComment = (postId: number, commentId: number) =>
  apiClient.delete(`/posts/${postId}/comments/${commentId}`);