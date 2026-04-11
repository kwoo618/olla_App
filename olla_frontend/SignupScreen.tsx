import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

const SignupScreen = () => {
  // 1️⃣ 각 항목별로 사용자가 입력하는 값을 저장할 공간
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // 2️⃣ 각 항목별로 에러 메시지를 띄울 스위치(상태) 공간
  const [idError, setIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // 👇 나중에 백엔드 서버가 보내주는 결과에 따라 작동할 임시 함수입니다.
  const handleTestButton = () => {
    // 버튼을 누르면 올려주신 이미지처럼 모든 에러 멘트가 동시에 나타납니다!
    setIdError('중복된 아이디입니다.');
    setPasswordError('비밀번호는 영문, 숫자, 특수기호를 포함한 6자리 이상이어야 합니다.');
    setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
    setEmailError('이메일 형식이 올바르지 않습니다.');
    setPhoneError("전화번호는 '-'를 제외하고 입력해주십시오.");
  };

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>회원가입</Text>

        <Text style={styles.middleText}>아이디</Text>
        {/* 💡 수정됨: 아이디 입력창과 중복확인 버튼을 한 줄(row)에 배치하기 위한 박스 */}
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.inputFlex} 
            placeholder="아이디를 입력하세요" 
            placeholderTextColor="#ffffff80"
            value={id}
            onChangeText={(text) => {
              setId(text);
              setIdError(''); // 글자를 다시 치면 에러 숨김
            }}
          />
          <TouchableOpacity style={styles.duplicateCheckButton}>
            <Text style={styles.duplicateCheckText}>중복확인</Text>
          </TouchableOpacity>
        </View>
        {/* 아이디 에러 메시지 */}
        {idError !== '' && <Text style={styles.errorText}>{idError}</Text>}

        <Text style={styles.middleText}>비밀번호</Text>
        <TextInput 
          style={styles.input} 
          placeholder="비밀번호를 입력하세요" 
          placeholderTextColor="#ffffff80"
          secureTextEntry={true}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError('');
          }}
        />
        {/* 비밀번호 에러 메시지 */}
        {passwordError !== '' && <Text style={styles.errorText}>{passwordError}</Text>}

        <Text style={styles.middleText}>비밀번호 재입력</Text>
        <TextInput 
          style={styles.input} 
          placeholder="비밀번호를 다시 입력하세요" 
          placeholderTextColor="#ffffff80"
          secureTextEntry={true}
          value={passwordConfirm}
          onChangeText={(text) => {
            setPasswordConfirm(text);
            setPasswordConfirmError('');
          }}
        />
        {/* 비밀번호 재입력 에러 메시지 */}
        {passwordConfirmError !== '' && <Text style={styles.errorText}>{passwordConfirmError}</Text>}
        
        <Text style={styles.middleText}>이름</Text>
        <TextInput 
          style={styles.input} 
          placeholder="이름을 입력하세요" 
          placeholderTextColor="#ffffff80"
          value={name}
          onChangeText={setName}
        />
        {/* 이름은 에러 화면이 없으므로 생략 */}
        
        <Text style={styles.middleText}>이메일</Text>
        <TextInput 
          style={styles.input} 
          placeholder="이메일을 입력하세요" 
          placeholderTextColor="#ffffff80"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError('');
          }}
        />
        {/* 이메일 에러 메시지 */}
        {emailError !== '' && <Text style={styles.errorText}>{emailError}</Text>}
        
        <Text style={styles.middleText}>전화번호</Text>
        <TextInput 
          style={styles.input} 
          placeholder="전화번호를 입력하세요" 
          placeholderTextColor="#ffffff80"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setPhoneError('');
          }}
        />
        {/* 전화번호 에러 메시지 */}
        {phoneError !== '' && <Text style={styles.errorText}>{phoneError}</Text>}

        {/* 찐 회원가입 진행 버튼 */}
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>다음으로</Text>
        </TouchableOpacity>

        {/* 테스트용 버튼 (나중에 지우시면 됩니다) */}
        <TouchableOpacity style={[styles.button, { backgroundColor: '#333', marginTop: 10 }]} onPress={handleTestButton}>
          <Text style={[styles.buttonText, { color: '#fff' }]}>[테스트] 에러 메시지 띄우기</Text>
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
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
    padding: 20,
    borderRadius: 25,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffffff',
  },
  middleText: {
    color: '#888888',
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginLeft: 5,
  },
  // 기본 입력창 스타일
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
  // 👇 아이디 입력창 전용 스타일 (중복확인 버튼 포함)
  inputRow: {
    flexDirection: 'row', // 가로로 배치
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#A1BE44',
    borderRadius: 10,
    marginBottom: 10,
    paddingRight: 5, // 버튼이 들어갈 오른쪽 여백 확보
  },
  inputFlex: {
    flex: 1, // 남은 공간을 입력창이 모두 차지하게 함
    height: '100%',
    color: '#ffffff',
    paddingHorizontal: 15,
  },
  duplicateCheckButton: {
    backgroundColor: '#A1BE44',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  duplicateCheckText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 에러 메시지 글씨 스타일
  errorText: {
    color: '#ff4d4d', 
    fontSize: 12,
    alignSelf: 'flex-start',
    marginLeft: 5,
    marginTop: -5,    
    marginBottom: 10, 
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#A1BE44',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SignupScreen;