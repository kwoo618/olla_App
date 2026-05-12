import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

interface Notice {
  id: number;
  important: boolean;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

const NoticeScreen = ({ navigation }: any) => {
  // 새로고침 상태 추가
  const [refreshing, setRefreshing] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── 커스텀 알림 모달 상태 추가 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const fetchNotices = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showResultModal('인증 오류', '로그인 정보가 없습니다.', 'error', () => {
          navigation.navigate('Login');
        });
        return;
      }

      // ✅ fetch 대신 axios를 사용하여 일관성 및 에러 처리 용이성 확보
      const response = await axios.get(`${API_BASE_URL}/admin/notices`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // ✅ ApiResponse Depth 1단계 추가 (response.data.data)
      // 페이징 객체(Page)로 올 경우를 대비해 content를 확인하고, 없으면 배열 자체를 사용합니다.
      const raw = response.data?.data?.data?.content ?? response.data?.data?.data ?? [];
      const list: Notice[] = Array.isArray(raw) ? raw : [];

      // 중요 공지 우선 → 최신순
      list.sort((a, b) => {
        if (a.important !== b.important) return a.important ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setNotices(list);
    } catch (error: any) {
      // ✅ 에러 메시지 처리 반영
      const errorMessage = error.response?.data?.message || '네트워크 연결을 확인해주세요.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // onRefresh 작성
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotices();
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
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

// ─────────────────────────── 스타일 (글씨 및 레이아웃 확대 적용) ───────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 50, // 💡 44 -> 50 (터치 영역 및 여유 공간 확대)
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
  },
  backBtn: { padding: 5 },
  backBtnText: { color: '#ffffff', fontSize: 28 }, // 💡 24 -> 28
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' }, // 💡 18 -> 20
  listContent: { padding: 20, paddingBottom: 30 },
  emptyText: { color: '#999999', textAlign: 'center', marginTop: 50, fontSize: 16 }, // 💡 16 추가

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

  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 }, // 💡 4 -> 6
  noticeBadge: { backgroundColor: '#A1BE44', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 }, // 💡 패딩 확대
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' }, // 💡 10 -> 12
  noticeTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', flex: 1 }, // 💡 16 -> 18

  noticeDate: { color: '#999999', fontSize: 14 }, // 💡 12 -> 14
  expandIcon: { color: '#999999', fontSize: 18, marginLeft: 10, fontWeight: 'bold' }, // 💡 16 -> 18

  noticeContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 15,
  },
  noticeContentText: { color: '#CCCCCC', fontSize: 16, lineHeight: 24 }, // 💡 14 -> 16, 행간 22 -> 24

  // ─── 커스텀 알림 모달 전용 스타일 (통일) ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, // 💡 300 -> 320
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, // 💡 18 -> 20
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, // 💡 15 -> 17
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, // 💡 14 -> 16
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
});

export default NoticeScreen;