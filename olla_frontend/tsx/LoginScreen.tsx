import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Modal, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

const LoginScreen = ({ navigation }: any) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // 💡 삭제되었던 포커스 상태(State) 복구
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  // ─── 커스텀 알림 결과 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  const handleLogin = async () => {
    if (!loginId || !password) {
      showResultModal('알림', '아이디와 비밀번호를 모두 입력해주세요.', 'info');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        loginId: loginId,
        password: password,
      });

      const token = response.data?.data?.accessToken;
      const role = response.data?.data?.role;

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        if (role) await AsyncStorage.setItem('userRole', role);
        navigation.replace('Home');
      } else {
        showResultModal('로그인 오류', '인증 정보를 찾을 수 없습니다.', 'error');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '아이디 또는 비밀번호를 확인해주세요.';
      showResultModal('로그인 실패', errorMessage, 'error');
    }
  };

  const goToPassword = () => {
    passwordRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.flex1} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
    >
      {/* 💡 빈 공간 터치 시 키보드 닫힘 및 포커스 해제 */}
      <TouchableOpacity 
        style={styles.flex1} 
        activeOpacity={1} 
        onPress={() => {
          Keyboard.dismiss();
          setFocusedField(null); // 💡 바깥을 누르면 테두리 색상 원상복구
        }}
      >
        <ScrollView 
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false} 
        >
          <View style={styles.innerContainer}>
            <Image 
              source={require('../assets/olla_logo_white.png')}
              style={styles.logo} 
            />

            <View style={styles.container}>
              <Text style={styles.title}>로그인</Text>

              <Text style={styles.middleText}>아이디</Text>
              <TextInput 
                // 💡 focusedField 상태에 따라 연두색 테두리 스타일 적용
                style={[styles.input, focusedField === 'loginId' && styles.focusedInput]} 
                placeholder="아이디를 입력하세요" 
                placeholderTextColor="#ffffff80"
                value={loginId}
                onChangeText={setLoginId}
                autoCapitalize="none"
                returnKeyType="next" 
                blurOnSubmit={false}
                onSubmitEditing={goToPassword}
                onFocus={() => setFocusedField('loginId')} // 💡 클릭 시 포커스 켜기
                onBlur={() => setFocusedField(null)} // 💡 다른 곳 클릭 시 포커스 끄기
              />
            
              <Text style={styles.middleText}>비밀번호</Text>
              <TextInput 
                ref={passwordRef}
                // 💡 focusedField 상태에 따라 연두색 테두리 스타일 적용
                style={[styles.input, focusedField === 'password' && styles.focusedInput]} 
                placeholder="비밀번호를 입력하세요" 
                secureTextEntry={true} 
                placeholderTextColor="#ffffff80"
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setFocusedField('password')} // 💡 클릭 시 포커스 켜기
                onBlur={() => setFocusedField(null)} // 💡 다른 곳 클릭 시 포커스 끄기
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
        </ScrollView>
      </TouchableOpacity>

      {/* ─── 커스텀 알림 결과 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.resultModalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ─────────────────────────── 스타일 (글씨 및 레이아웃 확대 적용) ───────────────────────────
const styles = StyleSheet.create({
  flex1: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingVertical: 20 
  },
  innerContainer: { 
    alignItems: 'center', 
    paddingHorizontal: 20,
  },
  container: { 
    width: '100%', 
    backgroundColor: '#212121', 
    padding: 24, // 💡 20 -> 24 (내부 여유 공간 확대)
    borderRadius: 25, 
    alignItems: 'center',
    marginTop: 20 
  },
  logo: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 10 }, // 💡 100 -> 120 (로고 크기 확대)
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 25, color: '#ffffff' }, // 💡 32 -> 36
  middleText: { color: '#888888', fontSize: 16, alignSelf: 'flex-start', marginBottom: 8, marginLeft: 5 }, // 💡 14 -> 16
  
  input: { 
    width: '100%', 
    height: 60, // 💡 50 -> 60 (입력창 높이 시원하게 확대)
    borderWidth: 1, 
    borderColor: '#444444', 
    color: '#ffffff', 
    fontSize: 18, // 💡 텍스트 입력 폰트 크기 확대
    borderRadius: 12, // 💡 10 -> 12
    paddingHorizontal: 15, 
    marginBottom: 20 // 💡 15 -> 20
  },
  focusedInput: { borderColor: '#A1BE44' }, // 연두색 테두리 스타일
  
  button: { 
    width: '100%', 
    height: 60, // 💡 50 -> 60 (버튼 높이 확대)
    backgroundColor: '#A1BE44', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 12, // 💡 10 -> 12
    marginTop: 10 
  },
  buttonText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' }, // 💡 18 -> 20
  
  signupContainer: { flexDirection: 'row', marginTop: 30 },
  signupText: { color: '#888888', fontSize: 16 }, // 💡 14 -> 16
  signupLink: { color: '#2ecc71', fontSize: 16, fontWeight: 'bold' }, // 💡 14 -> 16

  // ─── 커스텀 알림 모달 전용 스타일 (통일) ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, // 💡 300 -> 320
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, // 💡 18 -> 20
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, // 💡 15 -> 17
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, // 💡 14 -> 16
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, // 💡 16 -> 18
});

export default LoginScreen;