import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../src/constants/Config';

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  read?: boolean;
  important?: boolean;
}

// 💡 내 회원권 타입
interface MyMembership {
  id: number;
  name: string;
  endDate: string;
  dDay: number;
  status: string;
}

const NotificationScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 💡 내 회원권 만료 임박 상태
  const [myMemberships, setMyMemberships] = useState<MyMembership[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(true);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('NO_TOKEN');
    return { Authorization: `Bearer ${token}` };
  };

  // 💡 내 회원권 조회 후 7일 이내 만료 임박 항목만 추출
  const fetchMyMemberships = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/memberships/my`, { headers });

      const data = response.data?.data ?? response.data ?? {};
      let list: any[] = Array.isArray(data) ? data : data.content ?? data.memberships ?? [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiring: MyMembership[] = list
        .map((m: any) => {
          const endDate = m.endDate ?? m.end_date ?? null;
          if (!endDate) return null;
          const end = new Date(endDate);
          end.setHours(0, 0, 0, 0);
          const diffMs = end.getTime() - today.getTime();
          const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          return {
            id: m.id ?? 0,
            name: m.name ?? m.membershipName ?? m.type ?? '이용권',
            endDate,
            dDay,
            status: m.status ?? 'ACTIVE',
          };
        })
        .filter((m): m is MyMembership => m !== null && m.dDay >= 0 && m.dDay <= 7 && m.status === 'ACTIVE');

      setMyMemberships(expiring);
    } catch (error: any) {
      if (error.message === 'NO_TOKEN') return;
      console.log('회원권 조회 실패:', error);
    } finally {
      setMembershipLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/notifications?page=0&size=50`, { headers });

      let list: NotificationItem[] = [];
      if (response.data) {
        const dataObj = response.data.data || response.data;
        list = dataObj.content || dataObj.data?.content || dataObj.data || dataObj;
        if (!Array.isArray(list)) list = [];
      }

      setNotifications(list);
    } catch (error: any) {
      if (error.message === 'NO_TOKEN') {
        showResultModal('인증 오류', '로그인 정보가 없습니다.', 'error', () => navigation.navigate('Login'));
        return;
      }
      const errorMessage = error.response?.data?.message || '네트워크 연결을 확인해주세요.';
      showResultModal('오류', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchMyMemberships();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchNotifications(), fetchMyMemberships()]);
    setRefreshing(false);
  }, []);

  const toggleExpandAndRead = async (item: NotificationItem) => {
    if (!item || !item.id) return;
    const isCurrentlyExpanded = expandedId === item.id;
    setExpandedId(isCurrentlyExpanded ? null : item.id);

    const isItemRead = item.isRead === true || item.read === true;
    if (!isCurrentlyExpanded && !isItemRead) {
      try {
        const headers = await getAuthHeader();
        await axios.patch(`${API_BASE_URL}/notifications/${item.id}/read`, {}, { headers });
        setNotifications(prev =>
          prev.map(noti => noti.id === item.id ? { ...noti, isRead: true, read: true } : noti)
        );
      } catch (error) {
        console.log('읽음 처리 실패:', error);
      }
    }
  };

  // 💡 만료 임박 회원권 섹션
  const renderMembershipSection = () => {
    if (membershipLoading || myMemberships.length === 0) return null;

    return (
      <View style={styles.expiringCard}>
        <View style={styles.expiringHeader}>
          <Text style={styles.expiringIcon}>🎫</Text>
          <View style={styles.expiringHeaderText}>
            <Text style={styles.expiringTitle}>이용권 만료 임박</Text>
            <Text style={styles.expiringSubTitle}>만료가 7일 이내로 남은 이용권이 있습니다</Text>
          </View>
        </View>
        {myMemberships.map((m) => {
          const ddayColor = m.dDay <= 3 ? '#FF4D4D' : '#FF9800';
          const ddayLabel = m.dDay === 0 ? 'D-Day' : `D-${m.dDay}`;
          return (
            <View key={m.id} style={styles.expiringRow}>
              <View style={styles.expiringRowLeft}>
                <View style={[styles.ddayBadge, { backgroundColor: `${ddayColor}22` }]}>
                  <Text style={[styles.ddayText, { color: ddayColor }]}>{ddayLabel}</Text>
                </View>
                <View>
                  <Text style={styles.expiringName}>{m.name}</Text>
                  <Text style={styles.expiringDate}>만료일 {m.endDate}</Text>
                </View>
              </View>
              {m.dDay <= 3 && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentBadgeText}>긴급</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
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
        keyExtractor={(item, index) => item?.id ? item.id.toString() : index.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />
        }
        ListHeaderComponent={renderMembershipSection}
        ListEmptyComponent={
          <Text style={styles.emptyText}>새로운 알림이 없습니다.</Text>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          const isRead = item.isRead === true || item.read === true;

          return (
            <View style={[styles.noticeWrapper, isRead && { opacity: 0.7 }]}>
              <TouchableOpacity
                style={styles.noticeHeader}
                onPress={() => toggleExpandAndRead(item)}
                activeOpacity={0.8}
              >
                <View style={styles.noticeInfo}>
                  <View style={styles.noticeHeaderRow}>
                    {!isRead && <View style={styles.unreadDot} />}
                    {item.important && (
                      <View style={styles.noticeBadge}>
                        <Text style={styles.noticeBadgeText}>중요</Text>
                      </View>
                    )}
                    <Text style={[styles.noticeTitle, isRead && { color: '#999999' }]}>{item.title}</Text>
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

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 30 },
  emptyText: { color: '#999999', textAlign: 'center', marginTop: 50, fontSize: 16 },

  // ─── 만료 임박 섹션 ───
  expiringCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  expiringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  expiringIcon: { fontSize: 22, marginRight: 12 },
  expiringHeaderText: { flex: 1 },
  expiringTitle: { color: '#F5C842', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  expiringSubTitle: { color: '#999999', fontSize: 12 },
  expiringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  expiringRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expiringName: { color: '#ffffff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  expiringDate: { color: '#999999', fontSize: 12 },
  ddayBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  ddayText: { fontSize: 13, fontWeight: 'bold' },
  urgentBadge: {
    backgroundColor: 'rgba(255,77,77,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentBadgeText: { color: '#FF4D4D', fontSize: 11, fontWeight: 'bold' },

  // ─── 알림 리스트 ───
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
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A1BE44', marginRight: 8 },
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

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default NotificationScreen;