import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Alert } from 'react-native';
// 💡 최신 버전에 맞게 권한용 Camera와 화면용 CameraView를 둘 다 불러옵니다!
import { Camera, CameraView } from 'expo-camera';

const ManagerDashboard = () => {
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);

  // 💡 최신 규격의 권한 요청 로직
  const openScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("권한 필요", "QR 코드를 스캔하려면 카메라 접근 권한이 필요합니다.");
      return;
    }
    setScanned(false);
    setScannerVisible(true);
  };

  // 스캔 성공 시 실행되는 함수
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true); 
    
    Alert.alert(
      "출석 완료! 🎉",
      `스캔된 정보: ${data}\n(김정산 회원님의 출석이 처리되었습니다.)`,
      [
        { 
          text: "확인", 
          onPress: () => setScannerVisible(false) 
        }
      ]
    );
  };

  return (
    <View style={styles.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 최상단 4개 핵심 지표 카드 */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>총 회원 수</Text>
            <Text style={styles.metricValue}>1명</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>활성이용권</Text>
            <Text style={styles.metricValue}>1개</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>금일 방문자</Text>
            <Text style={styles.metricValue}>13명</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>커뮤니티 글</Text>
            <Text style={styles.metricValue}>2개</Text>
          </View>
        </View>

        {/* 최근 가입회원 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 가입회원</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.rowItem}>
            <Image source={require('./assets/profile.png')} style={styles.profileImg} defaultSource={undefined} />
            <View style={styles.infoCol}>
              <Text style={styles.nameText}>권클라이밍</Text>
              <Text style={styles.subText}>010-1234-5678</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(161, 190, 68, 0.2)' }]}>
              <Text style={[styles.badgeText, { color: '#A1BE44' }]}>출석</Text>
            </View>
          </View>

          <View style={[styles.rowItem, { marginTop: 15 }]}>
            <Image source={require('./assets/profile.png')} style={styles.profileImg} defaultSource={undefined} />
            <View style={styles.infoCol}>
              <Text style={styles.nameText}>김정산</Text>
              <Text style={styles.subText}>010-9876-5432</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(142, 142, 142, 0.2)' }]}>
              <Text style={[styles.badgeText, { color: '#8E8E8E' }]}>미출석</Text>
            </View>
          </View>
        </View>

        {/* 공지사항 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>공지사항</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          <View style={styles.noticeListItem}>
            <View style={styles.noticeTextContent}>
              <View style={[styles.badge, { width: 50, backgroundColor: 'rgba(255, 0, 0, 0.2)', alignSelf: 'flex-start', marginBottom: 8 }]}>
                <Text style={[styles.badgeText, { color: '#FF0000' }]}>중요</Text>
              </View>
              <Text style={styles.noticeTitle}>OLLA 클라이밍 센터 오픈 안내</Text>
              <Text style={styles.subText}>2026-04-05</Text>
            </View>
            <View style={styles.noticeActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Image source={require('./assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Image source={require('./assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.noticeListItem, { marginTop: 20 }]}>
            <View style={styles.noticeTextContent}>
              <Text style={styles.noticeTitle}>우천시에 따른 우산 및 물기 대비 공지</Text>
              <Text style={styles.subText}>2026-04-05</Text>
            </View>
            <View style={styles.noticeActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Image source={require('./assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Image source={require('./assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 최근 커뮤니티 글 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 커뮤니티 글</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          <View style={styles.noticeTextContent}>
            <View style={[styles.badge, { width: 70, backgroundColor: '#00810F', alignSelf: 'flex-start', marginBottom: 8 }]}>
              <Text style={[styles.badgeText, { color: '#2CDE00' }]}>아웃도어</Text>
            </View>
            <Text style={styles.noticeTitle}>북한산 암벽등반 모집</Text>
            <Text style={[styles.subText, { color: '#ffffff', fontSize: 12 }]}>최강우 03/31</Text>
          </View>

          <View style={[styles.noticeTextContent, { marginTop: 20 }]}>
            <View style={[styles.badge, { width: 50, backgroundColor: '#0072B9', alignSelf: 'flex-start', marginBottom: 8 }]}>
              <Text style={[styles.badgeText, { color: '#009DFF' }]}>센터</Text>
            </View>
            <Text style={styles.noticeTitle}>주말 클라이밍 같이 하실분!</Text>
            <Text style={[styles.subText, { color: '#ffffff', fontSize: 12 }]}>김정산 03/24</Text>
          </View>
        </View>

      </ScrollView>

      {/* 우측 하단 고정 스캔 버튼 */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openScanner}>
        <Image source={require('./assets/QR.png')} style={styles.fabIcon} />
      </TouchableOpacity>

      {/* QR 카메라 스캐너 모달창 */}
      <Modal visible={isScannerVisible} animationType="slide" transparent={true}>
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>QR 코드 스캔</Text>
            <TouchableOpacity onPress={() => setScannerVisible(false)}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.scannerContainer}>
            {/* 💡 최신 버전에 맞게 화면은 CameraView 로 그립니다! */}
            {isScannerVisible && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              />
            )}
            <View style={styles.targetBox} />
          </View>
          
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerDesc}>회원의 휴대폰에 있는 QR 코드를</Text>
            <Text style={styles.scannerDesc}>사각형 안으로 비춰주세요.</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingBottom: 80 }, 

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricBox: { flex: 1, backgroundColor: '#2C2C2C', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginHorizontal: 4 },
  metricTitle: { color: '#999999', fontSize: 11, fontWeight: 'bold', marginBottom: 8 },
  metricValue: { color: '#ffffff', fontSize: 15, fontWeight: '900' },

  card: { backgroundColor: '#2C2C2C', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  
  viewAllBtn: { borderWidth: 1, borderColor: '#A1BE44', backgroundColor: 'transparent', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  viewAllBtnText: { color: '#999999', fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#444444', marginVertical: 15 },

  rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileImg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#444444', marginRight: 15 },
  infoCol: { flex: 1, flexDirection: 'column', justifyContent: 'center' },
  nameText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  subText: { color: '#999999', fontSize: 13 },

  badge: { width: 65, paddingVertical: 5, alignItems: 'center', borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },

  noticeListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeTextContent: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', paddingRight: 10 },
  noticeTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  noticeActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 6, marginLeft: 6 },
  actionIcon: { width: 20, height: 20, resizeMode: 'contain' },

  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
  fabIcon: { width: 30, height: 30, tintColor: '#1A1A1A', resizeMode: 'contain' },

  scannerModalOverlay: { flex: 1, backgroundColor: '#1A1A1A' },
  scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1A1A1A' },
  scannerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  closeIcon: { color: '#999999', fontSize: 28 },
  scannerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  targetBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#A1BE44', backgroundColor: 'transparent', zIndex: 10 },
  scannerFooter: { padding: 40, alignItems: 'center', backgroundColor: '#1A1A1A' },
  scannerDesc: { color: '#ffffff', fontSize: 16, marginTop: 5 },
});

export default ManagerDashboard;