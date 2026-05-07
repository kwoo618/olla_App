import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';

const ManagerDashboard = () => {
  return (
    <View style={styles.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. 최상단 4개 핵심 지표 카드 */}
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

        {/* 2. 최근 가입회원 카드 */}
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
              {/* 💡 활동중 -> 출석으로 텍스트 변경 */}
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
              {/* 💡 비활중 -> 미출석으로 텍스트 변경 */}
              <Text style={[styles.badgeText, { color: '#8E8E8E' }]}>미출석</Text>
            </View>
          </View>
        </View>

        {/* 3. 공지사항 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>공지사항</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {/* 첫 번째 공지사항 */}
          <View style={styles.noticeListItem}>
            <View style={styles.noticeTextContent}>
              <View style={[styles.badge, { backgroundColor: 'rgba(255, 0, 0, 0.2)', alignSelf: 'flex-start', marginBottom: 8 }]}>
                <Text style={[styles.badgeText, { color: '#FF0000' }]}>중요</Text>
              </View>
              <Text style={styles.noticeTitle}>OLLA 클라이밍 센터 오픈 안내</Text>
              <Text style={styles.subText}>2026-04-05</Text>
            </View>
            {/* 💡 우측 수정/삭제 버튼 추가 */}
            <View style={styles.noticeActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Image source={require('./assets/fix.png')} style={[styles.actionIcon, { tintColor: '#A1BE44' }]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Image source={require('./assets/trash.png')} style={[styles.actionIcon, { tintColor: '#FF0000' }]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 두 번째 공지사항 */}
          <View style={[styles.noticeListItem, { marginTop: 20 }]}>
            <View style={styles.noticeTextContent}>
              <Text style={styles.noticeTitle}>우천시에 따른 우산 및 물기 대비 공지</Text>
              <Text style={styles.subText}>2026-04-05</Text>
            </View>
            {/* 💡 우측 수정/삭제 버튼 추가 */}
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

        {/* 4. 최근 커뮤니티 글 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 커뮤니티 글</Text>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          <View style={styles.noticeTextContent}>
            <View style={[styles.badge, { backgroundColor: '#00810F', alignSelf: 'flex-start', marginBottom: 8 }]}>
              <Text style={[styles.badgeText, { color: '#2CDE00' }]}>아웃도어</Text>
            </View>
            <Text style={styles.noticeTitle}>북한산 암벽등반 모집</Text>
            <Text style={[styles.subText, { color: '#ffffff', fontSize: 12 }]}>최강우 03/31</Text>
          </View>

          <View style={[styles.noticeTextContent, { marginTop: 20 }]}>
            <View style={[styles.badge, { backgroundColor: '#0072B9', alignSelf: 'flex-start', marginBottom: 8 }]}>
              <Text style={[styles.badgeText, { color: '#009DFF' }]}>센터</Text>
            </View>
            <Text style={styles.noticeTitle}>주말 클라이밍 같이 하실분!</Text>
            <Text style={[styles.subText, { color: '#ffffff', fontSize: 12 }]}>김정산 03/24</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingBottom: 50 },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricTitle: {
    color: '#999999',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // 💡 전체보기 버튼 디자인 수정 (좌우 호, 위아래 직선)
  viewAllBtn: {
    borderWidth: 1,
    borderColor: '#A1BE44',
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20, // 높이의 절반 이상을 주면 알약 형태가 됨
  },
  viewAllBtnText: {
    color: '#999999',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#444444',
    marginVertical: 15,
  },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444444',
    marginRight: 15,
  },
  infoCol: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  nameText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    color: '#999999',
    fontSize: 13,
  },

  // 💡 상태 표시 배지 디자인 수정 (좌우 호, 위아래 직선 + 고정 길이)
  badge: {
    width: 65,            // 💡 고정 너비를 주어서 글자 수와 상관없이 길이를 통일합니다!
    paddingVertical: 5,   // 위아래 여백
    alignItems: 'center', // 💡 글씨를 도형의 정중앙에 오도록 맞춥니다.
    borderRadius: 20,     // 알약 형태(Pill) 생성
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',  // 텍스트 중앙 정렬
  },

  // 💡 공지사항 리스트 아이템 및 우측 버튼 레이아웃 구조
  noticeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noticeTextContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingRight: 10, // 버튼과 너무 붙지 않게 여백
  },
  noticeTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  noticeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 6,
  },
  actionIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
});

export default ManagerDashboard;