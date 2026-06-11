import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl, 
  Modal, Animated, TouchableWithoutFeedback, BackHandler 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRanking, getFullImageUrl, getSectionColor, getRankColor, colors } from '../ts/Ranking';
import FastImage from 'react-native-fast-image';

// ─────────────────────────── 프로필 이미지 컴포넌트 ───────────────────────────
const ProfileImage = ({ uri, style }: { uri?: string | null; style: any }) => {
  const fullUri = getFullImageUrl(uri);
  if (fullUri) {
    return <FastImage source={{ uri: fullUri, priority: FastImage.priority.normal }} style={style} />;
  }
  return <Image source={require('../assets/profile.png')} style={style} />;
};

const RankingScreen = ({ route }: any) => {
  const {
    refreshing, onRefresh,
    mainTab, setMainTab,
    colorTab, setColorTab,
    myNickname, myCurrentRank, myProfileImageUrl,
    filteredList,
    isDetailVisible, selectedUser, openDetailModal, closeDetailModal, detailHeightAnim, detailPanResponder,
    alertConfig, setAlertConfig
  } = useRanking(route);

  // 💡 앱 종료 커스텀 모달 상태 추가
  const [isExitModalVisible, setExitModalVisible] = useState(false);

  // 💡 안드로이드 하드웨어 뒤로가기 제어 (모달 닫기 우선 -> 앱 종료 커스텀 모달)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // 1. 커스텀 경고 모달이 열려있으면 닫기
        if (alertConfig.visible) {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          return true;
        }
        // 2. 회원 상세 바텀시트가 열려있으면 닫기
        if (isDetailVisible) {
          closeDetailModal();
          return true;
        }
        // 3. 앱 종료 모달이 열려있으면 닫기
        if (isExitModalVisible) {
          setExitModalVisible(false);
          return true;
        }
        
        // 4. 기본 화면일 때 앱 종료 커스텀 모달 띄우기
        setExitModalVisible(true);
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [alertConfig.visible, isDetailVisible, isExitModalVisible, closeDetailModal, setAlertConfig])
  );

  const renderDetailRow = (label: string, value: string, unit: string = '') => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}{value !== '-' ? unit : ''}</Text>
    </View>
  );

  return (
    <View style={styles.background}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}
      >
        {/* 내 랭킹 카드 */}
        <View style={styles.myRankingWrapper}>
          <View style={styles.myRankingCard}>
            <View style={styles.myRankingContent}>
              <View style={styles.myRankingLeft}>
                <ProfileImage uri={myProfileImageUrl} style={styles.myProfileImg} />
                <View>
                  <Text style={styles.myNameText}>{myNickname}</Text>
                  <Text style={styles.myRankSubText}>{mainTab} 나의 순위</Text>
                </View>
              </View>
              <View style={styles.myRankingRight}>
                <Text style={styles.myRankNumText}>{myCurrentRank}</Text>
                <Text style={styles.myRankUnitText}>위</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 메인 탭 */}
        <View style={styles.mainTabContainer}>
          {(['초보벽', '지구력', '연속'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.mainTabButton, mainTab === tab && styles.activeMainTab]}
              onPress={() => setMainTab(tab)}
            >
              <Text style={[styles.mainTabText, mainTab === tab && styles.activeMainTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 색상 탭 (초보벽 전용) */}
        {mainTab === '초보벽' && (
          <View style={styles.colorTabRow}>
            <TouchableOpacity
              style={[
                styles.colorBtn, { borderColor: '#A1BE44' },
                colorTab === '전체' && { backgroundColor: '#A1BE44', borderWidth: 1.5 }
              ]}
              onPress={() => setColorTab('전체')}
            >
              <Text style={[
                styles.colorBtnTextGray,
                colorTab === '전체' && { color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
              ]}>전체</Text>
            </TouchableOpacity>

            {colors.map(c => {
              const isSelected = colorTab === c.name;
              return (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    styles.colorBtn, { borderColor: c.hex },
                    isSelected && { backgroundColor: c.hex, borderWidth: 1.5 }
                  ]}
                  onPress={() => setColorTab(c.name)}
                >
                  <Text style={[
                    styles.colorBtnText, { color: c.name === '검정' ? '#ffffff' : c.hex },
                    isSelected && { color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
                  ]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 랭킹 목록 */}
        <View style={styles.rankingListContainer}>
          {filteredList.length === 0 ? (
            <Text style={styles.emptyText}>랭킹 데이터가 없습니다.</Text>
          ) : (
            filteredList.map((item, index) => (
              <View key={`rank-${mainTab}-${item.id}-${index}`} style={[styles.rankItemCard, item.isMe && styles.myRankItemHighlight]}>
                <View style={[styles.rankCircle, { borderColor: getRankColor(item.rank) }]}>
                  <Text style={[styles.rankNumberText, { color: getRankColor(item.rank) }]}>{item.rank}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.rankCenter}
                  activeOpacity={item.isMe ? 1 : 0.7}
                  onPress={() => { if (!item.isMe && item.memberId) openDetailModal(item.memberId, item.name); }}
                >
                  <ProfileImage uri={item.profileImageUrl} style={styles.rankProfileImg} />
                  <Text style={styles.rankNameText}>{item.name}</Text>
                </TouchableOpacity>

                <View style={styles.rankRight}>
                  {mainTab === '연속' && (
                    <>
                      <View style={styles.consecutiveColorsRow}>
                        {item.colors.map((hex: string, idx: number) => (
                          <View key={idx} style={[styles.miniColorCircle, { backgroundColor: hex }]} />
                        ))}
                      </View>
                      <Text style={styles.consecutiveScoreText}>{item.score}점</Text>
                    </>
                  )}

                  {mainTab === '지구력' && (
                    <>
                      <Text style={styles.enduranceLapsText}>편도 {item.laps}회</Text>
                      <Text style={styles.enduranceTimeText}>{item.time}</Text>
                      <View style={styles.enduranceSectionRow}>
                        {item.laps % 2 !== 0 && <Text style={[styles.enduranceSectionArrow, { color: getSectionColor(item.section) }]}>← </Text>}
                        <Text style={[styles.enduranceSectionText, { color: getSectionColor(item.section) }]}>{item.section}</Text>
                        {item.laps % 2 === 0 && <Text style={[styles.enduranceSectionArrow, { color: getSectionColor(item.section) }]}> →</Text>}
                      </View>
                    </>
                  )}

                  {mainTab === '초보벽' && (
                    <>
                      <Text style={[styles.rankTypeText, { color: item.type === '왕복' ? '#0058CC' : '#FF2528' }]}>{item.type}</Text>
                      <View style={styles.rankInfoBottomRow}>
                        <Text style={[styles.rankColorText, { color: item.colorHex === '#000000' ? '#FFFFFF' : item.colorHex }]}>{item.colorName}</Text>
                        <Text style={styles.rankHoldText}>{item.hold}번</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 🌟 회원 정보 상세 팝업 */}
      <Modal visible={isDetailVisible} transparent={true} animationType="fade" onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeDetailModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <Animated.View style={[styles.bottomSheet, { height: detailHeightAnim, overflow: 'hidden' }]}>
            <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>회원 상세 정보</Text>
                <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {selectedUser && (
                <View style={styles.detailContainer}>
                  <View style={styles.detailProfileWrapper}>
                    <ProfileImage uri={selectedUser.profileImageUrl} style={styles.profileBig} />
                    <Text style={styles.profileName}>{selectedUser.name}</Text>
                  </View>
                  <View style={styles.detailInfoBox}>
                    {renderDetailRow('이름', selectedUser.name)}
                    {renderDetailRow('성별', selectedUser.gender)}
                    {renderDetailRow('나이', selectedUser.age, '세')}
                    {renderDetailRow('키', selectedUser.height, 'cm')}
                    {renderDetailRow('몸무게', selectedUser.weight, 'kg')}
                    {renderDetailRow('팔길이', selectedUser.arm, 'cm')}
                    {renderDetailRow('암벽화 사이즈', selectedUser.shoe, 'mm')}
                  </View>
                  <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}>
                    <Text style={styles.closeFullBtnText}>닫기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── 💡 앱 종료 확인 커스텀 모달 (통일된 디자인) ─── */}
      <Modal visible={isExitModalVisible} transparent animationType="fade" onRequestClose={() => setExitModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={styles.centerModalText}>앱을 종료하시겠습니까?</Text>
            <View style={styles.centerBtnRow}>
              <TouchableOpacity
                              style={styles.centerBtnYes}
                              onPress={() => {
                                setExitModalVisible(false);
                                setTimeout(() => {
                                  BackHandler.exitApp();
                                }, 100);
                              }}
                            >
                <Text style={styles.centerBtnYesText}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.centerBtnNo} onPress={() => setExitModalVisible(false)}>
                <Text style={styles.centerBtnNoText}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 💡 커스텀 알림 결과 모달 (OLLA 표준 규격 적용) ─── */}
      <Modal visible={alertConfig.visible} animationType="fade" transparent onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: '#FF4D4D' }]}>
              {alertConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{alertConfig.message}</Text>
            <TouchableOpacity 
              style={styles.resultModalBtn} 
              onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            >
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },

  myRankingWrapper: { marginBottom: 20, marginTop: 10 },
  myRankingCard: { height: 110, borderRadius: 16, borderWidth: 1, borderColor: '#718A26', backgroundColor: '#5E731F', justifyContent: 'center' },
  myRankingContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25 },
  myRankingLeft: { flexDirection: 'row', alignItems: 'center' },
  myProfileImg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#444444', marginRight: 15 },
  myNameText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  myRankSubText: { color: '#EBEBEB', fontSize: 15, fontWeight: '500' },
  myRankingRight: { flexDirection: 'row', alignItems: 'baseline' },
  myRankNumText: { color: '#A1BE44', fontSize: 48, fontWeight: '900', marginRight: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
  myRankUnitText: { color: '#EBEBEB', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },

  mainTabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  mainTabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 },
  activeMainTab: { backgroundColor: '#1D1D1D' },
  mainTabText: { color: '#999999', fontSize: 17, fontWeight: 'bold' },
  activeMainTabText: { color: '#ffffff' },

  scrollContent: { paddingBottom: 50 },

  colorTabRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  colorBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center', marginHorizontal: 2 },
  colorBtnText: { fontSize: 13, fontWeight: 'bold' },
  colorBtnTextActive: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  colorBtnTextGray: { color: '#999999', fontSize: 13, fontWeight: 'bold' },

  rankingListContainer: { paddingBottom: 20 },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 30, fontSize: 16 },
  rankItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderWidth: 1, borderColor: '#333333', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 15, marginBottom: 12 },
  myRankItemHighlight: { borderColor: '#A1BE44', backgroundColor: '#2A2F1D' },

  rankCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  rankNumberText: { fontSize: 16, fontWeight: '900' },

  rankCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rankProfileImg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#444444', marginRight: 12 },
  rankNameText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },

  rankRight: { alignItems: 'center', justifyContent: 'center', minWidth: 95 },

  rankTypeText: { fontSize: 16, fontWeight: '900', marginBottom: 4, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  rankInfoBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rankColorText: { fontSize: 17, fontWeight: 'bold', marginRight: 6, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  rankHoldText: { color: '#ffffff', fontSize: 17, fontWeight: '600', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

  enduranceLapsText: { color: '#A1BE44', fontSize: 17, fontWeight: 'bold', marginBottom: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceTimeText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  enduranceSectionText: { fontSize: 17, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  enduranceSectionArrow: { fontSize: 17, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

  consecutiveColorsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 90, marginBottom: 5 },
  miniColorCircle: { width: 16, height: 16, borderRadius: 8, margin: 2, borderWidth: 0.5, borderColor: '#555555' },
  consecutiveScoreText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 23, fontWeight: 'bold' }, 
  closeBtn: { color: '#999999', fontSize: 28, paddingHorizontal: 10 }, 
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },
  detailContainer: { width: '100%' },
  detailProfileWrapper: { alignSelf: 'center', marginBottom: 25, alignItems: 'center' },
  profileBig: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#444' },
  profileName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  detailInfoBox: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#333333' }, 
  detailLabel: { color: '#999999', fontSize: 17, fontWeight: 'bold' }, 
  detailValue: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' }, 
  closeFullBtn: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 18, alignItems: 'center' }, 
  closeFullBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

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
  resultModalBtn: { 
    width: '100%', 
    backgroundColor: '#A1BE44', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  resultModalBtnText: { 
    color: '#000000', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },

  // 2. 앱 종료 확인 커스텀 모달
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  centerModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25, 
    paddingVertical: 45, 
    paddingHorizontal: 35, 
    alignItems: 'center' 
  },
  centerModalText: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 25,
    lineHeight: 24,
    textAlign: 'center'
  },
  centerBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  centerBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginRight: 5 },
  centerBtnYesText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  centerBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginLeft: 5 },
  centerBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});

export default RankingScreen;