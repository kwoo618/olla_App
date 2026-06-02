import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Image, RefreshControl } from 'react-native';
import { useNotice, getFullImageUrl } from '../ts/Notice';

const NoticeScreen = ({ navigation }: any) => {
  // 비즈니스 로직(Hook)에서 데이터와 제어 함수를 가져옵니다.
  const {
    loading,
    refreshing,
    notices,
    expandedId,
    toggleExpand,
    onRefresh,
    resultModalVisible,
    setResultModalVisible,
    resultModalConfig
  } = useNotice(navigation);

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
          
          // 💡 상대경로 이미지를 절대경로로 변환합니다.
          const imageUrl = getFullImageUrl(item.imageUrl);

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
                  
                  {/* ── 이미지가 있을 때만 토글 영역 내 표시 ── */}
                  {!!imageUrl && (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.noticeImage}
                      resizeMode="cover"
                    />
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* ─── 💡 커스텀 알림 결과 모달 (OLLA 표준 규격 적용) ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity 
              style={styles.resultModalBtn} 
              onPress={() => {
                setResultModalVisible(false);
                if (typeof resultModalConfig.onConfirm === 'function') {
                  resultModalConfig.onConfirm();
                }
              }}
            >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 50,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
    position: 'relative',
  },
  backBtn: { padding: 5, zIndex: 10 },
  backBtnText: { color: '#ffffff', fontSize: 28 },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    zIndex: 1
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
  noticeImage: { width: '100%', height: 200, borderRadius: 10, marginTop: 16 },

  // ─────────────────────────── 💡 OLLA 모달창 표준 디자인 스타일 통일 적용 ───────────────────────────
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25, 
    paddingVertical: 45, 
    paddingHorizontal: 35, 
    alignItems: 'center' 
  },
  resultModalTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  resultModalMessage: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 24 
  },
  resultModalBtn: { 
    width: '100%', 
    backgroundColor: '#A1BE44', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  resultModalBtnText: { 
    color: '#000000', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
});

export default NoticeScreen;