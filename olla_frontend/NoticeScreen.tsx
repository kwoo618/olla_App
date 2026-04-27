import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList } from 'react-native';

const NoticeScreen = ({ navigation }: any) => {
  // 열려있는 공지사항의 ID를 기억하는 State
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 임시 공지사항 데이터
  const notices = [
    {
      id: 1,
      isImportant: true,
      title: 'OLLA 클라이밍 센터 오픈 안내',
      date: '2026 - 04 - 05',
      content: '새로운 클라이밍 문화의 시작, OLLA가 오픈했습니다!\n다양한 난이도의 벽과 쾌적한 시설을 즐겨보세요.'
    },
    {
      id: 2,
      isImportant: true,
      title: 'OLLA 클라이밍 센터 이용 수칙',
      date: '2026 - 04 - 05',
      content: '1. 암벽화 필수 착용\n2. 벽 아래 서 있지 않기\n3. 음주 후 등반 절대 금지'
    },
    {
      id: 3,
      isImportant: false,
      title: '우천시에 따른 우산 및 물기 대비 공지',
      date: '2026 - 04 - 05',
      content: '비가 오는 날에는 입구에 비치된 우산 꽂이를 이용해주시고, 매트 위로 물기가 떨어지지 않도록 주의 부탁드립니다.'
    }
  ];

  const toggleExpand = (id: number) => {
    // 이미 열려있는 걸 또 누르면 닫히고, 다른 걸 누르면 열리게 함
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.background}>
      
      {/* 상단 헤더 */}
      <View style={styles.header}>
        {/* 뒤로가기 버튼 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.logoText}>olla</Text>
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={{ width: 30 }} /> {/* 타이틀 중앙 정렬을 위한 빈 공간 */}
      </View>

      {/* 공지사항 리스트 */}
      <FlatList
        data={notices}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;

          return (
            <View style={styles.noticeWrapper}>
              <TouchableOpacity style={styles.noticeHeader} onPress={() => toggleExpand(item.id)} activeOpacity={0.8}>
                <View style={styles.noticeInfo}>
                  {item.isImportant && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>중요</Text>
                    </View>
                  )}
                  <Text style={styles.noticeTitle}>{item.title}</Text>
                  <Text style={styles.noticeDate}>{item.date}</Text>
                </View>
                {/* 💡 열렸는지 여부에 따라 아이콘 모양이 바뀜 ( > 에서 ∨ 로 ) */}
                <Text style={styles.expandIcon}>{isExpanded ? '∨' : '＞'}</Text>
              </TouchableOpacity>

              {/* 💡 선택된(Expanded) 아이템만 이 내용 영역이 렌더링됨 */}
              {isExpanded && (
                <View style={styles.noticeContent}>
                  <Text style={styles.noticeContentText}>{item.content}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  backBtn: { padding: 5 },
  backBtnText: { color: '#ffffff', fontSize: 24 },
  logoText: { fontSize: 20, fontWeight: '900', color: '#A1BE44', position: 'absolute', left: 60 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 20 },
  
  noticeWrapper: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden', // 둥근 모서리 바깥으로 내용이 안 튀어나오게
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  noticeInfo: { flex: 1 },
  badge: { backgroundColor: '#FF4D4D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  noticeTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  noticeDate: { color: '#999999', fontSize: 12 },
  expandIcon: { color: '#999999', fontSize: 16, marginLeft: 10 },
  
  noticeContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333', // 본문과 제목 사이 연한 선
    paddingTop: 15,
  },
  noticeContentText: { color: '#CCCCCC', fontSize: 14, lineHeight: 22 },
});

export default NoticeScreen;