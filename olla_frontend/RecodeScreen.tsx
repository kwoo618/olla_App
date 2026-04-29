import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RecodeScreen = ({ route, navigation }: any) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(route?.params?.openSection || null);

  useEffect(() => {
    if (route?.params?.openSection) {
      setExpandedSection(route.params.openSection);
    }
  }, [route?.params?.openSection]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const [difficultyData, setDifficultyData] = useState([
    { id: 1, color: '흰색', hex: '#EAEAEA', type: '왕복', current: 26, total: 26, status: '완료', score: 10 },
    { id: 2, color: '노랑', hex: '#F4D03F', type: '왕복', current: 33, total: 33, status: '완료', score: 20 },
    { id: 3, color: '초록', hex: '#58D68D', type: '왕복', current: 28, total: 28, status: '완료', score: 30 },
    { id: 4, color: '파랑', hex: '#5DADE2', type: '왕복', current: 26, total: 26, status: '완료', score: 40 },
    { id: 5, color: '빨강', hex: '#EC7063', type: '왕복', current: 26, total: 26, status: '완료', score: 50 },
    { id: 6, color: '보라', hex: '#AF7AC5', type: '왕복', current: 25, total: 25, status: '완료', score: 60 },
    { id: 7, color: '주황', hex: '#F0B27A', type: '왕복', current: 28, total: 28, status: '완료', score: 70 },
    { id: 8, color: '검정', hex: '#000000', type: '편도', current: 15, total: 30, status: '진행중', score: 80 },
  ]);

  const [enduranceData, setEnduranceData] = useState([
    { id: 1, type: '편도', arrow: '->', laps: '5', time: '12:30', section: '3-2' },
  ]);

  const deleteEnduranceRecord = (id: number) => {
    setEnduranceData(enduranceData.filter(item => item.id !== id));
  };

  const [consecutiveData, setConsecutiveData] = useState([
    { id: 1, colors: ['#EAEAEA', '#F4D03F', '#58D68D', '#5DADE2'] },
  ]);

  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number, type: 'endurance' | 'consecutive' } | null>(null);

  const confirmDelete = (type: 'endurance' | 'consecutive', id: number) => {
    setItemToDelete({ id, type });
    setDeleteModalVisible(true);
  };

  const executeDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'endurance') {
      setEnduranceData(enduranceData.filter(item => item.id !== itemToDelete.id));
    } else if (itemToDelete.type === 'consecutive') {
      setConsecutiveData(consecutiveData.filter(item => item.id !== itemToDelete.id));
    }
    setDeleteModalVisible(false);
    setItemToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setItemToDelete(null);
  };

  // --- 초보벽 기록 저장 팝업 ---
  const [isRecordModalVisible, setRecordModalVisible] = useState(false);
  const beginnerSlideAnim = useRef(new Animated.Value(800)).current;

  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [holdCount, setHoldCount] = useState<number>(0);

  useEffect(() => { setHoldCount(0); }, [selectedDifficulty]);

  const openRecordModal = () => {
    setRecordModalVisible(true);
    setTimeout(() => { Animated.timing(beginnerSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
  };
  const closeRecordModal = () => {
    Animated.timing(beginnerSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setRecordModalVisible(false);
      setSelectedType(null); setSelectedResult(null); setHoldCount(0);
    });
  };

  const currentMaxHolds = difficultyData.find(d => d.id === selectedDifficulty)?.total || 0;
  const handleSaveBeginnerRecord = () => {
    if (!selectedType || !selectedResult) return;
    const finalHoldCount = selectedResult === '완등' ? currentMaxHolds : holdCount;
    const finalStatus = selectedResult === '완등' ? '완료' : '진행중';
    setDifficultyData(prev => prev.map(item => item.id === selectedDifficulty ? { ...item, type: selectedType, current: finalHoldCount, status: finalStatus } : item));
    closeRecordModal();
  };

  // --- 지구력 기록 저장 팝업 ---
  const [isEnduranceModalVisible, setEnduranceModalVisible] = useState(false);
  const enduranceSlideAnim = useRef(new Animated.Value(800)).current;

  const [enduranceLaps, setEnduranceLaps] = useState<number>(0);
  const [selectedMapNode, setSelectedMapNode] = useState<string | null>(null);
  
  const [enduranceMin, setEnduranceMin] = useState<string>('');
  const [enduranceSec, setEnduranceSec] = useState<string>('');
  const secInputRef = useRef<TextInput>(null);

  const [isTimerModalVisible, setTimerModalVisible] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openEnduranceModal = () => {
    setEnduranceModalVisible(true);
    setTimeout(() => { Animated.timing(enduranceSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
  };
  const closeEnduranceModal = () => {
    Animated.timing(enduranceSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setEnduranceModalVisible(false);
      setEnduranceLaps(0); setSelectedMapNode(null); 
      setEnduranceMin(''); setEnduranceSec('');
    });
  };

  // 💡 지구력 기록 저장 (홀수/짝수 판별하여 화살표 적용)
  const handleSaveEnduranceRecord = () => {
    if (!selectedMapNode) return;
    const finalMin = enduranceMin.padStart(2, '0') || '00';
    const finalSec = enduranceSec.padStart(2, '0') || '00';

    // 💡 홀수 바퀴는 오른쪽(->), 짝수 바퀴는 왼쪽(<-) 화살표를 적용합니다!
    const directionArrow = enduranceLaps % 2 !== 0 ? '->' : '<-';

    const newRecord = { 
      id: Date.now(), 
      type: '편도', 
      arrow: directionArrow, 
      laps: String(enduranceLaps), 
      time: `${finalMin}:${finalSec}`, 
      section: selectedMapNode 
    };
    setEnduranceData([...enduranceData, newRecord]);
    closeEnduranceModal();
  };

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setTimerRunning(true);
      timerRef.current = setInterval(() => { setTimerSeconds(prev => prev + 1); }, 1000);
    }
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    
    const formatted = formatTime(timerSeconds);
    const [m, s] = formatted.split(':');
    setEnduranceMin(m);
    setEnduranceSec(s);

    setTimerModalVisible(false);
  };

  const openTimerModal = () => {
    setTimerSeconds(0);
    setTimerRunning(false);
    setTimerModalVisible(true);
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  // --- 지구력 지도 데이터 로직 ---
  const mapElements: any[] = [];
  const SPACING = 24; 
  const GAP = 10; 
  const BASE_X = 30; 
  const BASE_Y = 40; 
  const TEXT_OFFSET = 24; 

  for (let i = 0; i <= 12; i++) {
    let x = BASE_X + i * SPACING; let y = BASE_Y;
    mapElements.push({ type: 'text', id: `T2-${i}`, val: `2-${i}`, x: x, y: y - TEXT_OFFSET });
    if (i > 0) {
      let color = i <= 4 ? '#58CCFF' : i <= 8 ? '#3A4CA8' : '#692498';
      mapElements.push({ type: 'box', id: `2-${i}`, color, x: x - SPACING / 2, y: y });
    }
  }

  for (let i = 0; i <= 6; i++) {
    let x = BASE_X - GAP; let y = BASE_Y + GAP + (6 - i) * SPACING;
    mapElements.push({ type: 'text', id: `T1-${i}`, val: `1-${i}`, x: x - TEXT_OFFSET, y: y });
    if (i > 0) {
      let color = i === 6 ? '#B96BC6' : '#FFFFFF';
      mapElements.push({ type: 'box', id: `1-${i}`, color, x: x, y: y + SPACING / 2 });
    }
  }

  for (let i = 0; i <= 6; i++) {
    let x = BASE_X + 12 * SPACING + GAP; let y = BASE_Y + GAP + i * SPACING;
    mapElements.push({ type: 'text', id: `T3-${i}`, val: `3-${i}`, x: x + TEXT_OFFSET, y: y });
    if (i > 0) {
      mapElements.push({ type: 'box', id: `3-${i}`, color: '#666666', x: x, y: y - SPACING / 2 });
    }
  }

  for (let i = 0; i <= 2; i++) {
    let x = BASE_X + 12 * SPACING + GAP - i * SPACING; let y = BASE_Y + GAP + 6 * SPACING + GAP;
    mapElements.push({ type: 'text', id: `T4-${i}`, val: `4-${i}`, x: x, y: y + TEXT_OFFSET });
    if (i > 0) {
      mapElements.push({ type: 'box', id: `4-${i}`, color: '#343434', x: x + SPACING / 2, y: y });
    }
  }

  const renderMapNode = (item: any) => {
    if (item.type === 'text') {
      return (
        <Text key={item.id} style={[styles.mapAbsText, { left: item.x - 15, top: item.y - 8 }]}>{item.val}</Text>
      );
    } else {
      const isSelected = selectedMapNode === item.id;
      return (
        <TouchableOpacity 
          key={item.id} onPress={() => setSelectedMapNode(item.id)}
          style={[styles.mapAbsBox, { backgroundColor: item.color, left: item.x - 10, top: item.y - 10 }, isSelected && styles.mapAbsBoxSelected]} 
        />
      );
    }
  };

  // --- 초보벽 완등 연속 기록 팝업 State ---
  const [isConsecutiveModalVisible, setConsecutiveModalVisible] = useState(false);
  const consecutiveSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedConsecutiveList, setSelectedConsecutiveList] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false); 

  const openConsecutiveModal = () => {
    setConsecutiveModalVisible(true);
    setTimeout(() => { Animated.timing(consecutiveSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
  };

  const closeConsecutiveModal = () => {
    Animated.timing(consecutiveSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setConsecutiveModalVisible(false);
      setSelectedConsecutiveList([]); 
      setShowDetails(false);
    });
  };

  const totalConsecutiveScore = selectedConsecutiveList.reduce((acc, curr) => acc + curr.score, 0);

  const handleSaveConsecutiveRecord = () => {
    if (selectedConsecutiveList.length === 0) return;
    const newRecord = { id: Date.now(), colors: selectedConsecutiveList.map(item => item.hex) };
    setConsecutiveData([...consecutiveData, newRecord]);
    closeConsecutiveModal();
  };

  return (
    <SafeAreaView style={styles.background}>
      <View style={styles.topNav}>
        <Text style={styles.logoText}>olla</Text>
        <TouchableOpacity>
          <Image source={require('./assets/Vector.png')} style={styles.topIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.summaryContainer}>
          <TouchableOpacity style={styles.summaryItemVertical} onPress={openRecordModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('./assets/ArrowUpRight.png')} style={styles.summaryIconVertical1} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>초보벽</Text>
                <Text style={styles.summarySubLabelVertical}>난이도별 등반 기록 (터치하여 기록하기)</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryItemVertical} onPress={openEnduranceModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('./assets/Timer.png')} style={styles.summaryIconVertical2} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>지구력</Text>
                <Text style={styles.summarySubLabelVertical}>바퀴 수와 시간 기록 (터치하여 기록하기)</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryItemVertical} onPress={openConsecutiveModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('./assets/ArrowsClockwise.png')} style={styles.summaryIconVertical3} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>초보벽 완등 연속</Text>
                <Text style={styles.summarySubLabelVertical}>연속 완등 기록 (터치하여 기록하기)</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('difficulty')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>난이도 별 최고기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'difficulty' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {expandedSection === 'difficulty' && (
            <View style={styles.outerContainer}>
              {difficultyData.map((item) => (
                <View key={item.id} style={styles.recordItemCard}>
                  <Text style={styles.recordIdLarge}>{item.id}</Text>
                  <View style={styles.colorAndTypeColumn}>
                    <Text style={[styles.colorNameText, { color: item.hex }]}>{item.color}</Text>
                    <View style={item.type === '왕복' ? styles.typeBadgeRoundTrip : styles.typeBadgeOneWay}>
                      <Text style={item.type === '왕복' ? styles.typeTextRoundTrip : styles.typeTextOneWay}>{item.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.recordHoldsLeft}>{item.current} / {item.total}번</Text>
                  <Text style={[styles.recordStatus, item.status === '완료' ? styles.statusSuccess : styles.statusIng]}>{item.status}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('endurance')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>오늘의 지구력 기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'endurance' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {expandedSection === 'endurance' && (
            <View style={styles.outerContainer}>
              {enduranceData.length === 0 ? (
                <View style={styles.recordItemCard}><Text style={styles.emptyText}>오늘의 지구력 기록이 없습니다.</Text></View>
              ) : (
                enduranceData.map((item) => (
                  <View key={item.id} style={styles.rowCardWithTrash}>
                    <View style={styles.enduranceCol}><Text style={styles.enduranceTopText}>{item.type}</Text><Text style={styles.enduranceBottomText}>{item.arrow}</Text></View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}><Text style={styles.enduranceTopText}>{item.laps}</Text><Text style={styles.enduranceBottomText}>바퀴</Text></View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}><Text style={styles.enduranceTopText}>{item.time}</Text><Text style={styles.enduranceBottomText}>시간</Text></View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}><Text style={styles.enduranceTopText}>{item.section}</Text><Text style={styles.enduranceBottomText}>구간</Text></View>
                    
                    <TouchableOpacity style={styles.trashButton} onPress={() => confirmDelete('endurance', item.id)}>
                      <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('consecutive')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>오늘의 초보벽 연속 기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'consecutive' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {expandedSection === 'consecutive' && (
            <View style={styles.outerContainer}>
              {consecutiveData.length === 0 ? (
                <View style={styles.recordItemCard}><Text style={styles.emptyText}>오늘의 초보벽 연속 기록이 없습니다.</Text></View>
              ) : (
                consecutiveData.map((item) => (
                  <View key={item.id} style={styles.rowCardWithTrash}>
                    <View style={styles.circleContainer}>
                      {item.colors.map((color, index) => (<View key={index} style={[styles.colorCircle, { backgroundColor: color }]} />))}
                    </View>
                    
                    <TouchableOpacity style={styles.trashButton} onPress={() => confirmDelete('consecutive', item.id)}>
                      <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* 하단 네비게이션 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('Home')}><Image source={require('./assets/Home.png')} style={[styles.navIcon, { opacity: 0.4 }]} /><Text style={styles.bottomNavText}>홈</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/recode.png')} style={styles.navIcon} /><Text style={styles.bottomNavTextActive}>기록</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/ranking.png')} style={[styles.navIcon, { opacity: 0.4 }]} /><Text style={styles.bottomNavText}>랭킹</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/community.png')} style={[styles.navIcon, { opacity: 0.4 }]} /><Text style={styles.bottomNavText}>커뮤니티</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem}><Image source={require('./assets/mypage.png')} style={[styles.navIcon, { opacity: 0.4 }]} /><Text style={styles.bottomNavText}>마이페이지</Text></TouchableOpacity>
      </View>

      {/* 삭제 확인 팝업 */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true} onRequestClose={cancelDelete}>
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

      {/* 초보벽 팝업 */}
      <Modal visible={isRecordModalVisible} animationType="fade" transparent={true} onRequestClose={closeRecordModal}>
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
                    {difficultyData.map((item) => {
                      const isSelected = selectedDifficulty === item.id;
                      return (
                        <TouchableOpacity key={item.id} onPress={() => setSelectedDifficulty(item.id)}
                          style={[styles.diffButton, { borderColor: item.hex }, isSelected && { backgroundColor: item.hex + '20' }]}>
                          <Text style={[styles.diffButtonText, isSelected && { fontWeight: 'bold' }]}>{item.color}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <Text style={styles.sectionTitle}>등반 유형</Text>
                <View style={styles.choiceRow}>
                  {['편도', '왕복'].map(type => (
                    <TouchableOpacity key={type} onPress={() => setSelectedType(type)}
                      style={[styles.choiceButton, selectedType === type ? { borderColor: '#A1BE44' } : { borderColor: '#555555' }]}>
                      <Text style={styles.choiceButtonText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>결과</Text>
                <View style={styles.choiceRow}>
                  <TouchableOpacity onPress={() => setSelectedResult('완등')} style={[styles.choiceButton, selectedResult === '완등' ? { borderColor: '#A1BE44' } : { borderColor: '#555555' }]}>
                    <Text style={styles.choiceButtonText}>완등</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedResult('실패')} style={[styles.choiceButton, selectedResult === '실패' ? { borderColor: '#FF4D4D' } : { borderColor: '#555555' }]}>
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
                      <TouchableOpacity onPress={() => setHoldCount(Math.max(0, holdCount - 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>-</Text></TouchableOpacity>
                      <View style={styles.inputWrapper}>
                        <TextInput style={styles.holdInput} keyboardType="numeric" value={String(holdCount)} onChangeText={(text) => { const num = parseInt(text, 10); if (!isNaN(num)) setHoldCount(Math.min(currentMaxHolds, Math.max(0, num))); else if (text === '') setHoldCount(0); }} />
                        <Text style={styles.holdMaxText}>/ {currentMaxHolds}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setHoldCount(Math.min(currentMaxHolds, holdCount + 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
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

      {/* 지구력 기록 저장 팝업 */}
      <Modal visible={isEnduranceModalVisible} animationType="fade" transparent={true} onRequestClose={closeEnduranceModal}>
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
                    <TextInput
                      style={styles.lapsInput}
                      keyboardType="numeric"
                      value={String(enduranceLaps)}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (!isNaN(num)) setEnduranceLaps(Math.max(0, num));
                        else if (text === '') setEnduranceLaps(0);
                      }}
                    />
                  </View>
                  <TouchableOpacity onPress={() => setEnduranceLaps(enduranceLaps + 1)} style={styles.counterBtn}>
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>난이도 선택 (클라이밍장 지도)</Text>
                
                <View style={styles.mapSuperContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapScrollWrapper}>
                    <View style={styles.mapInnerWrapper}>
                      <View style={{ width: 350, height: 235 }}>
                        {mapElements.map(renderMapNode)}
                      </View>
                    </View>
                  </ScrollView>
                </View>

                <Text style={styles.sectionTitle}>선택한 구간</Text>
                <View style={styles.selectedSectionBox}>
                  <Text style={styles.selectedSectionText}>
                    {selectedMapNode ? `${selectedMapNode} 구간` : '지도에서 컬러 블록을 선택해주세요'}
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>타이머</Text>
                <View style={styles.timerInputRow}>
                  <TouchableOpacity onPress={openTimerModal} style={styles.timerPlayBtn}>
                    <Text style={styles.timerPlayIcon}>▶</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.timerTextInputWrapper}>
                    <TextInput
                      style={styles.timerTextInput}
                      value={enduranceMin}
                      onChangeText={(text) => {
                        const numeric = text.replace(/[^0-9]/g, '');
                        setEnduranceMin(numeric);
                        if (numeric.length >= 2) {
                          secInputRef.current?.focus();
                        }
                      }}
                      placeholder="00"
                      placeholderTextColor="#666666"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timerLabel}>분</Text>

                    <TextInput
                      ref={secInputRef}
                      style={[styles.timerTextInput, { marginLeft: 5 }]}
                      value={enduranceSec}
                      onChangeText={(text) => {
                        const numeric = text.replace(/[^0-9]/g, '');
                        setEnduranceSec(numeric);
                      }}
                      placeholder="00"
                      placeholderTextColor="#666666"
                      keyboardType="numeric"
                      maxLength={2}
                    />
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
      </Modal>

      {/* 초보벽 완등 연속 기록 팝업 */}
      <Modal visible={isConsecutiveModalVisible} animationType="fade" transparent={true} onRequestClose={closeConsecutiveModal}>
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
                  {selectedConsecutiveList.map((item, index) => (
                    <View key={index} style={[styles.filledDiffBox, { backgroundColor: item.hex }]}>
                      <Text style={styles.filledDiffText}>{item.color}</Text>
                    </View>
                  ))}
                  {selectedConsecutiveList.length === 0 && (
                    <Text style={styles.consecutiveEmptyText}>아래에서 난이도를 순서대로 탭해주세요</Text>
                  )}
                </View>

                <View style={styles.colorButtonContainer}>
                  <View style={styles.colorButtonRow}>
                    {difficultyData.map((item) => (
                      <TouchableOpacity 
                        key={item.id} 
                        onPress={() => setSelectedConsecutiveList([...selectedConsecutiveList, item])}
                        style={[styles.diffButton, { borderColor: item.hex }]}
                      >
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

                <Text style={styles.totalScoreText}>{totalConsecutiveScore} 점</Text>

                {showDetails && (
                  <View style={[styles.consecutiveInputBox, { marginTop: 15 }]}>
                    {selectedConsecutiveList.map((item, index) => (
                      <View key={index} style={[styles.filledDiffBox, { backgroundColor: item.hex }]}>
                        <Text style={styles.filledDiffText}>{item.score}</Text>
                      </View>
                    ))}
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

      {/* 타이머 팝업 */}
      <Modal visible={isTimerModalVisible} animationType="slide" transparent={false} onRequestClose={() => setTimerModalVisible(false)}>
        <SafeAreaView style={styles.timerModalBackground}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerHeaderTitle}>지구력 측정 타이머</Text>
            <TouchableOpacity onPress={() => setTimerModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timerCenterArea}>
            <Text style={styles.hugeTimerText}>{formatTime(timerSeconds)}</Text>
          </View>
          <View style={styles.timerControlRow}>
            <TouchableOpacity style={[styles.timerCircleBtn, { backgroundColor: timerRunning ? '#FFB74D' : '#A1BE44' }]} onPress={toggleTimer}>
              <Text style={styles.timerCircleBtnText}>{timerRunning ? '일시정지' : '재생'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timerCircleBtn, { backgroundColor: '#FF4D4D' }]} onPress={stopTimer}>
              <Text style={styles.timerCircleBtnText}>중단</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#A1BE44' },
  topIcon: { width: 24, height: 24, resizeMode: 'contain' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },

  summaryContainer: { marginBottom: 15 },
  summaryItemVertical: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 12 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center' },
  summaryIconVertical1: { width: 32, height: 32, tintColor: '#0084FF', marginRight: 15 },
  summaryIconVertical2: { width: 32, height: 32, tintColor: '#2CDA00', marginRight: 15 },
  summaryIconVertical3: { width: 32, height: 32, tintColor: '#FFCC00', marginRight: 15 },
  summaryTextColumn: { flexDirection: 'column', justifyContent: 'center' },
  summaryLabelVertical: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  summarySubLabelVertical: { color: '#999999', fontSize: 13, fontWeight: '500', marginTop: 4 },
  
  simpleAccordionWrapper: { marginBottom: 10 },
  simpleAccordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 5 },
  simpleAccordionTitle: { color: '#999999', fontSize: 15, fontWeight: '500' },
  chevronIcon: { color: '#999999', fontSize: 16, fontWeight: 'bold' },

  outerContainer: { paddingVertical: 5 },
  recordItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 16, marginBottom: 10 },
  recordIdLarge: { color: '#999999', fontSize: 22, fontWeight: 'bold', width: 35 },
  colorAndTypeColumn: { width: 60, flexDirection: 'column', justifyContent: 'center' },
  colorNameText: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  typeBadgeRoundTrip: { backgroundColor: '#1A5276', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  typeTextRoundTrip: { color: '#85C1E9', fontSize: 11, fontWeight: 'bold' },
  typeBadgeOneWay: { backgroundColor: '#7B241C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  typeTextOneWay: { color: '#CCCCCC', fontSize: 11, fontWeight: 'bold' },
  recordHoldsLeft: { flex: 1, color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },
  recordStatus: { fontSize: 14, fontWeight: 'bold', width: 45, textAlign: 'right' },
  statusSuccess: { color: '#A1BE44' },
  statusIng: { color: '#999999' },

  rowCardWithTrash: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', paddingVertical: 18, paddingHorizontal: 15, borderRadius: 16, marginBottom: 10 },
  enduranceCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  enduranceTopText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  enduranceBottomText: { color: '#999999', fontSize: 12 },
  verticalDivider: { width: 1, height: 30, backgroundColor: '#444444', marginHorizontal: 5 },
  circleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, flexWrap: 'wrap' },
  colorCircle: { width: 30, height: 30, borderRadius: 15, marginRight: 10, marginBottom: 5 },
  trashButton: { padding: 10, marginLeft: 5 },
  trashIcon: { width: 22, height: 22, tintColor: '#A1BE44', resizeMode: 'contain' },
  emptyText: { color: '#999999', fontSize: 14, textAlign: 'center', width: '100%' },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#111111', paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#222222' },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  bottomNavText: { color: '#666666', fontSize: 11, fontWeight: '500' },
  bottomNavTextActive: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 20, maxHeight: '85%', width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeBtn: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
  sectionTitle: { color: '#999999', fontSize: 14, fontWeight: '600', marginTop: 5, marginBottom: 10 },
  
  colorButtonContainer: { borderWidth: 1, borderColor: '#444444', borderRadius: 16, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 2, marginBottom: 15 },
  colorButtonRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  diffButton: { width: '23%', borderWidth: 1.5, backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  diffButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '500' },
  choiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  choiceButton: { flex: 1, borderWidth: 1.5, backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, marginHorizontal: 4, alignItems: 'center' },
  choiceButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  saveRecordButton: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  saveRecordButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  failContainer: { width: '100%', alignItems: 'center', marginTop: 5 },
  failLabel: { color: '#CCCCCC', fontSize: 14, marginBottom: 10 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  counterBtn: { width: 45, height: 45, backgroundColor: '#333333', borderRadius: 22.5, alignItems: 'center', justifyContent: 'center', marginHorizontal: 15 },
  counterBtnText: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: '#A1BE44', paddingBottom: 5 },
  holdInput: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', padding: 0, minWidth: 45, textAlign: 'center' },
  holdMaxText: { color: '#999999', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },

  enduranceCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  inputWrapperSmall: { borderBottomWidth: 2, borderBottomColor: '#A1BE44', paddingBottom: 2, marginHorizontal: 20 },
  lapsInput: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', padding: 0, minWidth: 60, textAlign: 'center' },

  mapSuperContainer: { alignItems: 'flex-start', width: '100%', paddingLeft: 0 }, 
  mapScrollWrapper: { flexGrow: 1, justifyContent: 'flex-start', paddingTop: 5, paddingBottom: 0, paddingHorizontal: 0 }, 
  mapInnerWrapper: { backgroundColor: '#1E1E1E', paddingTop: 20, paddingBottom: 10, paddingLeft: 10, paddingRight: 40, borderRadius: 16, alignSelf: 'flex-start' },
  mapAbsBox: { position: 'absolute', width: 20, height: 20, borderRadius: 6, zIndex: 2 }, 
  mapAbsBoxSelected: { borderWidth: 2, borderColor: '#ffffff', transform: [{ scale: 1.3 }], zIndex: 10 },
  mapAbsText: { position: 'absolute', width: 30, textAlign: 'center', fontSize: 10, color: '#999999', fontWeight: 'bold', zIndex: 1 },

  selectedSectionBox: { backgroundColor: '#2A2A2A', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  selectedSectionText: { color: '#A1BE44', fontSize: 16, fontWeight: 'bold' },

  // 💡 분, 초 입력창 스타일
  timerInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  timerPlayBtn: { width: 45, height: 45, backgroundColor: '#333333', borderRadius: 22.5, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  timerPlayIcon: { color: '#A1BE44', fontSize: 18, marginLeft: 4 },
  timerTextInputWrapper: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: '#A1BE44', paddingBottom: 5 },
  timerTextInput: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', padding: 0, minWidth: 40, textAlign: 'center' },
  timerLabel: { color: '#999999', fontSize: 16, fontWeight: 'bold', marginBottom: 4, marginRight: 8 },

  timerModalBackground: { flex: 1, backgroundColor: '#1A1A1A', padding: 20 },
  timerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  timerHeaderTitle: { color: '#A1BE44', fontSize: 22, fontWeight: 'bold' },
  timerCenterArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hugeTimerText: { color: '#ffffff', fontSize: 80, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerControlRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 50 },
  timerCircleBtn: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  timerCircleBtnText: { color: '#1A1A1A', fontSize: 18, fontWeight: 'bold' },

  consecutiveInputBox: {
    backgroundColor: '#111111', 
    minHeight: 60,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  consecutiveEmptyText: {
    color: '#666666',
    fontSize: 14,
    alignSelf: 'center',
    marginLeft: 5,
  },
  filledDiffBox: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledDiffText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 20, 
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreTitle: {
    color: '#ffffff',
    fontSize: 20, 
    fontWeight: 'bold',
    marginRight: 15,
  },
  detailButton: {
    borderWidth: 1,
    borderColor: '#A1BE44',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailButtonText: {
    color: '#999999',
    fontSize: 13,
    fontWeight: '600',
  },
  totalScoreText: {
    color: '#A1BE44',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalBox: {
    width: 300,
    backgroundColor: '#212121', 
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
  },
  deleteModalText: {
    color: '#ffffff', 
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  deleteBtnRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  deleteBtnYes: {
    flex: 1,
    backgroundColor: '#A1BE44', 
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 5,
  },
  deleteBtnYesText: {
    color: '#ffffff', 
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtnNo: {
    flex: 1,
    backgroundColor: '#262626', 
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 5,
  },
  deleteBtnNoText: {
    color: '#ffffff', 
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecodeScreen;