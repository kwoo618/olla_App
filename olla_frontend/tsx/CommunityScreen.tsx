import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Dimensions, PanResponder, TouchableWithoutFeedback, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useCommunityData, getFullImageUrl, formatCommentDate, getToday, p } from '../ts/Community';
import FastImage from 'react-native-fast-image';

LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'kr';

const calendarTheme = {
  backgroundColor: '#212121', calendarBackground: '#212121', textSectionTitleColor: '#999999',
  selectedDayBackgroundColor: '#A1BE44', selectedDayTextColor: '#000000', todayTextColor: '#A1BE44',
  dayTextColor: '#ffffff', textDisabledColor: '#444444', monthTextColor: '#ffffff',
  textDayFontWeight: '500' as const, textMonthFontWeight: 'bold' as const, textDayHeaderFontWeight: '500' as const,
  textDayFontSize: 16, textMonthFontSize: 18, textDayHeaderFontSize: 14,
};

// ✅ 이미지 에러 시 기본 아이콘 fallback
const ProfileImg = ({ uri, style }: { uri: string | null | undefined; style: any }) => {
  const [hasError, setHasError] = useState(false);
  const fullUri = getFullImageUrl(uri);

  if (fullUri && !hasError) {
    return (
      <FastImage
        source={{ uri: fullUri, priority: FastImage.priority.normal }}
        style={style}
        onError={() => setHasError(true)}
        defaultSource={require('../assets/profile.png')}
      />
    );
  }
  return <Image source={require('../assets/profile.png')} style={style} />;
};

