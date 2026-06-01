import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Animated, PanResponder, Dimensions, Keyboard } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// ─────────────────────────── 상수 및 유틸 ───────────────────────────
const ENDURANCE_BASE_URL = `${API_BASE_URL}/records/endurance`;
const SERIES_BASE_URL    = `${API_BASE_URL}/records/series`;
const MEMBERSHIP_URL     = `${API_BASE_URL}/memberships/me`;

export const MAX_HOLDS: Record<string, number> = {
  '흰색': 26, '노랑': 33, '초록': 28, '파랑': 26,
  '빨강': 26, '보라': 25, '주황': 28, '검정': 30,
};

export const BASE_SCORES: Record<string, number> = {
  '흰색': 10, '노랑': 20, '주황': 30, '초록': 40,
  '파랑': 50, '빨강': 60, '보라': 70, '검정': 80,
};

const KR_TO_ENUM: Record<string, string> = {
  '흰색': 'WHITE', '노랑': 'YELLOW', '주황': 'ORANGE', '초록': 'GREEN',
  '파랑': 'BLUE',  '빨강': 'RED',    '보라': 'PURPLE', '검정': 'BLACK',
};

export const ENUM_TO_KR: Record<string, string> = {
  WHITE: '흰색', YELLOW: '노랑', ORANGE: '주황', GREEN: '초록',
  BLUE: '파랑',  RED: '빨강',   PURPLE: '보라', BLACK: '검정',
};

const colorOrder = ['흰색', '노랑', '초록', '파랑', '빨강', '보라', '주황', '검정'];

const BOX_SEQUENCE = [
  '1-1','1-2','1-3','1-4','1-5','1-6',
  '2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10','2-11','2-12',
  '3-1','3-2','3-3','3-4','3-5','3-6',
  '4-1','4-2',
];

export const rainbowColors = ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0080FF','#4B0082','#9400D3'];

