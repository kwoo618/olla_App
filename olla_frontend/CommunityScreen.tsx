import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, TextInput } from 'react-native';

const CommunityScreen = ({ myProfile, myToggles }: any) => {
  const [selectedTab, setSelectedTab] = useState('전체');
  const tabs = ['전체', '센터', '아웃도어'];

  // 💡 기존 더미 데이터에 isJoined(내 참여 여부) 상태를 추가했습니다.
  const [posts, setPosts] = useState([
    { 
      id: 1, 
      type: '센터', 
      title: '주말 클라이밍 같이 하실 분!', 
      desc: '이번 주 토요일 오후에 센터에서 같이 클라이밍 하실 분 구합니다.', 
      location: 'olla 클라이밍 센터', 
      date: '2026-03-28', 
      people: '2/4명', 
      postDate: '2026.03.24', 
      author: myProfile?.name || '권클라이밍',
      isMine: true,
      isJoined: false
    },
    { 
      id: 2, 
      type: '아웃도어', 
      title: '북한산 암벽 등반 모집', 
      desc: '봄 맞이 북한산 암벽등반 가실 분 모집합니다.', 
      location: '북한산 인수봉', 
      date: '2026-04-05', 
      people: '4/6명', 
      postDate: '2026.03.31', 
      author: '최강우',
      isMine: false,
      isJoined: false // 💡 참여 여부 기본값
    }
  ]);

  const filteredPosts = posts.filter(post => selectedTab === '전체' || post.type === selectedTab);

  // 삭제 팝업 로직
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const confirmDelete = (id: number) => { setItemToDelete(id); setDeleteModalVisible(true); };
  const executeDelete = () => {
    if (itemToDelete !== null) setPosts(posts.filter(post => post.id !== itemToDelete));
    setDeleteModalVisible(false); setItemToDelete(null);
  };
  const cancelDelete = () => { setDeleteModalVisible(false); setItemToDelete(null); };

  // 프로필 보기 팝업 로직
  const [isDetailVisible, setDetailVisible] = useState(false);
  const detailSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const openDetailModal = (userType: 'me' | 'dummy') => {
    if (userType === 'me') {
      setSelectedUser({
        name: myProfile?.name || '권클라이밍', phone: myProfile?.phone, age: myProfile?.age, height: myProfile?.height,
        weight: myProfile?.weight, arm: myProfile?.arm, shoe: myProfile?.shoe, toggles: myToggles || {}, isMe: true
      });
    } else {
      setSelectedUser({
        name: '최강우', phone: '010-0000-0000', age: '25', height: '180', weight: '75', arm: '185', shoe: '275',
        toggles: { showName: true, showAge: true, showPhone: false, showHeight: false, showWeight: false, showArm: false, showShoe: false }, isMe: false
      });
    }
    setDetailVisible(true);
    setTimeout(() => { Animated.timing(detailSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
  };
  const closeDetailModal = () => {
    Animated.timing(detailSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { setDetailVisible(false); setSelectedUser(null); });
  };
  const renderDetailRow = (label: string, value: string, isVisible: boolean, unit: string = '') => {
    if (!isVisible) return null;
    return (<View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}{unit}</Text></View>);
  };

  // 모집 글 작성 팝업 State
  const [isCreateVisible, setCreateVisible] = useState(false);
  const createSlideAnim = useRef(new Animated.Value(800)).current;

  const [createCategory, setCreateCategory] = useState<'센터' | '아웃도어'>('센터');
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createTime, setCreateTime] = useState('');
  const [createPeople, setCreatePeople] = useState('2');
  const [createLocation, setCreateLocation] = useState('');

  const openCreateModal = () => {
    setCreateVisible(true);
    setTimeout(() => { Animated.timing(createSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);
  };

  const closeCreateModal = () => {
    Animated.timing(createSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => {
      setCreateVisible(false);
      setCreateCategory('센터'); setCreateTitle(''); setCreateDesc('');
      setCreateDate(''); setCreateTime(''); setCreatePeople('2'); setCreateLocation('');
    });
  };

  const handleDateChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, ''); 
    let formatted = numeric;
    if (numeric.length > 4 && numeric.length <= 6) {
      formatted = `${numeric.slice(0, 4)}/${numeric.slice(4)}`;
    } else if (numeric.length > 6) {
      formatted = `${numeric.slice(0, 4)}/${numeric.slice(4, 6)}/${numeric.slice(6, 8)}`;
    }
    setCreateDate(formatted);
  };

  const handleTimeChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, ''); 
    let formatted = numeric;
    if (numeric.length > 2) {
      formatted = `${numeric.slice(0, 2)}:${numeric.slice(2, 4)}`;
    }
    setCreateTime(formatted);
  };

  const handlePeopleChange = (text: string) => {
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) setCreatePeople('');
    else setCreatePeople(String(num));
  };
  const handlePeopleBlur = () => {
    const num = parseInt(createPeople, 10);
    if (isNaN(num) || num < 2) setCreatePeople('2');
  };
  const adjustPeople = (amount: number) => {
    let num = parseInt(createPeople, 10);
    if (isNaN(num)) num = 2;
    setCreatePeople(String(Math.max(2, num + amount)));
  };

  const submitNewPost = () => {
    const today = new Date();
    const formattedToday = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    
    const finalDate = createDate.replace(/\//g, '-') || '날짜 미정';

    const newPost = {
      id: Date.now(),
      type: createCategory,
      title: createTitle || '새로운 모집글',
      desc: createDesc || '모집 내용이 없습니다.',
      location: createCategory === '센터' ? 'olla 클라이밍 센터' : (createLocation || '장소 미정'),
      date: finalDate,
      people: `1/${createPeople}명`, 
      postDate: formattedToday,
      author: myProfile?.name || '권클라이밍',
      isMine: true,
      isJoined: false 
    };

    setPosts([newPost, ...posts]);
    closeCreateModal();
  };

  // ==========================================
  // 💡 참여하기 / 취소하기 토글 함수
  // ==========================================
  const toggleJoin = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        // "4/6명" 같은 문자열에서 현재 인원(current)과 최대 인원(max)을 숫자로 뽑아냅니다.
        const [currStr, maxStr] = post.people.replace('명', '').split('/');
        let current = parseInt(currStr, 10);
        const max = parseInt(maxStr, 10);

        if (post.isJoined) {
          // 이미 참여 중이면 취소 처리 (인원 -1)
          current = Math.max(0, current - 1);
          return { ...post, people: `${current}/${max}명`, isJoined: false };
        } else {
          // 미참여 상태일 때 최대 인원보다 적으면 참여 (인원 +1)
          if (current < max) {
            current += 1;
            return { ...post, people: `${current}/${max}명`, isJoined: true };
          } else {
            // 만약 이미 꽉 찼다면 그냥 리턴 (나중에 꽉 찼다는 알림을 띄워도 됩니다)
            return post;
          }
        }
      }
      return post;
    }));
  };

  return (
    <View style={styles.background}>
      
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
            onPress={() => setSelectedTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} scrollEventThrottle={16} decelerationRate="normal">
        {filteredPosts.map((post) => {
          const isOutdoor = post.type === '아웃도어';
          const badgeBgColor = isOutdoor ? '#00810F' : '#0072B9';
          const badgeTextColor = isOutdoor ? '#2CDE00' : '#009DFF';

          return (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: badgeBgColor }]}><Text style={[styles.badgeText, { color: badgeTextColor }]}>{post.type}</Text></View>
                <Text style={styles.postDateText}>{post.postDate}</Text>
              </View>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postDesc}>{post.desc}</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoItemGroup}>
                  <View style={styles.infoItem}><Image source={require('./assets/point.png')} style={styles.infoIcon} /><Text style={styles.infoText} numberOfLines={1}>{post.location}</Text></View>
                  <View style={styles.infoItem}><Image source={require('./assets/DATE.png')} style={styles.infoIcon} /><Text style={styles.infoText}>{post.date}</Text></View>
                  <View style={styles.infoItem}><Image source={require('./assets/people.png')} style={styles.infoIcon} /><Text style={styles.infoText}>{post.people}</Text></View>
                </View>
                
                {post.isMine && (
                  <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(post.id)}>
                    <Image source={require('./assets/trash.png')} style={styles.trashIcon} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.divider} />
              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.profileRow} onPress={() => openDetailModal(post.isMine ? 'me' : 'dummy')}>
                  {post.author === '최강우' ? (
                    <View style={styles.textProfileImg}><Text style={styles.textProfileText}>최</Text></View>
                  ) : (
                    <Image source={require('./assets/profile.png')} style={styles.profileImg} defaultSource={undefined} />
                  )}
                  <Text style={styles.authorText}>{post.author}</Text>
                </TouchableOpacity>

                {/* 💡 내가 쓴 글이 아닐 때 '참여하기 / 취소하기' 버튼 토글 */}
                {!post.isMine && (
                  <TouchableOpacity 
                    style={[styles.joinButton, post.isJoined && styles.cancelButton]} 
                    activeOpacity={0.8}
                    onPress={() => toggleJoin(post.id)}
                  >
                    <Text style={[styles.joinButtonText, post.isJoined && styles.cancelButtonText]}>
                      {post.isJoined ? '취소하기' : '참여하기'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openCreateModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true} onRequestClose={cancelDelete}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalText}>삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteBtnYes} onPress={executeDelete}><Text style={styles.deleteBtnYesText}>예</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtnNo} onPress={cancelDelete}><Text style={styles.deleteBtnNoText}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isDetailVisible} transparent={true} animationType="fade" onRequestClose={closeDetailModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeDetailModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: detailSlideAnim }] }]}>
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>회원 정보 확인</Text><TouchableOpacity onPress={closeDetailModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity></View>
              <View style={styles.horizontalDivider} />
              {selectedUser && (
                <View style={styles.detailContainer}>
                  <View style={styles.detailProfileWrapper}>
                    {selectedUser.name === '최강우' ? (
                       <View style={[styles.textProfileImg, { width: 80, height: 80, borderRadius: 40 }]}><Text style={[styles.textProfileText, { fontSize: 28 }]}>최</Text></View>
                    ) : (
                       <Image source={require('./assets/profile.png')} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#444444' }} />
                    )}
                  </View>
                  <View style={styles.detailInfoBox}>
                    {renderDetailRow('이름', selectedUser.name, selectedUser.toggles.showName)}
                    {renderDetailRow('전화번호', selectedUser.phone, selectedUser.toggles.showPhone)}
                    {renderDetailRow('나이', selectedUser.age, selectedUser.toggles.showAge, '세')}
                    {renderDetailRow('키', selectedUser.height, selectedUser.toggles.showHeight, 'cm')}
                    {renderDetailRow('몸무게', selectedUser.weight, selectedUser.toggles.showWeight, 'kg')}
                    {renderDetailRow('팔길이', selectedUser.arm, selectedUser.toggles.showArm, 'cm')}
                    {renderDetailRow('암벽화 사이즈', selectedUser.shoe, selectedUser.toggles.showShoe, 'mm')}
                  </View>
                  <TouchableOpacity style={styles.closeFullBtn} onPress={closeDetailModal}><Text style={styles.closeFullBtnText}>닫기</Text></TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isCreateVisible} transparent={true} animationType="fade" onRequestClose={closeCreateModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeCreateModal}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: createSlideAnim }], maxHeight: '90%' }]}>
            
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>모집 글 작성</Text>
                <TouchableOpacity onPress={closeCreateModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
              <TouchableOpacity activeOpacity={1} style={styles.createFormBox}>
                
                <Text style={styles.createLabel}>카테고리</Text>
                <View style={styles.createCategoryRow}>
                  <TouchableOpacity style={[styles.categoryBtn, createCategory === '센터' && styles.categoryBtnActive]} onPress={() => setCreateCategory('센터')}>
                    <Text style={[styles.categoryBtnText, createCategory === '센터' && styles.categoryBtnTextActive]}>센터</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.categoryBtn, createCategory === '아웃도어' && styles.categoryBtnActive]} onPress={() => setCreateCategory('아웃도어')}>
                    <Text style={[styles.categoryBtnText, createCategory === '아웃도어' && styles.categoryBtnTextActive]}>아웃도어</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.innerDivider} />

                <Text style={styles.createLabel}>제목</Text>
                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={styles.inputBox} 
                    placeholder="모집 제목을 작성하세요." 
                    placeholderTextColor="#666666" 
                    value={createTitle} 
                    onChangeText={setCreateTitle} 
                  />
                </View>

                <Text style={styles.createLabel}>내용</Text>
                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={[styles.inputBox, { minHeight: 45, textAlignVertical: 'top' }]} 
                    placeholder="모집 내용을 입력하세요." 
                    placeholderTextColor="#666666" 
                    multiline={true} 
                    value={createDesc} 
                    onChangeText={setCreateDesc} 
                  />
                </View>

                <View style={styles.rowWrapper}>
                  <View style={styles.halfField}>
                    <Text style={styles.createLabel}>날짜</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput 
                        style={styles.inputBox} 
                        placeholder="YYYY/MM/DD" 
                        placeholderTextColor="#666666" 
                        value={createDate} 
                        onChangeText={handleDateChange} 
                        keyboardType="numeric" 
                        maxLength={10} 
                      />
                    </View>
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.createLabel}>시간</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput 
                        style={styles.inputBox} 
                        placeholder="00:00" 
                        placeholderTextColor="#666666" 
                        value={createTime} 
                        onChangeText={handleTimeChange} 
                        keyboardType="numeric" 
                        maxLength={5} 
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.createLabel}>모집인원</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => adjustPeople(-1)}>
                    <Text style={styles.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.counterInputWrapper}>
                    <TextInput 
                      style={styles.counterInput} 
                      value={createPeople} 
                      onChangeText={handlePeopleChange} 
                      onBlur={handlePeopleBlur}
                      keyboardType="numeric" 
                    />
                    <Text style={styles.counterUnit}>명</Text>
                  </View>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => adjustPeople(1)}>
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {createCategory === '아웃도어' && (
                  <>
                    <View style={styles.innerDivider} />
                    <Text style={styles.createLabel}>장소정보</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput 
                        style={styles.inputBox} 
                        placeholder="위치" 
                        placeholderTextColor="#666666" 
                        value={createLocation} 
                        onChangeText={setCreateLocation} 
                      />
                    </View>
                  </>
                )}

                <TouchableOpacity style={styles.submitBtn} onPress={submitNewPost}>
                  <Text style={styles.submitBtnText}>모집 글 게시</Text>
                </TouchableOpacity>

              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#3A3A3A', borderRadius: 24, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  activeTabButton: { backgroundColor: '#1D1D1D' },
  tabText: { color: '#999999', fontSize: 15, fontWeight: 'bold' },
  activeTabText: { color: '#ffffff' },
  scrollContent: { paddingBottom: 80 },

  postCard: { backgroundColor: '#212121', borderColor: '#262626', borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  postDateText: { color: '#999999', fontSize: 12 },
  postTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  postDesc: { color: '#999999', fontSize: 14, lineHeight: 20, marginBottom: 15 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  infoItemGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  infoIcon: { width: 14, height: 14, resizeMode: 'contain', marginRight: 4, tintColor: '#999999' },
  infoText: { color: '#999999', fontSize: 12 },
  trashBtn: { padding: 4, marginLeft: 5 },
  trashIcon: { width: 18, height: 18, resizeMode: 'contain', tintColor: '#A1BE44' },
  
  divider: { height: 1, backgroundColor: '#333333', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileImg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#444444', marginRight: 10 },
  textProfileImg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#444444', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  textProfileText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  authorText: { color: '#cccccc', fontSize: 14, fontWeight: '600' },
  
  // 💡 버튼 스타일 추가 (참여 / 취소)
  joinButton: { backgroundColor: '#A1BE44', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  joinButtonText: { color: '#000000', fontSize: 14, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#333333' }, // 취소하기 버튼 배경 (어두운 회색)
  cancelButtonText: { color: '#ffffff' }, // 취소하기 버튼 글씨 (흰색)
  
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#000000', fontSize: 32, marginTop: -4 },

  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  deleteModalText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 25 },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  deleteBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  deleteBtnYesText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  deleteBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  deleteBtnNoText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, width: '100%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeBtn: { color: '#999999', fontSize: 24, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  detailContainer: { width: '100%' },
  detailProfileWrapper: { alignSelf: 'center', marginBottom: 25 },
  detailInfoBox: { backgroundColor: '#262626', borderRadius: 16, padding: 20, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#333333' },
  detailLabel: { color: '#999999', fontSize: 15, fontWeight: 'bold' },
  detailValue: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  closeFullBtn: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  closeFullBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },

  createFormBox: { backgroundColor: '#262626', borderWidth: 1, borderColor: '#555555', borderRadius: 16, padding: 20, marginTop: 5 },
  createLabel: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  innerDivider: { height: 1, backgroundColor: '#444444', marginVertical: 15 },
  
  createCategoryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryBtn: { flex: 1, borderWidth: 1, borderColor: '#555555', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginHorizontal: 4 },
  categoryBtnActive: { borderColor: '#A1BE44' }, 
  categoryBtnText: { color: '#999999', fontSize: 14, fontWeight: 'bold' },
  categoryBtnTextActive: { color: '#A1BE44' }, 

  inputWrapper: { backgroundColor: '#000000', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15 },
  inputBox: { color: '#ffffff', fontSize: 15, padding: 0 },
  
  rowWrapper: { flexDirection: 'row', justifyContent: 'space-between' },
  halfField: { flex: 1, marginRight: 8 },

  counterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  counterBtn: { width: 40, height: 40, backgroundColor: '#333333', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  counterInputWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15 },
  counterInput: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', minWidth: 20, padding: 0 },
  counterUnit: { color: '#999999', fontSize: 16, fontWeight: 'bold', marginLeft: 2 },

  submitBtn: { width: '100%', backgroundColor: '#A1BE44', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
});

export default CommunityScreen;