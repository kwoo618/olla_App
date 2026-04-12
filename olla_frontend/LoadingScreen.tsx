import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';

const LoadingScreen = () => {
  // 1. 로딩 상태 스위치 (true: 로딩 중, false: 로딩 완료)
  const [isLoading, setIsLoading] = useState(true);

  // 2. 애니메이션 효과를 위한 상태
  const fadeAnim = useState(new Animated.Value(0))[0]; // 페이드 인
  const scaleAnim = useState(new Animated.Value(0.9))[0]; // 스케일 인

  useEffect(() => {
    // 3. 컴포넌트가 나타날 때 애니메이션 실행
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. 테스트를 위한 인위적인 로딩 시간 시뮬레이션 (3초)
    const loadingTimeout = setTimeout(() => {
      // 💡 여기서 나중에 서버의 응답을 받거나 비동기 작업이 완료되면 호출합니다.
      setIsLoading(false); 
    }, 3000); // 3000ms = 3초

    // 컴포넌트가 사라질 때 타이머 정리
    return () => clearTimeout(loadingTimeout);
  }, [fadeAnim, scaleAnim]);

  // 5. 로딩 중일 때 보여줄 UI (image_2.png 기반)
  const renderLoadingCard = () => (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.cardContent}>
        {/* 중앙 로고 아이콘 */}
        <Image 
          source={require('./assets/olla_logo_white.png')}
          style={styles.logoIcon} 
          resizeMode="contain"
        />
        
        {/* 환영 메시지 */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeTitle}>환영합니다!</Text>
          <Text style={styles.welcomeDescription}>회원가입이 완료되었습니다.</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.background}>
      {/* 6. 조건부 렌더링 */}
      {isLoading ? (
        // 로딩 중: 로딩 카드 UI 표시
        renderLoadingCard()
      ) : (
        // 로딩 완료: 나중에 홈 화면으로 연결할 자리
        // 💡 여기에 실제 홈 화면 컴포넌트(<HomeScreen />)를 넣거나 네비게이션을 구현하면 됩니다.
        <View style={styles.homePlaceholder}>
          <Text style={styles.homePlaceholderText}>홈 화면 자리 표시자</Text>
          <Text style={styles.homePlaceholderSubText}>(나중에 연결할 예정)</Text>
        </View>
      )}

      {/* 오른쪽 하단 작은 OLLA 로고 */}
      <View style={styles.bottomLogoContainer}>
        <Image 
          source={require('./assets/olla_logo_white.png')}
          style={styles.bottomLogoIcon} 
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

// 화면을 예쁘게 꾸미는 설정 (Style)
const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A', // 전체 어두운 배경
    padding: 20,
  },
  // 중앙 로딩 카드 스타일
  card: {
    backgroundColor: '#212121', // 카드 배경
    borderRadius: 25,
    paddingVertical: 40,
    paddingHorizontal: 30,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardContent: {
    flexDirection: 'row', // 아이콘과 텍스트를 가로로 배치
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 60,
    height: 60,
    marginRight: 20, // 아이콘과 텍스트 사이 간격
  },
  textContainer: {
    flexDirection: 'column', // 두 줄의 텍스트를 세로로 배치
  },
  welcomeTitle: {
    color: '#A1BE44',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  welcomeDescription: {
    color: '#A1BE44',
    fontSize: 16,
    fontWeight: 'normal',
  },
  // 홈 화면 자리 표시자 스타일
  homePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  homePlaceholderText: {
    color: '#888888',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  homePlaceholderSubText: {
    color: '#888888',
    fontSize: 18,
  },
  // 하단 작은 로고 스타일
  bottomLogoContainer: {
    position: 'absolute', // 배경 위에 띄우기
    bottom: 30,
    right: 30,
  },
  bottomLogoIcon: {
    width: 40,
    height: 40,
    opacity: 0.5, // 투명도 조절
  },
});

export default LoadingScreen;