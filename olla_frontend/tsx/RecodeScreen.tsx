import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// ─────────────────────────── API URLs ───────────────────────────
const ENDURANCE_BASE_URL = `${API_BASE_URL}/records/endurance`;
const SERIES_BASE_URL    = `${API_BASE_URL}/records/series`;
const MEMBERSHIP_URL     = `${API_BASE_URL}/memberships/me`;

// ─────────────────────────── Axios 인터셉터 ───────────────────────────
axios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('토큰 가져오기 실패:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────── 상수 ───────────────────────────

const MAX_HOLDS: Record<string, number> = {
  '흰색': 26, '노랑': 33, '초록': 28, '파랑': 26,
  '빨강': 26, '보라': 25, '주황': 28, '검정': 30,
};

// 난이도별 기본 점수 (연속 완등 점수 화면 표시용 - 실제 저장은 서버에서 계산)
const BASE_SCORES: Record<string, number> = {
  '흰색': 10, '노랑': 20, '주황': 30, '초록': 40,
  '파랑': 50, '빨강': 60, '보라': 70, '검정': 80,
};

const KR_TO_ENUM: Record<string, string> = {
  '흰색': 'WHITE', '노랑': 'YELLOW', '주황': 'ORANGE', '초록': 'GREEN',
  '파랑': 'BLUE',  '빨강': 'RED',    '보라': 'PURPLE', '검정': 'BLACK',
};

const ENUM_TO_KR: Record<string, string> = {
  WHITE: '흰색', YELLOW: '노랑', ORANGE: '주황', GREEN: '초록',
  BLUE: '파랑',  RED: '빨강',   PURPLE: '보라', BLACK: '검정',
};

const BOX_SEQUENCE = [
  '1-1','1-2','1-3','1-4','1-5','1-6',
  '2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10','2-11','2-12',
  '3-1','3-2','3-3','3-4','3-5','3-6',
  '4-1','4-2',
];

// ─────────────────────────── 타입 ───────────────────────────
interface BeginnerRecord {
  id: number;
  difficulty: string;
  attemptType: string;
  maxHoldNo?: number;
  score?: number;
  recordDate: string;
  success: boolean;
}

interface EnduranceRecord {
  id: number;
  oneWayCount: number;
  additionalBlocks: number;
  timeSeconds: number;
  recordDate: string;
}

interface SeriesRecord {
  id: number;
  sequenceLog: string[];
  totalScore: number;
  recordDate: string;
}

// ─────────────────────────── 헬퍼 ───────────────────────────
const formatTime = (totalSecs: number): string => {
  const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
  const s = (totalSecs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const getSectionLabel = (oneWayCount: number, additionalBlocks: number): string => {
  if (oneWayCount === 0 && additionalBlocks === 0) return '0';
  if (additionalBlocks > 0 && additionalBlocks <= BOX_SEQUENCE.length)
    return BOX_SEQUENCE[additionalBlocks - 1];
  return '4-2'; 
};

const getLocalDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─────────────────────────── 컴포넌트 ───────────────────────────

const RecodeScreen = ({
  route, navigation,
  difficultyData, setDifficultyData,
  enduranceData,  setEnduranceData,
  consecutiveData, setConsecutiveData,
}: any) => {

  const [refreshing, setRefreshing] = useState(false);
  
  const loadAllData = async () => {
    setEnduranceData([]);
    setConsecutiveData([]);
    await Promise.all([
      checkMembership(),
      fetchBestRecords(),
      fetchEnduranceRecords(),
      fetchSeriesRecords()
    ]);
  };

  const [expandedSection, setExpandedSection] = useState<string | null>(
    route?.params?.openSection ?? null
  );
  const [hasValidMembership, setHasValidMembership] = useState(false);

  // ─── 커스텀 알림 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  useEffect(() => {
    loadAllData();
    if (route?.params?.openSection) setExpandedSection(route.params.openSection);
  }, [route?.params?.openSection]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  // ── 멤버십 확인 ──
  const checkMembership = async () => {
    try {
      const res = await axios.get(MEMBERSHIP_URL);
      const data = res.data?.data?.data; 
      
      if (data) {
        const typeStr = String(data.membershipType ?? '').toUpperCase();
        if (typeStr.includes('COUNT') || typeStr.includes('횟수')) {
          setHasValidMembership((data.remainingCount ?? 0) > 0);
        } else if (data.endDate) {
          const end = new Date(data.endDate);
          end.setHours(23, 59, 59, 999);
          setHasValidMembership(end.getTime() >= Date.now());
        } else {
          setHasValidMembership(false);
        }
      } else {
        setHasValidMembership(false);
      }
    } catch {
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

  // ── 초보벽 최고기록 조회 (🚀 수정포인트 1: 백엔드 점수 신뢰 로직) ──
  const fetchBestRecords = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/records/beginner/best`);
      const raw = res.data?.data?.data ?? [];
      const list: BeginnerRecord[] = Array.isArray(raw) ? raw : Array.isArray(raw?.list) ? raw.list : [];

      setDifficultyData((prevData: any[]) =>
        prevData.map((item: any) => {
          const enumColor = KR_TO_ENUM[item.color];
          const maxHold   = MAX_HOLDS[item.color] ?? item.total ?? 0;

          const recordsForColor = list.filter(r => r.difficulty === enumColor);
          let bestRecord: BeginnerRecord | null = null;
          let highestScore = -1;

          recordsForColor.forEach(r => {
            // [수정 완료] 프론트엔드 임의 계산 제거 (50_000 하드코딩 등). 백엔드 score를 최우선으로 신뢰합니다.
            const holdCount = r.success ? maxHold : (r.maxHoldNo ?? 0);
            const score = r.score ?? holdCount; // 백엔드 score가 없으면 임시로 홀드수만 적용 (서버 점수화 필수)

            if (score > highestScore) {
              highestScore = score;
              bestRecord   = r;
            }
          });

          if (bestRecord) {
            const b         = bestRecord as BeginnerRecord;
            const isRT      = String(b.attemptType ?? '').toUpperCase() === 'ROUND_TRIP';
            const rawHold   = b.maxHoldNo !== undefined ? b.maxHoldNo : b.score;
            const holdCount = b.success ? maxHold : (rawHold ?? 0);
            return {
              ...item,
              id:      b.id,
              type:    isRT ? '왕복' : '편도',
              current: holdCount,
              status:  b.success ? '완료' : '진행중',
            };
          }
          return { ...item, type: null, current: 0, status: '미기록' };
        })
      );
    } catch (error: any) {
      console.error('최고 기록 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  // ── 지구력 기록 조회 ──
  const fetchEnduranceRecords = async () => {
    try {
      const res = await axios.get(`${ENDURANCE_BASE_URL}/history`);
      const raw = res.data?.data?.data ?? [];
      const list: EnduranceRecord[] = Array.isArray(raw) ? raw : [];

      const mapped = list.map((item: EnduranceRecord) => ({
        id:      item.id,
        type:    '편도',
        arrow:   item.oneWayCount % 2 !== 0 ? '<-' : '->', 
        laps:    String(item.oneWayCount),
        time:    formatTime(item.timeSeconds),
        section: getSectionLabel(item.oneWayCount, item.additionalBlocks),
      }));

      setEnduranceData(mapped);
    } catch (error: any) {
      console.error('지구력 기록 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  // ── 연속 완등 기록 조회 ──
  const fetchSeriesRecords = async () => {
    try {
      const res = await axios.get(`${SERIES_BASE_URL}/history`);
      const raw = res.data?.data?.data ?? [];
      const list: SeriesRecord[] = Array.isArray(raw) ? raw : [];

      const mapped = list.map((item: SeriesRecord) => ({
        id:    item.id,
        score: item.totalScore ?? 0,
        colors: (item.sequenceLog ?? []).map(diffEnum => {
          const krName = ENUM_TO_KR[diffEnum] ?? '흰색';
          const found  = difficultyData.find((d: any) => d.color === krName);
          return found?.hex ?? '#999999';
        }),
      }));

      setConsecutiveData(mapped);
    } catch (error: any) {
      console.error('연속 완등 기록 로드 실패:', error.response?.data?.message || error.message);
    }
  };

  const toggleSection = (section: string) =>
    setExpandedSection(expandedSection === section ? null : section);

  // ─── 삭제 모달 및 삭제 로직 ───
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: number; type: 'endurance' | 'consecutive' | 'difficulty';
  } | null>(null);

  const confirmDelete = (type: any, id: number) => {
    requireMembership(() => {
      setItemToDelete({ id, type });
      setDeleteModalVisible(true);
    });
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const id = Number(itemToDelete.id);
      if      (itemToDelete.type === 'difficulty')  { await axios.delete(`${API_BASE_URL}/records/beginner/${id}`);       await fetchBestRecords();       }
      else if (itemToDelete.type === 'endurance')   { await axios.delete(`${ENDURANCE_BASE_URL}/${id}`); await fetchEnduranceRecords();  }
      else if (itemToDelete.type === 'consecutive') { await axios.delete(`${SERIES_BASE_URL}/${id}`);    await fetchSeriesRecords();     }
      
      setDeleteModalVisible(false);
      setItemToDelete(null);

      setTimeout(() => {
        showResultModal('성공', '기록이 삭제되었습니다.', 'success');
      }, 500);

    } catch (error: any) {
      setDeleteModalVisible(false);
      setItemToDelete(null);
      
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '기록 삭제에 실패했습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, 500);
    }
  };

  const cancelDelete = () => { setDeleteModalVisible(false); setItemToDelete(null); };

  // ─── 초보벽 모달 및 로직 ───
  const [isRecordModalVisible,  setRecordModalVisible]  = useState(false);
  const beginnerSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('흰색');
  const [selectedType,   setSelectedType]   = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [holdCount,      setHoldCount]      = useState(0);

  useEffect(() => { setHoldCount(0); }, [selectedDifficulty]);

  const openRecordModal = () => {
    requireMembership(() => {
      setRecordModalVisible(true);
      setTimeout(() => {
        Animated.timing(beginnerSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, 50);
    });
  };

  const closeRecordModal = () => {
    Animated.timing(beginnerSlideAnim, { toValue: 800, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      setRecordModalVisible(false);
      setSelectedType(null);
      setSelectedResult(null);
      setHoldCount(0);
    }, 200);
  };

  const currentMaxHolds = useMemo(() => {
    return MAX_HOLDS[selectedDifficulty] ?? 0;
  }, [selectedDifficulty]);

  const handleSaveBeginnerRecord = async () => {
    if (!selectedType || !selectedResult) {
      showResultModal('알림', '모든 항목을 선택해주세요.', 'info'); 
      return;
    }
    
    const isSuccess    = selectedResult === '완등';
    const finalHold    = isSuccess ? currentMaxHolds : holdCount;
    const enumDifficulty = KR_TO_ENUM[selectedDifficulty] ?? 'WHITE';

    const payload = {
      difficulty:  enumDifficulty,
      attemptType: selectedType === '편도' ? 'ONE_WAY' : 'ROUND_TRIP',
      maxHoldNo:   Number(finalHold),
      isSuccess:   Boolean(isSuccess), 
      recordDate:  getLocalDateStr(),
    };

    try {
      await axios.post(`${API_BASE_URL}/records/beginner`, payload);
      await fetchBestRecords();
      closeRecordModal();
      
      setTimeout(() => {
        showResultModal('성공', '등반 기록이 저장되었습니다.', 'success');
      }, 500);

    } catch (error: any) {
      closeRecordModal();
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '데이터 저장에 실패했습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, 500);
    }
  };

  // ─── 지구력 모달 ───
  const [isEnduranceModalVisible, setEnduranceModalVisible] = useState(false);
  const enduranceSlideAnim = useRef(new Animated.Value(800)).current;
  const [enduranceLaps,    setEnduranceLaps]    = useState(0);
  const [selectedMapNode,  setSelectedMapNode]  = useState<string | null>(null);
  const [enduranceMin,     setEnduranceMin]     = useState('');
  const [enduranceSec,     setEnduranceSec]     = useState('');
  
  const [isTimerActive,    setIsTimerActive]    = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'timer'>('stopwatch');
  const [initialTimerValue, setInitialTimerValue] = useState(600); 
  const [timerRunning,  setTimerRunning]  = useState(false);
  const [timerSeconds,  setTimerSeconds]  = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [isFinishModalVisible, setFinishModalVisible] = useState(false);

  const openEnduranceModal = () => {
    requireMembership(() => {
      setEnduranceModalVisible(true);
      setTimeout(() => {
        Animated.timing(enduranceSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, 50);
    });
  };

  const closeEnduranceModal = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);

    Animated.timing(enduranceSlideAnim, { toValue: 800, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      setEnduranceModalVisible(false);
      setEnduranceLaps(0);
      setSelectedMapNode(null);
      setEnduranceMin('');
      setEnduranceSec('');
      setIsTimerActive(false);
    }, 200);
  };

  const SPACING = 24; const GAP = 10; const BASE_X = 30; const BASE_Y = 40; const TEXT_OFFSET = 24;
  const mapElements: any[] = useMemo(() => {
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

  const getBoxCoord = (id: string) => {
    const node = mapElements.find(m => m.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const rainbowColors = ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0080FF','#4B0082','#9400D3'];

  const pathSegments = useMemo(() => {
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
        segments.push(
          <View key={`line-${l}-${i}`} style={{ position: 'absolute', left: cx - length / 2 + offset, top: cy - 2 + offset, width: length, height: 4, backgroundColor: color, transform: [{ rotate: `${angle}deg` }], zIndex: 5 + l, borderRadius: 2 }} />
        );
      }
    }
    return segments;
  }, [enduranceLaps, selectedMapNode, mapElements]);

  const handleSaveEnduranceRecord = async () => {
    if (!effectiveSection && enduranceLaps === 0) {
      showResultModal('알림', '기록할 바퀴 수나 지도 구간을 선택해주세요.', 'info');
      return;
    }
    const additionalBlocks = effectiveSection
      ? Math.max(0, BOX_SEQUENCE.indexOf(effectiveSection) + 1)
      : 0;
    const timeSeconds = ((parseInt(enduranceMin, 10) || 0) * 60) + (parseInt(enduranceSec, 10) || 0);

    const payload = {
      oneWayCount:      Number(enduranceLaps),
      additionalBlocks: Number(additionalBlocks),
      timeSeconds:      Number(timeSeconds),
      recordDate:       getLocalDateStr(),
    };

    try {
      await axios.post(ENDURANCE_BASE_URL, payload);
      await fetchEnduranceRecords();
      closeEnduranceModal();
      
      setTimeout(() => {
        showResultModal('성공', '지구력 기록이 저장되었습니다.', 'success');
      }, 500);

    } catch (error: any) {
      closeEnduranceModal();
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '지구력 기록 저장에 실패했습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, 500);
    }
  };

  const toggleTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerMode === 'timer' && timerSeconds <= 0) return; 
      
      setTimerRunning(true);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (timerMode === 'stopwatch') {
            return prev + 1; 
          } else {
            if (prev <= 1) { 
              if (timerRef.current) clearInterval(timerRef.current);
              setTimerRunning(false);
              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    }
  };

  const confirmStopTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setTimeout(() => {
      setFinishModalVisible(true);
    }, 500);
  };

  const cancelStopTimer = () => {
    setFinishModalVisible(false);
  };

  const stopTimerAndSave = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    
    let elapsed = 0;
    if (timerMode === 'stopwatch') {
      elapsed = timerSeconds; 
    } else {
      elapsed = initialTimerValue - timerSeconds; 
    }
    
    const [m, s] = formatTime(elapsed).split(':');
    setEnduranceMin(m);
    setEnduranceSec(s);
    setIsTimerActive(false);
    setFinishModalVisible(false); 
  };

  const openTimerModal = () => { 
    setTimerMode('stopwatch');
    setTimerSeconds(0); 
    setTimerRunning(false); 
    setIsTimerActive(true); 
  };
  
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const renderMapNode = (item: any) => {
    if (item.type === 'text')
      return <Text key={item.id} style={[styles.mapAbsText, { left: item.x - 15, top: item.y - 8 }]}>{item.val}</Text>;
    return (
      <TouchableOpacity key={item.id} onPress={() => setSelectedMapNode(item.id)}
        style={[styles.mapAbsBox, { backgroundColor: item.color, left: item.x - 10, top: item.y - 10 }]} />
    );
  };

  // ─── 연속 완등 모달 ───
  const [isConsecutiveModalVisible, setConsecutiveModalVisible] = useState(false);
  const consecutiveSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedConsecutiveList, setSelectedConsecutiveList] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const openConsecutiveModal = () => {
    requireMembership(() => {
      setConsecutiveModalVisible(true);
      setTimeout(() => {
        Animated.timing(consecutiveSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, 50);
    });
  };

  const closeConsecutiveModal = () => {
    Animated.timing(consecutiveSlideAnim, { toValue: 800, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      setConsecutiveModalVisible(false);
      setSelectedConsecutiveList([]);
      setShowDetails(false);
    }, 200);
  };

  const removeConsecutiveItem = (indexToRemove: number) =>
    setSelectedConsecutiveList(prev => prev.filter((_, i) => i !== indexToRemove));

  // 이 점수는 화면 노출용(Preview)으로만 사용하며 실제 저장은 sequenceLog만 전송합니다.
  const totalConsecutiveScore = selectedConsecutiveList.reduce(
    (acc: number, curr: any, index: number) => {
      const baseScore = BASE_SCORES[curr.color] ?? 10;
      const multiplier = 1.0 + (index * 0.1);
      return acc + (baseScore * multiplier);
    }, 0
  );
  
  const displayTotalScore = Math.round(totalConsecutiveScore * 10) / 10;

  const handleSaveConsecutiveRecord = async () => {
    if (selectedConsecutiveList.length === 0) {
      showResultModal('알림', '연속으로 완등한 난이도를 1개 이상 입력해주세요.', 'info');
      return;
    }
    const payload = {
      sequenceLog: selectedConsecutiveList.map(item => KR_TO_ENUM[item.color] ?? 'WHITE'),
      recordDate:  getLocalDateStr(),
    };

    try {
      await axios.post(SERIES_BASE_URL, payload);
      await fetchSeriesRecords();
      closeConsecutiveModal();
      
      setTimeout(() => {
        showResultModal('성공', '연속 완등 기록이 저장되었습니다.', 'success');
      }, 500);

    } catch (error: any) {
      closeConsecutiveModal();
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '연속 완등 기록 저장에 실패했습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, 500);
    }
  };

  // ─────────────────────────── 렌더 ───────────────────────────
  return (
    <View style={styles.background}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A1BE44"
            colors={['#A1BE44']}
          />
        }
      >

        {/* 요약 카드 영역 */}
        <View style={styles.summaryContainer}>
          <TouchableOpacity style={styles.summaryItemVertical} onPress={openRecordModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('../assets/ArrowUpRight.png')} style={styles.summaryIconVertical1} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>초보벽</Text>
                <Text style={styles.summarySubLabelVertical}>난이도별 등반 기록 (터치하여 기록하기)</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryItemVertical} onPress={openEnduranceModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('../assets/Timer.png')} style={styles.summaryIconVertical2} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>지구력</Text>
                <Text style={styles.summarySubLabelVertical}>바퀴 수와 시간 기록 (터치하여 기록하기)</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryItemVertical} onPress={openConsecutiveModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('../assets/ArrowsClockwise.png')} style={styles.summaryIconVertical3} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>초보벽 완등 연속</Text>
                <Text style={styles.summarySubLabelVertical}>연속 완등 기록 (터치하여 기록하기)</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>
        </View>

        {/* 난이도별 최고기록 아코디언 */}
        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('difficulty')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>난이도 별 최고기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'difficulty' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {expandedSection === 'difficulty' && (
            <View style={styles.outerContainer}>
              {difficultyData.map((item: any, index: number) => (
                <View key={item.color} style={styles.recordItemCard}>
                  <Text style={styles.recordIdLarge}>{index + 1}</Text>
                  <View style={styles.colorAndTypeColumn}>
                    <Text style={[styles.colorNameText, { color: item.hex }]}>{item.color}</Text>
                    <View style={item.type === '왕복' ? styles.typeBadgeRoundTrip : styles.typeBadgeOneWay}>
                      <Text style={item.type === '왕복' ? styles.typeTextRoundTrip : styles.typeTextOneWay}>
                        {item.type || '미기록'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.recordHoldsLeft}>
                    {item.current ?? 0} / {MAX_HOLDS[item.color] ?? item.total}번
                  </Text>
                  <Text style={[styles.recordStatus, item.status === '완료' ? styles.statusSuccess : styles.statusIng]}>
                    {item.status || '-'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 지구력 기록 아코디언 */}
        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('endurance')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>오늘의 지구력 기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'endurance' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {expandedSection === 'endurance' && (
            <View style={styles.outerContainer}>
              {enduranceData.length === 0 ? (
                <View style={styles.recordItemCard}>
                  <Text style={styles.emptyText}>오늘의 지구력 기록이 없습니다.</Text>
                </View>
              ) : (
                enduranceData.map((item: any) => (
                  <View key={item.id} style={styles.rowCardWithTrash}>
                    <View style={styles.enduranceCol}>
                      <Text style={styles.enduranceTopText}>{item.type}</Text>
                      <Text style={styles.enduranceBottomText}>{item.arrow}</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}>
                      <Text style={styles.enduranceTopText}>{item.laps}</Text>
                      <Text style={styles.enduranceBottomText}>바퀴</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}>
                      <Text style={styles.enduranceTopText}>{item.time}</Text>
                      <Text style={styles.enduranceBottomText}>시간</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}>
                      <Text style={styles.enduranceTopText}>{item.section}</Text>
                      <Text style={styles.enduranceBottomText}>구간</Text>
                    </View>
                    <TouchableOpacity style={styles.trashButton} onPress={() => confirmDelete('endurance', item.id)}>
                      <Image source={require('../assets/trash.png')} style={styles.trashIcon} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* 연속 완등 기록 아코디언 */}
        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('consecutive')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>오늘의 초보벽 연속 기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'consecutive' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {expandedSection === 'consecutive' && (
            <View style={styles.outerContainer}>
              {consecutiveData.length === 0 ? (
                <View style={styles.recordItemCard}>
                  <Text style={styles.emptyText}>오늘의 초보벽 연속 기록이 없습니다.</Text>
                </View>
              ) : (
                consecutiveData.map((item: any, index: number) => (
                  <View key={item.id ?? index} style={styles.rowCardWithTrash}>
                    <View style={styles.circleContainer}>
                      {item.colors?.map((color: string, idx: number) => (
                        <View key={idx} style={[styles.colorCircle, { backgroundColor: color }]} />
                      ))}
                    </View>
                    <TouchableOpacity style={styles.trashButton} onPress={() => confirmDelete('consecutive', item.id)}>
                      <Image source={require('../assets/trash.png')} style={styles.trashIcon} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* ─── 초보벽 기록 모달 ─── */}
      <Modal visible={isRecordModalVisible} animationType="fade" transparent onRequestClose={closeRecordModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeRecordModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: beginnerSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>초보벽 기록 저장</Text>
                <TouchableOpacity onPress={closeRecordModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <TouchableOpacity activeOpacity={1} style={{ width: '100%', paddingBottom: 20 }}>
                
                <Text style={styles.sectionTitle}>난이도 선택</Text>
                <View style={styles.colorButtonContainer}>
                  <View style={styles.colorButtonRow}>
                    {difficultyData.map((item: any) => {
                      const isSelected = selectedDifficulty === item.color;
                      return (
                        <TouchableOpacity key={item.color} onPress={() => setSelectedDifficulty(item.color)}
                          style={[
                            styles.diffButton, 
                            { borderColor: item.hex }, 
                            isSelected && { backgroundColor: item.hex, borderWidth: 2 } 
                          ]}>
                          <Text style={[
                            styles.diffButtonText, 
                            isSelected && { 
                              fontWeight: 'bold', 
                              color: '#ffffff', 
                              textShadowColor: 'rgba(0, 0, 0, 0.7)', 
                              textShadowOffset: { width: 0, height: 1 }, 
                              textShadowRadius: 2 
                            }
                          ]}>
                            {item.color}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <Text style={styles.sectionTitle}>등반 유형</Text>
                <View style={styles.choiceRow}>
                  {['편도', '왕복'].map(type => (
                    <TouchableOpacity key={type} onPress={() => setSelectedType(type)}
                      style={[styles.choiceButton, { borderColor: selectedType === type ? '#A1BE44' : '#555555' }]}>
                      <Text style={styles.choiceButtonText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>결과</Text>
                <View style={styles.choiceRow}>
                  <TouchableOpacity onPress={() => setSelectedResult('완등')}
                    style={[styles.choiceButton, { borderColor: selectedResult === '완등' ? '#A1BE44' : '#555555' }]}>
                    <Text style={styles.choiceButtonText}>완등</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedResult('실패')}
                    style={[styles.choiceButton, { borderColor: selectedResult === '실패' ? '#FF4D4D' : '#555555' }]}>
                    <Text style={styles.choiceButtonText}>실패</Text>
                  </TouchableOpacity>
                </View>

                {selectedResult === '완등' && (
                  <TouchableOpacity style={styles.saveRecordButton} onPress={handleSaveBeginnerRecord}>
                    <Text style={styles.saveRecordButtonText}>기록 저장하기</Text>
                  </TouchableOpacity>
                )}

                {selectedResult === '실패' && (
                  <View style={styles.failContainer}>
                    <Text style={styles.failLabel}>진행한 홀드 수를 입력하세요</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity onPress={() => setHoldCount(Math.max(0, holdCount - 1))} style={styles.counterBtn}>
                        <Text style={styles.counterBtnText}>-</Text>
                      </TouchableOpacity>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.holdInput}>{holdCount}</Text>
                        <Text style={styles.holdMaxText}>/ {currentMaxHolds}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setHoldCount(Math.min(currentMaxHolds, holdCount + 1))} style={styles.counterBtn}>
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.saveRecordButton} onPress={handleSaveBeginnerRecord}>
                      <Text style={styles.saveRecordButtonText}>기록 저장하기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 지구력 스톱워치 / 타이머 모달 (🚀 수정포인트 2: absoluteFill, zIndex 꼼수 제거) ─── */}
      <Modal visible={isEnduranceModalVisible} animationType="fade" transparent onRequestClose={closeEnduranceModal}>
        {isTimerActive ? (
          <SafeAreaView style={styles.timerModalBackground}>
            <View style={styles.timerHeader}>
              <Text style={styles.timerHeaderTitle}>지구력 측정</Text>
              <TouchableOpacity onPress={() => { if (timerRef.current) clearInterval(timerRef.current); setTimerRunning(false); setIsTimerActive(false); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timerModeContainer}>
              <TouchableOpacity 
                style={[styles.timerModeBtn, timerMode === 'stopwatch' && styles.timerModeBtnActive]}
                onPress={() => { 
                  if (!timerRunning) { 
                    setTimerMode('stopwatch'); 
                    setTimerSeconds(0); 
                  } 
                }}
                activeOpacity={timerRunning ? 1 : 0.7}
              >
                <Text style={[styles.timerModeBtnText, timerMode === 'stopwatch' && styles.timerModeBtnTextActive]}>
                  스톱워치
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.timerModeBtn, timerMode === 'timer' && styles.timerModeBtnActive]}
                onPress={() => { 
                  if (!timerRunning) { 
                    setTimerMode('timer'); 
                    setTimerSeconds(600); 
                    setInitialTimerValue(600); 
                  } 
                }}
                activeOpacity={timerRunning ? 1 : 0.7}
              >
                <Text style={[styles.timerModeBtnText, timerMode === 'timer' && styles.timerModeBtnTextActive]}>
                  타이머
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timerCenterArea}>
              <Text style={styles.hugeTimerText}>{formatTime(timerSeconds)}</Text>
              
              {timerMode === 'timer' && !timerRunning && (
                <View style={styles.timerAdjustRow}>
                  <TouchableOpacity 
                    onPress={() => {
                      setTimerSeconds(prev => Math.max(600, prev - 600)); 
                      setInitialTimerValue(prev => Math.max(600, prev - 600));
                    }} 
                    style={styles.adjustBtn}
                  >
                    <Text style={styles.adjustBtnText}>- 10분</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setTimerSeconds(prev => prev + 600);
                      setInitialTimerValue(prev => prev + 600);
                    }} 
                    style={styles.adjustBtn}
                  >
                    <Text style={styles.adjustBtnText}>+ 10분</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.timerControlRow}>
              <TouchableOpacity style={[styles.timerCircleBtn, { backgroundColor: timerRunning ? '#FFB74D' : '#A1BE44' }]} onPress={toggleTimer}>
                <Text style={styles.timerCircleBtnText}>{timerRunning ? '일시정지' : '시작'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.timerCircleBtn, { backgroundColor: '#FF4D4D' }]} onPress={confirmStopTimer}>
                <Text style={styles.timerCircleBtnText}>완료</Text>
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        ) : (
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeEnduranceModal}>
            <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: enduranceSlideAnim }] }]}>
              <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>지구력 기록 저장</Text>
                  <TouchableOpacity onPress={closeEnduranceModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
                </View>
              </TouchableOpacity>
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                <TouchableOpacity activeOpacity={1} style={{ width: '100%', paddingBottom: 20 }}>
                  <Text style={styles.sectionTitle}>편도 횟수</Text>
                  <View style={styles.enduranceCounterRow}>
                    <TouchableOpacity onPress={() => setEnduranceLaps(Math.max(0, enduranceLaps - 1))} style={styles.counterBtn}>
                      <Text style={styles.counterBtnText}>-</Text>
                    </TouchableOpacity>
                    <View style={styles.inputWrapperSmall}>
                      <Text style={styles.lapsInputText}>{enduranceLaps}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setEnduranceLaps(enduranceLaps + 1)} style={styles.counterBtn}>
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitle}>지도에서 선택</Text>
                  <View style={styles.mapSuperContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapScrollWrapper}>
                      <View style={styles.mapInnerWrapper}>
                        <View style={{ width: 350, height: 235 }}>
                          {mapElements.map(renderMapNode)}
                          {pathSegments}
                          {selectedMapNode && (
                            <View style={[styles.headMarker, {
                              backgroundColor: rainbowColors[enduranceLaps % 7],
                              left: getBoxCoord(selectedMapNode).x - 10,
                              top:  getBoxCoord(selectedMapNode).y - 10,
                            }]} />
                          )}
                        </View>
                      </View>
                    </ScrollView>
                  </View>

                  <Text style={styles.sectionTitle}>선택한 구간 (자동계산)</Text>
                  <View style={styles.selectedSectionBox}>
                    <Text style={styles.selectedSectionText}>
                      {effectiveSection ? `${effectiveSection} 구간` : '지도에서 컬러 블록을 선택해주세요'}
                    </Text>
                  </View>

                  <Text style={styles.sectionTitle}>시간 기록 (타이머 기능 제공)</Text>
                  <View style={styles.timerInputRow}>
                    <TouchableOpacity onPress={openTimerModal} style={styles.timerPlayBtn}>
                      <Text style={styles.timerPlayIcon}>▶</Text>
                    </TouchableOpacity>
                    <View style={styles.timerDisplayWrapper}>
                      <Text style={styles.timerDisplayText}>{enduranceMin || '00'}</Text>
                      <Text style={styles.timerLabel}>분</Text>
                      <Text style={styles.timerDisplayText}>{enduranceSec || '00'}</Text>
                      <Text style={styles.timerLabel}>초</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.saveRecordButton} onPress={handleSaveEnduranceRecord}>
                    <Text style={styles.saveRecordButtonText}>기록 저장하기</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        )}
      </Modal>

      {/* ─── 연속 완등 모달 ─── */}
      <Modal visible={isConsecutiveModalVisible} animationType="fade" transparent onRequestClose={closeConsecutiveModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeConsecutiveModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: consecutiveSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>연속 기록 저장</Text>
                <TouchableOpacity onPress={closeConsecutiveModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <TouchableOpacity activeOpacity={1} style={{ width: '100%', paddingBottom: 20 }}>
                <Text style={styles.sectionTitle}>난이도 입력</Text>
                <View style={styles.consecutiveInputBox}>
                  {selectedConsecutiveList.map((item: any, index: number) => (
                    <TouchableOpacity key={index} onPress={() => removeConsecutiveItem(index)}
                      style={[styles.filledDiffBox, { backgroundColor: item.hex }]}>
                      <Text style={styles.filledDiffText}>{item.color}</Text>
                    </TouchableOpacity>
                  ))}
                  {selectedConsecutiveList.length === 0 && (
                    <Text style={styles.consecutiveEmptyText}>아래에서 난이도를 순서대로 탭해주세요</Text>
                  )}
                </View>

                <View style={styles.colorButtonContainer}>
                  <View style={styles.colorButtonRow}>
                    {difficultyData.map((item: any) => (
                      <TouchableOpacity key={item.color}
                        onPress={() => setSelectedConsecutiveList([...selectedConsecutiveList, item])}
                        style={[styles.diffButton, { borderColor: item.hex }]}>
                        <Text style={styles.diffButtonText}>{item.color}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.horizontalDivider} />
                <View style={styles.scoreHeaderRow}>
                  <Text style={styles.scoreTitle}>총 점</Text>
                  <TouchableOpacity style={styles.detailButton} onPress={() => setShowDetails(!showDetails)}>
                    <Text style={styles.detailButtonText}>{showDetails ? '닫기' : '상세보기'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.totalScoreText}>{displayTotalScore} 점</Text>

                {showDetails && (
                  <View style={[styles.consecutiveInputBox, { marginTop: 15 }]}>
                    {selectedConsecutiveList.map((item: any, index: number) => {
                      const baseScore = BASE_SCORES[item.color] ?? 10;
                      const multiplier = 1.0 + (index * 0.1);
                      const stepScore = Math.round((baseScore * multiplier) * 10) / 10;
                      return (
                        <View key={index} style={[styles.filledDiffBox, { backgroundColor: item.hex }]}>
                          <Text style={styles.filledDiffText}>{stepScore}</Text>
                        </View>
                      );
                    })}
                    {selectedConsecutiveList.length === 0 && (
                      <Text style={styles.consecutiveEmptyText}>입력된 기록이 없습니다</Text>
                    )}
                  </View>
                )}

                <TouchableOpacity style={styles.saveRecordButton} onPress={handleSaveConsecutiveRecord}>
                  <Text style={styles.saveRecordButtonText}>기록 저장하기</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 커스텀 알림 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 삭제 확인 모달 ─── */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent onRequestClose={cancelDelete}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={executeDelete}>
                <Text style={styles.deleteBtnYesText}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={cancelDelete}>
                <Text style={styles.deleteBtnNoText}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 타이머 종료 확인 모달 ─── */}
      <Modal visible={isFinishModalVisible} animationType="fade" transparent onRequestClose={cancelStopTimer}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>종료하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={stopTimerAndSave}>
                <Text style={styles.deleteBtnYesText}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={cancelStopTimer}>
                <Text style={styles.deleteBtnNoText}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },

  summaryContainer: { marginBottom: 15 },
  summaryItemVertical: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 12 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center' },
  summaryIconVertical1: { width: 32, height: 32, tintColor: '#0084FF', marginRight: 15 },
  summaryIconVertical2: { width: 32, height: 32, tintColor: '#2CDA00', marginRight: 15 },
  summaryIconVertical3: { width: 32, height: 32, tintColor: '#FFCC00', marginRight: 15 },
  summaryTextColumn: { flexDirection: 'column', justifyContent: 'center' },
  summaryLabelVertical: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 
  summarySubLabelVertical: { color: '#999999', fontSize: 15, fontWeight: '500', marginTop: 4 }, 

  simpleAccordionWrapper: { marginBottom: 10 },
  simpleAccordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 5 },
  simpleAccordionTitle: { color: '#999999', fontSize: 17, fontWeight: '500' }, 
  chevronIcon: { color: '#999999', fontSize: 18, fontWeight: 'bold' }, 
  outerContainer: { paddingVertical: 5 },

  recordItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 16, marginBottom: 10 },
  recordIdLarge: { color: '#999999', fontSize: 25, fontWeight: 'bold', width: 40 }, 
  colorAndTypeColumn: { width: 65, flexDirection: 'column', justifyContent: 'center' }, 
  colorNameText: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 }, 
  typeBadgeRoundTrip: { backgroundColor: '#1A5276', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  typeTextRoundTrip: { color: '#85C1E9', fontSize: 13, fontWeight: 'bold' }, 
  typeBadgeOneWay: { backgroundColor: '#7B241C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  typeTextOneWay: { color: '#CCCCCC', fontSize: 13, fontWeight: 'bold' }, 
  recordHoldsLeft: { flex: 1, color: '#ffffff', fontSize: 17, fontWeight: 'bold', marginLeft: 10 }, 
  recordStatus: { fontSize: 16, fontWeight: 'bold', width: 55, textAlign: 'right' }, 
  statusSuccess: { color: '#A1BE44' },
  statusIng: { color: '#999999' },

  rowCardWithTrash: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', paddingVertical: 18, paddingHorizontal: 15, borderRadius: 16, marginBottom: 10 },
  enduranceCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  enduranceTopText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }, 
  enduranceBottomText: { color: '#999999', fontSize: 14 }, 
  verticalDivider: { width: 1, height: 30, backgroundColor: '#444444', marginHorizontal: 5 },
  circleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, flexWrap: 'wrap' },
  colorCircle: { width: 30, height: 30, borderRadius: 15, marginRight: 10, marginBottom: 5 },
  trashButton: { padding: 10, marginLeft: 5 },
  trashIcon: { width: 24, height: 24, tintColor: '#A1BE44', resizeMode: 'contain' }, 
  emptyText: { color: '#999999', fontSize: 16, textAlign: 'center', width: '100%' }, 

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold', marginLeft: 10 }, 
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 }, 
  sectionTitle: { color: '#999999', fontSize: 16, fontWeight: '600', marginTop: 5, marginBottom: 10 }, 

  colorButtonContainer: { borderWidth: 1, borderColor: '#444444', borderRadius: 16, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 2, marginBottom: 15 },
  colorButtonRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  diffButton: { width: '23%', borderWidth: 1.5, backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  diffButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '500' }, 
  choiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  choiceButton: { flex: 1, borderWidth: 1.5, backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, marginHorizontal: 4, alignItems: 'center' },
  choiceButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '600' }, 
  saveRecordButton: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  saveRecordButtonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 

  failContainer: { width: '100%', alignItems: 'center', marginTop: 5 },
  failLabel: { color: '#CCCCCC', fontSize: 16, marginBottom: 10 }, 
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  counterBtn: { width: 50, height: 50, backgroundColor: '#333333', borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginHorizontal: 15 }, 
  counterBtnText: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' }, 
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: '#A1BE44', paddingBottom: 5 },
  holdInput: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', padding: 0, minWidth: 55, textAlign: 'center' }, 
  holdMaxText: { color: '#999999', fontSize: 20, fontWeight: 'bold', marginBottom: 4 }, 

  enduranceCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  inputWrapperSmall: { borderBottomWidth: 2, borderBottomColor: '#A1BE44', paddingBottom: 2, marginHorizontal: 20 },
  lapsInputText: { color: '#ffffff', fontSize: 36, fontWeight: 'bold', padding: 0, minWidth: 70, textAlign: 'center' }, 

  mapSuperContainer: { alignItems: 'flex-start', width: '100%', paddingLeft: 0 },
  mapScrollWrapper: { flexGrow: 1, justifyContent: 'flex-start', paddingTop: 5, paddingBottom: 0, paddingHorizontal: 0 },
  mapInnerWrapper: { backgroundColor: '#1E1E1E', paddingTop: 20, paddingBottom: 10, paddingLeft: 10, paddingRight: 40, borderRadius: 16, alignSelf: 'flex-start' },
  mapAbsBox: { position: 'absolute', width: 20, height: 20, borderRadius: 6, zIndex: 2 },
  mapAbsText: { position: 'absolute', width: 30, textAlign: 'center', fontSize: 12, color: '#999999', fontWeight: 'bold', zIndex: 1 }, 
  headMarker: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#FFFFFF', zIndex: 20 },
  selectedSectionBox: { backgroundColor: '#2A2A2A', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  selectedSectionText: { color: '#A1BE44', fontSize: 18, fontWeight: 'bold' }, 

  timerInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  timerPlayBtn: { width: 50, height: 50, backgroundColor: '#333333', borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  timerPlayIcon: { color: '#A1BE44', fontSize: 20, marginLeft: 4 }, 
  timerDisplayWrapper: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: '#A1BE44', paddingBottom: 5, paddingHorizontal: 10 },
  timerDisplayText: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', minWidth: 45, textAlign: 'center' }, 
  timerLabel: { color: '#999999', fontSize: 18, fontWeight: 'bold', marginBottom: 4, marginRight: 8, marginLeft: 4 }, 

  // 🚀 타이머 모달용 수정된 스타일
  timerModalBackground: { flex: 1, backgroundColor: '#1A1A1A', padding: 20 },
  timerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  timerHeaderTitle: { color: '#A1BE44', fontSize: 24, fontWeight: 'bold' }, 
  timerCenterArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hugeTimerText: { color: '#ffffff', fontSize: 86, fontWeight: '900' }, 
  
  timerModeContainer: { flexDirection: 'row', backgroundColor: '#333333', borderRadius: 12, padding: 4, marginHorizontal: 20, marginTop: 20 },
  timerModeBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 8 },
  timerModeBtnActive: { backgroundColor: '#555555' },
  timerModeBtnText: { color: '#999999', fontSize: 18, fontWeight: 'bold' },
  timerModeBtnTextActive: { color: '#ffffff' },

  timerAdjustRow: { flexDirection: 'row', marginTop: 40, justifyContent: 'center', alignItems: 'center' },
  adjustBtn: { backgroundColor: '#333333', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginHorizontal: 10 },
  adjustBtnText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },

  timerControlRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 50 },
  timerCircleBtn: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center' }, 
  timerCircleBtnText: { color: '#1A1A1A', fontSize: 20, fontWeight: 'bold' }, 

  consecutiveInputBox: { backgroundColor: '#111111', minHeight: 60, borderRadius: 12, padding: 10, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  consecutiveEmptyText: { color: '#666666', fontSize: 16, alignSelf: 'center', marginLeft: 5 }, 
  filledDiffBox: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, margin: 4, alignItems: 'center', justifyContent: 'center' },
  filledDiffText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }, 
  horizontalDivider: { height: 1, backgroundColor: '#333333', marginVertical: 20 },
  scoreHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  scoreTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginRight: 15 }, 
  detailButton: { borderWidth: 1, borderColor: '#A1BE44', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  detailButtonText: { color: '#999999', fontSize: 15, fontWeight: '600' }, 
  totalScoreText: { color: '#A1BE44', fontSize: 40, fontWeight: 'bold', marginBottom: 10 }, 

  // ─── 커스텀 알림 모달 전용 스타일 ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, 
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 

  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteModalText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25 }, 
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  deleteBtnYesText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  deleteBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 
});

export default RecodeScreen;