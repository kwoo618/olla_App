import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Dimensions, PanResponder, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useManagerCommunityData, getProfileImage, formatCommentDate } from '../ts/ManagerCommunity';

const ManagerCommunity = ({ route, navigation }: any) => {
  const isFocused = useIsFocused();
  const currentFilter = route?.params?.filter || 'ALL';
  
  // 💡 로직 분리: 백엔드 연동 관련 코드는 모두 훅에서 가져옵니다.
  const {
    posts, loading, refreshing, myUserId, myProfileImageUrl,
    selectedTab, setSelectedTab, comments, commentInput, setCommentInput, replyingTo, setReplyingTo,
    selectedUser, setSelectedUser, selectedPost, setSelectedPost,
    resultModalVisible, resultModalConfig, deleteTarget, setDeleteTarget, commentDeleteTarget, setCommentDeleteTarget,
    onRefresh, executeDelete, submitComment, executeCommentDelete, loadUserDetail, loadPostDetail, closeResultModal
  } = useManagerCommunityData(currentFilter, isFocused);

  const tabs = ['전체', '센터', '아웃도어'];

  // UI 모달 상태
  const [isCommentVisible, setCommentVisible] = useState(false);
  const [isDetailVisible, setDetailVisible] = useState(false);

  // 애니메이션 치수 설정
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN = SCREEN_HEIGHT * 0.6; 
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95; 
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.65; 
  const THRESHOLD = (HALF_SCREEN + FULL_SCREEN) / 2; 
  const CLOSE_THRESHOLD = HALF_SCREEN * 0.7; 

  // 1️⃣ 댓글창 애니메이션
  const commentHeightAnim = useRef(new Animated.Value(0)).current;
  const currentSnap = useRef(HALF_SCREEN); 
  const commentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => { commentHeightAnim.setOffset(currentSnap.current); commentHeightAnim.setValue(0); },
      onPanResponderMove: (_, gestureState) => { commentHeightAnim.setValue(-gestureState.dy); },
      onPanResponderRelease: (_, gestureState) => {
        commentHeightAnim.flattenOffset();
        const finalHeight = currentSnap.current - gestureState.dy;
        if (finalHeight > THRESHOLD) {
          currentSnap.current = FULL_SCREEN;
          Animated.spring(commentHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight < CLOSE_THRESHOLD) {
          closeCommentModal();
        } else {
          currentSnap.current = HALF_SCREEN;
          Animated.spring(commentHeightAnim, { toValue: HALF_SCREEN, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // 2️⃣ 회원 정보 상세 팝업 애니메이션
  const detailHeightAnim = useRef(new Animated.Value(0)).current;
  const currentDetailSnap = useRef(DETAIL_MODAL_HEIGHT);
  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => { detailHeightAnim.setOffset(currentDetailSnap.current); detailHeightAnim.setValue(0); },
      onPanResponderMove: (_, gestureState) => { detailHeightAnim.setValue(Math.min(0, -gestureState.dy)); },
      onPanResponderRelease: (_, gestureState) => {
        detailHeightAnim.flattenOffset();
        const finalHeight = currentDetailSnap.current - gestureState.dy;
        if (finalHeight < currentDetailSnap.current * 0.7) closeDetailModal();
        else Animated.spring(detailHeightAnim, { toValue: currentDetailSnap.current, useNativeDriver: false }).start();
      }
    })
  ).current;

  // 모달 제어 함수들
  const openDetailModal = async (authorId: number, authorName: string) => {
    if (await loadUserDetail(authorId, authorName)) {
      setDetailVisible(true);
      currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
      detailHeightAnim.setValue(0);
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }
  };
  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => { 
      setDetailVisible(false); setSelectedUser(null); 
    });
  };

  const openPostDetail = async (post: any) => {
    if (await loadPostDetail(post)) {
      setCommentVisible(true);
      currentSnap.current = HALF_SCREEN;
      commentHeightAnim.setValue(0);
      Animated.timing(commentHeightAnim, { toValue: HALF_SCREEN, duration: 300, useNativeDriver: false }).start();
    }
  };
  const closeCommentModal = () => {
    Animated.timing(commentHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setCommentVisible(false); setReplyingTo(null); setCommentInput(''); setSelectedPost(null);
    });
  };

  const renderDetailRow = (label: string, value: string, unit: string = '') => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}{value !== '-' ? unit : ''}</Text>
    </View>
  );

  const filteredPosts = posts.filter((post: any) => selectedTab === '전체' || post.type === selectedTab);

  if (loading) {
    return (
      <SafeAreaView style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.background} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}>
        
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]} onPress={() => setSelectedTab(tab)} activeOpacity={0.8}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredPosts.map((post: any) => {
          const isOutdoor = post.type === '아웃도어';
          const isPast = post.isPast; 
          const badgeBgColor = isPast ? '#333333' : (isOutdoor ? '#00810F' : '#0072B9');
          const badgeTextColor = isPast ? '#888888' : (isOutdoor ? '#2CDE00' : '#009DFF');

          return (
            <TouchableOpacity key={post.id} style={[styles.postCard, isPast && styles.postCardDimmed]} activeOpacity={0.95} onPress={() => openPostDetail(post)}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: badgeBgColor }]}>
                  <Text style={[styles.badgeText, { color: badgeTextColor }]}>{post.type}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={styles.statsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                      <Image source={require('../assets/Eye.png')} style={{ width: 17, height: 17, tintColor: '#999', marginRight: 4 }} />
                      <Text style={styles.statTopText}>{post.viewCount}</Text>
                    </View>
                    <Text style={styles.postDateText}>{post.postDate}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.postTitle, isPast && { color: '#888888' }]}>{post.title}</Text>
              <Text style={[styles.postDesc, isPast && { color: '#666666' }]}>{post.desc}</Text>
              
              <View style={styles.infoRow}>
                {([['point.png',post.location],['DATE.png',post.date],['people.png',post.people]] as [string,string][]).map(([img,val],i) => (
                  <View key={i} style={styles.infoItem}>
                    <Image source={img==='point.png'?require('../assets/point.png'):img==='DATE.png'?require('../assets/DATE.png'):require('../assets/people.png')} style={styles.infoIcon}/>
                    <Text style={styles.infoText}>{val}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />
              
              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.profileRow} onPress={() => openDetailModal(post.writerId, post.author)}>
                  <Image source={getProfileImage(post.profileImageUrl)} style={[styles.profileImg, isPast && { opacity: 0.5 }]} />
                  <Text style={[styles.authorText, isPast && { color: '#666666' }]}>{post.author}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ marginRight: 10 }} onPress={() => openPostDetail(post)}>
                  <Image source={require('../assets/ChatText.png')} style={{ width: 22, height: 22, tintColor: '#ffffff' }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.trashBtn} onPress={() => setDeleteTarget(post.id)}>
                  <Image source={require('../assets/trash.png')} style={[styles.trashIcon, isPast && { tintColor: '#666666' }]} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
        {filteredPosts.length === 0 && <Text style={{ color: '#999', textAlign: 'center', marginTop: 30, fontSize: 16 }}>등록된 커뮤니티 글이 없습니다.</Text>}
      </ScrollView>

      {/* 기본 모달 영역 */}
      {!isCommentVisible && (
        <>
          <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={closeResultModal}>
            <View style={styles.resultModalOverlay}>
              <View style={styles.resultModalBox}>
                <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>{resultModalConfig.title}</Text>
                <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
                <TouchableOpacity style={styles.resultModalBtn} onPress={closeResultModal}><Text style={styles.resultModalBtnText}>확인</Text></TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={deleteTarget !== null} animationType="fade" transparent={true} onRequestClose={() => setDeleteTarget(null)}>
            <View style={styles.deleteModalOverlay}>
              <View style={styles.deleteModalBox}>
                <Text style={styles.deleteModalText}>삭제하시겠습니까?</Text>
                <View style={styles.deleteBtnRow}>
                  <TouchableOpacity style={styles.deleteBtnYes} onPress={executeDelete}><Text style={styles.deleteBtnYesText}>예</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtnNo} onPress={() => setDeleteTarget(null)}><Text style={styles.deleteBtnNoText}>아니오</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={isDetailVisible} transparent={true} animationType="fade" onRequestClose={closeDetailModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={closeDetailModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
              <Animated.View style={[styles.bottomSheet, { height: detailHeightAnim, overflow: 'hidden' }]}>
                <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                  <View style={styles.dragHandle} />
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>회원 정보 확인</Text>
                    <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
                  </View>
                  <View style={styles.horizontalDivider} />
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                  {selectedUser && (
                    <View style={styles.detailContainer}>
                      <View style={styles.detailProfileWrapper}>
                        <Image source={getProfileImage(selectedUser.profileImageUrl)} style={styles.profileBig} /> 
                        <Text style={styles.profileName}>{selectedUser.name}</Text>
                      </View>
                      <View style={styles.detailInfoBox}>
                        {renderDetailRow('이름', selectedUser.name)}
                        {renderDetailRow('전화번호', selectedUser.phone)}
                        {renderDetailRow('성별', selectedUser.gender)}
                        {renderDetailRow('나이', selectedUser.age, '세')}
                        {renderDetailRow('키', selectedUser.height, 'cm')}
                        {renderDetailRow('몸무게', selectedUser.weight, 'kg')}
                        {renderDetailRow('팔길이', selectedUser.arm, 'cm')}
                        {renderDetailRow('암벽화 사이즈', selectedUser.shoe, 'mm')}
                      </View>
                      <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}><Text style={styles.closeFullBtnText}>닫기</Text></TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
        </>
      )}

      {/* 댓글 및 게시글 모달 창 */}
      <Modal visible={isCommentVisible} transparent animationType="fade" onRequestClose={closeCommentModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeCommentModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[styles.commentSheet, { height: commentHeightAnim }]}>
              <View style={{ position: 'absolute', bottom: -SCREEN_HEIGHT, left: -20, right: -20, height: SCREEN_HEIGHT, backgroundColor: '#1E1E1E' }} />
              <View {...commentPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>게시글 보기</Text>
                  <TouchableOpacity onPress={closeCommentModal} hitSlop={{top:10, bottom:10, left:10, right:10}}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
                </View>
                <View style={styles.horizontalDivider} />
              </View>
              
              <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {selectedPost && (
                  <View style={styles.postDetailContainer}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.badge, { backgroundColor: selectedPost.isPast ? '#333' : (selectedPost.type==='아웃도어' ? '#00810F' : '#0072B9') }]}>
                        <Text style={[styles.badgeText, { color: selectedPost.isPast ? '#888' : (selectedPost.type==='아웃도어' ? '#2CDE00' : '#009DFF') }]}>{selectedPost.type}</Text>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                          <Image source={require('../assets/Eye.png')} style={{ width: 17, height: 17, tintColor: '#999', marginRight: 4 }} />
                          <Text style={styles.statTopText}>{selectedPost.viewCount}</Text>
                        </View>
                        <Text style={styles.postDateText}>{selectedPost.postDate}</Text>
                      </View>
                    </View>
                    <Text style={[styles.postTitle, selectedPost.isPast && { color: '#888888' }]}>{selectedPost.title}</Text>
                    <Text style={[styles.postDesc, selectedPost.isPast && { color: '#666666' }]}>{selectedPost.desc}</Text>
                    <View style={styles.infoRow}>
                      <View style={styles.infoItem}><Image source={require('../assets/point.png')} style={styles.infoIcon}/><Text style={styles.infoText}>{selectedPost.location}</Text></View>
                      <View style={styles.infoItem}><Image source={require('../assets/DATE.png')} style={styles.infoIcon}/><Text style={styles.infoText}>{selectedPost.date}</Text></View>
                      <View style={styles.infoItem}><Image source={require('../assets/people.png')} style={styles.infoIcon}/><Text style={styles.infoText}>{selectedPost.people}</Text></View>
                    </View>
                    <View style={[styles.divider, { marginBottom: 5 }]}/>
                    <Text style={styles.commentSectionTitle}>댓글 {comments.length}개</Text>
                  </View>
                )}

                {comments.map((parent) => {
                  const isParentDeleted = parent.content === "삭제된 댓글입니다.";
                  return (
                    <View key={`comment-${parent.id}`}>
                      <View style={styles.commentItem}>
                        <TouchableOpacity onPress={() => openDetailModal(parent.writerId, parent.writerName)}><Image source={getProfileImage(parent.profileImageUrl)} style={styles.commentAvatar} /></TouchableOpacity>
                        <View style={styles.commentContentArea}>
                          <View style={styles.commentHeaderLine}>
                            <TouchableOpacity onPress={() => openDetailModal(parent.writerId, parent.writerName)}><Text style={styles.commentAuthorName}>{parent.writerName}</Text></TouchableOpacity>
                            <Text style={styles.commentDateText}>{formatCommentDate(parent.createdAt)}</Text>
                          </View>
                          <Text style={[styles.commentBodyText, isParentDeleted && { color: '#888' }]}>{parent.content}</Text>
                          {!isParentDeleted && <TouchableOpacity onPress={() => setReplyingTo({ id: parent.id, name: parent.writerName })}><Text style={styles.commentReplyBtnText}>답글 달기</Text></TouchableOpacity>}
                        </View>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                          {!isParentDeleted && <TouchableOpacity style={styles.commentAdminDeletePngBtn} onPress={() => setCommentDeleteTarget(parent.id)}><Image source={require('../assets/trash.png')} style={styles.commentAdminTrashIcon} /></TouchableOpacity>}
                        </View>
                      </View>

                      {parent.children?.map((child) => {
                        const isChildDeleted = child.content === "삭제된 댓글입니다.";
                        return (
                          <View key={`reply-${child.id}`} style={[styles.commentItem, styles.childCommentItem]}>
                            <TouchableOpacity onPress={() => openDetailModal(child.writerId, child.writerName)}><Image source={getProfileImage(child.profileImageUrl)} style={styles.commentAvatar} /></TouchableOpacity>
                            <View style={styles.commentContentArea}>
                              <View style={styles.commentHeaderLine}>
                                <TouchableOpacity onPress={() => openDetailModal(child.writerId, child.writerName)}><Text style={styles.commentAuthorName}>{child.writerName}</Text></TouchableOpacity>
                                <Text style={styles.commentDateText}>{formatCommentDate(child.createdAt)}</Text>
                              </View>
                              <Text style={[styles.commentBodyText, isChildDeleted && { color: '#888' }]}>{child.content}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                              {!isChildDeleted && <TouchableOpacity style={styles.commentAdminDeletePngBtn} onPress={() => setCommentDeleteTarget(child.id)}><Image source={require('../assets/trash.png')} style={styles.commentAdminTrashIcon} /></TouchableOpacity>}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
                {comments.length === 0 && <Text style={{color:'#999',fontSize:16,textAlign:'center',marginTop:30}}>등록된 댓글이 없습니다.</Text>}
              </ScrollView>

              <View style={styles.commentInputWrapper}>
                {replyingTo && (
                  <View style={styles.replyingToIndicator}>
                    <Text style={styles.replyingToIndicatorText}>{replyingTo.name}님에게 답글 남기는 중</Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}><Text style={styles.replyingCancelText}>✕</Text></TouchableOpacity>
                  </View>
                )}
                <View style={styles.commentInputRow}>
                  <Image source={getProfileImage(myProfileImageUrl)} style={styles.commentInputAvatar} />
                  <TextInput style={styles.commentTextInput} placeholder="댓글을 작성해주세요." placeholderTextColor="#666" value={commentInput} onChangeText={setCommentInput} multiline />
                  <TouchableOpacity onPress={submitComment}><Text style={[styles.commentSubmitBtn, commentInput.trim() ? { color: '#A1BE44' } : undefined]}>등록</Text></TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>

          {/* 댓글 모달 내부 알림/에러창 처리 (Absolute Overlay) */}
          {commentDeleteTarget !== null && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <View style={styles.deleteModalOverlay}>
                <View style={styles.deleteModalBox}>
                  <Text style={styles.deleteModalText}>해당 댓글을 삭제하시겠습니까?</Text>
                  <View style={styles.deleteBtnRow}>
                    <TouchableOpacity style={styles.deleteBtnYes} onPress={executeCommentDelete}><Text style={styles.deleteBtnYesText}>예</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtnNo} onPress={() => setCommentDeleteTarget(null)}><Text style={styles.deleteBtnNoText}>아니오</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {resultModalVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <View style={styles.resultModalOverlay}>
                <View style={styles.resultModalBox}>
                  <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>{resultModalConfig.title}</Text>
                  <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
                  <TouchableOpacity style={styles.resultModalBtn} onPress={closeResultModal}><Text style={styles.resultModalBtnText}>확인</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {isDetailVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={closeDetailModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
                <Animated.View style={[styles.bottomSheet, { height: detailHeightAnim, overflow: 'hidden' }]}>
                  <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                    <View style={styles.dragHandle} />
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>회원 정보 확인</Text>
                      <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
                    </View>
                    <View style={styles.horizontalDivider} />
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                    {selectedUser && (
                      <View style={styles.detailContainer}>
                        <View style={styles.detailProfileWrapper}>
                          <Image source={getProfileImage(selectedUser.profileImageUrl)} style={styles.profileBig} /> 
                          <Text style={styles.profileName}>{selectedUser.name}</Text>
                        </View>
                        <View style={styles.detailInfoBox}>
                          {renderDetailRow('이름', selectedUser.name)}
                          {renderDetailRow('전화번호', selectedUser.phone)}
                          {renderDetailRow('성별', selectedUser.gender)}
                          {renderDetailRow('나이', selectedUser.age, '세')}
                          {renderDetailRow('키', selectedUser.height, 'cm')}
                          {renderDetailRow('몸무게', selectedUser.weight, 'kg')}
                          {renderDetailRow('팔길이', selectedUser.arm, 'cm')}
                          {renderDetailRow('암벽화 사이즈', selectedUser.shoe, 'mm')}
                        </View>
                        <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}><Text style={styles.closeFullBtnText}>닫기</Text></TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </Animated.View>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ... 아래의 스타일 객체는 그대로 유지 ...
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 }, 
  activeTabButton: { backgroundColor: '#1D1D1D' },
  tabText: { color: '#999999', fontSize: 17, fontWeight: 'bold' }, 
  activeTabText: { color: '#ffffff' },
  scrollContent: { paddingBottom: 80 },

  postCard: { backgroundColor: '#212121', borderColor: '#262626', borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 15 },
  postCardDimmed: { opacity: 0.6, borderColor: '#333333' }, 

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 }, 
  badgeText: { fontSize: 14, fontWeight: 'bold' }, 
  
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statTopText: { color: '#999', fontSize: 14, fontWeight: '500', marginRight: 10 },
  postDateText: { color: '#999999', fontSize: 14 }, 
  
  postTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 6 }, 
  postDesc: { color: '#999999', fontSize: 16, lineHeight: 22, marginBottom: 15 }, 
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 4, flexShrink: 1 }, 
  infoIcon: { width: 14, height: 14, resizeMode: 'contain', marginRight: 4, tintColor: '#999999' }, 
  infoText: { color: '#999999', fontSize: 13, flexShrink: 1 }, 
  
  statBottomText: { color: '#999', fontSize: 14, fontWeight: '500' },

  trashBtn: { padding: 10, marginRight: -8 }, 
  trashIcon: { width: 22, height: 22, resizeMode: 'contain', tintColor: '#A1BE44' }, 
  
  divider: { height: 1, backgroundColor: '#333333', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  profileImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444444', marginRight: 10 }, 
  textProfileImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444444', marginRight: 10, justifyContent: 'center', alignItems: 'center' }, 
  textProfileText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }, 
  authorText: { color: '#cccccc', fontSize: 16, fontWeight: '600' }, 

  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' }, 
  deleteModalText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' }, 
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginRight: 5 }, 
  deleteBtnYesText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginLeft: 5 }, 
  deleteBtnNoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, 

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

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, 
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, 
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, 
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 

  commentSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, width: '100%', overflow: 'hidden' },
  postDetailContainer: { paddingBottom: 10, paddingTop: 10 },
  commentSectionTitle: { color: '#A1BE44', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  commentItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  childCommentItem: { marginLeft: 45, borderLeftWidth: 1.5, borderLeftColor: '#444', paddingLeft: 12 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444', marginRight: 12 },
  commentContentArea: { flex: 1, justifyContent: 'center' },
  commentHeaderLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  commentAuthorName: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginRight: 8 },
  commentDateText: { color: '#999999', fontSize: 13 },
  commentBodyText: { color: '#ffffff', fontSize: 16, lineHeight: 22, marginBottom: 6 },
  commentReplyBtnText: { color: '#888888', fontSize: 13, fontWeight: 'bold' },
  
  commentStatText: { color: '#999', fontSize: 14, fontWeight: '500' },
  
  commentAdminDeletePngBtn: { padding: 4, marginTop: 4 }, 
  commentAdminTrashIcon: { width: 18, height: 18, resizeMode: 'contain', tintColor: '#FF0000' },
  
  commentInputWrapper: { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12, backgroundColor: '#1E1E1E' },
  replyingToIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginBottom: 10 },
  replyingToIndicatorText: { color: '#A1BE44', fontSize: 13, fontWeight: 'bold' },
  replyingCancelText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center' },
  commentInputAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444', marginRight: 10 },
  commentTextInput: { flex: 1, backgroundColor: '#000000', color: '#ffffff', fontSize: 15, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, maxHeight: 100 },
  commentSubmitBtn: { color: '#666666', fontSize: 16, fontWeight: 'bold', marginLeft: 12, paddingVertical: 10 },
});

export default ManagerCommunity;