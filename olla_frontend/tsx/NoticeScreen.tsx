import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Image, RefreshControl, Dimensions } from 'react-native';
import { useNotice, getFullImageUrl } from '../ts/Notice';
import FastImage from 'react-native-fast-image';

const NoticeScreen = ({ navigation }: any) => {
  const {
    loading,
    refreshing,
    notices,
    expandedId,
    toggleExpand,
    onRefresh,
    resultModalVisible,
    setResultModalVisible,
    resultModalConfig,
    // 이미지 뷰어
    imageViewerVisible,
    imageViewerUrl,
    openImageViewer,
    closeImageViewer,
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

                  {/* 이미지 탭하면 전체화면 뷰어 */}
                  {!!imageUrl && (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(item.imageUrl)}>
                      <FastImage
                        source={{ uri: imageUrl, priority: FastImage.priority.high }}
                        style={styles.noticeImage}
                        resizeMode={FastImage.resizeMode.cover}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* 결과 모달 */}
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

      {/* 이미지 전체화면 뷰어 */}
      <Modal visible={imageViewerVisible} animationType="fade" transparent onRequestClose={closeImageViewer}>
        <TouchableOpacity style={styles.imageViewerOverlay} activeOpacity={1} onPress={closeImageViewer}>
          <FastImage
            source={{ uri: imageViewerUrl, priority: FastImage.priority.high }}
            style={styles.imageViewerImage}
            resizeMode={FastImage.resizeMode.contain}
          />
          <TouchableOpacity style={styles.imageViewerCloseBtn} onPress={closeImageViewer}>
            <Text style={styles.imageViewerCloseText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  center: { justifyContent: 'center', alignItems: 'center' },
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

  // 결과 모달
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: '90%', backgroundColor: '#212121', borderRadius: 25, paddingVertical: 45, paddingHorizontal: 35, alignItems: 'center' },
  resultModalTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  resultModalMessage: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', lineHeight: 24 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  // 이미지 뷰어
  imageViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imageViewerImage: { width, height: height * 0.8 },
  imageViewerCloseBtn: { position: 'absolute', top: 50, right: 20, padding: 10 },
  imageViewerCloseText: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
});

export default NoticeScreen;