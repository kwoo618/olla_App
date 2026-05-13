import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

// 💡 타입 이름을 Notice에서 NotificationItem으로 변경했습니다.
interface NotificationItem {
  id: number;
  important?: boolean;
  title: string;
  content: string;
  createdAt: string;
}

const NotificationScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── 커스텀 알림 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showResultModal('인증 오류', '로그인 정보가 없습니다.', 'error', () => {
          navigation.navigate('Login');
        });
        return;
      }

      // 💡 백엔드 알림 조회 API 주소로 변경해주세요 (예: /members/notifications)
      const response = await axios.get(`${API_BASE_URL}/members/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      const list: NotificationItem[] = Array.isArray(raw) ? raw : [];

      // 정렬 (최신순)
      list.sort((a, b) => {
        if (a.important !== b.important) return a.important ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setNotifications(list);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '네트워크 연결을 확인해주세요.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
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
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>새로운 알림이 없습니다.</Text>
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

      {/* ─── 커스텀 알림 결과 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => {
              setResultModalVisible(false);
              if (typeof resultModalConfig.onConfirm === 'function') {
                resultModalConfig.onConfirm();
              }
            }}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─────────────────────────── 스타일 ───────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 50,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
    // 💡 relative를 주어 자식 요소가 절대 위치를 잡을 수 있게 함
    position: 'relative', 
  },
  backBtn: { padding: 5, zIndex: 10 }, // 뒤로가기 버튼이 제목 위로 올라오게 zIndex 부여
  backBtnText: { color: '#ffffff', fontSize: 28 },
  
  // 🌟 정중앙 배치를 위한 핵심 스타일
  headerTitle: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    textAlign: 'center', 
    color: '#ffffff', 
    fontSize: 20, 
    fontWeight: 'bold',
    zIndex: 1 // 뒤로가기 버튼보다 아래에 위치
  },
  
  listContent: { padding: 20, paddingBottom: 30 },
  emptyText: { color: '#999999', textAlign: 'center', marginTop: 50, fontSize: 16 },

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

  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' },
  noticeTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', flex: 1 },

  noticeDate: { color: '#999999', fontSize: 14 },
  expandIcon: { color: '#999999', fontSize: 18, marginLeft: 10, fontWeight: 'bold' },

  noticeContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 15,
  },
  noticeContentText: { color: '#CCCCCC', fontSize: 16, lineHeight: 24 },

  // ─── 커스텀 알림 모달 전용 스타일 (통일) ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default NotificationScreen;