import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  ActivityIndicator, 
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  targetRole?: string;
}

export default function AdminNotificationScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // 입력 필드 상태
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 🛠 커스텀 결과 및 확인용 모달 상태 관리 (MYScreen 구조 차용)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    type: 'warn' | 'confirm' | 'success';
    onConfirm?: () => void;
  }>({ title: '', message: '', type: 'success' });

  const dummyNotifications: NotificationItem[] = [
    { id: 1, title: '점검 안내', body: '금일 새벽 2시부터 4시까지 서버 점검이 있을 예정입니다.', createdAt: '2026-05-25 14:30', targetRole: '전체' },
    { id: 2, title: '이벤트 시작', body: '새로운 연속 등반 챌린지가 시작되었습니다! 지금 참여하세요.', createdAt: '2026-05-24 09:00', targetRole: '전체' },
  ];

  useEffect(() => {
    fetchNotificationHistory();
  }, []);

  const fetchNotificationHistory = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.getItem('userToken');
      setNotifications(dummyNotifications);
    } catch (error) {
      console.error('알림 이력 조회 실패:', error);
      setNotifications(dummyNotifications);
    } finally {
      setIsLoading(false);
    }
  };

  // 알림 팝업 트리거 도우미
  const showAlertModal = (
    title: string, 
    message: string, 
    type: 'warn' | 'confirm' | 'success', 
    onConfirm?: () => void
  ) => {
    setModalConfig({ title, message, type, onConfirm });
    setModalVisible(true);
  };

  // 발송 프로세스 분기
  const handleSendNotification = () => {
    if (!title.trim() || !body.trim()) {
      showAlertModal('경고', '제목과 내용을 모두 입력해주세요.', 'warn');
      return;
    }

    // FCM 발송 확인 커스텀 팝업 창
    showAlertModal(
      '알림 발송', 
      '모든 유저에게 푸시 알림을 발송하시겠습니까?', 
      'confirm', 
      executeSendNotification
    );
  };

  // 실제 발송 로직 처리
  const executeSendNotification = async () => {
    setIsSending(true);
    try {
      // 비동기 전송 시뮬레이션
      const newNoti: NotificationItem = {
        id: Date.now(),
        title: title,
        body: body,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        targetRole: '전체'
      };
      setNotifications([newNoti, ...notifications]);
      setTitle('');
      setBody('');
      
      showAlertModal('성공', '푸시 알림이 성공적으로 발송되었습니다.', 'success');
    } catch (error) {
      console.error('알림 발송 실패:', error);
      showAlertModal('실패', '알림 발송 중 오류가 발생했습니다.', 'warn');
    } finally {
      setIsSending(false);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardTarget}>{item.targetRole || '전체'}</Text>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      <Text style={styles.cardDate}>{item.createdAt}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      
      {/* 상단 네비게이션 헤더 */}
      <View style={{ backgroundColor: '#1A1A1A', paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>관리자 알림 창</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.scrollContainer}
        ListHeaderComponent={
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>전체 푸시 알림 발송</Text>
            
            <TextInput
              style={styles.input}
              placeholder="알림 제목을 입력하세요"
              placeholderTextColor="#7D7D7D"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="알림 내용을 입력하세요"
              placeholderTextColor="#7D7D7D"
              multiline
              numberOfLines={4}
              value={body}
              onChangeText={setBody}
            />

            <TouchableOpacity 
              style={[styles.sendBtn, isSending && styles.disabledBtn]} 
              onPress={handleSendNotification}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>FCM 알림 일괄 발송</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />
            
            <Text style={styles.sectionTitle}>최근 발송 이력</Text>
            {isLoading && <ActivityIndicator color="#A1BE44" style={{ marginTop: 20 }} />}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>과거 발송한 알림 내역이 없습니다.</Text>
            </View>
          ) : null
        }
      />

      {/* 🛠 MYScreen의 모달 시스템 공용 테마 적용 객체 */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBox}>
            <Text style={[
              styles.resultModalTitle, 
              { color: modalConfig.type === 'warn' ? '#FF4D4D' : '#A1BE44' }
            ]}>
              {modalConfig.title}
            </Text>
            <Text style={styles.centerModalText}>{modalConfig.message}</Text>
            
            <View style={styles.centerBtnRow}>
              {modalConfig.type === 'confirm' ? (
                <>
                  <TouchableOpacity style={styles.centerBtnYes} onPress={() => {
                    setModalVisible(false);
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                  }}>
                    <Text style={styles.centerBtnYesText}>예</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.centerBtnNo} onPress={() => setModalVisible(false)}>
                    <Text style={styles.centerBtnNoText}>아니오</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.singleFullBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.singleFullBtnText}>확인</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { 
    height: 56,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2C'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  backBtnText: { color: '#ffffff', fontSize: 24, fontWeight: '500' },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  scrollContainer: { paddingBottom: 30 },
  formContainer: { padding: 20 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  input: {
    backgroundColor: '#212121',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#333'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: '#A1BE44',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  disabledBtn: { opacity: 0.5 },
  sendBtnText: { color: '#000000', fontSize: 15, fontWeight: 'bold' },
  divider: { height: 0.5, backgroundColor: '#333', marginVertical: 25 },
  historyCard: {
    backgroundColor: '#212121',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#2C2C2C',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 10 },
  cardTarget: { color: '#A1BE44', fontSize: 11, fontWeight: 'bold', backgroundColor: '#2C2C2C', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  cardBody: { color: '#CCCCCC', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardDate: { color: '#7D7D7D', fontSize: 11, textAlign: 'right' },
  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: '#7D7D7D', fontSize: 13 },

  // 🛠 MYScreen 양식 디자인 완전 정합성 보완
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  centerModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 25, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  centerModalText: { color: '#ffffff', fontSize: 16, fontWeight: '500', marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  centerBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  centerBtnYes: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  centerBtnYesText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  centerBtnNo: { flex: 1, backgroundColor: '#262626', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  centerBtnNoText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  
  // 단일 확인 전용 버튼 구조 정의
  singleFullBtn: { flex: 1, backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  singleFullBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' }
});