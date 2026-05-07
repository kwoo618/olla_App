import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, TextInput, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const POST_API_URL = 'http://192.168.0.23:8080/api/vi/posts'; // 게시글 조회/작성/삭제 (vi)
const PARTICIPANT_API_URL = 'http://192.168.0.23:8080/api/v1/posts'; // 참가/취소 (v1)
const MEMBER_API_URL = 'http://192.168.0.23:8080/api/v1/members'; // 멤버 정보

const CommunityScreen = ({ myProfile, myToggles }: any) => {
  const [selectedTab, setSelectedTab] = useState('전체');
  const tabs = ['전체', '센터', '아웃도어'];

  const [posts, setPosts] = useState<any[]>([]);
  const [myNickname, setMyNickname] = useState('');

  // 1. 초기 데이터 로드 (내 닉네임을 확실히 가져온 뒤 게시글 호출)
  useEffect(() => {
    const initData = async () => {
      let currentNickname = '';
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const profileRes = await axios.get(`${MEMBER_API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const pData = profileRes.data?.data || profileRes.data;
          currentNickname = pData.nickname || pData.name || '';
          setMyNickname(currentNickname); 
        }
      } catch (error: any) {
        console.error("초기 데이터 로드 실패 (내 프로필):", error?.response?.data || error);
      } finally {
        fetchPosts(currentNickname);
      }
    };
    initData();
  }, []);

  // 2. 게시글 목록 불러오기
  const fetchPosts = async (nicknameToUse = myNickname) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(POST_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const rawList = response.data?.data?.content || response.data?.data || response.data || [];
      if (!Array.isArray(rawList)) return;

      const mappedPosts = rawList.map((item: any) => {
        // 날짜 포맷팅 안전 처리
        const meetDate = new Date(item.meetDateTime);
        const formattedMeetDate = isNaN(meetDate.getTime()) 
          ? item.meetDateTime 
          : `${meetDate.getFullYear()}-${String(meetDate.getMonth() + 1).padStart(2, '0')}-${String(meetDate.getDate()).padStart(2, '0')} ${String(meetDate.getHours()).padStart(2, '0')}:${String(meetDate.getMinutes()).padStart(2, '0')}`;
        
        const createdDate = new Date(item.createdAt);
        const formattedCreated = isNaN(createdDate.getTime()) 
          ? item.createdAt 
          : `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')}`;

        // 🚨 [핵심 수정 부분] 참여 여부 판단 조건 대폭 강화
        // 백엔드에서 내려주는 필드명이 다를 수 있으므로 여러 가능성을 모두 체크합니다.
        const isJoined = 
          item.isParticipant === true || 
          item.isParticipated === true || 
          item.participated === true || 
          (Array.isArray(item.participants) && item.participants.some((p: any) => 
            typeof p === 'string' ? p === nicknameToUse : (p?.name === nicknameToUse || p?.nickname === nicknameToUse || p?.memberName === nicknameToUse)
          )) || false;

        return {
          id: item.id,
          type: item.differentGym ? '아웃도어' : '센터',
          title: item.title,
          desc: item.content,
          location: item.differentGym ? (item.gymPlace || '장소 미정') : 'olla 클라이밍 센터',
          date: formattedMeetDate,
          people: `${item.memberCount || item.participants?.length || 1}/${item.maxMember}명`,
          postDate: formattedCreated,
          author: item.writerName,
          isMine: item.writerName === nicknameToUse, 
          isJoined: isJoined
        };
      });

      // 최신순 정렬
      setPosts(mappedPosts.sort((a: any, b: any) => b.id - a.id));
    } catch (error: any) {
      console.error("게시글 목록 로드 실패:", error?.response?.data || error.message);
      if (error?.response?.status === 500) {
        Alert.alert("서버 오류", "게시글 목록을 불러오는 중 서버 내부 오류가 발생했습니다.");
      }
    }
  };

  const filteredPosts = posts.filter(post => selectedTab === '전체' || post.type === selectedTab);

  // ==========================================
  // 💡 게시글 삭제 로직
  // ==========================================
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const confirmDelete = (id: number) => { setItemToDelete(id); setDeleteModalVisible(true); };
  
  const executeDelete = async () => {
    if (itemToDelete !== null) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        await axios.delete(`${POST_API_URL}/${itemToDelete}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert("알림", "게시글이 성공적으로 삭제되었습니다.");
        fetchPosts(); 
      } catch (error: any) {
        console.error("게시글 삭제 실패:", error?.response?.data || error.message);
        Alert.alert("삭제 실패", error.response?.data?.message || "게시글을 삭제할 수 없습니다.");
      }
    }
    setDeleteModalVisible(false); 
    setItemToDelete(null);
  };
  const cancelDelete = () => { setDeleteModalVisible(false); setItemToDelete(null); };

  // ==========================================
  // 💡 프로필 보기 팝업 로직 
  // ==========================================
  const [isDetailVisible, setDetailVisible] = useState(false);
  const detailSlideAnim = useRef(new Animated.Value(800)).current;
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const openDetailModal = async (authorName: string, isMine: boolean) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${MEMBER_API_URL}/profile?nickname=${encodeURIComponent(authorName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = res.data?.data || res.data;

      setSelectedUser({
        name: userData.nickname || userData.name || authorName, 
        phone: userData.phone || '-', 
        age: userData.age || '-', 
        height: userData.height || '-',
        weight: userData.weight || '-', 
        arm: userData.armSpan || '-', 
        shoe: userData.footSize || '-',
        toggles: userData.privacy || { showName: true, showAge: true, showPhone: true, showHeight: true, showWeight: true, showArm: true, showShoe: true },
        isMe: isMine
      });

      setDetailVisible(true);
      setTimeout(() => { Animated.timing(detailSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, 50);

    } catch (error: any) {
      console.error("회원 프로필 조회 실패:", error?.response?.data || error.message);
      Alert.alert("프로필 조회 불가", "해당 사용자의 프로필 정보를 불러올 수 없습니다.");
    }
  };
  
  const closeDetailModal = () => {
    Animated.timing(detailSlideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { setDetailVisible(false); setSelectedUser(null); });
  };
  
  const renderDetailRow = (label: string, value: string, isVisible: boolean, unit: string = '') => {
    if (!isVisible) return null;
    return (<View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value !== '-' ? value + unit : '-'}</Text></View>);
  };

  // ==========================================
  // 💡 모집 글 작성 로직
  // ==========================================
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

  const submitNewPost = async () => {
    if (!createTitle || !createDesc || !createDate || !createTime) {
      Alert.alert("알림", "모든 항목을 입력해주세요.");
      return;
    }

    if (createDate.length !== 10 || createTime.length !== 5) {
      Alert.alert("알림", "날짜(YYYY/MM/DD)와 시간(HH:MM)을 끝까지 올바르게 입력해주세요.");
      return;
    }

    const [year, month, day] = createDate.split('/').map(Number);
    const [hours, minutes] = createTime.split(':').map(Number);

    if (month < 1 || month > 12) {
      Alert.alert("알림", "올바른 월(1~12월)을 입력해주세요.");
      return;
    }
    const daysInMonth = new Date(year, month, 0).getDate(); 
    if (day < 1 || day > daysInMonth) {
      Alert.alert("알림", `${month}월은 ${daysInMonth}일까지 있습니다. 올바른 일자를 입력해주세요.`);
      return;
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      Alert.alert("알림", "올바른 시간을 입력해주세요. (00:00 ~ 23:59)");
      return;
    }

    const inputDateObj = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();

    if (inputDateObj < now) {
      Alert.alert("알림", "과거의 시간으로 모집글을 등록할 수 없습니다.");
      return;
    }

    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3); 
    if (inputDateObj > maxDate) {
      Alert.alert("알림", "일정은 오늘로부터 최대 3개월 이내의 날짜만 등록 가능합니다.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const dateTimeString = inputDateObj.toISOString(); 
      
      const payload = {
        title: createTitle,
        content: createDesc,
        isDifferentGym: createCategory === '아웃도어',
        gymPlace: createCategory === '센터' ? 'olla 클라이밍 센터' : createLocation,
        meetDateTime: dateTimeString,
        maxMember: parseInt(createPeople, 10)
      };

      await axios.post(POST_API_URL, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert("알림", "모집 글이 작성되었습니다.");
      closeCreateModal();
      fetchPosts(); 
    } catch (error: any) {
      console.error("게시글 작성 실패:", error?.response?.data || error.message);
      Alert.alert("작성 실패", error.response?.data?.message || "게시글 작성에 실패했습니다.");
    }
  };

  // ==========================================
  // 💡 참여하기 / 취소하기 토글 함수 
  // ==========================================
  const toggleJoin = async (postId: number, isCurrentlyJoined: boolean) => {
    // 1. 낙관적 UI 업데이트 (버튼 상태와 인원수를 즉각적으로 변경)
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          // "1/4명" 형태에서 숫자 추출
          const [currentStr, maxStr] = post.people.replace('명', '').split('/');
          let currentCount = parseInt(currentStr, 10);
          const maxCount = parseInt(maxStr, 10);

          // 참여하는 거면 +1, 취소하는 거면 -1
          if (!isCurrentlyJoined) {
            currentCount = Math.min(currentCount + 1, maxCount); // 최대인원 초과 방지
          } else {
            currentCount = Math.max(currentCount - 1, 1); // 1명 밑으로 내려가지 않게 방지
          }

          return { 
            ...post, 
            isJoined: !isCurrentlyJoined, // 버튼 취소/참여 변경
            people: `${currentCount}/${maxCount}명` // 변경된 인원수 텍스트 반영
          };
        }
        return post;
      })
    );

    try {
      const token = await AsyncStorage.getItem('userToken');
      const url = `${PARTICIPANT_API_URL}/${postId}/participants`;

      if (isCurrentlyJoined) {
        await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
      }

    } catch (error: any) {
      console.error("참여/취소 실패:", error?.response?.data || error.message);
      
      // 2. 실패 시 롤백 (원래 버튼과 인원수로 복구)
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
             const [currentStr, maxStr] = post.people.replace('명', '').split('/');
             let currentCount = parseInt(currentStr, 10);
             const maxCount = parseInt(maxStr, 10);
             // 롤백 계산
             if (isCurrentlyJoined) currentCount = Math.min(currentCount + 1, maxCount);
             else currentCount = Math.max(currentCount - 1, 1);

             return { ...post, isJoined: isCurrentlyJoined, people: `${currentCount}/${maxCount}명` };
          }
          return post;
        })
      );

      const errorMsg = error.response?.data?.message || error.response?.data?.data || "참여 요청을 처리할 수 없습니다.";
      Alert.alert("알림", errorMsg);
    }
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
                
                <TouchableOpacity style={styles.profileRow} onPress={() => openDetailModal(post.author, post.isMine)}>
                  <Image source={require('./assets/profile.png')} style={styles.profileImg} defaultSource={undefined} />
                  <Text style={styles.authorText}>{post.author}</Text>
                </TouchableOpacity>

                {/* 💡 참여하기 버튼 */}
                {!post.isMine && (
                  <TouchableOpacity 
                    style={[styles.joinButton, post.isJoined && styles.cancelButton]} 
                    activeOpacity={0.8}
                    onPress={() => toggleJoin(post.id, post.isJoined)}
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
        {filteredPosts.length === 0 && (
          <Text style={{color: '#999', textAlign: 'center', marginTop: 30}}>등록된 게시글이 없습니다.</Text>
        )}
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
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>회원 정보 확인</Text>
                <TouchableOpacity onPress={closeDetailModal}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
              {selectedUser && (
                <View style={styles.detailContainer}>
                  <View style={styles.detailProfileWrapper}>
                    <Image source={require('./assets/profile.png')} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#444444' }} />
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
                  <TextInput style={styles.inputBox} placeholder="모집 제목을 작성하세요." placeholderTextColor="#666666" value={createTitle} onChangeText={setCreateTitle} />
                </View>

                <Text style={styles.createLabel}>내용</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={[styles.inputBox, { minHeight: 45, textAlignVertical: 'top' }]} placeholder="모집 내용을 입력하세요." placeholderTextColor="#666666" multiline={true} value={createDesc} onChangeText={setCreateDesc} />
                </View>

                <View style={styles.rowWrapper}>
                  <View style={styles.halfField}>
                    <Text style={styles.createLabel}>날짜</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput style={styles.inputBox} placeholder="YYYY/MM/DD" placeholderTextColor="#666666" value={createDate} onChangeText={handleDateChange} keyboardType="numeric" maxLength={10} />
                    </View>
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.createLabel}>시간</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput style={styles.inputBox} placeholder="00:00" placeholderTextColor="#666666" value={createTime} onChangeText={handleTimeChange} keyboardType="numeric" maxLength={5} />
                    </View>
                  </View>
                </View>

                <Text style={styles.createLabel}>모집인원</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => adjustPeople(-1)}><Text style={styles.counterBtnText}>-</Text></TouchableOpacity>
                  <View style={styles.counterInputWrapper}>
                    <TextInput style={styles.counterInput} value={createPeople} onChangeText={handlePeopleChange} onBlur={handlePeopleBlur} keyboardType="numeric" />
                    <Text style={styles.counterUnit}>명</Text>
                  </View>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => adjustPeople(1)}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
                </View>

                {createCategory === '아웃도어' && (
                  <>
                    <View style={styles.innerDivider} />
                    <Text style={styles.createLabel}>장소정보</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput style={styles.inputBox} placeholder="위치" placeholderTextColor="#666666" value={createLocation} onChangeText={setCreateLocation} />
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
  authorText: { color: '#cccccc', fontSize: 14, fontWeight: '600' },
  
  joinButton: { backgroundColor: '#A1BE44', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  joinButtonText: { color: '#000000', fontSize: 14, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#333333' }, 
  cancelButtonText: { color: '#ffffff' }, 
  
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