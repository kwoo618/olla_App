import React, { useState } from 'react';
import axios from 'axios';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

const LoginScreen = ({ navigation }: any) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // 💡 현재 포커스된 필드를 추적하는 상태 추가
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!loginId || !password) {
      Alert.alert('알림', '아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await axios.post('http://172.29.151.129:8080/api/v1/auth/login', {
        loginId: loginId,
        password: password,
      });

      // ✅ 서버 응답 구조가 { data: { accessToken: "..." } } 이므로 
      // response.data(응답바디) 안의 .data(주머니) 안의 .accessToken을 꺼냅니다.
      const token = response.data?.data?.accessToken;

      if (token) {
        // 토큰 저장 (키 이름은 NoticeScreen과 동일하게 'userToken' 사용)
        await AsyncStorage.setItem('userToken', token);
        console.log('로그인 성공! 토큰 저장 완료.');
        
        // 홈 화면으로 이동 (뒤로가기 방지를 위해 replace 사용 권장)
        navigation.replace('Home');
      } else {
        // 응답은 왔지만 토큰이 없는 경우 (백엔드 DTO @Getter 누락 등)
        console.error('토큰 추출 실패. 응답 구조:', response.data);
        Alert.alert('로그인 오류', '인증 정보를 찾을 수 없습니다.');
      }
    } catch (error: any) {
      console.error('로그인 에러:', error.response?.data || error.message);
      
      // 백엔드 공통 응답 규격이 있다면 message를 출력, 없으면 기본 메시지
      const errorMessage = error.response?.data?.message || '아이디 또는 비밀번호를 확인해주세요.';
      Alert.alert('로그인 실패', errorMessage);
    }
  };

  return (
    <View style={styles.background}>
      <Image 
        source={require('./assets/olla_logo_white.png')}
        style={styles.logo} 
      />

      <View style={styles.container}>
        <Text style={styles.title}>로그인</Text>

        <Text style={styles.middleText}>아이디</Text>
        <TextInput 
          // 💡 포커스 여부에 따라 스타일(테두리 색상)을 조건부 적용
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
          // 💡 포커스 여부에 따라 스타일(테두리 색상)을 조건부 적용
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
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 20,
  },
  container: {
    width: '100%',
    backgroundColor: '#212121',
    padding: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ffffff',
  },
  middleText: {
    color: '#888888',
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#444444', // 💡 기본 색상을 어두운 회색으로 변경
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  focusedInput: {
    borderColor: '#A1BE44', // 💡 포커스 됐을 때만 초록색으로 변경
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#A1BE44',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff', // 원래 코드는 #ffffff 였으므로 그대로 유지
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 30,
  },
  signupText: {
    color: '#888888',
    fontSize: 14,
  },
  signupLink: {
    color: '#2ecc71',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;