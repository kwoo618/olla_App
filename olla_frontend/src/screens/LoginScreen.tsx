import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LoginScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Olla Climbing</Text>
      <Text style={styles.subtitle}>로그인 화면입니다. 여기서 시작하세요!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontFamily: 'Pretendard-Bold', // 세팅한 폰트 적용
    fontSize: 28,
    color: '#000',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 16,
    color: '#666',
  },
});

export default LoginScreen;
