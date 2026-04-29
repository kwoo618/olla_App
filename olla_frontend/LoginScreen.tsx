import React, { useState } from 'react';
import axios from 'axios';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { Color } from 'react-native/types_generated/Libraries/Animated/AnimatedExports';

const LoginScreen = ({ navigation }: any) => { // 👈 네비게이션 추가

  // 사용자가 입력할 아이디, 비밀번호 관리할 상태 
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // 로그인 버튼 클릭 시 실행될 함수 
  const handleLogin = async () => {
    // 빈 칸 검사 (간단한 프론트엔드 유효성 검사)
    if (!loginId || !password) {
      Alert.alert('알림', '아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      // 서버 통신
      const response = await axios.post('http://172.29.151.129:8080/api/v1/auth/login', {
        loginId: loginId, // Java DTO의 private String loginId와 일치해야 함
        password: password, // Java DTO의 private String password와 일치해야 함
      });

      // 로그인 성공 처리
      if (response.status === 200) {
        console.log('로그인 성공! 서버 응답:', response.data);
        
        // 서버에서 준 TokenResponse(accessToken 등) 처리 로직이 여기에 들어감
        // 홈 화면으로 이동
        navigation.navigate('Home');
      }
    } catch (error: any) {
      // 로그인 실패 처리
      console.error('로그인 에러:', error.response?.data || error.message);
      
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
        {/* 아이디 입력창 */}
        <TextInput 
          style={styles.input} 
          placeholder="아이디를 입력하세요" 
          placeholderTextColor="#ffffff80"
          value={loginId}
          onChangeText={setLoginId}
          autoCapitalize="none" // 첫 글자 대문자 방지 
        />
      
        <Text style={styles.middleText}>비밀번호</Text>
        {/* 비밀번호 입력창 */}
        <TextInput 
          style={styles.input} 
          placeholder="비밀번호를 입력하세요" 
          secureTextEntry={true} 
          placeholderTextColor="#ffffff80"
          value={password}
          onChangeText={setPassword}
        />

        {/* 로그인 버튼 */}
        <TouchableOpacity 
          onPress={handleLogin}
          style={styles.button}>
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

// 화면을 예쁘게 꾸미는 설정 (Style)
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
    height: 420,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
    padding: 20,
    borderRadius: 25,
  },
  logo: {
    width: 100,       // 로고 가로 크기
    height: 100,      // 로고 세로 크기
    marginBottom: 30, // 로고 아래 '로그인' 제목과의 간격
    resizeMode: 'contain', // 이미지가 찌그러지지 않게 비율을 유지합니다.
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffffff',
  },
  middleText: {
    color: '#888888',      // 회색으로 눈에 너무 띄지 않게!
    fontSize: 14,          // 글씨 크기
    alignSelf: 'flex-start', // 왼쪽으로 정렬할지 (가운데는 'center', 오른쪽은 'flex-end')
    marginBottom: 10,      // 아래쪽(비밀번호 칸)과 10만큼 간격 띄우기
    marginLeft: 5,         // 왼쪽 벽에서 5만큼 띄우기
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#A1BE44',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
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
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 👇 새로 추가할 스타일 (쉼표를 잊지 마세요!) 👇
  signupContainer: {
    flexDirection: 'row',  // 핵심! 안의 내용물을 '가로(row)'로 나란히 배치합니다.
    marginTop: 40,         // 위에 있는 로그인 버튼과 간격 띄우기
  },
  signupText: {
    color: '#888888',      // 기본 안내 문구는 눈에 띄지 않는 회색
    fontSize: 14,
  },
  signupLink: {
    color: '#2ecc71',      // 회원가입 글자는 클릭하고 싶게 초록색으로!
    fontSize: 14,
    fontWeight: 'bold',    // 두껍게 강조
  },
});

export default LoginScreen;