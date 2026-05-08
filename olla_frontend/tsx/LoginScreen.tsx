import React, { useState } from 'react';
import axios from 'axios';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }: any) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!loginId || !password) {
      Alert.alert('알림', '아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await axios.post('http://10.0.2.2:8080/api/v1/auth/login', {
        loginId: loginId,
        password: password,
      });

      // 💡 서버 응답 구조에서 token과 role 동시 추출
      const token = response.data?.data?.accessToken;
      const role = response.data?.data?.role;

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        
        // 💡 로그인 시 반환된 권한(role) 저장
        if (role) {
          await AsyncStorage.setItem('userRole', role);
        }
        
        console.log('로그인 성공! 권한:', role);
        navigation.replace('Home');
      } else {
        console.error('토큰 추출 실패. 응답 구조:', response.data);
        Alert.alert('로그인 오류', '인증 정보를 찾을 수 없습니다.');
      }
    } catch (error: any) {
      console.error('로그인 에러:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || '아이디 또는 비밀번호를 확인해주세요.';
      Alert.alert('로그인 실패', errorMessage);
    }
  };

  return (
    <View style={styles.background}>
      <Image 
        source={require('../assets/olla_logo_white.png')}
        style={styles.logo} 
      />

      <View style={styles.container}>
        <Text style={styles.title}>로그인</Text>

        <Text style={styles.middleText}>아이디</Text>
        <TextInput 
          style={[styles.input, focusedField === 'loginId' && styles.focusedInput]} 
          placeholder="아이디를 입력하세요" 
          placeholderTextColor="#ffffff80"
          value={loginId}
          onChangeText={setLoginId}
          autoCapitalize="none"
          onFocus={() => setFocusedField('loginId')}
          onBlur={() => setFocusedField(null)}
        />
      
        <Text style={styles.middleText}>비밀번호</Text>
        <TextInput 
          style={[styles.input, focusedField === 'password' && styles.focusedInput]} 
          placeholder="비밀번호를 입력하세요" 
          secureTextEntry={true} 
          placeholderTextColor="#ffffff80"
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
        />

        <TouchableOpacity onPress={handleLogin} style={styles.button}>
          <Text style={styles.buttonText}>로그인</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>계정이 없으신가요?  </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 20 },
  container: { width: '100%', backgroundColor: '#212121', padding: 20, borderRadius: 25, alignItems: 'center' },
  logo: { width: 100, height: 100, marginBottom: 30, resizeMode: 'contain' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20, color: '#ffffff' },
  middleText: { color: '#888888', fontSize: 14, alignSelf: 'flex-start', marginBottom: 8, marginLeft: 5 },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#444444', color: '#ffffff', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  focusedInput: { borderColor: '#A1BE44' },
  button: { width: '100%', height: 50, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginTop: 10 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  signupContainer: { flexDirection: 'row', marginTop: 30 },
  signupText: { color: '#888888', fontSize: 14 },
  signupLink: { color: '#2ecc71', fontSize: 14, fontWeight: 'bold' },
});

export default LoginScreen;