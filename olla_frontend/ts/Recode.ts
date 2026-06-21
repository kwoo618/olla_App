// ============================================================
// useRecode.ts
// 기록(Record) 화면에서 사용하는 커스텀 훅
// - 초보벽 / 지구력 / 연속 완등 3가지 종류의 기록 조회·저장·삭제
// - 기간권 보유 여부 확인 (일일권/횟수권은 기록 작성·삭제 불가)
// - 각 기록 타입별 하단 모달 상태 및 드래그(PanResponder)로 닫기/확장 처리
// - 지구력 지도 좌표 계산 및 이동 경로(선분) 생성
// - 지구력 기록용 스톱워치 타이머
// - pull-to-refresh
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Animated, PanResponder, Dimensions, Keyboard } from 'react-native';
import axios from 'axios';

import {
  getBeginnerBestRecords,
  getBeginnerHistory,
  saveBeginnerRecord,
  deleteBeginnerRecord,
  getEnduranceHistory,
  saveEnduranceRecord,
  deleteEnduranceRecord,
  getSeriesHistory,
  saveSeriesRecord,
  deleteSeriesRecord,
} from '../src/constants/api/record';
import { fetchHasMembership } from '../src/constants/api/member';

// ─────────────────────────── 상수 및 유틸 ───────────────────────────
// 색상별 최대 홀드 수 (완등 판정 기준)
export const MAX_HOLDS: Record<string, number> = {
  '흰색': 26, '노랑': 33, '초록': 28, '파랑': 26,
  '빨강': 26, '보라': 25, '주황': 28, '검정': 30,
};

// 색상별 연속 완등 기본 점수 (연속 완등 점수 계산에 사용)
export const BASE_SCORES: Record<string, number> = {
  '흰색': 10, '노랑': 20, '주황': 30, '초록': 40,
  '파랑': 50, '빨강': 60, '보라': 70, '검정': 80,
};

// 한글 색상명 → 서버 enum 값 변환 맵
const KR_TO_ENUM: Record<string, string> = {
  '흰색': 'WHITE', '노랑': 'YELLOW', '주황': 'ORANGE', '초록': 'GREEN',
  '파랑': 'BLUE',  '빨강': 'RED',    '보라': 'PURPLE', '검정': 'BLACK',
};

// 서버 enum → 한글 색상명 변환 맵
export const ENUM_TO_KR: Record<string, string> = {
  WHITE: '흰색', YELLOW: '노랑', ORANGE: '주황', GREEN: '초록',
  BLUE: '파랑',  RED: '빨강',   PURPLE: '보라', BLACK: '검정',
};

// 초보벽 점수 계산 시 색상 우선순위 (낮음 → 높음)
const colorOrder = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];

// 지구력 지도 구간 순서 (추가 블록 수 → 구간 레이블 변환에 사용)
const BOX_SEQUENCE = [
  '1-1','1-2','1-3','1-4','1-5','1-6',
  '2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10','2-11','2-12',
  '3-1','3-2','3-3','3-4','3-5','3-6',
  '4-1','4-2',
];

// 연속 완등 기록 카드에 사용되는 무지개 색상 배열 (바퀴/순서별 경로 색상 등에도 사용)
export const rainbowColors = ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0080FF','#4B0082','#9400D3'];

