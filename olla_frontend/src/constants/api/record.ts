// /records/** 엔드포인트 모음
// ts/ 16개 파일에서는 "조회"만 실제로 쓰이고 있음 (Home.ts, Ranking.ts, Recode.ts).
// 저장/삭제는 백엔드 컨트롤러 스펙 기준으로 미리 작성해둠 — 기록 입력 화면(.tsx) 검토 시 사용 여부 확인 필요
import apiClient from './apiClient';

// ── 초보벽 ──
export const getBeginnerBestRecords = () => apiClient.get('/records/beginner/best');
export const getBeginnerHistory = () => apiClient.get('/records/beginner/history');
export const saveBeginnerRecord = (requestBody: any) =>
  apiClient.post('/records/beginner', requestBody);
export const deleteBeginnerRecord = (recordId: number) =>
  apiClient.delete(`/records/beginner/${recordId}`);

// ── 지구력 ──
export const getEnduranceBestRecord = () => apiClient.get('/records/endurance/best');
export const getEnduranceHistory = () => apiClient.get('/records/endurance/history');
export const saveEnduranceRecord = (requestBody: any) =>
  apiClient.post('/records/endurance', requestBody);
export const deleteEnduranceRecord = (recordId: number) =>
  apiClient.delete(`/records/endurance/${recordId}`);

// ── 연속 리드(시리즈) ──
export const getSeriesBestRecord = () => apiClient.get('/records/series/best');
export const getSeriesHistory = () => apiClient.get('/records/series/history');
export const saveSeriesRecord = (requestBody: any) =>
  apiClient.post('/records/series', requestBody);
export const deleteSeriesRecord = (recordId: number) =>
  apiClient.delete(`/records/series/${recordId}`);