export const formatTime = (totalSecs: number): string => {
  const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
  const s = (totalSecs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

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

const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const useRecode = ({ route, navigation }: any) => {
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
  const [enduranceData, setEnduranceData] = useState<any[]>([]);
  const [consecutiveData, setConsecutiveData] = useState<any[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [showTimerFinishConfirm, setShowTimerFinishConfirm] = useState(false); 
  const [beginnerHistoryData, setBeginnerHistoryData] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(route?.params?.openSection ?? null);
  const [hasValidMembership, setHasValidMembership] = useState(false);

  // ─── 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' as 'info'|'success'|'error' });

  const showResultModal = useCallback((title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    Keyboard.dismiss();
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  }, []);

  const checkMembership = async () => {
    try {
      const config = await getAuthHeader();
      const res = await axios.get(MEMBERSHIP_URL, config); 
      const rawData = res.data.data; 
      if (rawData) {
        const memberships = Array.isArray(rawData) ? rawData : [rawData];
        let isValid = false;
        for (const m of memberships) {
          if (!m) continue;
          const status = String(m.membershipStatus || '').toUpperCase();
          if (status === 'DELETED') continue;
          const typeStr = String(m.membershipType ?? '').toUpperCase();
          
          if (typeStr.includes('COUNT') || typeStr.includes('횟수')) {
            if ((m.remainingCount ?? 0) > 0) { isValid = true; break; }
          } else if (typeStr.includes('PERIOD') || typeStr.includes('기간') || m.endDate) {
            if (m.endDate) {
              const end = new Date(m.endDate);
              end.setHours(23, 59, 59, 999);
              if (end.getTime() >= Date.now()) { isValid = true; break; }
            }
          }
        }
        setHasValidMembership(isValid);
      } else {
        setHasValidMembership(false);
      }
    } catch (error) {
      setHasValidMembership(false);
    }
  };

  const requireMembership = (action: () => void) => {
    if (!hasValidMembership) {
      showResultModal('알림', '이용권을 먼저 구매해주세요.', 'info');
      return;
    }
    action();
  };

  // ── 데이터 로드 ──
  // 진짜 최고 기록을 유지하기 위한 로직
  const fetchBestRecords = async () => {
    try {
      const config = await getAuthHeader();
      // 최고 기록 전용 API 호출
      const bestRes = await axios.get(`${API_BASE_URL}/records/beginner/best`, config).catch(() => null);
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
        const histRes = await axios.get(`${API_BASE_URL}/records/beginner/history`, { ...config, params: { size: 500 } }).catch(() => null);
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
  const fetchBeginnerHistoryRecords = async () => {
    try {
      const config = await getAuthHeader();
      const reqConfig = { ...config, params: { page: 0, size: 500, sort: 'id,desc' } };
      
      const res = await axios.get(`${API_BASE_URL}/records/beginner/history`, reqConfig); 
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
  const fetchEnduranceRecords = async () => {
    try {
      const config = await getAuthHeader();
      const reqConfig = { ...config, params: { page: 0, size: 500, sort: 'id,desc' } };

      const res = await axios.get(`${ENDURANCE_BASE_URL}/history`, reqConfig); 
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
  const fetchSeriesRecords = async () => {
    try {
      const config = await getAuthHeader();
      const reqConfig = { ...config, params: { page: 0, size: 500, sort: 'id,desc' } };

      const res = await axios.get(`${SERIES_BASE_URL}/history`, reqConfig); 
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

  const loadAllData = useCallback(async () => {
    await Promise.all([ checkMembership(), fetchBestRecords(), fetchBeginnerHistoryRecords(), fetchEnduranceRecords(), fetchSeriesRecords() ]);
  }, [difficultyData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  useEffect(() => {
    loadAllData();
    if (route?.params?.openSection) setExpandedSection(route.params.openSection);
  }, [route?.params?.openSection]);

  const toggleSection = (section: string) => setExpandedSection(expandedSection === section ? null : section);

  // ── 삭제 로직 ──
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; type: 'endurance' | 'consecutive' | 'difficulty' } | null>(null);

  const confirmDelete = (type: any, id: number) => { requireMembership(() => { setItemToDelete({ id, type }); setDeleteModalVisible(true); }); };
  const cancelDelete = () => { setDeleteModalVisible(false); setItemToDelete(null); };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const config = await getAuthHeader();
      const id = Number(itemToDelete.id);
      
      if (itemToDelete.type === 'difficulty') { 
        await axios.delete(`${API_BASE_URL}/records/beginner/${id}`, config);       
        await fetchBestRecords(); // 💡 오늘꺼 지워져도 다른 최고 기록이 있는지 재검사
        await fetchBeginnerHistoryRecords(); 
      }
      else if (itemToDelete.type === 'endurance') { 
        await axios.delete(`${ENDURANCE_BASE_URL}/${id}`, config); 
        await fetchEnduranceRecords();  
      }
      else if (itemToDelete.type === 'consecutive') { 
        await axios.delete(`${SERIES_BASE_URL}/${id}`, config);    
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
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const BEGINNER_MODAL_HEIGHT = SCREEN_HEIGHT * 0.70;       
  const ENDURANCE_HALF_HEIGHT = SCREEN_HEIGHT * 0.55;       
  const ENDURANCE_FULL_HEIGHT = SCREEN_HEIGHT * 0.95;       
  const CONSECUTIVE_MODAL_HEIGHT = SCREEN_HEIGHT * 0.77;    

  const beginnerHeightAnim = useRef(new Animated.Value(0)).current;
  const enduranceHeightAnim = useRef(new Animated.Value(0)).current;
  const consecutiveHeightAnim = useRef(new Animated.Value(0)).current;

  const beginnerSnap = useRef(BEGINNER_MODAL_HEIGHT);
  const enduranceSnap = useRef(ENDURANCE_HALF_HEIGHT);
  const consecutiveSnap = useRef(CONSECUTIVE_MODAL_HEIGHT);

  const closeRecordModal = useCallback(() => {
    Animated.timing(beginnerHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setRecordModalVisible(false); setSelectedType(null); setSelectedResult(null); setHoldCount(0);
    });
  }, []);

  const closeEnduranceModal = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    Animated.timing(enduranceHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setEnduranceModalVisible(false); setEnduranceLaps(0); setSelectedMapNode(null); setEnduranceMin(''); setEnduranceSec(''); setIsTimerActive(false);
    });
  }, []);

  const closeConsecutiveModal = useCallback(() => {
    Animated.timing(consecutiveHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setConsecutiveModalVisible(false); setSelectedConsecutiveList([]); setShowDetails(false);
    });
  }, []);

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
  const [isRecordModalVisible,  setRecordModalVisible]  = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('흰색');
  const [selectedType,   setSelectedType]   = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [holdCount,      setHoldCount]      = useState(0);

  useEffect(() => { setHoldCount(0); }, [selectedDifficulty]);

  const openRecordModal = () => requireMembership(() => {
    setRecordModalVisible(true); beginnerSnap.current = BEGINNER_MODAL_HEIGHT; beginnerHeightAnim.setValue(0);
    Animated.timing(beginnerHeightAnim, { toValue: BEGINNER_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  });

  const currentMaxHolds = useMemo(() => MAX_HOLDS[selectedDifficulty] ?? 0, [selectedDifficulty]);

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
      const config = await getAuthHeader(); 
      await axios.post(`${API_BASE_URL}/records/beginner`, payload, config);
      await fetchBestRecords(); await fetchBeginnerHistoryRecords();
      closeRecordModal(); setTimeout(() => showResultModal('성공', '등반 기록이 저장되었습니다.', 'success'), 500);
    } catch (error: any) {
      closeRecordModal(); setTimeout(() => showResultModal('오류', error.response?.data?.message || '저장 실패', 'error'), 500);
    }
  };

  // ── 지구력 상태 ──
  const [isEnduranceModalVisible, setEnduranceModalVisible] = useState(false);
  const [enduranceLaps,    setEnduranceLaps]    = useState(0);
  const [selectedMapNode,  setSelectedMapNode]  = useState<string | null>(null);
  const [enduranceMin,     setEnduranceMin]     = useState('');
  const [enduranceSec,     setEnduranceSec]     = useState('');
  const [isTimerActive,    setIsTimerActive]    = useState(false);
  const [timerRunning,  setTimerRunning]  = useState(false);
  const [timerSeconds,  setTimerSeconds]  = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openEnduranceModal = () => requireMembership(() => {
    setEnduranceModalVisible(true); enduranceSnap.current = ENDURANCE_HALF_HEIGHT; enduranceHeightAnim.setValue(0);
    Animated.timing(enduranceHeightAnim, { toValue: ENDURANCE_HALF_HEIGHT, duration: 300, useNativeDriver: false }).start();
  });

  const SPACING = 24; const GAP = 10; const BASE_X = 30; const BASE_Y = 40; const TEXT_OFFSET = 24;
  const mapElements = useMemo(() => {
    const elements: any[] = [];
    for (let i = 0; i <= 12; i++) { const x = BASE_X + i * SPACING; const y = BASE_Y; elements.push({ type: 'text', id: `T2-${i}`, val: `2-${i}`, x, y: y - TEXT_OFFSET }); if (i > 0) elements.push({ type: 'box', id: `2-${i}`, color: i <= 4 ? '#58CCFF' : i <= 8 ? '#3A4CA8' : '#692498', x: x - SPACING / 2, y }); }
    for (let i = 0; i <= 6; i++) { const x = BASE_X - GAP; const y = BASE_Y + GAP + (6 - i) * SPACING; elements.push({ type: 'text', id: `T1-${i}`, val: `1-${i}`, x: x - TEXT_OFFSET, y }); if (i > 0) elements.push({ type: 'box', id: `1-${i}`, color: i === 6 ? '#B96BC6' : '#FFFFFF', x, y: y + SPACING / 2 }); }
    for (let i = 0; i <= 6; i++) { const x = BASE_X + 12 * SPACING + GAP; const y = BASE_Y + GAP + i * SPACING; elements.push({ type: 'text', id: `T3-${i}`, val: `3-${i}`, x: x + TEXT_OFFSET, y }); if (i > 0) elements.push({ type: 'box', id: `3-${i}`, color: '#666666', x, y: y - SPACING / 2 }); }
    for (let i = 0; i <= 2; i++) { const x = BASE_X + 12 * SPACING + GAP - i * SPACING; const y = BASE_Y + GAP + 6 * SPACING + GAP; elements.push({ type: 'text', id: `T4-${i}`, val: `4-${i}`, x, y: y + TEXT_OFFSET }); if (i > 0) elements.push({ type: 'box', id: `4-${i}`, color: '#343434', x: x + SPACING / 2, y }); }
    return elements;
  }, []);

  const effectiveSection = useMemo(() => {
    if (!selectedMapNode) return null;
    const [A, B] = selectedMapNode.split('-');
    return enduranceLaps % 2 !== 0 ? `${A}-${parseInt(B, 10) - 1}` : selectedMapNode;
  }, [selectedMapNode, enduranceLaps]);

  const getBoxCoord = useCallback((id: string) => {
    const node = mapElements.find(m => m.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  }, [mapElements]);

  // View 렌더링 부분을 데이터화 하여 분리
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

  const handleSaveEnduranceRecord = async () => {
    if (!effectiveSection && enduranceLaps === 0) { showResultModal('알림', '기록할 바퀴 수나 지도 구간을 선택해주세요.', 'info'); return; }
    const additionalBlocks = effectiveSection ? Math.max(0, BOX_SEQUENCE.indexOf(effectiveSection) + 1) : 0;
    const timeSeconds = ((parseInt(enduranceMin, 10) || 0) * 60) + (parseInt(enduranceSec, 10) || 0);

    const payload = { oneWayCount: Number(enduranceLaps), additionalBlocks: Number(additionalBlocks), timeSeconds: Number(timeSeconds), recordDate: getLocalDateStr() };
    try {
      const config = await getAuthHeader(); 
      await axios.post(ENDURANCE_BASE_URL, payload, config);
      await fetchEnduranceRecords(); closeEnduranceModal(); setTimeout(() => showResultModal('성공', '지구력 기록이 저장되었습니다.', 'success'), 500);
    } catch (error: any) {
      closeEnduranceModal(); setTimeout(() => showResultModal('오류', '지구력 기록 저장에 실패했습니다.', 'error'), 500);
    }
  };

  const toggleTimer = () => {
    if (timerRunning) { setTimerRunning(false); if (timerRef.current) clearInterval(timerRef.current); } 
    else { setTimerRunning(true); if (timerRef.current) clearInterval(timerRef.current); timerRef.current = setInterval(() => setTimerSeconds(p => p + 1), 1000); }
  };
  const confirmStopTimer = () => { if (timerRunning) { setTimerRunning(false); if (timerRef.current) clearInterval(timerRef.current); } setShowTimerFinishConfirm(true); };
  const stopTimerAndSave = () => {
    setShowTimerFinishConfirm(false); setIsTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current); setTimerRunning(false);
    const [m, s] = formatTime(timerSeconds).split(':'); setEnduranceMin(m); setEnduranceSec(s);
  };
  const openTimerModal = () => { setTimerSeconds(0); setTimerRunning(false); setIsTimerActive(true); };
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── 연속 완등 상태 ──
  const [isConsecutiveModalVisible, setConsecutiveModalVisible] = useState(false);
  const [selectedConsecutiveList, setSelectedConsecutiveList] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const openConsecutiveModal = () => requireMembership(() => {
    setConsecutiveModalVisible(true); consecutiveSnap.current = CONSECUTIVE_MODAL_HEIGHT; consecutiveHeightAnim.setValue(0);
    Animated.timing(consecutiveHeightAnim, { toValue: CONSECUTIVE_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
  });

  const removeConsecutiveItem = (idx: number) => setSelectedConsecutiveList(p => p.filter((_, i) => i !== idx));

  const displayTotalScore = useMemo(() => {
    const total = selectedConsecutiveList.reduce((acc, curr, index) => {
      const baseScore = BASE_SCORES[curr.color] ?? 10;
      return acc + (baseScore * (1.0 + (index * 0.1)));
    }, 0);
    return Math.round(total * 10) / 10;
  }, [selectedConsecutiveList]);

  const handleSaveConsecutiveRecord = async () => {
    if (selectedConsecutiveList.length === 0) { showResultModal('알림', '연속으로 완등한 난이도를 입력해주세요.', 'info'); return; }
    try {
      const config = await getAuthHeader(); 
      await axios.post(SERIES_BASE_URL, { sequenceLog: selectedConsecutiveList.map(i => KR_TO_ENUM[i.color] ?? 'WHITE'), recordDate: getLocalDateStr() }, config);
      await fetchSeriesRecords(); closeConsecutiveModal(); setTimeout(() => showResultModal('성공', '기록이 저장되었습니다.', 'success'), 500);
    } catch (error) { closeConsecutiveModal(); setTimeout(() => showResultModal('오류', '저장 실패', 'error'), 500); }
  };

  return {
    difficultyData, enduranceData, consecutiveData, 
    refreshing, onRefresh, expandedSection, toggleSection,
    beginnerHistoryData,
    
    resultModalVisible, resultModalConfig, closeResultModal: () => setResultModalVisible(false),
    isDeleteModalVisible, confirmDelete, executeDelete, cancelDelete,

    isRecordModalVisible, openRecordModal, closeRecordModal, beginnerHeightAnim, beginnerPanResponder,
    selectedDifficulty, setSelectedDifficulty, selectedType, setSelectedType, selectedResult, setSelectedResult, holdCount, setHoldCount, currentMaxHolds, handleSaveBeginnerRecord,

    isEnduranceModalVisible, openEnduranceModal, closeEnduranceModal, enduranceHeightAnim, endurancePanResponder,
    enduranceLaps, setEnduranceLaps, selectedMapNode, setSelectedMapNode, enduranceMin, setEnduranceMin, enduranceSec, setEnduranceSec, effectiveSection,
    mapElements, getBoxCoord, pathSegmentsData, handleSaveEnduranceRecord,
    isTimerActive, setIsTimerActive, timerRunning, timerSeconds, showTimerFinishConfirm, setShowTimerFinishConfirm, toggleTimer, confirmStopTimer, stopTimerAndSave, openTimerModal,

    isConsecutiveModalVisible, openConsecutiveModal, closeConsecutiveModal, consecutiveHeightAnim, consecutivePanResponder,
    selectedConsecutiveList, setSelectedConsecutiveList, removeConsecutiveItem, showDetails, setShowDetails, displayTotalScore, handleSaveConsecutiveRecord,
  };
};