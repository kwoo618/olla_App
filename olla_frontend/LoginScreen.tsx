import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Color } from 'react-native/types_generated/Libraries/Animated/AnimatedExports';

const LoginScreen = () => {
  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>로그인</Text>

        <Text style={styles.txt}>아이디</Text>
        {/* 아이디 입력창 */}
        <TextInput 
          style={styles.input} 
          placeholder="아이디를 입력하세요" 
          placeholderTextColor="#ffffff80"
        />
      
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
    height: 500,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#ffffff',
  },
  txt: {
    width: '100%',
    height: 50,
    color: '#ffffff80',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#A1BE44',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#A1BE44',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;