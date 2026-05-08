import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated, TextInput, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const BASE = 'http://192.168.0.23:8080/api/v1';
const POSTS = `http://192.168.0.23:8080/api/v1/posts`;
const MEMBERS = `${BASE}/members`;

const authHeader = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token}` };
};

const p = (n: number) => String(n).padStart(2, '0');

const CommunityScreen = ({ route, navigation }: any) => {
  const isFocused = useIsFocused();
  const currentFilter = route?.params?.filter || 'ALL';

  const [posts, setPosts] = useState<any[]>([]);
  const [myNickname, setMyNickname] = useState('');
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isCreateVisible, setCreateVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: '센터' as '센터'|'아웃도어', title: '', desc: '', date: '', time: '', people: '2', location: '' });

  const detailAnim = useRef(new Animated.Value(800)).current;
  const createAnim = useRef(new Animated.Value(800)).current;

  useEffect(() => { 
    if (isFocused) {
      initData(currentFilter); 
    }
  }, [isFocused, currentFilter]);

  const initData = async (filterToUse: string) => {
    let uName = '', uNick = '', uId = null;
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${MEMBERS}/me`, { headers });
      const d = data?.data?.data || data?.data || data;
      uName = d.name || ''; 
      uNick = d.nickname || d.name || ''; 
      uId = d.id || d.memberId || null;
      setMyNickname(uNick || uName); setMyUserId(uId);
    } catch {}
    fetchPosts(uName, uNick, uId, filterToUse);
  };

  const sortPosts = (list: any[]) => {
    return list.sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return b.id - a.id;
    });
  };

  const checkIsMine = (writerId: number | null, writerName: string, uId: number | null, uName: string, uNick: string): boolean => {
    if (uId !== null && writerId !== null && writerId !== undefined) {
      return Number(writerId) === Number(uId);
    }
    return writerName === uName || writerName === uNick;
  };

  const fetchPosts = async (uName: string, uNick: string, uId: number | null, filterToUse: string) => {
    try {
      const headers = await authHeader();
      const urlMap: any = { MY_WRITTEN: `${POSTS}/me`, MY_APPLIED: `${POSTS}/me/applied` };
      const url = `${urlMap[filterToUse] || POSTS}?page=0&size=100`;
      
      const { data } = await axios.get(url, { headers });
      const raw = data?.data?.data || data?.data || data;
      let list = raw?.content || raw || [];

      if (filterToUse === 'MY_APPLIED') {
        list = list.filter((item: any) => {
          const isMine = checkIsMine(item.writerId, item.writerName || '', uId, uName, uNick);
          return !isMine;
        });
      }

      if (Array.isArray(list)) {
        const mappedList = mapPosts(list, uName, uNick, uId);
        setPosts(sortPosts(mappedList));
      }
    } catch (e: any) {
      Alert.alert('불러오기 실패', e?.response?.data?.message || '게시글을 가져오지 못했습니다.');
    }
  };

  const mapPosts = (list: any[], uName: string, uNick: string, uId: number | null) =>
    list.map(item => {
      const md = new Date(item.meetDateTime), cd = new Date(item.createdAt);
      const author = item.writerName || '알 수 없음';
      const isMine = checkIsMine(item.writerId, author, uId, uName, uNick);
      const isPast = md.getTime() < new Date().getTime();

      return {
        id: item.id, writerId: item.writerId,
        type: item.differentGym ? '아웃도어' : '센터',
        title: item.title, desc: item.content, author, isMine, isPast,
        location: item.differentGym ? (item.gymPlace || '장소 미정') : 'olla 클라이밍 센터',
        date: isNaN(md.getTime()) ? item.meetDateTime : `${md.getFullYear()}-${p(md.getMonth()+1)}-${p(md.getDate())} ${p(md.getHours())}:${p(md.getMinutes())}`,
        rawMeetDateTime: item.meetDateTime,
        people: `${item.memberCount||0}/${item.maxMember}명`, maxMember: item.maxMember,
        postDate: isNaN(cd.getTime()) ? item.createdAt : `${cd.getFullYear()}.${p(cd.getMonth()+1)}.${p(cd.getDate())}`,
        isJoined: item.applied === true, viewCount: item.viewCount||0,
        likeCount: item.likeCount||0, isLiked: item.liked === true,
        differentGym: item.differentGym, gymPlace: item.gymPlace,
      };
    });

  const searchPosts = async () => {
    if (!searchKeyword.trim()) { Alert.alert('알림', '검색어를 입력해주세요.'); return; }
    setIsSearching(true);
    const kw = searchKeyword.trim().toLowerCase();
    try {
      const headers = await authHeader();
      let backendRes: any[] = [];
      try {
        const { data } = await axios.get(`${POSTS}/search?keyword=${encodeURIComponent(searchKeyword)}&page=0&size=100`, { headers });
        const d = data?.data?.data || data?.data || data;
        backendRes = Array.isArray(d?.content||d) ? d?.content||d : [];
      } catch {}
      const { data } = await axios.get(`${POSTS}?page=0&size=100`, { headers });
      const d = data?.data?.data || data?.data || data;
      const all: any[] = Array.isArray(d?.content||d) ? d?.content||d : [];
      const filtered = all.filter(i => [i.title,i.content,i.writerName,i.gymPlace].some(v => (v||'').toLowerCase().includes(kw)));
      const map = new Map();
      [...backendRes, ...filtered].forEach(i => i?.id != null && map.set(i.id, i));
      
      const mappedList = mapPosts(Array.from(map.values()), '', myNickname, myUserId);
      setPosts(sortPosts(mappedList));
    } catch (e: any) {
      Alert.alert('검색 실패', e?.response?.data?.message || '검색에 실패했습니다.');
    }
  };

  const clearSearch = () => { setSearchKeyword(''); setIsSearching(false); initData(currentFilter); };

  const updatePost = (id: number, changes: Record<string, any>) =>
    setPosts(prev => prev.map(post => post.id !== id ? post :
      { ...post, ...Object.fromEntries(Object.entries(changes).map(([k,v]) => [k, typeof v==='function' ? v(post) : v])) }
    ));

  const updatePeople = (id: number, joining: boolean) =>
    setPosts(prev => prev.map(post => {
      if (post.id !== id) return post;
      const [cur, max] = post.people.replace('명','').split('/').map(Number);
      return { ...post, isJoined: joining, people: `${joining?Math.min(cur+1,max):Math.max(cur-1,1)}/${max}명` };
    }));

  const toggleLike = async (id: number, liked: boolean) => {
    updatePost(id, { isLiked: !liked, likeCount: (post: any) => liked ? Math.max(post.likeCount-1,0) : post.likeCount+1 });
    try {
      const headers = await authHeader();
      // DELETE 대신 POST로 토글 처리 (서버 에러 방지)
      await axios.post(`${POSTS}/${id}/like`, {}, { headers });
    } catch {
      updatePost(id, { isLiked: liked, likeCount: (post: any) => liked ? post.likeCount+1 : post.likeCount-1 });
      Alert.alert('알림','좋아요 요청을 처리할 수 없습니다.');
    }
  };

  const toggleJoin = async (id: number, joined: boolean) => {
    updatePeople(id, !joined);
    try {
      const headers = await authHeader();
      if (joined) {
        await axios.delete(`${POSTS}/${id}/participants`, { headers });
      } else {
        await axios.post(`${POSTS}/${id}/participants`, {}, { headers });
      }
    } catch (e: any) {
      updatePeople(id, joined);
      Alert.alert('알림', e?.response?.data?.message || '참여 요청을 처리할 수 없습니다.');
    }
  };

  const incrementViewCount = async (id: number) => {
    try {
      const headers = await authHeader();
      await axios.get(`${POSTS}/${id}`, { headers });
      updatePost(id, { viewCount: (post: any) => post.viewCount+1 });
    } catch {}
  };

  const executeDelete = async () => {
    if (deleteTarget === null) return;
    try {
      const headers = await authHeader();
      await axios.delete(`${POSTS}/${deleteTarget}`, { headers });
      Alert.alert('알림','게시글이 삭제되었습니다.'); initData(currentFilter);
    } catch (e: any) {
      Alert.alert('삭제 실패', e?.response?.data?.message||'삭제할 수 없습니다.');
    }
    setDeleteTarget(null);
  };

  const openDetailModal = async (authorId: number, authorName: string, isMine: boolean) => {
    try {
      const headers = await authHeader();
      const url = isMine ? `${MEMBERS}/me` : `${MEMBERS}/${authorId}/profile`;
      const { data } = await axios.get(url, { headers });
      
      const d = data?.data?.data || data?.data || data; 
      
      if (!d) { Alert.alert('프로필 조회 불가','정보를 불러올 수 없습니다.'); return; }
      
      if (isMine) {
        const detail = d.detail || {};
        const privacy = d.privacy || {};
        setSelectedUser({
          name: d.name || authorName,
          phone: d.phone || '-',
          age: detail.age || '-',
          height: detail.height || '-',
          weight: detail.weight || '-',
          arm: detail.armSpan || '-',
          shoe: detail.footSize || '-',
          toggles: {
            showName: true,
            showPhone: privacy.phonePublic !== false,
            showAge: true,
            showHeight: privacy.heightPublic !== false,
            showWeight: privacy.weightPublic !== false,
            showArm: privacy.armSpanPublic !== false,
            showShoe: privacy.footSizePublic !== false,
          },
          isMe: true
        });
      } else {
        setSelectedUser({
          name: d.name || authorName,
          phone: '-', 
          age: d.age || '-',
          height: d.height || '-',
          weight: d.weight || '-',
          arm: d.armSpan || '-',
          shoe: d.footSize || '-',
          toggles: {
            showName: true,
            showPhone: false,
            showAge: !!d.age,
            showHeight: !!d.height,
            showWeight: !!d.weight,
            showArm: !!d.armSpan,
            showShoe: !!d.footSize,
          },
          isMe: false
        });
      }
      setTimeout(() => Animated.timing(detailAnim,{toValue:0,duration:300,useNativeDriver:true}).start(), 50);
    } catch (e) {
      Alert.alert('프로필 조회 불가','정보를 불러올 수 없습니다.');
    }
  };

  const closeDetailModal = () =>
    Animated.timing(detailAnim,{toValue:800,duration:250,useNativeDriver:true}).start(() => setSelectedUser(null));

  const openCreateModal = () => {
    setIsEditMode(false); setEditPostId(null);
    setForm({ category:'센터', title:'', desc:'', date:'', time:'', people:'2', location:'' });
    setCreateVisible(true);
    setTimeout(() => Animated.timing(createAnim,{toValue:0,duration:300,useNativeDriver:true}).start(), 50);
  };

  const openEditModal = (post: any) => {
    setIsEditMode(true); setEditPostId(post.id);
    const md = new Date(post.rawMeetDateTime);
    setForm({
      category: post.differentGym ? '아웃도어' : '센터', title: post.title, desc: post.desc,
      date: isNaN(md.getTime()) ? '' : `${md.getFullYear()}/${p(md.getMonth()+1)}/${p(md.getDate())}`,
      time: isNaN(md.getTime()) ? '' : `${p(md.getHours())}:${p(md.getMinutes())}`,
      people: String(post.maxMember), location: post.gymPlace||'',
    });
    setCreateVisible(true);
    setTimeout(() => Animated.timing(createAnim,{toValue:0,duration:300,useNativeDriver:true}).start(), 50);
  };

  const closeCreateModal = () =>
    Animated.timing(createAnim,{toValue:800,duration:250,useNativeDriver:true}).start(() => setCreateVisible(false));

  const submitPost = async () => {
    const { category, title, desc, date, time, people, location } = form;
    
    if (!title || !desc || !date || !time) { 
      Alert.alert('알림', '모든 항목을 입력해주세요.'); 
      return; 
    }
    if (category === '아웃도어' && (!location || !location.trim())) {
      Alert.alert('알림', '아웃도어 장소 정보를 입력해주세요.');
      return;
    }
    if (date.length !== 10 || time.length !== 5) { 
      Alert.alert('알림', '날짜(YYYY/MM/DD)와 시간(HH:MM)을 올바르게 입력해주세요.'); 
      return; 
    }
    
    const [yr, mo, dy] = date.split('/').map(Number);
    const [hr, mn] = time.split(':').map(Number);
    
    if (mo < 1 || mo > 12) { Alert.alert('알림', '올바른 월을 입력해주세요.'); return; }
    if (dy < 1 || dy > new Date(yr, mo, 0).getDate()) { Alert.alert('알림', `${mo}월은 ${new Date(yr, mo, 0).getDate()}일까지입니다.`); return; }
    if (hr > 23 || mn > 59) { Alert.alert('알림', '올바른 시간을 입력해주세요.'); return; }
    
    const dt = new Date(yr, mo - 1, dy, hr, mn);
    if (dt < new Date()) { Alert.alert('알림', '과거 시간으로 등록할 수 없습니다.'); return; }
    
    const max3 = new Date(); 
    max3.setMonth(max3.getMonth() + 3);
    if (dt > max3) { Alert.alert('알림', '최대 3개월 이내 날짜만 가능합니다.'); return; }
    
    const formattedDateTime = `${yr}-${p(mo)}-${p(dy)}T${p(hr)}:${p(mn)}:00`;

    try {
      const headers = await authHeader();
      const payload = { 
        title, 
        content: desc, 
        isDifferentGym: category === '아웃도어', 
        gymPlace: category === '센터' ? 'olla 클라이밍 센터' : location.trim(), 
        meetDateTime: formattedDateTime, 
        maxMember: parseInt(people, 10) 
      };

      if (isEditMode && editPostId) {
        await axios.patch(`${POSTS}/${editPostId}`, payload, { headers });
      } else {
        await axios.post(POSTS, payload, { headers });
      }
      
      Alert.alert('알림', isEditMode ? '게시글이 수정되었습니다.' : '모집 글이 작성되었습니다.');
      closeCreateModal(); 
      initData(currentFilter);
    } catch (e: any) {
      Alert.alert(`${isEditMode ? '수정' : '작성'} 실패`, e?.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  const filteredPosts = posts.filter(post => selectedTab === '전체' || post.type === selectedTab);

  return (
    <View style={s.bg}>
      {/* 검색 */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <TextInput style={s.searchInput} placeholder="제목 / 내용 / 작성자 / 지역 검색" placeholderTextColor="#666" value={searchKeyword} onChangeText={setSearchKeyword} onSubmitEditing={searchPosts} returnKeyType="search" />
          {searchKeyword.length>0 && <TouchableOpacity onPress={clearSearch}><Text style={s.clearText}>✕</Text></TouchableOpacity>}
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
        {['전체','센터','아웃도어'].map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, selectedTab===tab&&s.tabActive]} onPress={() => setSelectedTab(tab)}>
            <Text style={[s.tabText, selectedTab===tab&&s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentFilter !== 'ALL' && (
        <View style={s.filterBar}>
          <Text style={s.alertGreen}>{currentFilter==='MY_WRITTEN'?'내가 쓴 게시글':'내가 참여한 게시글'}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({filter:'ALL'})}><Text style={s.clearBtn}>초기화 ✕</Text></TouchableOpacity>
        </View>
      )}

      {/* 게시글 목록 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {filteredPosts.map(post => {
          const isOut = post.type==='아웃도어';
          const isPast = post.isPast;

          return (
            <TouchableOpacity 
              key={post.id} 
              style={[s.card, isPast && s.cardPast]}
              activeOpacity={0.95} 
              onPress={() => incrementViewCount(post.id)}
            >
              <View style={s.cardHeader}>
                <View style={[s.badge, { backgroundColor: isPast ? '#333' : (isOut ? '#00810F' : '#0072B9') }]}>
                  <Text style={[s.badgeText, { color: isPast ? '#888' : (isOut ? '#2CDE00' : '#009DFF') }]}>{post.type}</Text>
                </View>
                <View style={s.statsRow}>
                  <Text style={s.stat}>👁 {post.viewCount}</Text>
                  <TouchableOpacity onPress={() => toggleLike(post.id,post.isLiked)}>
                    <Text style={[s.stat, post.isLiked&&{color:'#FF4D4D'}]}>{post.isLiked?'♥':'♡'} {post.likeCount}</Text>
                  </TouchableOpacity>
                  <Text style={s.dateText}>{post.postDate}</Text>
                </View>
              </View>

              <Text style={[s.title, isPast && { color: '#888' }]}>{post.title}</Text>
              <Text style={[s.desc, isPast && { color: '#666' }]}>{post.desc}</Text>

              <View style={s.infoRow}>
                {([['point.png',post.location],['DATE.png',post.date],['people.png',post.people]] as [string,string][]).map(([img,val],i) => (
                  <View key={i} style={s.infoItem}>
                    <Image source={img==='point.png'?require('../assets/point.png'):img==='DATE.png'?require('../assets/DATE.png'):require('../assets/people.png')} style={s.infoIcon}/>
                    <Text style={s.infoText} numberOfLines={1}>{val}</Text>
                  </View>
                ))}
              </View>

              <View style={s.divider}/>
              <View style={s.footer}>
                <TouchableOpacity style={s.profileRow} onPress={() => openDetailModal(post.writerId, post.author, post.isMine)}>
                  <Image source={require('../assets/profile.png')} style={[s.avatar, isPast && { opacity: 0.5 }]}/>
                  <Text style={[s.author, isPast && { color: '#666' }]}>{post.author}</Text>
                </TouchableOpacity>
                {!post.isMine && (
                  isPast ? (
                    <View style={[s.joinBtn, s.cancelBtn]}>
                      <Text style={[s.joinText, s.cancelText]}>{post.isJoined ? '참가완료' : '마감됨'}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={[s.joinBtn,post.isJoined&&s.cancelBtn]} onPress={() => toggleJoin(post.id,post.isJoined)}>
                      <Text style={[s.joinText,post.isJoined&&s.cancelText]}>{post.isJoined?'취소하기':'참여하기'}</Text>
                    </TouchableOpacity>
                  )
                )}
                {post.isMine && (
                  <View style={s.myActions}>
                    {!isPast && (
                      <TouchableOpacity style={s.editBtn} onPress={() => openEditModal(post)}><Text style={s.editText}>수정</Text></TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.trashBtn} onPress={() => setDeleteTarget(post.id)}>
                      <Image source={require('../assets/trash.png')} style={[s.trashIcon, isPast && { tintColor: '#666' }]}/>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {filteredPosts.length===0 && <Text style={s.empty}>등록된 게시글이 없습니다.</Text>}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={openCreateModal}><Text style={s.fabText}>+</Text></TouchableOpacity>

      {/* 삭제 확인 */}
      <Modal visible={deleteTarget!==null} animationType="fade" transparent onRequestClose={() => setDeleteTarget(null)}>
        <View style={s.overlay}>
          <View style={s.alertBox}>
            <Text style={s.alertTitle}>삭제하시겠습니까?</Text>
            <View style={s.alertBtns}>
              <TouchableOpacity style={s.btnYes} onPress={executeDelete}><Text style={s.btnYesText}>예</Text></TouchableOpacity>
              <TouchableOpacity style={s.btnNo} onPress={() => setDeleteTarget(null)}><Text style={s.btnNoText}>아니오</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 회원 정보 */}
      <Modal visible={selectedUser!==null} transparent animationType="fade" onRequestClose={closeDetailModal}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeDetailModal}>
          <Animated.View style={[s.sheet,{transform:[{translateY:detailAnim}]}]}>
            <TouchableOpacity activeOpacity={1} style={{width:'100%'}}>
              <View style={s.handle}/><View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>{selectedUser?.isMe?'내 정보':'회원 정보'}</Text>
                <TouchableOpacity onPress={closeDetailModal}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
              </View><View style={s.hr}/>
              {selectedUser && (
                <View>
                  <View style={s.profileCenter}>
                    <Image source={require('../assets/profile.png')} style={s.profileBig}/>
                    <Text style={s.profileName}>{selectedUser.name}</Text>
                  </View>
                  <View style={s.infoBox}>
                    {([['이름',selectedUser.name,selectedUser.toggles.showName,''],['전화번호',selectedUser.phone,selectedUser.toggles.showPhone,''],['나이',selectedUser.age,selectedUser.toggles.showAge,'세'],['키',selectedUser.height,selectedUser.toggles.showHeight,'cm'],['몸무게',selectedUser.weight,selectedUser.toggles.showWeight,'kg'],['팔길이',selectedUser.arm,selectedUser.toggles.showArm,'cm'],['암벽화 사이즈',selectedUser.shoe,selectedUser.toggles.showShoe,'mm']] as [string,string,boolean,string][])
                      .filter(([,,show]) => show)
                      .map(([label,val,,unit]) => (
                        <View key={label} style={s.infoRowDetail}>
                          <Text style={s.infoLabel}>{label}</Text>
                          <Text style={s.infoVal}>{val!=='-'?val+unit:'-'}</Text>
                        </View>
                      ))}
                  </View>
                  <TouchableOpacity style={s.closeFullBtn} onPress={closeDetailModal}><Text style={s.closeFullText}>닫기</Text></TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 작성/수정 */}
      <Modal visible={isCreateVisible} transparent animationType="fade" onRequestClose={closeCreateModal}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeCreateModal}>
          <Animated.View style={[s.sheet,{transform:[{translateY:createAnim}],maxHeight:'90%'}]}>
            <TouchableOpacity activeOpacity={1} style={{width:'100%'}}>
              <View style={s.handle}/><View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>{isEditMode?'게시글 수정':'모집 글 작성'}</Text>
                <TouchableOpacity onPress={closeCreateModal}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
              </View><View style={s.hr}/>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:80}}>
              <TouchableOpacity activeOpacity={1} style={s.formBox}>
                <Text style={s.label}>카테고리</Text>
                <View style={s.catRow}>
                  {(['센터','아웃도어'] as const).map(c => (
                    <TouchableOpacity key={c} style={[s.catBtn,form.category===c&&s.catBtnActive]} onPress={() => setForm(f=>({...f,category:c}))}>
                      <Text style={[s.catText,form.category===c&&s.catTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.innerHr}/>

                <Text style={s.label}>제목</Text>
                <View style={s.inputWrap}><TextInput style={s.input} placeholder="모집 제목을 작성하세요." placeholderTextColor="#666" value={form.title} onChangeText={v=>setForm(f=>({...f,title:v}))}/></View>

                <Text style={s.label}>내용</Text>
                <View style={s.inputWrap}><TextInput style={[s.input,{minHeight:45,textAlignVertical:'top'}]} placeholder="모집 내용을 입력하세요." placeholderTextColor="#666" multiline value={form.desc} onChangeText={v=>setForm(f=>({...f,desc:v}))}/></View>

                <View style={{flexDirection:'row'}}>
                  <View style={{flex:1,marginRight:8}}>
                    <Text style={s.label}>날짜</Text>
                    <View style={s.inputWrap}><TextInput style={s.input} placeholder="YYYY/MM/DD" placeholderTextColor="#666" value={form.date} onChangeText={v=>{const n=v.replace(/\D/g,'');setForm(f=>({...f,date:n.length>6?`${n.slice(0,4)}/${n.slice(4,6)}/${n.slice(6,8)}`:n.length>4?`${n.slice(0,4)}/${n.slice(4)}`:n}));}} keyboardType="numeric" maxLength={10}/></View>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.label}>시간</Text>
                    <View style={s.inputWrap}><TextInput style={s.input} placeholder="00:00" placeholderTextColor="#666" value={form.time} onChangeText={v=>{const n=v.replace(/\D/g,'');setForm(f=>({...f,time:n.length>2?`${n.slice(0,2)}:${n.slice(2,4)}`:n}));}} keyboardType="numeric" maxLength={5}/></View>
                  </View>
                </View>

                <Text style={s.label}>모집인원</Text>
                <View style={s.counterRow}>
                  <TouchableOpacity style={s.counterBtn} onPress={() => setForm(f=>({...f,people:String(Math.max(2,parseInt(f.people||'2')-1))}))}><Text style={s.counterBtnText}>-</Text></TouchableOpacity>
                  <View style={{flexDirection:'row',alignItems:'center',marginHorizontal:15}}>
                    <TextInput style={s.counterInput} value={form.people} onChangeText={v=>setForm(f=>({...f,people:v.replace(/\D/g,'')}))} onBlur={()=>{const n=parseInt(form.people);setForm(f=>({...f,people:String(isNaN(n)||n<2?2:n)}));}} keyboardType="numeric"/>
                    <Text style={s.counterUnit}>명</Text>
                  </View>
                  <TouchableOpacity style={s.counterBtn} onPress={() => setForm(f=>({...f,people:String(parseInt(f.people||'2')+1)}))}><Text style={s.counterBtnText}>+</Text></TouchableOpacity>
                </View>

                {form.category==='아웃도어' && (
                  <><View style={s.innerHr}/>
                  <Text style={s.label}>장소정보</Text>
                  <View style={s.inputWrap}><TextInput style={s.input} placeholder="위치" placeholderTextColor="#666" value={form.location} onChangeText={v=>setForm(f=>({...f,location:v}))}/></View></>
                )}

                <TouchableOpacity style={s.submitBtn} onPress={submitPost}>
                  <Text style={s.submitText}>{isEditMode?'게시글 수정':'모집 글 게시'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  bg:{flex:1,backgroundColor:'#1A1A1A',paddingHorizontal:20,paddingTop:10},
  searchRow:{flexDirection:'row',marginBottom:12,alignItems:'center'},
  searchBox:{flex:1,backgroundColor:'#262626',borderRadius:10,flexDirection:'row',alignItems:'center',paddingHorizontal:12},
  searchInput:{flex:1,color:'#fff',fontSize:14,paddingVertical:10},
  clearText:{color:'#999',fontSize:16,padding:5},
  searchBtn:{backgroundColor:'#A1BE44',borderRadius:10,paddingHorizontal:16,paddingVertical:10,marginLeft:10},
  searchBtnText:{color:'#000',fontSize:14,fontWeight:'bold'},
  alertBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'rgba(0,114,185,0.1)',paddingHorizontal:16,paddingVertical:10,borderRadius:8,marginBottom:10,borderWidth:1,borderColor:'#0072B9'},
  alertBlue:{color:'#009DFF',fontSize:14,fontWeight:'bold'},
  filterBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'rgba(161,190,68,0.1)',paddingHorizontal:16,paddingVertical:10,borderRadius:8,marginBottom:15,borderWidth:1,borderColor:'#A1BE44'},
  alertGreen:{color:'#A1BE44',fontSize:14,fontWeight:'bold'},
  clearBtn:{color:'#fff',fontSize:12,opacity:0.8},
  tabRow:{flexDirection:'row',backgroundColor:'#3A3A3A',borderRadius:24,padding:4,marginBottom:20},
  tab:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:20},
  tabActive:{backgroundColor:'#1D1D1D'},
  tabText:{color:'#999',fontSize:15,fontWeight:'bold'},
  tabTextActive:{color:'#fff'},
  scroll:{paddingBottom:80},
  empty:{color:'#999',textAlign:'center',marginTop:30},
  card:{backgroundColor:'#212121',borderColor:'#262626',borderWidth:1.5,borderRadius:16,padding:20,marginBottom:15},
  cardPast:{opacity:0.25,borderColor:'#333'},
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  badge:{paddingHorizontal:12,paddingVertical:4,borderRadius:8},
  badgeText:{fontSize:12,fontWeight:'bold'},
  statsRow:{flexDirection:'row',alignItems:'center'},
  stat:{color:'#999',fontSize:12,fontWeight:'500',marginRight:10},
  dateText:{color:'#999',fontSize:12},
  title:{color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:6},
  desc:{color:'#999',fontSize:14,lineHeight:20,marginBottom:15},
  infoRow:{flexDirection:'row',alignItems:'center',marginBottom:15,flexWrap:'wrap'},
  infoItem:{flexDirection:'row',alignItems:'center',marginRight:12,marginBottom:4},
  infoIcon:{width:14,height:14,resizeMode:'contain',marginRight:4,tintColor:'#999'},
  infoText:{color:'#999',fontSize:12},
  divider:{height:1,backgroundColor:'#333',marginBottom:15},
  footer:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  profileRow:{flexDirection:'row',alignItems:'center'},
  avatar:{width:32,height:32,borderRadius:16,backgroundColor:'#444',marginRight:10},
  author:{color:'#ccc',fontSize:14,fontWeight:'600'},
  joinBtn:{backgroundColor:'#A1BE44',paddingHorizontal:20,paddingVertical:10,borderRadius:12},
  joinText:{color:'#000',fontSize:14,fontWeight:'bold'},
  cancelBtn:{backgroundColor:'#333'},
  cancelText:{color:'#fff'},
  myActions:{flexDirection:'row',alignItems:'center'},
  editBtn:{backgroundColor:'#333',paddingHorizontal:14,paddingVertical:7,borderRadius:8,marginRight:8},
  editText:{color:'#A1BE44',fontSize:12,fontWeight:'bold'},
  trashBtn:{padding:6},
  trashIcon:{width:18,height:18,resizeMode:'contain',tintColor:'#A1BE44'},
  fab:{position:'absolute',right:20,bottom:20,width:60,height:60,borderRadius:30,backgroundColor:'#A1BE44',justifyContent:'center',alignItems:'center',elevation:5},
  fabText:{color:'#000',fontSize:32,marginTop:-4},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',alignItems:'center'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'},
  sheet:{backgroundColor:'#1E1E1E',borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20,paddingBottom:40,width:'100%'},
  handle:{width:40,height:4,backgroundColor:'#333',borderRadius:2,marginTop:12,marginBottom:20,alignSelf:'center'},
  sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:15},
  sheetTitle:{color:'#fff',fontSize:20,fontWeight:'bold'},
  closeBtn:{color:'#999',fontSize:24,paddingHorizontal:10},
  hr:{height:1,backgroundColor:'#333',marginBottom:20},
  alertBox:{width:300,backgroundColor:'#212121',borderRadius:16,padding:25,alignItems:'center'},
  alertTitle:{color:'#fff',fontSize:16,fontWeight:'bold',marginBottom:25},
  alertBtns:{flexDirection:'row',width:'100%'},
  btnYes:{flex:1,backgroundColor:'#A1BE44',paddingVertical:12,borderRadius:8,alignItems:'center',marginRight:5},
  btnYesText:{color:'#fff',fontSize:16,fontWeight:'bold'},
  btnNo:{flex:1,backgroundColor:'#262626',paddingVertical:12,borderRadius:8,alignItems:'center',marginLeft:5},
  btnNoText:{color:'#fff',fontSize:16,fontWeight:'bold'},
  profileCenter:{alignSelf:'center',alignItems:'center',marginBottom:25},
  profileBig:{width:80,height:80,borderRadius:40,backgroundColor:'#444'},
  profileName:{color:'#fff',fontSize:16,fontWeight:'bold',marginTop:12},
  infoBox:{backgroundColor:'#262626',borderRadius:16,padding:20,marginBottom:20},
  infoRowDetail:{flexDirection:'row',justifyContent:'space-between',paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:'#333'},
  infoLabel:{color:'#999',fontSize:15,fontWeight:'bold'},
  infoVal:{color:'#fff',fontSize:15,fontWeight:'bold'},
  closeFullBtn:{width:'100%',backgroundColor:'#A1BE44',borderRadius:12,paddingVertical:16,alignItems:'center'},
  closeFullText:{color:'#000',fontSize:16,fontWeight:'bold'},
  formBox:{backgroundColor:'#262626',borderWidth:1,borderColor:'#555',borderRadius:16,padding:20,marginTop:5},
  label:{color:'#fff',fontSize:16,fontWeight:'bold',marginBottom:10},
  innerHr:{height:1,backgroundColor:'#444',marginVertical:15},
  catRow:{flexDirection:'row',justifyContent:'space-between'},
  catBtn:{flex:1,borderWidth:1,borderColor:'#555',borderRadius:10,paddingVertical:12,alignItems:'center',marginHorizontal:4},
  catBtnActive:{borderColor:'#A1BE44'},
  catText:{color:'#999',fontSize:14,fontWeight:'bold'},
  catTextActive:{color:'#A1BE44'},
  inputWrap:{backgroundColor:'#000',borderRadius:10,paddingHorizontal:15,paddingVertical:12,marginBottom:15},
  input:{color:'#fff',fontSize:15,padding:0},
  counterRow:{flexDirection:'row',alignItems:'center',marginBottom:5},
  counterBtn:{width:40,height:40,backgroundColor:'#333',borderRadius:20,alignItems:'center',justifyContent:'center'},
  counterBtnText:{color:'#fff',fontSize:20,fontWeight:'bold'},
  counterInput:{color:'#fff',fontSize:20,fontWeight:'bold',textAlign:'center',minWidth:20,padding:0},
  counterUnit:{color:'#999',fontSize:16,fontWeight:'bold',marginLeft:2},
  submitBtn:{width:'100%',backgroundColor:'#A1BE44',borderRadius:12,paddingVertical:16,alignItems:'center',marginTop:20},
  submitText:{color:'#000',fontSize:16,fontWeight:'bold'},
});

export default CommunityScreen;