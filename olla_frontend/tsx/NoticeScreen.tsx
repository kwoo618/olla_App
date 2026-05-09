import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.0.23:8080/api/v1';

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

      const response = await fetch(`${API_BASE_URL}/admin/notices`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      const raw = result.data?.content ?? result.data ?? [];
      const list: Notice[] = Array.isArray(raw) ? raw : [];

      // 중요 공지 우선 → 최신순
      list.sort((a, b) => {
        if (a.important !== b.important) return a.important ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setNotices(list);
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={{ width: 30 }} />
      </View>

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
                  <View style={styles.noticeHeaderRow}>
                    {item.important && (
                      <View style={styles.noticeBadge}>
                        <Text style={styles.noticeBadgeText}>중요</Text>
                      </View>
                    )}
                    <Text style={styles.noticeTitle}>{item.title}</Text>
                  </View>
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
    height: 44,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
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

  // 수정한 스타일 (HomeScreen 스타일 적용)
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 10, fontWeight: 'bold' },
  noticeTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', flex: 1 },

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