const CommunityScreen = ({ route, navigation }: any) => {
  const isFocused = useIsFocused();
  const currentFilter = route?.params?.filter || 'ALL';

  const {
    posts, loading, refreshing, myUserId, myProfileImageUrl,
    hasMembership,
    selectedTab, setSelectedTab, searchKeyword, setSearchKeyword, isSearching, form, setForm,
    comments, commentInput, setCommentInput, replyingTo, setReplyingTo,
    selectedUser, selectedPost, setSelectedPost, isEditMode, isPostLoading,
    resultModalVisible, resultModalConfig, createAlertVisible, setCreateAlertVisible, createAlertMessage,
    deleteTarget, setDeleteTarget, closeTarget, setCloseTarget, commentDeleteTarget, setCommentDeleteTarget,
    isCalendarVisible, openCalendar, closeCalendar,
    isTimePickerVisible, tempHour, setTempHour, tempMinute, setTempMinute, openTimePicker, closeTimePicker, confirmTimeSelection,
    onRefresh, searchPosts, clearSearch, toggleLike, toggleJoin, executeDelete, executeClose,
    submitPost, submitComment, executeCommentDelete, loadUserDetail, loadPostDetail, setupCreateForm, setupEditForm, closeResultModal
  } = useCommunityData(currentFilter, isFocused);

  const [isCreateVisible, setCreateVisible] = useState(false);
  const [isCommentVisible, setCommentVisible] = useState(false);
  const [isDetailVisible, setDetailVisible] = useState(false);

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const HALF_SCREEN = SCREEN_HEIGHT * 0.6;
  const CREATE_SCREEN = SCREEN_HEIGHT * 0.85;
  const FULL_SCREEN = SCREEN_HEIGHT * 0.95;
  const DETAIL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.65;
  const THRESHOLD = (HALF_SCREEN + FULL_SCREEN) / 2;
  const CLOSE_THRESHOLD = HALF_SCREEN * 0.7;

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

  const createHeightAnim = useRef(new Animated.Value(0)).current;
  const currentCreateSnap = useRef(HALF_SCREEN);
  const createPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => { createHeightAnim.setOffset(currentCreateSnap.current); createHeightAnim.setValue(0); },
      onPanResponderMove: (_, gestureState) => { createHeightAnim.setValue(-gestureState.dy); },
      onPanResponderRelease: (_, gestureState) => {
        createHeightAnim.flattenOffset();
        const finalHeight = currentCreateSnap.current - gestureState.dy;
        if (finalHeight > THRESHOLD) {
          currentCreateSnap.current = FULL_SCREEN;
          Animated.spring(createHeightAnim, { toValue: FULL_SCREEN, useNativeDriver: false }).start();
        } else if (finalHeight < CLOSE_THRESHOLD) {
          closeCreateModal();
        } else {
          currentCreateSnap.current = HALF_SCREEN;
          Animated.spring(createHeightAnim, { toValue: HALF_SCREEN, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

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

  const openDetailModal = async (authorId: number, authorName: string, isMine: boolean) => {
    if (await loadUserDetail(authorId, authorName, isMine)) {
      setDetailVisible(true);
      currentDetailSnap.current = DETAIL_MODAL_HEIGHT;
      detailHeightAnim.setValue(0);
      Animated.timing(detailHeightAnim, { toValue: DETAIL_MODAL_HEIGHT, duration: 300, useNativeDriver: false }).start();
    }
  };
  const closeDetailModal = () => {
    Animated.timing(detailHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => setDetailVisible(false));
  };

  const openPostDetail = async (post: any) => {
    if (isPostLoading) return;
    // ✅ 마감된 게시글은 모달 안 열고 조회수도 안 올림
    if (post.isPast) return;
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

  const openCreateModal = () => {
    if (!hasMembership) return;
    setupCreateForm();
    setCreateVisible(true);
    currentCreateSnap.current = CREATE_SCREEN;
    createHeightAnim.setValue(0);
    Animated.timing(createHeightAnim, { toValue: CREATE_SCREEN, duration: 300, useNativeDriver: false }).start();
  };

  const openEditModal = (post: any) => {
    setupEditForm(post);
    setCreateVisible(true);
    currentCreateSnap.current = CREATE_SCREEN;
    createHeightAnim.setValue(0);
    Animated.timing(createHeightAnim, { toValue: CREATE_SCREEN, duration: 300, useNativeDriver: false }).start();
  };

  const closeCreateModal = () => {
    Keyboard.dismiss();
    Animated.timing(createHeightAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => setCreateVisible(false));
  };

  const filteredPosts = posts.filter(post => selectedTab === '전체' || post.type === selectedTab);

  if (loading) {
    return (
      <SafeAreaView style={[s.bg, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </SafeAreaView>
    );
  }
  if (!hasMembership) {
    return (
      <SafeAreaView style={[s.bg, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }]} edges={[]}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>🔒</Text>
        <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
          회원권 전용 기능입니다
        </Text>
        <Text style={{ color: '#999999', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
          커뮤니티는 회원권 보유 회원만{'\n'}이용할 수 있습니다.
        </Text>
      </SafeAreaView>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => p(i));
  const minutes = ['00', '10', '20', '30', '40', '50'];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isTodaySelected = !form.date || form.date === getToday();

  return (
    <SafeAreaView style={s.bg} edges={[]}>
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <TextInput style={s.searchInput} placeholder="제목 / 내용 / 작성자 / 지역 검색" placeholderTextColor="#666" value={searchKeyword} onChangeText={setSearchKeyword} onSubmitEditing={searchPosts} returnKeyType="search" />
          {searchKeyword.length > 0 && <TouchableOpacity onPress={clearSearch}><Text style={s.clearText}>✕</Text></TouchableOpacity>}
        </View>
        <TouchableOpacity style={s.searchBtn} onPress={searchPosts}><Text style={s.searchBtnText}>검색</Text></TouchableOpacity>
      </View>

      {isSearching && (
        <View style={s.alertBar}>
          <Text style={s.alertBlue}>"{searchKeyword}" 검색 결과</Text>
          <TouchableOpacity onPress={clearSearch}><Text style={s.clearBtn}>초기화 ✕</Text></TouchableOpacity>
        </View>
      )}

      <View style={s.tabRow}>
        {['전체', '센터', '아웃도어'].map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, selectedTab === tab && s.tabActive]} onPress={() => setSelectedTab(tab)}>
            <Text style={[s.tabText, selectedTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentFilter !== 'ALL' && (
        <View style={s.filterBar}>
          <Text style={s.alertGreen}>{currentFilter === 'MY_WRITTEN' ? '내가 쓴 게시글' : '내가 참여한 게시글'}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({ filter: 'ALL' })}><Text style={s.clearBtn}>초기화 ✕</Text></TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}>
        {filteredPosts.map(post => {
          const isOut = post.type === '아웃도어';
          const isPast = post.isPast;
          return (
            <TouchableOpacity key={post.id} style={[s.card, isPast && s.cardPast]} activeOpacity={isPast ? 1 : 0.95} disabled={isPostLoading} onPress={() => openPostDetail(post)}>
              <View style={s.cardHeader}>
                <View style={[s.badge, { backgroundColor: isPast ? '#333' : (isOut ? '#00810F' : '#0072B9') }]}>
                  <Text style={[s.badgeText, { color: isPast ? '#888' : (isOut ? '#2CDE00' : '#009DFF') }]}>{post.type}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={s.statsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                      <Image source={require('../assets/Eye.png')} style={{ width: 17, height: 17, tintColor: '#999', marginRight: 4 }} />
                      <Text style={s.stat}>{post.viewCount}</Text>
                    </View>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 5, marginRight: 8 }} onPress={() => toggleLike(post.id, post.isLiked)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={[{ fontSize: 20, color: '#999', marginRight: 4, marginTop: -2, marginLeft: -20 }, post.isLiked && { color: '#FF4D4D' }]}>{post.isLiked ? '♥' : '♡'}</Text>
                      <Text style={[s.stat, { marginRight: 0 }]}>{post.likeCount}</Text>
                    </TouchableOpacity>
                    <Text style={s.dateText}>{post.postDate}</Text>
                  </View>
                  {post.isMine && !isPast && (
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      <TouchableOpacity style={s.closeBtnAction} onPress={() => setCloseTarget(post.id)}><Text style={s.closeTextAction}>마감</Text></TouchableOpacity>
                      <TouchableOpacity style={s.editBtn} onPress={() => openEditModal(post)}><Text style={s.editText}>수정</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <Text style={[s.title, isPast && { color: '#888' }]}>{post.title}</Text>
              <Text style={[s.desc, isPast && { color: '#666' }]}>{post.desc}</Text>

              <View style={s.infoRow}>
                {([['point.png', post.location], ['DATE.png', post.date], ['people.png', post.people]] as [string, string][]).map(([img, val], i) => (
                  <View key={i} style={s.infoItem}>
                    <Image source={img === 'point.png' ? require('../assets/point.png') : img === 'DATE.png' ? require('../assets/DATE.png') : require('../assets/people.png')} style={s.infoIcon} />
                    <Text style={s.infoText}>{val}</Text>
                  </View>
                ))}
              </View>

              <View style={s.divider} />
              <View style={s.footer}>
                <TouchableOpacity style={s.profileRow} onPress={() => openDetailModal(post.writerId, post.author, post.isMine)}>
                  {/* ✅ ProfileImg로 교체 */}
                  <ProfileImg uri={post.profileImageUrl} style={[s.avatar, isPast && { opacity: 0.5 }]} />
                  <Text style={[s.author, isPast && { color: '#666' }]}>{post.author}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity style={{ marginRight: post.isMine ? 11 : 15 }} disabled={isPostLoading} onPress={() => openPostDetail(post)}>
                    <Image source={require('../assets/ChatText.png')} style={{ width: 22, height: 22, tintColor: isPast ? '#555' : '#ffffff' }} />
                  </TouchableOpacity>

                  {!post.isMine && (
                    isPast ? <View style={[s.joinBtn, s.cancelBtn]}><Text style={[s.joinText, s.cancelText]}>마감됨</Text></View>
                    : <TouchableOpacity style={[s.joinBtn, post.isJoined && s.cancelBtn]} onPress={() => toggleJoin(post.id, post.isJoined)}><Text style={[s.joinText, post.isJoined && s.cancelText]}>{post.isJoined ? '취소하기' : '참여하기'}</Text></TouchableOpacity>
                  )}

                  {post.isMine && (
                    <View style={s.myActions}>
                      <TouchableOpacity style={s.trashBtn} onPress={() => setDeleteTarget(post.id)}>
                        <Image source={require('../assets/trash.png')} style={[s.trashIcon, isPast && { tintColor: '#A1BE44' }]} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {filteredPosts.length === 0 && <Text style={s.empty}>등록된 게시글이 없습니다.</Text>}
      </ScrollView>

      {/* FAB: 회원권 없으면 비활성 */}
      <TouchableOpacity
        style={[s.fab, !hasMembership && s.fabDisabled]}
        onPress={openCreateModal}
      >
        <Text style={[s.fabText, !hasMembership && { color: '#888' }]}>+</Text>
      </TouchableOpacity>

      {!isCreateVisible && !isCommentVisible && (
        <>
          <Modal visible={deleteTarget !== null} animationType="fade" transparent onRequestClose={() => setDeleteTarget(null)}>
            <View style={s.overlay}>
              <View style={s.alertBox}>
                <Text style={[s.alertTitle, { color: '#FF4D4D' }]}>삭제 확인!</Text>
                <Text style={s.alertMessage}>게시글을 정말로 삭제하시겠습니까.</Text>
                <View style={s.alertBtns}>
                  <TouchableOpacity style={s.btnYes} onPress={executeDelete}><Text style={s.btnYesText}>예</Text></TouchableOpacity>
                  <TouchableOpacity style={s.btnNo} onPress={() => setDeleteTarget(null)}><Text style={s.btnNoText}>아니오</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={closeTarget !== null} animationType="fade" transparent onRequestClose={() => setCloseTarget(null)}>
            <View style={s.overlay}>
              <View style={s.alertBox}>
                <Text style={[s.alertTitle, { color: '#A1BE44' }]}>마감 확인!</Text>
                <Text style={s.alertMessage}>모집을 정말로 마감하시겠습니까.</Text>
                <View style={s.alertBtns}>
                  <TouchableOpacity style={s.btnYes} onPress={executeClose}><Text style={s.btnYesText}>예</Text></TouchableOpacity>
                  <TouchableOpacity style={s.btnNo} onPress={() => setCloseTarget(null)}><Text style={s.btnNoText}>아니오</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* 댓글 및 상세조회 모달 */}
      <Modal visible={isCommentVisible} transparent animationType="fade" onRequestClose={closeCommentModal}>
        <View style={s.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeCommentModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[s.commentSheet, { height: commentHeightAnim }]}>
              <View style={{ position: 'absolute', bottom: -SCREEN_HEIGHT, left: -20, right: -20, height: SCREEN_HEIGHT, backgroundColor: '#1E1E1E' }} />
              <View {...commentPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={s.handle} />
                <View style={s.sheetHeader}>
                  <Text style={s.sheetTitle}>게시글 보기</Text>
                  <TouchableOpacity onPress={closeCommentModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
                </View>
                <View style={s.hr} />
              </View>
              <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {selectedPost && (
                  <View style={s.postDetailContainer}>
                    <View style={s.cardHeader}>
                      <View style={[s.badge, { backgroundColor: selectedPost.isPast ? '#333' : (selectedPost.type === '아웃도어' ? '#00810F' : '#0072B9') }]}>
                        <Text style={[s.badgeText, { color: selectedPost.isPast ? '#888' : (selectedPost.type === '아웃도어' ? '#2CDE00' : '#009DFF') }]}>{selectedPost.type}</Text>
                      </View>
                      <View style={s.statsRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                          <Image source={require('../assets/Eye.png')} style={{ width: 17, height: 17, tintColor: '#999', marginRight: 4 }} />
                          <Text style={s.stat}>{selectedPost.viewCount}</Text>
                        </View>
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 5, marginRight: 8 }} onPress={() => toggleLike(selectedPost.id, selectedPost.isLiked)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Text style={[{ fontSize: 20, color: '#999', marginRight: 4, marginTop: -2, marginLeft: -20 }, selectedPost.isLiked && { color: '#FF4D4D' }]}>{selectedPost.isLiked ? '♥' : '♡'}</Text>
                          <Text style={[s.stat, { marginRight: 0 }]}>{selectedPost.likeCount}</Text>
                        </TouchableOpacity>
                        <Text style={s.dateText}>{selectedPost.postDate}</Text>
                      </View>
                    </View>
                    <Text style={[s.title, selectedPost.isPast && { color: '#888' }]}>{selectedPost.title}</Text>
                    <Text style={[s.desc, selectedPost.isPast && { color: '#666' }]}>{selectedPost.desc}</Text>
                    <View style={s.infoRow}>
                      <View style={s.infoItem}><Image source={require('../assets/point.png')} style={s.infoIcon} /><Text style={s.infoText}>{selectedPost.location}</Text></View>
                      <View style={s.infoItem}><Image source={require('../assets/DATE.png')} style={s.infoIcon} /><Text style={s.infoText}>{selectedPost.date}</Text></View>
                      <View style={s.infoItem}><Image source={require('../assets/people.png')} style={s.infoIcon} /><Text style={s.infoText}>{selectedPost.people}</Text></View>
                    </View>
                    <View style={[s.divider, { marginBottom: 5 }]} />
                    <Text style={s.commentSectionTitle}>댓글 {comments.length}개</Text>
                  </View>
                )}
                {comments.map((parent) => {
                  const isParentDeleted = parent.content === "삭제된 댓글입니다.";
                  return (
                    <View key={`comment-${parent.id}`}>
                      <View style={s.commentItem}>
                        <TouchableOpacity onPress={() => openDetailModal(parent.writerId, parent.writerName, myUserId === parent.writerId)}>
                          {/* ✅ ProfileImg로 교체 */}
                          <ProfileImg uri={parent.profileImageUrl ?? parent.writerProfileImageUrl} style={s.commentAvatar} />
                        </TouchableOpacity>
                        <View style={s.commentContentArea}>
                          <View style={s.commentHeaderLine}>
                            <TouchableOpacity onPress={() => openDetailModal(parent.writerId, parent.writerName, myUserId === parent.writerId)}><Text style={s.commentAuthorName}>{parent.writerName}</Text></TouchableOpacity>
                            <Text style={s.commentDateText}>{formatCommentDate(parent.createdAt)}</Text>
                          </View>
                          <Text style={[s.commentBodyText, isParentDeleted && { color: '#888' }]}>{parent.content}</Text>
                          {!isParentDeleted && hasMembership && (
                            <TouchableOpacity onPress={() => setReplyingTo({ id: parent.id, name: parent.writerName })}>
                              <Text style={s.commentReplyBtnText}>답글 달기</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                          {myUserId === parent.writerId && !isParentDeleted && (
                            <TouchableOpacity style={s.commentDeletePngBtn} onPress={() => setCommentDeleteTarget(parent.id)}>
                              <Image source={require('../assets/trash.png')} style={s.commentTrashIcon} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {parent.children?.map((child) => {
                        const isChildDeleted = child.content === "삭제된 댓글입니다.";
                        return (
                          <View key={`reply-${child.id}`} style={[s.commentItem, s.childCommentItem]}>
                            <TouchableOpacity onPress={() => openDetailModal(child.writerId, child.writerName, myUserId === child.writerId)}>
                              {/* ✅ ProfileImg로 교체 */}
                              <ProfileImg uri={child.profileImageUrl ?? child.writerProfileImageUrl} style={s.commentAvatar} />
                            </TouchableOpacity>
                            <View style={s.commentContentArea}>
                              <View style={s.commentHeaderLine}>
                                <TouchableOpacity onPress={() => openDetailModal(child.writerId, child.writerName, myUserId === child.writerId)}><Text style={s.commentAuthorName}>{child.writerName}</Text></TouchableOpacity>
                                <Text style={s.commentDateText}>{formatCommentDate(child.createdAt)}</Text>
                              </View>
                              <Text style={[s.commentBodyText, isChildDeleted && { color: '#888' }]}>{child.content}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                              {myUserId === child.writerId && !isChildDeleted && (
                                <TouchableOpacity style={s.commentDeletePngBtn} onPress={() => setCommentDeleteTarget(child.id)}>
                                  <Image source={require('../assets/trash.png')} style={s.commentTrashIcon} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
                {comments.length === 0 && <Text style={s.empty}>등록된 댓글이 없습니다.</Text>}
              </ScrollView>

              <View style={s.commentInputWrapper}>
                {!hasMembership ? (
                  <View style={s.guestCommentBlock}>
                    <Text style={s.guestCommentText}>댓글은 이용권 보유 회원만 작성할 수 있습니다.</Text>
                  </View>
                ) : selectedPost?.isPast ? (
                  <View style={s.guestCommentBlock}>
                    <Text style={s.guestCommentText}>마감된 게시글에는 댓글을 작성할 수 없습니다.</Text>
                  </View>
                ) : (
                  <>
                    {replyingTo && (
                      <View style={s.replyingToIndicator}>
                        <Text style={s.replyingToIndicatorText}>{replyingTo.name}님에게 답글 남기는 중</Text>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}><Text style={s.replyingCancelText}>✕</Text></TouchableOpacity>
                      </View>
                    )}
                    <View style={s.commentInputRow}>
                      {/* ✅ ProfileImg로 교체 */}
                      <ProfileImg uri={myProfileImageUrl} style={s.commentInputAvatar} />
                      <TextInput style={s.commentTextInput} placeholder="댓글을 작성해주세요." placeholderTextColor="#666" value={commentInput} onChangeText={setCommentInput} multiline />
                      <TouchableOpacity onPress={submitComment}><Text style={[s.commentSubmitBtn, commentInput.trim() && { color: '#A1BE44' }]}>등록</Text></TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </Animated.View>
          </KeyboardAvoidingView>

          <Modal visible={commentDeleteTarget !== null} animationType="fade" transparent={true} onRequestClose={() => setCommentDeleteTarget(null)}>
            <View style={s.overlay}>
              <View style={s.alertBox}>
                <Text style={[s.alertTitle, { color: '#FF4D4D' }]}>삭제 확인!</Text>
                <Text style={s.alertMessage}>해당 댓글을 정말로 삭제하시겠습니까.</Text>
                <View style={s.alertBtns}>
                  <TouchableOpacity style={s.btnYes} onPress={executeCommentDelete}><Text style={s.btnYesText}>예</Text></TouchableOpacity>
                  <TouchableOpacity style={s.btnNo} onPress={() => setCommentDeleteTarget(null)}><Text style={s.btnNoText}>아니오</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {isDetailVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <View style={s.modalOverlay}>
                <TouchableWithoutFeedback onPress={closeDetailModal}>
                  <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
                <Animated.View style={[s.sheet, { height: detailHeightAnim, overflow: 'hidden' }]}>
                  <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                    <View style={s.handle} />
                    <View style={s.sheetHeader}>
                      <Text style={s.sheetTitle}>{selectedUser?.isMe ? '내 정보' : '회원 정보'}</Text>
                      <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={s.closeBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={s.hr} />
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                    {selectedUser && (
                      <View>
                        <View style={s.profileCenter}>
                          {/* ✅ ProfileImg로 교체 */}
                          <ProfileImg uri={selectedUser.profileImageUrl} style={s.profileBig} />
                          <Text style={s.profileName}>{selectedUser.name}</Text>
                        </View>
                        <View style={s.infoBox}>
                          {([
                            ['이름', selectedUser.name, ''],
                            ['성별', selectedUser.gender, ''],
                            ['전화번호', selectedUser.phone, ''],
                            ['나이', selectedUser.age, '세'],
                            ['키', selectedUser.height, 'cm'],
                            ['몸무게', selectedUser.weight, 'kg'],
                            ['팔길이', selectedUser.arm, 'cm'],
                            ['암벽화 사이즈', selectedUser.shoe, 'mm'],
                          ] as [string, string, string][])
                            .map(([label, val, unit]) => (
                              <View key={label} style={s.infoRowDetail}>
                                <Text style={s.infoLabel}>{label}</Text>
                                <Text style={s.infoVal}>{val !== '-' ? val + unit : '-'}</Text>
                              </View>
                            ))}
                        </View>
                        <TouchableOpacity style={s.closeFullBtn} onPress={closeDetailModal}>
                          <Text style={s.closeFullText}>닫기</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </Animated.View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* 작성/수정 창 모달 */}
      <Modal visible={isCreateVisible} transparent animationType="fade" onRequestClose={closeCreateModal}>
        <View style={s.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeCreateModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[s.sheet, { height: createHeightAnim, maxHeight: '100%' }]}>
              <View style={{ position: 'absolute', bottom: -SCREEN_HEIGHT, left: -20, right: -20, height: SCREEN_HEIGHT, backgroundColor: '#1E1E1E' }} />
              <View {...createPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={s.handle} />
                <View style={s.sheetHeader}>
                  <Text style={s.sheetTitle}>{isEditMode ? '게시글 수정' : '모집 글 작성'}</Text>
                  <TouchableOpacity onPress={closeCreateModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
                </View>
                <View style={s.hr} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                <TouchableOpacity activeOpacity={1} style={s.formBox}>
                  <Text style={s.label}>카테고리</Text>
                  <View style={s.catRow}>
                    {(['센터', '아웃도어'] as const).map(c => (
                      <TouchableOpacity key={c} style={[s.catBtn, form.category === c && s.catBtnActive]} onPress={() => setForm(f => ({ ...f, category: c }))}>
                        <Text style={[s.catText, form.category === c && s.catTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.innerHr} />
                  <Text style={s.label}>제목</Text>
                  <View style={s.inputWrap}><TextInput style={s.input} placeholder="모집 제목을 작성하세요." placeholderTextColor="#666" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} /></View>
                  <Text style={s.label}>내용</Text>
                  <View style={s.inputWrap}>
                    <TextInput style={[s.input, { minHeight: 45, textAlignVertical: 'top' }]} placeholder="모집 내용을 입력하세요." placeholderTextColor="#666" multiline value={form.desc} onChangeText={v => setForm(f => ({ ...f, desc: v }))} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={s.label}>날짜</Text>
                      <View style={s.pickerInputBox}>
                        <Text style={form.date ? s.pickerTextActive : s.pickerTextPlaceholder}>{form.date || '날짜 선택'}</Text>
                        <TouchableOpacity onPress={openCalendar} style={s.calendarIconBtn}>
                          <Image source={require('../assets/DATE.png')} style={s.dateIcon} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.label}>시간</Text>
                      <TouchableOpacity style={s.pickerInputBox} onPress={openTimePicker}>
                        <Text style={form.time ? s.pickerTextActive : s.pickerTextPlaceholder}>{form.time || '시간 선택'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={s.label}>모집인원</Text>
                  <View style={s.counterRow}>
                    <TouchableOpacity style={s.counterBtn} onPress={() => setForm(f => ({ ...f, people: String(Math.max(2, parseInt(f.people || '2') - 1)) }))}><Text style={s.counterBtnText}>-</Text></TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 15 }}>
                      <TextInput style={s.counterInput} value={form.people} onChangeText={v => setForm(f => ({ ...f, people: v.replace(/\D/g, '') }))} onBlur={() => { const n = parseInt(form.people); setForm(f => ({ ...f, people: String(isNaN(n) || n < 2 ? 2 : n) })); }} keyboardType="numeric" />
                      <Text style={s.counterUnit}>명</Text>
                    </View>
                    <TouchableOpacity style={s.counterBtn} onPress={() => setForm(f => ({ ...f, people: String(parseInt(f.people || '2') + 1) }))}><Text style={s.counterBtnText}>+</Text></TouchableOpacity>
                  </View>
                  {form.category === '아웃도어' && (
                    <><View style={s.innerHr} /><Text style={s.label}>장소정보</Text><View style={s.inputWrap}><TextInput style={s.input} placeholder="위치" placeholderTextColor="#666" value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} /></View></>
                  )}
                  <TouchableOpacity style={s.submitBtn} onPress={() => submitPost(closeCreateModal)}>
                    <Text style={s.submitText}>{isEditMode ? '게시글 수정' : '모집 글 게시'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>

          {isCalendarVisible && (
            <View style={[StyleSheet.absoluteFill, s.calendarOverlay, { zIndex: 1000, elevation: 10 }]}>
              <View style={s.calendarBox}>
                <Text style={s.calendarTitle}>날짜 선택</Text>
                <Calendar
                  current={form.date || getToday()}
                  minDate={getToday()}
                  onDayPress={(day: any) => { setForm(f => ({ ...f, date: day.dateString })); closeCalendar(); }}
                  theme={calendarTheme}
                  markedDates={{ [form.date || getToday()]: { selected: true, selectedColor: '#A1BE44' } }}
                />
                <TouchableOpacity style={s.calendarCloseBtn} onPress={closeCalendar}>
                  <Text style={s.calendarCloseText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isTimePickerVisible && (
            <View style={[StyleSheet.absoluteFill, s.calendarOverlay, { zIndex: 1000, elevation: 10 }]}>
              <View style={s.timePickerBox}>
                <Text style={s.calendarTitle}>시간 선택</Text>
                <View style={s.timePickerCols}>
                  <ScrollView style={s.timeScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {hours.map(h => {
                      const isHourDisabled = isTodaySelected && parseInt(h) < currentHour;
                      return (
                        <TouchableOpacity key={`hour-${h}`} style={[s.timeItem, tempHour === h && s.timeItemActive, isHourDisabled && { opacity: 0.2 }]} onPress={() => !isHourDisabled && setTempHour(h)} disabled={isHourDisabled}>
                          <Text style={[s.timeItemText, tempHour === h && s.timeItemTextActive]}>{h}시</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <View style={s.timeDivider}><Text style={s.timeDividerText}>:</Text></View>
                  <ScrollView style={s.timeScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {minutes.map(m => {
                      const isMinDisabled = isTodaySelected && parseInt(tempHour || String(currentHour)) === currentHour && parseInt(m) < currentMinute;
                      return (
                        <TouchableOpacity key={`min-${m}`} style={[s.timeItem, tempMinute === m && s.timeItemActive, isMinDisabled && { opacity: 0.2 }]} onPress={() => !isMinDisabled && setTempMinute(m)} disabled={isMinDisabled}>
                          <Text style={[s.timeItemText, tempMinute === m && s.timeItemTextActive]}>{m}분</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={s.timeBtnRow}>
                  <TouchableOpacity style={[s.timeConfirmBtn, { backgroundColor: '#333' }]} onPress={closeTimePicker}>
                    <Text style={[s.timeConfirmText, { color: '#fff' }]}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.timeConfirmBtn, { marginLeft: 10 }]} onPress={confirmTimeSelection}>
                    <Text style={s.timeConfirmText}>확인</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {createAlertVisible && (
            <View style={s.innerAlertOverlay}>
              <View style={s.resultModalBox}>
                <Text style={[s.resultModalTitle, { color: '#FF4D4D' }]}>알림!</Text>
                <Text style={s.resultModalMessage}>{createAlertMessage}</Text>
                <TouchableOpacity style={s.resultModalBtn} onPress={() => setCreateAlertVisible(false)}><Text style={s.resultModalBtnText}>확인</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={closeResultModal}>
        <View style={s.resultModalOverlay}>
          <View style={s.resultModalBox}>
            <Text style={[s.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>{resultModalConfig.title}</Text>
            <Text style={s.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={s.resultModalBtn} onPress={closeResultModal}><Text style={s.resultModalBtnText}>확인</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!isCommentVisible && (
        <Modal visible={isDetailVisible} transparent animationType="fade" onRequestClose={closeDetailModal}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback onPress={closeDetailModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
            <Animated.View style={[s.sheet, { height: detailHeightAnim, overflow: 'hidden' }]}>
              <View {...detailPanResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
                <View style={s.handle} />
                <View style={s.sheetHeader}>
                  <Text style={s.sheetTitle}>{selectedUser?.isMe ? '내 정보' : '회원 정보'}</Text>
                  <TouchableOpacity onPress={closeDetailModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
                </View>
                <View style={s.hr} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                {selectedUser && (
                  <View>
                    <View style={s.profileCenter}>
                      {/* ✅ ProfileImg로 교체 */}
                      <ProfileImg uri={selectedUser.profileImageUrl} style={s.profileBig} />
                      <Text style={s.profileName}>{selectedUser.name}</Text>
                    </View>
                    <View style={s.infoBox}>
                      {([
                        ['이름',          selectedUser.name,   ''],
                        ['성별',          selectedUser.gender, ''],
                        ['전화번호',      selectedUser.phone,  ''],
                        ['나이',          selectedUser.age,    '세'],
                        ['키',            selectedUser.height, 'cm'],
                        ['몸무게',        selectedUser.weight, 'kg'],
                        ['팔길이',        selectedUser.arm,    'cm'],
                        ['암벽화 사이즈', selectedUser.shoe,   'mm'],
                      ] as [string, string, string][])
                        .map(([label, val, unit]) => (
                          <View key={label} style={s.infoRowDetail}>
                            <Text style={s.infoLabel}>{label}</Text>
                            <Text style={s.infoVal}>{val !== '-' ? val + unit : '-'}</Text>
                          </View>
                        ))
                      }
                    </View>
                    <TouchableOpacity style={s.closeFullBtn} onPress={closeDetailModal}><Text style={s.closeFullText}>닫기</Text></TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  bg:{flex:1,backgroundColor:'#1A1A1A',paddingHorizontal:20,paddingTop:10},
  searchRow:{flexDirection:'row',marginBottom:12,alignItems:'center'},
  searchBox:{flex:1,backgroundColor:'#262626',borderRadius:10,flexDirection:'row',alignItems:'center',paddingHorizontal:12},
  searchInput:{flex:1,color:'#fff',fontSize:16,paddingVertical:12},
  clearText:{color:'#999',fontSize:18,padding:5},
  searchBtn:{backgroundColor:'#A1BE44',borderRadius:10,paddingHorizontal:16,paddingVertical:10,marginLeft:10},
  searchBtnText:{color:'#000',fontSize:16,fontWeight:'bold'},
  alertBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'rgba(0,114,185,0.1)',paddingHorizontal:16,paddingVertical:10,borderRadius:8,marginBottom:10,borderWidth:1,borderColor:'#0072B9'},
  alertBlue:{color:'#009DFF',fontSize:16,fontWeight:'bold'},
  filterBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'rgba(161,190,68,0.1)',paddingHorizontal:16,paddingVertical:10,borderRadius:8,marginBottom:15,borderWidth:1,borderColor:'#A1BE44'},
  alertGreen:{color:'#A1BE44',fontSize:16,fontWeight:'bold'},
  clearBtn:{color:'#fff',fontSize:14,opacity:0.8},
  tabRow:{flexDirection:'row',backgroundColor:'#3A3A3A',borderRadius:24,padding:4,marginBottom:20},
  tab:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:20},
  tabActive:{backgroundColor:'#1D1D1D'},
  tabText:{color:'#999',fontSize:17,fontWeight:'bold'},
  tabTextActive:{color:'#fff'},
  scroll:{paddingBottom:80},
  empty:{color:'#999',fontSize:16,textAlign:'center',marginTop:30},
  card:{backgroundColor:'#212121',borderColor:'#262626',borderWidth:1.5,borderRadius:16,padding:20,marginBottom:15},
  cardPast:{opacity:0.4,borderColor:'#333'},
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  badge:{paddingHorizontal:14,paddingVertical:6,borderRadius:8},
  badgeText:{fontSize:14,fontWeight:'bold'},
  statsRow:{flexDirection:'row',alignItems:'center'},
  stat:{color:'#999',fontSize:14,fontWeight:'500',marginRight:10},
  dateText:{color:'#999',fontSize:14},
  title:{color:'#fff',fontSize:20,fontWeight:'bold',marginBottom:6},
  desc:{color:'#999',fontSize:16,lineHeight:22,marginBottom:15},
  infoRow:{flexDirection:'row',alignItems:'center',marginBottom:15,flexWrap:'wrap'},
  infoItem:{flexDirection:'row',alignItems:'center',marginRight:10,marginBottom:4,flexShrink:1},
  infoIcon:{width:14,height:14,resizeMode:'contain',marginRight:4,tintColor:'#999'},
  infoText:{color:'#999',fontSize:13,flexShrink:1},
  divider:{height:1,backgroundColor:'#333',marginBottom:15},
  footer:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  profileRow:{flexDirection:'row',alignItems:'center'},
  avatar:{width:36,height:36,borderRadius:18,backgroundColor:'#444',marginRight:10},
  author:{color:'#ccc',fontSize:16,fontWeight:'600'},
  joinBtn:{backgroundColor:'#A1BE44',paddingHorizontal:20,paddingVertical:10,borderRadius:12},
  joinText:{color:'#000',fontSize:16,fontWeight:'bold'},
  cancelBtn:{backgroundColor:'#333'},
  cancelText:{color:'#fff'},
  myActions:{flexDirection:'row',alignItems:'center'},
  closeBtnAction:{backgroundColor:'#333',paddingHorizontal:14,paddingVertical:7,borderRadius:8,marginRight:6},
  closeTextAction:{color:'#fff',fontSize:13,fontWeight:'bold'},
  editBtn:{backgroundColor:'#333',paddingHorizontal:14,paddingVertical:7,borderRadius:8},
  editText:{color:'#A1BE44',fontSize:13,fontWeight:'bold'},
  trashBtn:{padding:6},
  trashIcon:{width:20,height:20,resizeMode:'contain',tintColor:'#A1BE44'},
  fab:{position:'absolute',right:20,bottom:20,width:60,height:60,borderRadius:30,backgroundColor:'#A1BE44',justifyContent:'center',alignItems:'center',elevation:5},
  fabText:{color:'#000',fontSize:36,marginTop:-4},
  fabDisabled:{backgroundColor:'#333'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',alignItems:'center'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'},
  sheet:{backgroundColor:'#1E1E1E',borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20,paddingBottom:40,width:'100%'},
  handle:{width:40,height:4,backgroundColor:'#333',borderRadius:2,marginTop:12,marginBottom:20,alignSelf:'center'},
  sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:15},
  sheetTitle:{color:'#fff',fontSize:23,fontWeight:'bold'},
  closeBtn:{color:'#999',fontSize:28,paddingHorizontal:10},
  hr:{height:1,backgroundColor:'#333',marginBottom:20},
  alertBox:{width:'90%',backgroundColor:'#212121',borderRadius:25,paddingVertical:45,paddingHorizontal:35,alignItems:'center'},
  alertTitle:{fontSize:28,fontWeight:'bold',marginBottom:8},
  alertMessage:{color:'#ffffff',fontSize:18,fontWeight:'bold',textAlign:'center',lineHeight:24,marginBottom:25},
  alertBtns:{flexDirection:'row',width:'100%'},
  btnYes:{flex:1,backgroundColor:'#A1BE44',paddingVertical:16,borderRadius:12,alignItems:'center',marginRight:5},
  btnYesText:{color:'#000000',fontSize:18,fontWeight:'bold'},
  btnNo:{flex:1,backgroundColor:'#262626',paddingVertical:16,borderRadius:12,alignItems:'center',marginLeft:5},
  btnNoText:{color:'#ffffff',fontSize:18,fontWeight:'bold'},
  resultModalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',alignItems:'center'},
  innerAlertOverlay:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',alignItems:'center',zIndex:9999,elevation:9999},
  resultModalBox:{width:'90%',backgroundColor:'#212121',borderRadius:25,paddingVertical:45,paddingHorizontal:35,alignItems:'center'},
  resultModalTitle:{fontSize:28,fontWeight:'bold',marginBottom:8},
  resultModalMessage:{color:'#ffffff',fontSize:18,fontWeight:'bold',marginBottom:25,textAlign:'center',lineHeight:24},
  resultModalBtn:{width:'100%',backgroundColor:'#A1BE44',paddingVertical:16,borderRadius:12,alignItems:'center'},
  resultModalBtnText:{color:'#000000',fontSize:18,fontWeight:'bold'},
  profileCenter:{alignSelf:'center',alignItems:'center',marginBottom:25},
  profileBig:{width:80,height:80,borderRadius:40,backgroundColor:'#444'},
  profileName:{color:'#fff',fontSize:18,fontWeight:'bold',marginTop:12},
  infoBox:{backgroundColor:'#262626',borderRadius:16,padding:20,marginBottom:20},
  infoRowDetail:{flexDirection:'row',justifyContent:'space-between',paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:'#333'},
  infoLabel:{color:'#999',fontSize:17,fontWeight:'bold'},
  infoVal:{color:'#fff',fontSize:17,fontWeight:'bold'},
  closeFullBtn:{width:'100%',backgroundColor:'#A1BE44',borderRadius:12,paddingVertical:16,alignItems:'center'},
  closeFullText:{color:'#000',fontSize:18,fontWeight:'bold'},
  formBox:{backgroundColor:'#262626',borderWidth:1,borderColor:'#555',borderRadius:16,padding:20,marginTop:5},
  label:{color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:10},
  innerHr:{height:1,backgroundColor:'#444',marginVertical:15},
  catRow:{flexDirection:'row',justifyContent:'space-between'},
  catBtn:{flex:1,borderWidth:1,borderColor:'#555',borderRadius:10,paddingVertical:12,alignItems:'center',marginHorizontal:4},
  catBtnActive:{borderColor:'#A1BE44'},
  catText:{color:'#999',fontSize:16,fontWeight:'bold'},
  catTextActive:{color:'#A1BE44'},
  inputWrap:{backgroundColor:'#000',borderRadius:10,paddingHorizontal:15,paddingVertical:12,marginBottom:15},
  input:{color:'#fff',fontSize:17,padding:0},
  counterRow:{flexDirection:'row',alignItems:'center',marginBottom:5},
  counterBtn:{width:45,height:45,backgroundColor:'#333',borderRadius:22.5,alignItems:'center',justifyContent:'center'},
  counterBtnText:{color:'#fff',fontSize:24,fontWeight:'bold'},
  counterInput:{color:'#fff',fontSize:24,fontWeight:'bold',textAlign:'center',minWidth:20,padding:0},
  counterUnit:{color:'#999',fontSize:18,fontWeight:'bold',marginLeft:2},
  submitBtn:{width:'100%',backgroundColor:'#A1BE44',borderRadius:12,paddingVertical:16,alignItems:'center',marginTop:20},
  submitText:{color:'#000',fontSize:18,fontWeight:'bold'},
  commentSheet:{backgroundColor:'#1E1E1E',borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20,paddingBottom:Platform.OS==='ios'?30:20,width:'100%'},
  postDetailContainer:{paddingBottom:10,paddingTop:10},
  commentSectionTitle:{color:'#A1BE44',fontSize:16,fontWeight:'bold',marginBottom:10},
  commentItem:{flexDirection:'row',paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:'#333'},
  childCommentItem:{marginLeft:45,borderLeftWidth:1.5,borderLeftColor:'#444',paddingLeft:12},
  commentAvatar:{width:36,height:36,borderRadius:18,backgroundColor:'#444',marginRight:12},
  commentContentArea:{flex:1,justifyContent:'center'},
  commentHeaderLine:{flexDirection:'row',alignItems:'center',marginBottom:4},
  commentAuthorName:{color:'#ffffff',fontSize:14,fontWeight:'bold',marginRight:8},
  commentDateText:{color:'#999999',fontSize:13},
  commentBodyText:{color:'#ffffff',fontSize:16,lineHeight:22,marginBottom:6},
  commentReplyBtnText:{color:'#888888',fontSize:13,fontWeight:'bold'},
  commentDeletePngBtn:{padding:4,marginTop:4},
  commentTrashIcon:{width:18,height:18,resizeMode:'contain',tintColor:'#FF0000'},
  commentInputWrapper:{borderTopWidth:1,borderTopColor:'#333',paddingTop:12,backgroundColor:'#1E1E1E'},
  guestCommentBlock:{paddingVertical:14,alignItems:'center',justifyContent:'center'},
  guestCommentText:{color:'#666',fontSize:15,fontWeight:'bold'},
  replyingToIndicator:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#2A2A2A',paddingHorizontal:15,paddingVertical:8,borderRadius:8,marginBottom:10},
  replyingToIndicatorText:{color:'#A1BE44',fontSize:13,fontWeight:'bold'},
  replyingCancelText:{color:'#999',fontSize:16,fontWeight:'bold'},
  commentInputRow:{flexDirection:'row',alignItems:'center'},
  commentInputAvatar:{width:36,height:36,borderRadius:18,backgroundColor:'#444',marginRight:10},
  commentTextInput:{flex:1,backgroundColor:'#000000',color:'#ffffff',fontSize:15,borderRadius:20,paddingHorizontal:16,paddingVertical:10,minHeight:40,maxHeight:100},
  commentSubmitBtn:{color:'#666666',fontSize:16,fontWeight:'bold',marginLeft:12,paddingVertical:10},
  pickerInputBox:{height:50,backgroundColor:'#000',borderRadius:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:15,paddingRight:8,borderWidth:1,borderColor:'#333'},
  pickerTextActive:{color:'#fff',fontSize:16},
  pickerTextPlaceholder:{color:'#666',fontSize:16},
  calendarIconBtn:{padding:5},
  dateIcon:{width:22,height:22,tintColor:'#A1BE44'},
  calendarOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',alignItems:'center'},
  calendarBox:{width:'90%',backgroundColor:'#212121',borderRadius:16,padding:15},
  calendarTitle:{color:'#fff',fontSize:18,fontWeight:'bold',textAlign:'center',marginBottom:10},
  calendarCloseBtn:{marginTop:15,paddingVertical:14,backgroundColor:'#333',borderRadius:10,alignItems:'center'},
  calendarCloseText:{color:'#fff',fontSize:18,fontWeight:'bold'},
  timePickerBox:{width:'80%',backgroundColor:'#212121',borderRadius:16,padding:20,alignItems:'center'},
  timePickerCols:{flexDirection:'row',height:200,width:'100%',justifyContent:'center',alignItems:'center'},
  timeScroll:{flex:1,backgroundColor:'#1A1A1A',borderRadius:10,marginHorizontal:5},
  timeDivider:{width:20,alignItems:'center',justifyContent:'center'},
  timeDividerText:{color:'#fff',fontSize:24,fontWeight:'bold'},
  timeItem:{paddingVertical:12,alignItems:'center',borderBottomWidth:1,borderBottomColor:'#262626'},
  timeItemActive:{backgroundColor:'rgba(161, 190, 68, 0.2)'},
  timeItemText:{color:'#999',fontSize:18},
  timeItemTextActive:{color:'#A1BE44',fontWeight:'bold'},
  timeBtnRow:{flexDirection:'row',marginTop:20,width:'100%'},
  timeConfirmBtn:{flex:1,backgroundColor:'#A1BE44',paddingVertical:14,borderRadius:10,alignItems:'center'},
  timeConfirmText:{color:'#000',fontSize:18,fontWeight:'bold'},
});

export default CommunityScreen;