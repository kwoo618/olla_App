import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminNotification } from '../ts/AdminNotification';

const AdminNotificationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  
  // 로직 파일에서 필요한 상태와 함수를 가져옵니다.
  const {
    alerts,
    loading,
    expiringMembers,
    expiringLoading,
    refreshing,
    expandedId,
    resultModalVisible,
    resultModalConfig,
    onRefresh,
    toggleExpandAndRead,
    closeResultModal 
  } = useAdminNotification(navigation);

  const renderExpiringSection = () => {
    if (expiringLoading || expiringMembers.length === 0) return null;

    const urgent  = expiringMembers.filter(m => m.dDay <= 3);
    const warning = expiringMembers.filter(m => m.dDay > 3 && m.dDay <= 7);

    return (
      <View style={styles.expiringCard}>
        <View style={styles.expiringHeader}>
          <View style={styles.expiringHeaderText}>
            <Text style={styles.expiringTitle}>만료 임박 회원 알림</Text>
            <Text style={styles.expiringSubTitle}>
              {urgent.length > 0 && `긴급 ${urgent.length}명`}
              {urgent.length > 0 && warning.length > 0 && ' · '}
              {warning.length > 0 && `주의 ${warning.length}명`}
            </Text>
          </View>
        </View>

        {expiringMembers.map((m, idx) => {
          const ddayColor = m.dDay <= 3 ? '#FF4D4D' : '#FF9800';
          const ddayLabel = m.dDay === 0 ? 'D-Day' : `D-${m.dDay}`;
          const maskedPhone = m.phone ? m.phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3') : '-';

          return (
            <View key={m.id} style={[styles.expiringRow, idx < expiringMembers.length - 1 && styles.expiringRowBorder]}>
              <View style={styles.expiringRowLeft}>
                <View style={[styles.ddayBadge, { backgroundColor: `${ddayColor}22` }]}>
                  <Text style={[styles.ddayText, { color: ddayColor }]}>{ddayLabel}</Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {m.dDay <= 3 && <View style={styles.urgentDot} />}
                    <Text style={[styles.expiringName, m.dDay <= 3 && { color: '#FF4D4D' }]}>{m.name}</Text>
                  </View>
                  <Text style={styles.expiringPhone}>{maskedPhone}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.expiringDate}>{m.endDate}</Text>
                {m.dDay <= 3 && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>긴급</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading && expiringLoading) {
    return (
      <View style={[styles.background, styles.center]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <View style={[styles.topNav, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.topNavInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>관리자 알림함</Text>
        </View>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item, index) => item?.id ? item.id.toString() : index.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1BE44" />}
        ListHeaderComponent={renderExpiringSection()}
        ListEmptyComponent={<Text style={styles.emptyText}>수신된 알림이 없습니다.</Text>}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          const isRead = item.read === true;

          return (
            <View style={[styles.noticeWrapper, isRead && { opacity: 0.7 }]}>
              <TouchableOpacity style={styles.noticeHeader} onPress={() => toggleExpandAndRead(item)} activeOpacity={0.8}>
                <View style={styles.noticeInfo}>
                  <View style={styles.noticeHeaderRow}>
                    {!isRead && <View style={styles.unreadDot} />}
                    <Text style={[styles.noticeTitle, isRead && { color: '#999999' }]}>{item.title}</Text>
                  </View>
                  <Text style={styles.noticeDate}>{item.createdAt ? item.createdAt.split('T')[0] : ''}</Text>
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

      {/* 💡 복잡했던 모달 닫기 로직을 closeResultModal 하나로 깔끔하게 처리 */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={closeResultModal}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={closeResultModal}>
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
  topNav: { backgroundColor: '#1A1A1A', borderBottomWidth: 0.5, borderBottomColor: '#2A2A2A' },
  topNavInner: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, position: 'relative' },
  backBtn: { padding: 5, zIndex: 10 },
  backBtnText: { color: '#ffffff', fontSize: 28 },
  headerTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#ffffff', fontSize: 20, fontWeight: 'bold', zIndex: 1 },
  listContent: { padding: 20, paddingBottom: 30 },
  emptyText: { color: '#999999', textAlign: 'center', marginTop: 50, fontSize: 16 },

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
  expiringHeaderIcon: { fontSize: 22, marginRight: 12 },
  expiringHeaderText: { flex: 1 },
  expiringTitle: { color: '#F5C842', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  expiringSubTitle: { color: '#999999', fontSize: 12 },
  expiringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  expiringRowBorder: { borderBottomWidth: 1, borderBottomColor: '#333333' },
  expiringRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  urgentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4D4D', marginRight: 5 },
  expiringName: { color: '#ffffff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  expiringPhone: { color: '#999999', fontSize: 12 },
  expiringDate: { color: '#999999', fontSize: 12, marginBottom: 4 },
  ddayBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, minWidth: 52, alignItems: 'center' },
  ddayText: { fontSize: 13, fontWeight: 'bold' },
  urgentBadge: { backgroundColor: 'rgba(255,77,77,0.15)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  urgentBadgeText: { color: '#FF4D4D', fontSize: 11, fontWeight: 'bold' },

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
  noticeTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  noticeDate: { color: '#999999', fontSize: 14 },
  expandIcon: { color: '#999999', fontSize: 18, marginLeft: 10, fontWeight: 'bold' },
  noticeContent: { paddingHorizontal: 20, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#333333', paddingTop: 15 },
  noticeContentText: { color: '#CCCCCC', fontSize: 16, lineHeight: 24 },
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default AdminNotificationScreen;