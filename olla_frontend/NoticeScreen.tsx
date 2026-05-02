import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
// SafeAreaView 삭제 (App.tsx에서 관리)
import AsyncStorage from '@react-native-async-storage/async-storage'; 

interface Notice {
  id: number;
  important: boolean; 
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

const NoticeScreen = ({ navigation }: any) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('인증 오류', '로그인 정보가 없습니다.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch('http://172.30.1.54:8080/api/v1/admin/notices', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.data?.content) {
        setNotices(result.data.content);
      } else {
        setNotices([]);
      }
    } catch (error) {
      Alert.alert('오류', '네트워크 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <View style={[styles.background, styles.center]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      
      {/* 상단 헤더: 디자인은 그대로 유지하되 겹침 방지를 위해 높이와 마진만 조정 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* 공지사항 리스트 */}
      <FlatList
        data={notices}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;

          return (
            <View style={styles.noticeWrapper}>
              <TouchableOpacity 
                style={styles.noticeHeader} 
                onPress={() => toggleExpand(item.id)} 
                activeOpacity={0.8}
              >
                <View style={styles.noticeInfo}>
                  {item.important && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>중요</Text>
                    </View>
                  )}
                  <Text style={styles.noticeTitle}>{item.title}</Text>
                  <Text style={styles.noticeDate}>
                    {item.createdAt ? item.createdAt.split('T')[0] : ''}
                  </Text>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? '∨' : '＞'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.noticeContent}>
                  <Text style={styles.noticeContentText}>{item.content}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    height: 44, // App.tsx의 툴바 높이와 통일하여 공백 제거
    borderBottomWidth: 0.5, 
    borderBottomColor: '#2A2A2A' 
  },
  backBtn: { padding: 5 },
  backBtnText: { color: '#ffffff', fontSize: 24 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 20, paddingBottom: 30 },
  emptyText: { color: '#999999', textAlign: 'center', marginTop: 50 },
  
  noticeWrapper: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
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
    borderTopColor: '#333333',
    paddingTop: 15,
  },
  noticeContentText: { color: '#CCCCCC', fontSize: 14, lineHeight: 22 },
});

export default NoticeScreen;