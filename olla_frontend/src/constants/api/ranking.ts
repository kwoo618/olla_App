// /rankings/** 엔드포인트 모음
import apiClient from './apiClient';

export const getBeginnerRanking = (difficulty: string) =>
  apiClient.get('/rankings/beginner', { params: { difficulty } });

export const getSeriesRanking = () => apiClient.get('/rankings/series');

export const getEnduranceDistanceRanking = () =>
  apiClient.get('/rankings/endurance/distance');

export const getEnduranceTimeRanking = () =>
  apiClient.get('/rankings/endurance/time');