// 초 단위를 "MM:SS" 형식 문자열로 변환
export const formatTime = (totalSecs: number): string => {
  const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
  const s = (totalSecs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// 지구력 편도 수 + 추가 블록 수 → 구간 레이블 변환
// 추가 블록이 없으면 '0', 있으면 BOX_SEQUENCE에서 해당 레이블 조회 (범위를 넘으면 마지막 구간 '4-2'로 처리)
const getSectionLabel = (oneWayCount: number, additionalBlocks: number): string => {
  if (oneWayCount === 0 && additionalBlocks === 0) return '0';
  if (additionalBlocks > 0 && additionalBlocks <= BOX_SEQUENCE.length) return BOX_SEQUENCE[additionalBlocks - 1];
  return '4-2'; 
};

// 오늘 날짜 문자열 반환
const getLocalDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============================================================
// useRecode: 기록 화면 메인 커스텀 훅
// - 난이도별(초보벽) 최고 기록 / 오늘의 기록, 지구력, 연속 완등 기록을 조회
// - 기록 저장/삭제, 모달 상태 및 드래그 제스처, 타이머를 관리
// ============================================================
export const useRecode = ({ route, navigation }: any) => {
  // 난이도(색상)별 최고 기록 데이터 (초기값은 전부 미기록 상태)
  const [difficultyData, setDifficultyData] = useState<any[]>([
    { color: '흰색', hex: '#FFFFFF', type: null, current: 0, status: '미기록' },
    { color: '노랑', hex: '#FFE600', type: null, current: 0, status: '미기록' },
    { color: '초록', hex: '#00C853', type: null, current: 0, status: '미기록' },
    { color: '파랑', hex: '#007AFF', type: null, current: 0, status: '미기록' },
    { color: '빨강', hex: '#FF3B30', type: null, current: 0, status: '미기록' },
    { color: '보라', hex: '#AF52DE', type: null, current: 0, status: '미기록' },
    { color: '주황', hex: '#FF8A00', type: null, current: 0, status: '미기록' },
    { color: '검정', hex: '#555555', type: null, current: 0, status: '미기록' },
  ]);
  // 지구력 오늘의 기록 목록
  const [enduranceData, setEnduranceData] = useState<any[]>([]);
  // 연속 완등 오늘의 기록 목록
  const [consecutiveData, setConsecutiveData] = useState<any[]>([]);

  // pull-to-refresh 진행 여부
  const [refreshing, setRefreshing] = useState(false);
  // 지구력 타이머 종료 확인 모달 표시 여부
  const [showTimerFinishConfirm, setShowTimerFinishConfirm] = useState(false); 
  // 초보벽 오늘 기록 히스토리 목록 (최근 기록 표시용)
  const [beginnerHistoryData, setBeginnerHistoryData] = useState<any[]>([]);
  // 현재 펼쳐진 섹션 (라우트 파라미터로 초기값 지정 가능)
  const [expandedSection, setExpandedSection] = useState<string | null>(route?.params?.openSection ?? null);
  // 기간권 보유 여부 (기록 작성/삭제 가능 여부 판단에 사용)
  const [hasValidMembership, setHasValidMembership] = useState(false);

  // ─── 모달 상태 ───
  // 결과 알림(성공/오류/안내) 모달 표시 여부 및 내용
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' as 'info'|'success'|'error' });

  // 결과 알림 모달 표시 (키보드를 먼저 닫은 뒤 모달 노출)
  const showResultModal = useCallback((title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  }, []);

  // 기록 작성/삭제가 가능한 기간권 보유 여부 확인
  // membership.ts의 hasActivePeriodMembership 사용 (isStarted 체크 포함 — 시작일이 미래인 이용권은 제외됨)
  const checkMembership = async () => {
    const isValid = await fetchHasMembership();
    setHasValidMembership(isValid);
  };

  // 기간권 보유 시에만 전달된 액션을 실행, 없으면 구매 안내 모달 표시
  const requireMembership = (action: () => void) => {
    if (!hasValidMembership) {
      showResultModal('알림', '이용권을 먼저 구매해주세요.', 'info');
      return;
    }
    action();
  };

  // ── 데이터 로드 ──
  // 진짜 최고 기록을 유지하기 위한 로직
  // - 최고 기록 전용 API를 우선 조회하고, 비어 있으면 히스토리 500개를 불러와 직접 최고 기록을 산출
  // - 왕복 가점과 성공 여부를 점수에 포함시켜 색상별로 가장 높은 점수의 기록만 선택
  const fetchBestRecords = async () => {
    try {
      const bestRes = await getBeginnerBestRecords().catch(() => null);
      let rawData = bestRes?.data?.data;
      
      let bestList: any[] = [];
      // 백엔드가 배열을 주든, Object(Map)를 주든 무조건 끄집어냄
      if (Array.isArray(rawData)) {
        bestList = rawData;
      } else if (rawData && typeof rawData === 'object') {
        if (Array.isArray(rawData.content)) bestList = rawData.content;
        else if (Array.isArray(rawData.list)) bestList = rawData.list;
        else bestList = Object.values(rawData); // { "WHITE": {...} } 형태 대비
      }

      // 최고기록 전용 API가 비어있다면, 안전하게 최신 500개 히스토리를 불러와서 직접 최고기록 산출
      if (bestList.length === 0) {
        const histRes = await getBeginnerHistory().catch(() => null);
        const histData = histRes?.data?.data;
        if (Array.isArray(histData)) bestList = histData;
        else if (Array.isArray(histData?.content)) bestList = histData.content;
        else if (Array.isArray(histData?.list)) bestList = histData.list;
      }

      setDifficultyData((prevData: any[]) =>
        prevData.map((item: any) => {
          const krColor = item.color;
          const enumColor = KR_TO_ENUM[krColor];
          const maxHold = MAX_HOLDS[krColor] ?? 0;
          
          let bestRecord = null;
          let highestScore = -1;

          bestList.forEach((r: any) => {
            const rColorEnum = r.difficulty || r.color;
            if (rColorEnum === enumColor || rColorEnum === krColor) {
              const isSuccess = r.success !== undefined ? r.success : r.isSuccess;
              const holdCount = isSuccess ? maxHold : (r.maxHoldNo ?? r.score ?? 0);
              const isRoundTrip = String(r.attemptType || r.type).toUpperCase().includes('ROUND') || r.isRoundTrip;
              const colorIdx = colorOrder.indexOf(krColor);
              
              // 왕복 가점과 성공여부를 포함하여 '진짜 가장 높은 점수' 산출
              const score = (colorIdx * 100000) + (isRoundTrip ? 50000 : 0) + Number(holdCount);
              if (score > highestScore) {
                highestScore = score;
                bestRecord = { ...r, calculatedHold: holdCount, isSuccess, isRoundTrip };
              }
            }
          });

          if (bestRecord) {
            const b = bestRecord as any;
            return { 
              ...item, 
              id: b.id, 
              type: b.isRoundTrip ? '왕복' : '편도', 
              current: b.calculatedHold, 
              status: b.isSuccess ? '완료' : '진행중' 
            };
          }
          return { ...item, type: null, current: 0, status: '미기록' };
        })
      );
    } catch (error) { console.error('최고 기록 로드 실패'); }
  };

  // 초보벽 최근 기록 데이터만 뽑아냄
  // - 전체 히스토리(최대 500개)를 불러온 뒤 오늘 날짜에 해당하는 항목만 필터링하여 화면 표시용으로 변환
  const fetchBeginnerHistoryRecords = async () => {
    try {
      const res = await getBeginnerHistory(); 
      const raw = res.data.data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : Array.isArray(raw?.list) ? raw.list : [];
      
      const todayStr = getLocalDateStr();
      const todayList = list.filter((item: any) => {
        const dateStr = item.recordDate || item.createdAt || '';
        return dateStr.startsWith(todayStr); // 여기서 오늘 날짜랑 똑같은 것만 걸러냄
      });

      const sortedList = todayList.sort((a: any, b: any) => b.id - a.id);

      const mapped = sortedList.map((item: any) => {
        const krColor = ENUM_TO_KR[item.difficulty] ?? '흰색';
        const foundDiff = difficultyData?.find((d: any) => d.color === krColor);
        const maxHold = MAX_HOLDS[krColor] ?? 0;
        const isRT = String(item.attemptType ?? '').toUpperCase() === 'ROUND_TRIP';
        const isSuccess = item.success !== undefined ? item.success : item.isSuccess;
        const holdCount = isSuccess ? maxHold : (item.maxHoldNo ?? item.score ?? 0);

        return {
          id: item.id, color: krColor, hex: foundDiff?.hex ?? '#999999',
          type: isRT ? '왕복' : '편도', current: holdCount, max: maxHold, status: isSuccess ? '완등' : '실패',
        };
      });
      setBeginnerHistoryData(mapped);
    } catch (error) { console.error('초보벽 최근 기록 로드 실패'); }
  };

  // 💡 [수정] 지구력 기록도 동일하게 적용
  // 지구력 오늘 기록 조회: 히스토리에서 오늘 날짜만 필터링 후 화면 표시용(편도 횟수/방향/시간/구간)으로 변환
  const fetchEnduranceRecords = async () => {
    try {
      const res = await getEnduranceHistory();
      const raw = res.data.data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : [];
      
      const todayStr = getLocalDateStr();
      const todayList = list.filter((item: any) => {
        const dateStr = item.recordDate || item.createdAt || '';
        return dateStr.startsWith(todayStr);
      });

      const mapped = todayList.map((item: any) => ({
        id: item.id, type: '편도', arrow: item.oneWayCount % 2 !== 0 ? '<-' : '->', 
        laps: String(item.oneWayCount), time: formatTime(item.timeSeconds),
        section: getSectionLabel(item.oneWayCount, item.additionalBlocks),
      }));
      setEnduranceData(mapped);
    } catch (error) { console.error('지구력 기록 로드 실패'); }
  };

  // 연속 완등 기록도 동일하게 적용
  // 연속 완등 오늘 기록 조회: sequenceLog(완등 색상 순서)를 hex 색상 배열로 변환하여 화면 표시
  const fetchSeriesRecords = async () => {
    try {
      const res = await getSeriesHistory();
      const raw = res.data.data ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : [];
      
      const todayStr = getLocalDateStr();
      const todayList = list.filter((item: any) => {
        const dateStr = item.recordDate || item.createdAt || '';
        return dateStr.startsWith(todayStr);
      });

      const mapped = todayList.map((item: any) => ({
        id: item.id, score: item.totalScore ?? 0,
        colors: (item.sequenceLog ?? []).map((diffEnum: string) => {
          const krName = ENUM_TO_KR[diffEnum] ?? '흰색';
          const found  = difficultyData.find((d: any) => d.color === krName);
          return found?.hex ?? '#999999';
        }),
      }));
      setConsecutiveData(mapped);
    } catch (error) { console.error('연속 완등 기록 로드 실패'); }
  };

  // 회원권 확인 + 4가지 기록 데이터(최고 기록/초보벽 히스토리/지구력/연속)를 한꺼번에 병렬 로드
  const loadAllData = useCallback(async () => {
    await Promise.all([ checkMembership(), fetchBestRecords(), fetchBeginnerHistoryRecords(), fetchEnduranceRecords(), fetchSeriesRecords() ]);
  }, [difficultyData]);

  // pull-to-refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // 마운트 시 전체 데이터 로드, 라우트로 전달된 섹션이 있으면 자동으로 펼치기
  useEffect(() => {
    loadAllData();
    if (route?.params?.openSection) setExpandedSection(route.params.openSection);
  }, [route?.params?.openSection]);

  // 섹션 펼침/접힘 토글
  const toggleSection = (section: string) => setExpandedSection(expandedSection === section ? null : section);

  // ── 삭제 로직 ──
  // 삭제 확인 모달 표시 여부 및 삭제 대상(id, 기록 타입)
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; type: 'endurance' | 'consecutive' | 'difficulty' } | null>(null);

  // 기간권 보유 시에만 삭제 확인 모달 표시
  const confirmDelete = (type: any, id: number) => { requireMembership(() => { setItemToDelete({ id, type }); setDeleteModalVisible(true); }); };
  // 삭제 확인 모달 취소
  const cancelDelete = () => { setDeleteModalVisible(false); setItemToDelete(null); };

  // 선택된 기록 타입에 따라 삭제 API 호출 후 해당 목록 재조회
  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const id = Number(itemToDelete.id);
      
      if (itemToDelete.type === 'difficulty') { 
        await deleteBeginnerRecord(id);         
        await fetchBestRecords(); // 오늘꺼 지워져도 다른 최고 기록이 있는지 재검사
        await fetchBeginnerHistoryRecords(); 
      }
      else if (itemToDelete.type === 'endurance') { 
        await deleteEnduranceRecord(id);
        await fetchEnduranceRecords();  
      }
      else if (itemToDelete.type === 'consecutive') { 
        await deleteSeriesRecord(id);       
        await fetchSeriesRecords();     
      }
      
      setDeleteModalVisible(false); setItemToDelete(null);
      setTimeout(() => showResultModal('성공', '기록이 삭제되었습니다.', 'success'), 500);
    } catch (error: any) {
      setDeleteModalVisible(false); setItemToDelete(null);
      setTimeout(() => showResultModal('오류', error.response?.data?.message || '기록 삭제에 실패했습니다.', 'error'), 500);
    }
  };

  // ── 애니메이션 & PanResponder ──
  // 각 모달의 높이(화면 높이 기준 비율)
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const BEGINNER_MODAL_HEIGHT = SCREEN_HEIGHT * 0.70;       
  const ENDURANCE_HALF_HEIGHT = SCREEN_HEIGHT * 0.55;       
  const ENDURANCE_FULL_HEIGHT = SCREEN_HEIGHT * 0.95;       
  const CONSECUTIVE_MODAL_HEIGHT = SCREEN_HEIGHT * 0.77;    

  // 모달 슬라이드 애니메이션 값 (모달별로 분리)
  const beginnerHeightAnim = useRef(new Animated.Value(0)).current;
  const enduranceHeightAnim = useRef(new Animated.Value(0)).current;
  const consecutiveHeightAnim = useRef(new Animated.Value(0)).current;

  // 드래그 시 기준이 되는 현재 스냅(고정) 높이
  const beginnerSnap = useRef(BEGINNER_MODAL_HEIGHT);
  const enduranceSnap = useRef(ENDURANCE_HALF_HEIGHT);
  const consecutiveSnap = useRef(CONSECUTIVE_MODAL_HEIGHT);

  // 초보벽 기록 모달 닫기 (슬라이드 다운 애니메이션 후 관련 상태 초기화)
  const closeRecordModal = useCallback(() => {
    Animated.timing(beginnerHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setRecordModalVisible(false); setSelectedType(null); setSelectedResult(null); setHoldCount(0);
    });
  }, []);

  // 지구력 기록 모달 닫기 (타이머가 실행 중이면 정지 후 슬라이드 다운)
  const closeEnduranceModal = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    Animated.timing(enduranceHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setEnduranceModalVisible(false); setEnduranceLaps(0); setSelectedMapNode(null); setEnduranceMin(''); setEnduranceSec(''); setIsTimerActive(false);
    });
  }, []);

  // 연속 완등 기록 모달 닫기 (슬라이드 다운 후 선택 목록/상세 표시 초기화)
  const closeConsecutiveModal = useCallback(() => {
    Animated.timing(consecutiveHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setConsecutiveModalVisible(false); setSelectedConsecutiveList([]); setShowDetails(false);
    });
  }, []);

  // 초보벽 모달 드래그 제스처 처리
  // - 아래로 드래그하여 현재 높이의 70% 미만이 되면 모달 닫기, 그 외에는 원위치로 스프링 복귀
  const beginnerPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
    onPanResponderGrant: () => { beginnerHeightAnim.setOffset(beginnerSnap.current); beginnerHeightAnim.setValue(0); },
    onPanResponderMove: (_, gs) => { beginnerHeightAnim.setValue(Math.min(0, -gs.dy)); },
    onPanResponderRelease: (_, gs) => {
      beginnerHeightAnim.flattenOffset();
      if (beginnerSnap.current - gs.dy < beginnerSnap.current * 0.7) closeRecordModal();
      else Animated.spring(beginnerHeightAnim, { toValue: beginnerSnap.current, useNativeDriver: false }).start();
    }
  })).current;

  // 지구력 모달 드래그 제스처 처리
  // - 위로 크게 드래그하면 전체 화면 높이로 확장, 아래로 크게 드래그하면 닫기, 그 외에는 절반 높이로 복귀
  const endurancePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
    onPanResponderGrant: () => { enduranceHeightAnim.setOffset(enduranceSnap.current); enduranceHeightAnim.setValue(0); },
    onPanResponderMove: (_, gs) => { enduranceHeightAnim.setValue(-gs.dy); },
    onPanResponderRelease: (_, gs) => {
      enduranceHeightAnim.flattenOffset();
      const finalHeight = enduranceSnap.current - gs.dy;
      const THRESHOLD = (ENDURANCE_HALF_HEIGHT + ENDURANCE_FULL_HEIGHT) / 2;
      const CLOSE_THRESHOLD = ENDURANCE_HALF_HEIGHT * 0.7;
      if (finalHeight > THRESHOLD) { enduranceSnap.current = ENDURANCE_FULL_HEIGHT; Animated.spring(enduranceHeightAnim, { toValue: ENDURANCE_FULL_HEIGHT, useNativeDriver: false }).start(); } 
      else if (finalHeight < CLOSE_THRESHOLD) { closeEnduranceModal(); } 
      else { enduranceSnap.current = ENDURANCE_HALF_HEIGHT; Animated.spring(enduranceHeightAnim, { toValue: ENDURANCE_HALF_HEIGHT, useNativeDriver: false }).start(); }
    }
  })).current;

  // 연속 완등 모달 드래그 제스처 처리
  // - 아래로 드래그하여 현재 높이의 70% 미만이 되면 모달 닫기, 그 외에는 원위치로 스프링 복귀
  const consecutivePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
    onPanResponderGrant: () => { consecutiveHeightAnim.setOffset(consecutiveSnap.current); consecutiveHeightAnim.setValue(0); },
    onPanResponderMove: (_, gs) => { consecutiveHeightAnim.setValue(Math.min(0, -gs.dy)); },
    onPanResponderRelease: (_, gs) => {
      consecutiveHeightAnim.flattenOffset();
      if (consecutiveSnap.current - gs.dy < consecutiveSnap.current * 0.7) closeConsecutiveModal();
      else Animated.spring(consecutiveHeightAnim, { toValue: consecutiveSnap.current, useNativeDriver: false }).start();
    }
  })).current;

  // ── 초보벽 상태 ──
  // 초보벽 기록 모달 표시 여부
  const [isRecordModalVisible,  setRecordModalVisible]  = useState(false);
  // 선택된 난이도(색상), 기본값 '흰색'
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('흰색');
  // 선택된 등반 방식 (편도/왕복)
  const [selectedType,   setSelectedType]   = useState<string | null>(null);
  // 선택된 결과 (완등/실패)
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  // 실패 시 도달한 홀드 번호
  const [holdCount,      setHoldCount]      = useState(0);

  // 난이도 변경 시 홀드 카운트 초기화
  useEffect(() => { setHoldCount(0); }, [selectedDifficulty]);

  // 초보벽 기록 모달 열기 (기간권 보유 확인 후 슬라이드 업)
  const openRecordModal = () => requireMembership(() => {
    setRecordModalVisible(true); beginnerSnap.current = BEGINNER_MODAL_HEIGHT; beginnerHeightAnim.setValue(0);
    Animated.timing(beginnerHeightAnim, { toValue: BEGINNER_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  });

  // 선택된 난이도의 최대 홀드 수
  const currentMaxHolds = useMemo(() => MAX_HOLDS[selectedDifficulty] ?? 0, [selectedDifficulty]);

  // 초보벽 기록 저장
  // - 완등(성공)인 경우 홀드 번호를 해당 난이도의 최대 홀드 수로 자동 설정
  const handleSaveBeginnerRecord = async () => {
    if (!selectedType || !selectedResult) { showResultModal('알림', '모든 항목을 선택해주세요.', 'info'); return; }
    const isSuccess = selectedResult === '완등';
    const payload = {
      difficulty: KR_TO_ENUM[selectedDifficulty] ?? 'WHITE',
      attemptType: selectedType === '편도' ? 'ONE_WAY' : 'ROUND_TRIP',
      maxHoldNo: Number(isSuccess ? currentMaxHolds : holdCount),
      isSuccess: Boolean(isSuccess), 
      recordDate: getLocalDateStr(),
    };
    try {
      await saveBeginnerRecord(payload);
      await fetchBestRecords(); await fetchBeginnerHistoryRecords();
      closeRecordModal(); setTimeout(() => showResultModal('성공', '등반 기록이 저장되었습니다.', 'success'), 500);
    } catch (error: any) {
      closeRecordModal(); setTimeout(() => showResultModal('오류', error.response?.data?.message || '저장 실패', 'error'), 500);
    }
  };

  // ── 지구력 상태 ──
  // 지구력 기록 모달 표시 여부
  const [isEnduranceModalVisible, setEnduranceModalVisible] = useState(false);
  // 현재까지 진행한 편도(바퀴) 수
  const [enduranceLaps,    setEnduranceLaps]    = useState(0);
  // 지도에서 선택된 구간 노드
  const [selectedMapNode,  setSelectedMapNode]  = useState<string | null>(null);
  // 직접 입력한 분/초 (타이머를 사용하지 않을 때)
  const [enduranceMin,     setEnduranceMin]     = useState('');
  const [enduranceSec,     setEnduranceSec]     = useState('');
  // 타이머 모달 활성화 여부
  const [isTimerActive,    setIsTimerActive]    = useState(false);
  // 타이머 실행 중 여부 및 누적 초
  const [timerRunning,  setTimerRunning]  = useState(false);
  const [timerSeconds,  setTimerSeconds]  = useState(0);
  // setInterval 핸들 보관용 ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 지구력 기록 모달 열기 (기간권 보유 확인 후 절반 높이로 슬라이드 업)
  const openEnduranceModal = () => requireMembership(() => {
    setEnduranceModalVisible(true); enduranceSnap.current = ENDURANCE_HALF_HEIGHT; enduranceHeightAnim.setValue(0);
    Animated.timing(enduranceHeightAnim, { toValue: ENDURANCE_HALF_HEIGHT, duration: 300, useNativeDriver: false }).start();
  });

  // 지구력 지도 좌표 계산용 상수 (간격, 시작 위치, 텍스트 오프셋)
  const SPACING = 24; const GAP = 10; const BASE_X = 30; const BASE_Y = 40; const TEXT_OFFSET = 24;
  // 지구력 지도의 박스/텍스트 좌표 생성
  // - 구간 2(상단 가로), 구간 1(좌측 세로), 구간 3(우측 세로), 구간 4(하단 가로) 영역별로 좌표와 색상을 배치
  const mapElements = useMemo(() => {
    const elements: any[] = [];
    for (let i = 0; i <= 12; i++) { const x = BASE_X + i * SPACING; const y = BASE_Y; elements.push({ type: 'text', id: `T2-${i}`, val: `2-${i}`, x, y: y - TEXT_OFFSET }); if (i > 0) elements.push({ type: 'box', id: `2-${i}`, color: i <= 4 ? '#58CCFF' : i <= 8 ? '#3A4CA8' : '#692498', x: x - SPACING / 2, y }); }
    for (let i = 0; i <= 6; i++) { const x = BASE_X - GAP; const y = BASE_Y + GAP + (6 - i) * SPACING; elements.push({ type: 'text', id: `T1-${i}`, val: `1-${i}`, x: x - TEXT_OFFSET, y }); if (i > 0) elements.push({ type: 'box', id: `1-${i}`, color: i === 6 ? '#B96BC6' : '#FFFFFF', x, y: y + SPACING / 2 }); }
    for (let i = 0; i <= 6; i++) { const x = BASE_X + 12 * SPACING + GAP; const y = BASE_Y + GAP + i * SPACING; elements.push({ type: 'text', id: `T3-${i}`, val: `3-${i}`, x: x + TEXT_OFFSET, y }); if (i > 0) elements.push({ type: 'box', id: `3-${i}`, color: '#666666', x, y: y - SPACING / 2 }); }
    for (let i = 0; i <= 2; i++) { const x = BASE_X + 12 * SPACING + GAP - i * SPACING; const y = BASE_Y + GAP + 6 * SPACING + GAP; elements.push({ type: 'text', id: `T4-${i}`, val: `4-${i}`, x, y: y + TEXT_OFFSET }); if (i > 0) elements.push({ type: 'box', id: `4-${i}`, color: '#343434', x: x + SPACING / 2, y }); }
    return elements;
  }, []);

  // 현재 바퀴 수가 홀수면 역방향으로 진행 중이므로 직전 구간 번호로 보정한 '실제 구간'
  const effectiveSection = useMemo(() => {
    if (!selectedMapNode) return null;
    const [A, B] = selectedMapNode.split('-');
    return enduranceLaps % 2 !== 0 ? `${A}-${parseInt(B, 10) - 1}` : selectedMapNode;
  }, [selectedMapNode, enduranceLaps]);

  // 구간 id로 지도 좌표 조회
  const getBoxCoord = useCallback((id: string) => {
    const node = mapElements.find(m => m.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  }, [mapElements]);

  // View 렌더링 부분을 데이터화 하여 분리
  // 지구력 이동 경로를 바퀴 수만큼 선분 데이터로 변환 (바퀴마다 무지개 색상을 순환 적용, 짝/홀수 바퀴에 따라 진행 방향이 반대)
  const pathSegmentsData = useMemo(() => {
    const segments: any[] = [];
    const maxIdx = BOX_SEQUENCE.length - 1;
    for (let l = 0; l <= enduranceLaps; l++) {
      const color = rainbowColors[l % 7]; const offset = l * 2; const isEven = l % 2 === 0;
      let startIdx: number, endIdx: number;
      if (l === enduranceLaps) {
        if (!selectedMapNode) break;
        const targetIdx = BOX_SEQUENCE.indexOf(selectedMapNode);
        if (targetIdx === -1) break;
        startIdx = isEven ? 0 : maxIdx; endIdx = targetIdx;
      } else {
        startIdx = isEven ? 0 : maxIdx; endIdx = isEven ? maxIdx : 0;
      }
      const step = isEven ? 1 : -1;
      for (let i = startIdx; i !== endIdx; i += step) {
        const nextI = i + step;
        const p1 = getBoxCoord(BOX_SEQUENCE[i]); const p2 = getBoxCoord(BOX_SEQUENCE[nextI]);
        const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const angle  = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
        const cx = (p1.x + p2.x) / 2; const cy = (p1.y + p2.y) / 2;
        segments.push({
          key: `line-${l}-${i}`, left: cx - length / 2 + offset, top: cy - 2 + offset,
          width: length, color, angle, zIndex: 5 + l
        });
      }
    }
    return segments;
  }, [enduranceLaps, selectedMapNode, getBoxCoord]);

  // 지구력 기록 저장
  // - 선택된 구간을 추가 블록 수로 환산, 입력된 분/초를 합산하여 timeSeconds로 변환 후 API 호출
  const handleSaveEnduranceRecord = async () => {
    if (!effectiveSection && enduranceLaps === 0) { showResultModal('알림', '기록할 바퀴 수나 지도 구간을 선택해주세요.', 'info'); return; }
    const additionalBlocks = effectiveSection ? Math.max(0, BOX_SEQUENCE.indexOf(effectiveSection) + 1) : 0;
    const timeSeconds = ((parseInt(enduranceMin, 10) || 0) * 60) + (parseInt(enduranceSec, 10) || 0);

    const payload = { oneWayCount: Number(enduranceLaps), additionalBlocks: Number(additionalBlocks), timeSeconds: Number(timeSeconds), recordDate: getLocalDateStr() };
    try {
      await saveEnduranceRecord(payload);
      await fetchEnduranceRecords(); closeEnduranceModal(); setTimeout(() => showResultModal('성공', '지구력 기록이 저장되었습니다.', 'success'), 500);
    } catch (error: any) {
      closeEnduranceModal(); setTimeout(() => showResultModal('오류', '지구력 기록 저장에 실패했습니다.', 'error'), 500);
    }
  };

  // 타이머 시작/정지 토글
  const toggleTimer = () => {
    if (timerRunning) { setTimerRunning(false); if (timerRef.current) clearInterval(timerRef.current); } 
    else { setTimerRunning(true); if (timerRef.current) clearInterval(timerRef.current); timerRef.current = setInterval(() => setTimerSeconds(p => p + 1), 1000); }
  };
  // 타이머 정지 후 종료 확인 모달 표시
  const confirmStopTimer = () => { if (timerRunning) { setTimerRunning(false); if (timerRef.current) clearInterval(timerRef.current); } setShowTimerFinishConfirm(true); };
  // 타이머 종료 확정: 측정된 시간을 분/초 입력값으로 반영
  const stopTimerAndSave = () => {
    setShowTimerFinishConfirm(false); setIsTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current); setTimerRunning(false);
    const [m, s] = formatTime(timerSeconds).split(':'); setEnduranceMin(m); setEnduranceSec(s);
  };
  // 타이머 모달 초기화 후 열기
  const openTimerModal = () => { setTimerSeconds(0); setTimerRunning(false); setIsTimerActive(true); };
  // 언마운트 시 실행 중인 타이머 정리
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── 연속 완등 상태 ──
  // 연속 완등 기록 모달 표시 여부
  const [isConsecutiveModalVisible, setConsecutiveModalVisible] = useState(false);
  // 현재 입력 중인 연속 완등 색상 목록
  const [selectedConsecutiveList, setSelectedConsecutiveList] = useState<any[]>([]);
  // 상세 정보(점수 등) 표시 여부
  const [showDetails, setShowDetails] = useState(false);

  // 연속 완등 기록 모달 열기 (기간권 보유 확인 후 슬라이드 업)
  const openConsecutiveModal = () => requireMembership(() => {
    setConsecutiveModalVisible(true); consecutiveSnap.current = CONSECUTIVE_MODAL_HEIGHT; consecutiveHeightAnim.setValue(0);
    Animated.timing(consecutiveHeightAnim, { toValue: CONSECUTIVE_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  });

  // 연속 완등 입력 목록에서 특정 항목 제거
  const removeConsecutiveItem = (idx: number) => setSelectedConsecutiveList(p => p.filter((_, i) => i !== idx));

  // 연속 완등 총점 계산: 색상 기본 점수 * (1.0 + 인덱스 * 0.1) → 뒤에 이을수록 점수 배수 증가
  const displayTotalScore = useMemo(() => {
    const total = selectedConsecutiveList.reduce((acc, curr, index) => {
      const baseScore = BASE_SCORES[curr.color] ?? 10;
      return acc + (baseScore * (1.0 + (index * 0.1)));
    }, 0);
    return Math.round(total * 10) / 10;
  }, [selectedConsecutiveList]);

  // 연속 완등 기록 저장
  const handleSaveConsecutiveRecord = async () => {
    if (selectedConsecutiveList.length === 0) { showResultModal('알림', '연속으로 완등한 난이도를 입력해주세요.', 'info'); return; }
    try {
      await saveSeriesRecord({ sequenceLog: selectedConsecutiveList.map(i => KR_TO_ENUM[i.color] ?? 'WHITE'), recordDate: getLocalDateStr() });
      await fetchSeriesRecords(); closeConsecutiveModal(); setTimeout(() => showResultModal('성공', '기록이 저장되었습니다.', 'success'), 500);
    } catch (error) { closeConsecutiveModal(); setTimeout(() => showResultModal('오류', '저장 실패', 'error'), 500); }
  };

  // 화면(컴포넌트)에서 사용할 상태 값과 핸들러를 묶어서 반환
  return {
    difficultyData, enduranceData, consecutiveData, 
    refreshing, onRefresh, expandedSection, toggleSection,
    beginnerHistoryData,
    
    resultModalVisible, resultModalConfig, closeResultModal: () => setResultModalVisible(false),
    isDeleteModalVisible, confirmDelete, executeDelete, cancelDelete,

    isRecordModalVisible, openRecordModal, closeRecordModal, beginnerHeightAnim, beginnerPanResponder, hasValidMembership,
    selectedDifficulty, setSelectedDifficulty, selectedType, setSelectedType, selectedResult, setSelectedResult, holdCount, setHoldCount, currentMaxHolds, handleSaveBeginnerRecord,

    isEnduranceModalVisible, openEnduranceModal, closeEnduranceModal, enduranceHeightAnim, endurancePanResponder,
    enduranceLaps, setEnduranceLaps, selectedMapNode, setSelectedMapNode, enduranceMin, setEnduranceMin, enduranceSec, setEnduranceSec, effectiveSection,
    mapElements, getBoxCoord, pathSegmentsData, handleSaveEnduranceRecord,
    isTimerActive, setIsTimerActive, timerRunning, timerSeconds, showTimerFinishConfirm, setShowTimerFinishConfirm, toggleTimer, confirmStopTimer, stopTimerAndSave, openTimerModal,

    isConsecutiveModalVisible, openConsecutiveModal, closeConsecutiveModal, consecutiveHeightAnim, consecutivePanResponder,
    selectedConsecutiveList, setSelectedConsecutiveList, removeConsecutiveItem, showDetails, setShowDetails, displayTotalScore, handleSaveConsecutiveRecord,
  };
};