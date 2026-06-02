import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, RefreshControl, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManagerNotice, formatDate, resolveImageUrl } from '../ts/ManagerNotice';

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────
const ManagerNotice = ({ route, navigation }: any) => {
  const n = useManagerNotice(navigation, route);

  // ─── 로딩 ────────────────────────────────────────────────────────────────
  if (n.loading) {
    return (
      <View style={[styles.background, styles.center]}>
        <ActivityIndicator size="large" color="#A1BE44" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.background} edges={[]}>

      {/* ─── 공지 목록 ────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={n.refreshing} onRefresh={n.onRefresh} tintColor="#A1BE44" />}
      >
        {n.sortedNotices.length === 0 ? (
          <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
        ) : (
          n.sortedNotices.map((notice) => (
            <TouchableOpacity
              key={notice.id}
              style={styles.noticeCard}
              activeOpacity={0.75}
              onPress={() => n.openDetailModal(notice)}
            >
              <View style={styles.noticeContent}>
                <View style={styles.noticeHeaderRow}>
                  {notice.important && (
                    <View style={styles.noticeBadge}>
                      <Text style={styles.noticeBadgeText}>중요</Text>
                    </View>
                  )}
                  <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                </View>
                <Text style={styles.noticeDate}>{formatDate(notice.createdAt)}</Text>
                {notice.authorName ? <Text style={styles.noticeAuthor}>{notice.authorName}</Text> : null}
              </View>

              <View style={styles.noticeActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={(e) => { e.stopPropagation(); n.openEditModal(notice); }}
                >
                  <Image source={require('../assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={(e) => { e.stopPropagation(); n.confirmDelete(notice.id); }}
                >
                  <Image source={require('../assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ─── FAB ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={n.openWriteModal}>
        <Text style={styles.fabText}>+ 작성</Text>
      </TouchableOpacity>

      {/* ─── 💡 결과 알림 모달 (OLLA 표준 규격 적용) ───────────────────────────────────────────────── */}
      <Modal visible={n.resultModalVisible} animationType="fade" transparent onRequestClose={n.closeResultModal}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, { color: n.resultModalConfig.type === 'error' ? '#FF4D4D' : '#A1BE44' }]}>
              {n.resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{n.resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={n.closeResultModal}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 공지 상세 바텀시트 ───────────────────────────────────────────── */}
      <Modal visible={n.isDetailModalVisible} animationType="fade" transparent onRequestClose={() => n.closeDetailModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => n.closeDetailModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <Animated.View style={[styles.detailBottomSheet, { height: n.detailHeightAnim, overflow: 'hidden' }]}>
            <View {...n.detailPanResponder.panHandlers} style={{ width: '100%' }}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle} numberOfLines={1}>공지 상세</Text>
                <TouchableOpacity onPress={() => n.closeDetailModal()} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.horizontalDivider} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              {n.detailNotice?.important && (
                <View style={styles.detailBadgeRow}>
                  <View style={styles.noticeBadge}>
                    <Text style={styles.noticeBadgeText}>중요</Text>
                  </View>
                </View>
              )}

              <Text style={styles.detailTitle}>{n.detailNotice?.title}</Text>

              <View style={styles.detailMetaRow}>
                <Text style={styles.detailMeta}>{formatDate(n.detailNotice?.createdAt ?? '')}</Text>
                {n.detailNotice?.authorName ? (
                  <Text style={styles.detailMeta}> · {n.detailNotice.authorName}</Text>
                ) : null}
              </View>

              <View style={styles.horizontalDivider} />

              {!!n.detailNotice?.imageUrl && (
                <Image
                  source={{ uri: resolveImageUrl(n.detailNotice.imageUrl) }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
              )}

              <Text style={styles.detailContent}>{n.detailNotice?.content}</Text>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => n.closeDetailModal(() => {
                    setTimeout(() => n.detailNotice && n.openEditModal(n.detailNotice), 100);
                  })}
                >
                  <Text style={styles.cancelBtnText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.registerBtn, { backgroundColor: '#FF4D4D' }]}
                  onPress={() => n.closeDetailModal(() => {
                    setTimeout(() => n.detailNotice && n.confirmDelete(n.detailNotice.id), 100);
                  })}
                >
                  <Text style={styles.registerBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── 작성 / 수정 바텀시트 ─────────────────────────────────────────── */}
      <Modal visible={n.isWriteModalVisible} animationType="fade" transparent onRequestClose={() => n.closeWriteModal()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => n.closeWriteModal()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }}
            pointerEvents="box-none"
          >
            <Animated.View style={[styles.bottomSheet, { height: n.writeHeightAnim, overflow: 'hidden' }]}>
              <View {...n.writePanResponder.panHandlers} style={{ width: '100%' }}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>
                    {n.modalMode === 'create' ? '새 공지 작성' : '공지 수정'}
                  </Text>
                  <TouchableOpacity onPress={() => n.closeWriteModal()} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horizontalDivider} />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.inputLabel}>공지 제목</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="공지 제목을 입력해주세요."
                  placeholderTextColor="#666666"
                  value={n.newTitle}
                  onChangeText={n.setNewTitle}
                />

                <Text style={styles.inputLabel}>공지 내용</Text>
                <TextInput
                  style={[styles.textInput, styles.contentInput]}
                  placeholder="공지 내용을 입력해 주세요."
                  placeholderTextColor="#666666"
                  multiline
                  textAlignVertical="top"
                  value={n.newContent}
                  onChangeText={n.setNewContent}
                />

                <Text style={styles.inputLabel}>이미지 첨부 (선택)</Text>
                <TouchableOpacity
                  style={styles.imagePickerWrapper}
                  activeOpacity={0.7}
                  onPress={n.handleSelectImage}
                  disabled={n.isImageUploading}
                >
                  {n.selectedImageUri ? (
                    <Image source={{ uri: n.selectedImageUri }} style={styles.imagePreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>탭하여 이미지 선택</Text>
                    </View>
                  )}
                  {n.isImageUploading && (
                    <View style={[styles.imageEditOverlay, { height: '100%', justifyContent: 'center' }]}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={[styles.imageEditOverlayText, { marginTop: 8 }]}>업로드 중...</Text>
                    </View>
                  )}
                  {n.selectedImageUri && !n.isImageUploading && (
                    <View style={styles.imageEditOverlay}>
                      <Text style={styles.imageEditOverlayText}>수정</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={{ height: 20 }} />

                <TouchableOpacity style={styles.checkboxRow} activeOpacity={0.8} onPress={() => n.setIsImportant(!n.isImportant)}>
                  <View style={[styles.checkbox, n.isImportant && styles.checkboxChecked]}>
                    {n.isImportant && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>중요 공지로 설정</Text>
                </TouchableOpacity>

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => n.closeWriteModal()} disabled={n.saving}>
                    <Text style={styles.cancelBtnText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.registerBtn, (!n.newTitle || !n.newContent || n.saving) && { opacity: 0.5 }]}
                    onPress={n.handleSaveNotice}
                    disabled={!n.newTitle || !n.newContent || n.saving}
                  >
                    {n.saving
                      ? <ActivityIndicator size="small" color="#000" />
                      : <Text style={styles.registerBtnText}>{n.modalMode === 'create' ? '등록하기' : '수정하기'}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ─── 💡 삭제 확인 모달 (OLLA 표준 규격 적용) ───────────────────────────────────────────────── */}
      <Modal visible={n.isDeleteModalVisible} animationType="fade" transparent onRequestClose={n.cancelDelete}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>공지사항을 삭제하시겠습니까?</Text>
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.btnYes} onPress={n.executeDelete}>
                <Text style={styles.btnTextBlack}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNo} onPress={n.cancelDelete}>
                <Text style={styles.btnTextWhite}>아니오</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ─── 스타일 ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  background:    { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 20 },
  center:        { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  emptyText:     { color: '#666', fontSize: 17, textAlign: 'center', marginTop: 60 },

  noticeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2C2C2C', borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 20,
    marginBottom: 15, borderWidth: 1, borderColor: '#333333',
  },
  noticeContent:   { flex: 1, flexDirection: 'column', alignItems: 'flex-start', paddingRight: 10 },
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noticeBadge:     { backgroundColor: '#A1BE44', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
  noticeBadgeText: { color: '#1A1A1A', fontSize: 12, fontWeight: 'bold' },
  noticeTitle:     { color: '#ffffff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  noticeDate:      { color: '#999999', fontSize: 14 },
  noticeAuthor:    { color: '#666666', fontSize: 13, marginTop: 4 },
  noticeActions:   { flexDirection: 'row', alignItems: 'center' },
  actionBtn:       { padding: 8, marginLeft: 4 },
  deleteBtn:       { borderRadius: 8 },
  actionIcon:      { width: 22, height: 22, resizeMode: 'contain' },

  fab: {
    position: 'absolute', bottom: 15, right: 20, backgroundColor: '#A1BE44',
    paddingHorizontal: 25, paddingVertical: 18, borderRadius: 35, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet:       { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, width: '100%' },
  detailBottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, width: '100%' },
  dragHandle:        { width: 40, height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 12, marginBottom: 20, alignSelf: 'center' },
  sheetHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sheetTitle:        { color: '#ffffff', fontSize: 23, fontWeight: 'bold', flex: 1 },
  closeIcon:         { color: '#999999', fontSize: 28, paddingHorizontal: 10 },
  horizontalDivider: { height: 1, backgroundColor: '#333333', width: '100%', marginBottom: 20 },

  inputLabel:   { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 10, marginLeft: 2 },
  textInput:    { backgroundColor: '#000', borderWidth: 1, borderColor: '#333333', borderRadius: 12, color: '#ffffff', padding: 16, fontSize: 17, marginBottom: 20 },
  contentInput: { height: 140, paddingTop: 16 },

  imagePickerWrapper:   { width: '100%', height: 140, borderRadius: 12, backgroundColor: '#2C2C2C', overflow: 'hidden', borderWidth: 1, borderColor: '#444444', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  imagePreview:         { width: '100%', height: '100%' },
  imagePlaceholder:     { alignItems: 'center' },
  imagePlaceholderText: { color: '#666666', fontSize: 15 },
  imageEditOverlay:     { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, alignItems: 'center' },
  imageEditOverlayText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },

  checkboxRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginTop: 5 },
  checkbox:        { width: 24, height: 24, borderWidth: 2, borderColor: '#666666', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#A1BE44', borderColor: '#A1BE44' },
  checkmark:       { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel:   { color: '#ffffff', fontSize: 17 },

  btnRow:          { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn:       { flex: 1, backgroundColor: '#333333', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginRight: 6 },
  cancelBtnText:   { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  registerBtn:     { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginLeft: 6 },
  registerBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  detailBadgeRow: { flexDirection: 'row', marginBottom: 10 },
  detailTitle:    { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 8, lineHeight: 30 },
  detailMetaRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  detailMeta:     { color: '#999999', fontSize: 14 },
  detailImage:    { width: '100%', height: 200, borderRadius: 12, marginBottom: 20, backgroundColor: '#2C2C2C' },
  detailContent:  { color: '#dddddd', fontSize: 16, lineHeight: 26, marginBottom: 30 },

  // ─────────────────────────── 💡 OLLA 모달창 표준 디자인 스타일 통일 적용 ───────────────────────────
  // 1. 공통 시스템 결과 알림 모달
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
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
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },

  // 2. 삭제 확인 모달
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25, 
    paddingVertical: 45, 
    paddingHorizontal: 35, 
    alignItems: 'center' 
  },
  deleteTitle: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 24 
  },
  deleteBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginRight: 5 },
  btnTextBlack: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  btnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginLeft: 5 },
  btnTextWhite: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});

export default ManagerNotice;