import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { Color } from 'react-native/types_generated/Libraries/Animated/AnimatedExports';

const LoginScreen = () => {
  return (
    <View style={styles.background}>

      <Image 
          source={require('./assets/olla_logo_white.png')} // 파일 이름과 경로를 실제 저장 위치와 맞춰주세요!
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
        />
      
        <Text style={styles.middleText}>비밀번호</Text>
        {/* 비밀번호 입력창 */}
        <TextInput 
          style={styles.input} 
          placeholder="비밀번호를 입력하세요" 
          secureTextEntry={true} 
          placeholderTextColor="#ffffff80"
        />

        {/* 로그인 버튼 */}
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>로그인</Text>
        </TouchableOpacity>
        <View style={styles.signupContainer}>
        <Text style={styles.signupText}>계정이 없으신가요?  </Text>
        
        <TouchableOpacity onPress={() => alert('나중에 회원가입 화면으로 이동할게요!')}>
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