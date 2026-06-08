import React from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, 
  Modal, Animated, RefreshControl, TouchableWithoutFeedback, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecode, MAX_HOLDS, BASE_SCORES, rainbowColors, formatTime } from '../ts/Recode'; 

const RecodeScreen = ({ route, navigation }: any) => {

  const {
    difficultyData, enduranceData, consecutiveData, 
    refreshing, onRefresh, expandedSection, toggleSection, beginnerHistoryData,
    resultModalVisible, resultModalConfig, closeResultModal,
    isDeleteModalVisible, confirmDelete, executeDelete, cancelDelete,
    hasValidMembership,
    isRecordModalVisible, openRecordModal, closeRecordModal, beginnerHeightAnim, beginnerPanResponder,
    selectedDifficulty, setSelectedDifficulty, selectedType, setSelectedType, selectedResult, setSelectedResult, holdCount, setHoldCount, currentMaxHolds, handleSaveBeginnerRecord,
    
    isEnduranceModalVisible, openEnduranceModal, closeEnduranceModal, enduranceHeightAnim, endurancePanResponder,
    enduranceLaps, setEnduranceLaps, selectedMapNode, setSelectedMapNode, enduranceMin, setEnduranceMin, enduranceSec, setEnduranceSec, effectiveSection,
    mapElements, getBoxCoord, pathSegmentsData, handleSaveEnduranceRecord,
    isTimerActive, setIsTimerActive, timerRunning, timerSeconds, showTimerFinishConfirm, setShowTimerFinishConfirm, toggleTimer, confirmStopTimer, stopTimerAndSave, openTimerModal,
    
    isConsecutiveModalVisible, openConsecutiveModal, closeConsecutiveModal, consecutiveHeightAnim, consecutivePanResponder,
    selectedConsecutiveList, setSelectedConsecutiveList, removeConsecutiveItem, showDetails, setShowDetails, displayTotalScore, handleSaveConsecutiveRecord,
  } = useRecode({ route, navigation });

  const renderMapNode = (item: any) => {
    if (item.type === 'text') return <Text key={item.id} style={[styles.mapAbsText, { left: item.x - 15, top: item.y - 8 }]}>{item.val}</Text>;
    return (
      <TouchableOpacity key={item.id} onPress={() => setSelectedMapNode(item.id)}
        style={[styles.mapAbsBox, { backgroundColor: item.color, left: item.x - 10, top: item.y - 10 }]} />
    );
  };
  if (!hasValidMembership) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }]}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>🔒</Text>
        <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
          회원권 전용 기능입니다
        </Text>
        <Text style={{ color: '#999999', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
          기록 탭은 회원권 보유 회원만{'\n'}이용할 수 있습니다.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" colors={['#A1BE44']} />}
      >
        {/* 요약 카드 영역 */}
        <View style={styles.summaryContainer}>
          <TouchableOpacity style={styles.summaryItemVertical} onPress={openRecordModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('../assets/ArrowUpRight.png')} style={styles.summaryIconVertical1} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>초보벽</Text>
                <Text style={styles.summarySubLabelVertical}>난이도별 등반 기록</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryItemVertical} onPress={openEnduranceModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('../assets/Timer.png')} style={styles.summaryIconVertical2} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>지구력</Text>
                <Text style={styles.summarySubLabelVertical}>바퀴 수와 시간 기록</Text>
              </View>
            </View>
            <Text style={styles.chevronIcon}>＞</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryItemVertical} onPress={openConsecutiveModal} activeOpacity={0.8}>
            <View style={styles.summaryLeft}>
              <Image source={require('../assets/ArrowsClockwise.png')} style={styles.summaryIconVertical3} />
              <View style={styles.summaryTextColumn}>
                <Text style={styles.summaryLabelVertical}>초보벽 완등 연속</Text>
                <Text style={styles.summarySubLabelVertical}>연속 완등 기록</Text>
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
                      <Text style={item.type === '왕복' ? styles.typeTextRoundTrip : styles.typeTextOneWay}>{item.type || '미기록'}</Text>
                    </View>
                  </View>
                  <Text style={styles.recordHoldsLeft}>{item.current ?? 0} / {MAX_HOLDS[item.color] ?? item.total}번</Text>
                  <Text style={[
                    styles.recordStatus, 
                    item.status === '완료' ? styles.statusSuccess : (item.status === '진행중' ? styles.statusIng : styles.statusNone)
                  ]}>{item.status || '-'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 오늘의 초보벽 기록 아코디언 */}
        <View style={styles.simpleAccordionWrapper}>
          <TouchableOpacity style={styles.simpleAccordionHeader} onPress={() => toggleSection('beginnerHistory')} activeOpacity={0.8}>
            <Text style={styles.simpleAccordionTitle}>오늘의 초보벽 기록</Text>
            <Text style={styles.chevronIcon}>{expandedSection === 'beginnerHistory' ? '∨' : '＞'}</Text>
          </TouchableOpacity>
          {expandedSection === 'beginnerHistory' && (
            <View style={styles.outerContainer}>
              {beginnerHistoryData.length === 0 ? (
                <View style={styles.recordItemCard}><Text style={styles.emptyText}>오늘 등록된 기록이 없습니다.</Text></View>
              ) : (
                beginnerHistoryData.map((item: any, index: number) => (
                  <View key={item.id} style={styles.rowCardWithTrash}>
                    <Text style={styles.recordIdLarge}>{index + 1}</Text>
                    <View style={styles.enduranceCol}>
                      <Text style={[styles.colorNameText, { color: item.hex, textAlign: 'center', marginBottom: 4 }]}>{item.color}</Text>
                      <View style={[item.type === '왕복' ? styles.typeBadgeRoundTrip : styles.typeBadgeOneWay, { alignSelf: 'center' }]}>
                        <Text style={item.type === '왕복' ? styles.typeTextRoundTrip : styles.typeTextOneWay}>{item.type}</Text>
                      </View>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}>
                      <Text style={[styles.enduranceBottomText, { marginBottom: 4 }]}>진행 홀드</Text>
                      <Text style={[styles.enduranceTopText, { marginBottom: 0 }]}>{item.current} / {item.max}번</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}>
                      <Text style={[styles.enduranceBottomText, { marginBottom: 4 }]}>결과</Text>
                      <Text style={[
                        styles.enduranceTopText, 
                        { marginBottom: 0 }, 
                        item.status === '완등' ? styles.statusSuccess : (item.status === '진행중' ? styles.statusIng : styles.statusNone)
                      ]}>{item.status}</Text>
                    </View>
                    <TouchableOpacity style={styles.trashButton} onPress={() => confirmDelete('difficulty', item.id)}>
                      <Image source={require('../assets/trash.png')} style={styles.trashIcon} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
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
                <View style={styles.recordItemCard}><Text style={styles.emptyText}>오늘 등록된 지구력 기록이 없습니다.</Text></View>
              ) : (
                enduranceData.map((item: any) => (
                  <View key={item.id} style={styles.rowCardWithTrash}>
                    <View style={styles.enduranceCol}><Text style={styles.enduranceTopText}>{item.type}</Text><Text style={styles.enduranceBottomText}>{item.arrow}</Text></View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}><Text style={styles.enduranceTopText}>{item.laps}</Text><Text style={styles.enduranceBottomText}>회</Text></View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}><Text style={styles.enduranceTopText}>{item.time}</Text><Text style={styles.enduranceBottomText}>시간</Text></View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.enduranceCol}><Text style={styles.enduranceTopText}>{item.section}</Text><Text style={styles.enduranceBottomText}>구간</Text></View>
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
                <View style={styles.recordItemCard}><Text style={styles.emptyText}>오늘 등록된 연속 기록이 없습니다.</Text></View>
              ) : (
                consecutiveData.map((item: any, index: number) => (
                  <View key={item.id ?? index} style={styles.rowCardWithTrash}>
                    <View style={styles.circleContainer}>
                      {item.colors?.map((color: string, idx: number) => <View key={idx} style={[styles.colorCircle, { backgroundColor: color }]} />)}
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

      {/* 초보벽 기록 모달 */}
      <Modal visible={isRecordModalVisible} animationType="fade" transparent onRequestClose={closeRecordModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeRecordModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: beginnerHeightAnim }]}>
            <View {...beginnerPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>초보벽 기록 저장</Text>
                <TouchableOpacity onPress={closeRecordModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <TouchableOpacity activeOpacity={1} style={{ width: '100%', paddingBottom: 20 }}>
                <Text style={styles.sectionTitle}>난이도 선택</Text>
                <View style={styles.colorButtonContainer}>
                  <View style={styles.colorButtonRow}>
                    {difficultyData.map((item: any) => {
                      const isSelected = selectedDifficulty === item.color;
                      return (
                        <TouchableOpacity key={item.color} onPress={() => setSelectedDifficulty(item.color)}
                          style={[styles.diffButton, { borderColor: item.hex }, isSelected && { backgroundColor: item.hex, borderWidth: 2 }]}>
                          <Text style={[styles.diffButtonText, isSelected && { fontWeight: 'bold', color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>
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
                    <TouchableOpacity key={type} onPress={() => setSelectedType(type)} style={[styles.choiceButton, { borderColor: selectedType === type ? '#A1BE44' : '#555555' }]}>
                      <Text style={styles.choiceButtonText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>결과</Text>
                <View style={styles.choiceRow}>
                  <TouchableOpacity onPress={() => setSelectedResult('완등')} style={[styles.choiceButton, { borderColor: selectedResult === '완등' ? '#A1BE44' : '#555555' }]}>
                    <Text style={styles.choiceButtonText}>완등</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedResult('실패')} style={[styles.choiceButton, { borderColor: selectedResult === '실패' ? '#FF4D4D' : '#555555' }]}>
                    <Text style={styles.choiceButtonText}>실패</Text>
                  </TouchableOpacity>
                </View>

                {selectedResult === '완등' && (
                  <TouchableOpacity style={styles.saveRecordButton} onPress={handleSaveBeginnerRecord}><Text style={styles.saveRecordButtonText}>기록 저장하기</Text></TouchableOpacity>
                )}

                {selectedResult === '실패' && (
                  <View style={styles.failContainer}>
                    <Text style={styles.failLabel}>진행한 홀드 수를 입력하세요</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity onPress={() => setHoldCount(Math.max(0, holdCount - 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>-</Text></TouchableOpacity>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.holdInput}>{holdCount}</Text>
                        <Text style={styles.holdMaxText}>/ {currentMaxHolds}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setHoldCount(Math.min(currentMaxHolds, holdCount + 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.saveRecordButton} onPress={handleSaveBeginnerRecord}><Text style={styles.saveRecordButtonText}>기록 저장하기</Text></TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* 지구력 스톱워치 / 모달 */}
      <Modal visible={isEnduranceModalVisible} animationType="fade" transparent onRequestClose={closeEnduranceModal}>
        {isTimerActive ? (
          <SafeAreaView style={styles.timerModalBackground}>
            <View style={styles.timerHeader}>
              <Text style={styles.timerHeaderTitle}>지구력 측정</Text>
              <TouchableOpacity onPress={() => { toggleTimer(); setIsTimerActive(false); }}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.timerCenterArea}><Text style={styles.hugeTimerText}>{formatTime(timerSeconds)}</Text></View>
            <View style={styles.timerControlRow}>
              <TouchableOpacity style={[styles.timerCircleBtn, { backgroundColor: timerRunning ? '#FFB74D' : '#A1BE44' }]} onPress={toggleTimer}>
                <Text style={styles.timerCircleBtnText}>{timerRunning ? '일시정지' : '시작'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.timerCircleBtn, { backgroundColor: '#FF4D4D' }]} onPress={confirmStopTimer}>
                <Text style={styles.timerCircleBtnText}>완료</Text>
              </TouchableOpacity>
            </View>
            {showTimerFinishConfirm && (
              <View style={styles.confirmTimerOverlay}>
                {/* 💡 타이머 완료 확인 모달 - OLLA 표준 적용 */}
                <View style={styles.deleteModalBox}>
                  <Text style={[styles.deleteModalText, { color: '#A1BE44' }]}>기록 확인</Text>
                  <Text style={styles.deleteModalMessage}>{formatTime(timerSeconds)} 기록으로 저장됩니다.</Text>
                  <View style={styles.deleteBtnRow}>
                    <TouchableOpacity style={styles.deleteBtnYes} onPress={stopTimerAndSave}><Text style={styles.deleteBtnYesText}>저장</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtnNo} onPress={() => setShowTimerFinishConfirm(false)}><Text style={styles.deleteBtnNoText}>취소</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </SafeAreaView>
        ) : (
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={closeEnduranceModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
            <Animated.View style={[styles.bottomSheet, { height: enduranceHeightAnim }]}>
              <View {...endurancePanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>지구력 기록 저장</Text>
                  <TouchableOpacity onPress={closeEnduranceModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
                </View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                <TouchableOpacity activeOpacity={1} style={{ width: '100%', paddingBottom: 20 }}>
                  <Text style={styles.sectionTitle}>편도 횟수</Text>
                  <View style={styles.enduranceCounterRow}>
                    <TouchableOpacity onPress={() => setEnduranceLaps(Math.max(0, enduranceLaps - 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>-</Text></TouchableOpacity>
                    <View style={styles.inputWrapperSmall}><Text style={styles.lapsInputText}>{enduranceLaps}</Text></View>
                    <TouchableOpacity onPress={() => setEnduranceLaps(enduranceLaps + 1)} style={styles.counterBtn}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitle}>지도에서 선택</Text>
                  <View style={styles.mapSuperContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapScrollWrapper}>
                      <View style={styles.mapInnerWrapper}>
                        <View style={{ width: 350, height: 235 }}>
                          {mapElements.map(renderMapNode)}
                          
                          {pathSegmentsData.map((seg: any) => (
                            <View key={seg.key} style={{ position: 'absolute', left: seg.left, top: seg.top, width: seg.width, height: 4, backgroundColor: seg.color, transform: [{ rotate: `${seg.angle}deg` }], zIndex: seg.zIndex, borderRadius: 2 }} />
                          ))}

                          {selectedMapNode && (
                            <View style={[styles.headMarker, { backgroundColor: rainbowColors[enduranceLaps % 7], left: getBoxCoord(selectedMapNode).x - 10, top: getBoxCoord(selectedMapNode).y - 10 }]} />
                          )}
                        </View>
                      </View>
                    </ScrollView>
                  </View>

                  <Text style={styles.sectionTitle}>선택한 구간 (자동계산)</Text>
                  <View style={styles.selectedSectionBox}>
                    <Text style={styles.selectedSectionText}>{effectiveSection ? `${effectiveSection} 구간` : '지도에서 컬러 블록을 선택해주세요'}</Text>
                  </View>

                  <Text style={styles.sectionTitle}>시간 기록 (수동 기입 가능 / 타이머 연동)</Text>
                  <View style={styles.timerInputRow}>
                    <TouchableOpacity onPress={openTimerModal} style={styles.timerPlayBtn}><Text style={styles.timerPlayIcon}>▶</Text></TouchableOpacity>
                    <View style={styles.timerDisplayWrapper}>
                      <TextInput style={[styles.timerDisplayText, { padding: 0 }]} value={enduranceMin} onChangeText={setEnduranceMin} keyboardType="number-pad" maxLength={3} placeholder="00" placeholderTextColor="#555" />
                      <Text style={styles.timerLabel}>분</Text>
                      <TextInput style={[styles.timerDisplayText, { padding: 0 }]} value={enduranceSec} onChangeText={setEnduranceSec} keyboardType="number-pad" maxLength={2} placeholder="00" placeholderTextColor="#555" />
                      <Text style={styles.timerLabel}>초</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.saveRecordButton} onPress={handleSaveEnduranceRecord}><Text style={styles.saveRecordButtonText}>기록 저장하기</Text></TouchableOpacity>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        )}
      </Modal>

      {/* 연속 완등 모달 */}
      <Modal visible={isConsecutiveModalVisible} animationType="fade" transparent onRequestClose={closeConsecutiveModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeConsecutiveModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: consecutiveHeightAnim }]}>
            <View {...consecutivePanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>연속 기록 저장</Text>
                <TouchableOpacity onPress={closeConsecutiveModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <TouchableOpacity activeOpacity={1} style={{ width: '100%', paddingBottom: 20 }}>
                <Text style={styles.sectionTitle}>난이도 입력</Text>
                <View style={styles.consecutiveInputBox}>
                  {selectedConsecutiveList.map((item: any, index: number) => (
                    <TouchableOpacity key={index} onPress={() => removeConsecutiveItem(index)} style={[styles.filledDiffBox, { backgroundColor: item.hex }]}>
                      <Text style={styles.filledDiffText}>{item.color}</Text>
                    </TouchableOpacity>
                  ))}
                  {selectedConsecutiveList.length === 0 && <Text style={styles.consecutiveEmptyText}>아래에서 난이도를 순서대로 탭해주세요.{"\n"}입력창의 난이도를 터치시 삭제됩니다.</Text>}
                </View>

                <View style={styles.colorButtonContainer}>
                  <View style={styles.colorButtonRow}>
                    {difficultyData.map((item: any) => (
                      <TouchableOpacity key={item.color} onPress={() => setSelectedConsecutiveList([...selectedConsecutiveList, item])} style={[styles.diffButton, { borderColor: item.hex }]}>
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
                      const stepScore = Math.round((BASE_SCORES[item.color] ?? 10) * (1.0 + (index * 0.1)) * 10) / 10;
                      return (
                        <View key={index} style={[styles.filledDiffBox, { backgroundColor: item.hex }]}><Text style={styles.filledDiffText}>{stepScore}</Text></View>
                      );
                    })}
                    {selectedConsecutiveList.length === 0 && <Text style={styles.consecutiveEmptyText}>입력된 기록이 없습니다</Text>}
                  </View>
                )}

                <TouchableOpacity style={styles.saveRecordButton} onPress={handleSaveConsecutiveRecord}><Text style={styles.saveRecordButtonText}>기록 저장하기</Text></TouchableOpacity>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── 💡 결과 & 삭제 확인 모달 (OLLA 표준 규격 적용) ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={closeResultModal}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={closeResultModal}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isDeleteModalVisible} animationType="fade" transparent onRequestClose={cancelDelete}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={[styles.deleteModalText, { color: '#FF4D4D' }]}>기록 삭제!</Text>
            <Text style={styles.deleteModalMessage}>해당 기록을 정말 삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={executeDelete}><Text style={styles.deleteBtnYesText}>삭제</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={cancelDelete}><Text style={styles.deleteBtnNoText}>취소</Text></TouchableOpacity>
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
  statusIng: { color: '#ffffff' }, // 💡 진행중 상태: 흰색
  statusNone: { color: '#999999' }, // 💡 미기록/실패 등 기본 상태: 회색

  rowCardWithTrash: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', paddingVertical: 18, paddingHorizontal: 15, borderRadius: 16, marginBottom: 10 },
  enduranceCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  enduranceTopText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }, 
  enduranceBottomText: { color: '#999999', fontSize: 14 }, 
  verticalDivider: { width: 1, height: 30, backgroundColor: '#444444', marginHorizontal: 5 },
  circleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, flexWrap: 'wrap' },
  colorCircle: { width: 30, height: 30, borderRadius: 15, marginRight: 10, marginBottom: 5 },
  trashButton: { padding: 10, marginLeft: 5 },
  trashIcon: { width: 24, height: 24, tintColor: '#FF4D4D', resizeMode: 'contain' }, 
  emptyText: { color: '#999999', fontSize: 16, textAlign: 'center', width: '100%' }, 

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center', width: '100%', overflow: 'hidden' },
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

  timerModalBackground: { flex: 1, backgroundColor: '#1A1A1A', padding: 20 },
  timerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  timerHeaderTitle: { color: '#A1BE44', fontSize: 24, fontWeight: 'bold' }, 
  timerCenterArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hugeTimerText: { color: '#ffffff', fontSize: 86, fontWeight: '900' }, 

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

  confirmTimerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },

  // ─────────────────────────── 💡 OLLA 모달창 표준 디자인 스타일 통일 적용 ───────────────────────────
  // 1. 공통 시스템 결과 알림 모달
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25, 
    paddingVertical: 45, 
    paddingHorizontal: 35, 
    alignItems: 'center' 
  },
  resultModalTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 8 
  }, 
  resultModalMessage: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 24 
  }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 

  // 2. 삭제/완료 투 버튼 확인 모달 (deleteModalBox 공유)
  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25, 
    paddingVertical: 45, 
    paddingHorizontal: 35, 
    alignItems: 'center' 
  },
  deleteModalText: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 8 
  }, 
  deleteModalMessage: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 24 
  }, 
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginRight: 5 },
  deleteBtnYesText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginLeft: 5 },
  deleteBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 
  // ───────────────────────────────────────────────────────────────────────────────────────────
});

export default RecodeScreen;