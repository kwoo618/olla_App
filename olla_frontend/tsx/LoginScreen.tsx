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

  const [focusedField, setFocusedField] = useState<string | null>(null);
  // 💡 입력창을 눌렀을 때만 스크롤을 허용하기 위한 상태
  const [isScrollEnabled, setIsScrollEnabled] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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

  // 다음 버튼 클릭 시 실행
  const goToPassword = () => {
    passwordRef.current?.focus();
    // 비밀번호 칸으로 넘어갈 때 화면을 끌어올림
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 220, animated: true });
    }, 100);
  };

  // 💡 포커스를 잃었을 때 호출 (키보드 닫기 및 스크롤 비활성화)
  const handleBlur = () => {
    setFocusedField(null);
    setIsScrollEnabled(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.flex1} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.flex1}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // 💡 입력창을 눌렀을 때만 스크롤이 가능하게 설정
        scrollEnabled={isScrollEnabled}
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
              style={[styles.input, focusedField === 'loginId' && styles.focusedInput]} 
              placeholder="아이디를 입력하세요" 
              placeholderTextColor="#ffffff80"
              value={loginId}
              onChangeText={setLoginId}
              autoCapitalize="none"
              returnKeyType="next" 
              blurOnSubmit={false}
              onSubmitEditing={goToPassword}
              onFocus={() => {
                setFocusedField('loginId');
                setIsScrollEnabled(true); // 💡 포커스 시 스크롤 활성화
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 120, animated: true });
                }, 100);
              }}
              onBlur={handleBlur}
            />
          
            <Text style={styles.middleText}>비밀번호</Text>
            <TextInput 
              ref={passwordRef}
              style={[styles.input, focusedField === 'password' && styles.focusedInput]} 
              placeholder="비밀번호를 입력하세요" 
              secureTextEntry={true} 
              placeholderTextColor="#ffffff80"
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onFocus={() => {
                setFocusedField('password');
                setIsScrollEnabled(true); // 💡 포커스 시 스크롤 활성화
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 220, animated: true });
                }, 100);
              }}
              onBlur={handleBlur}
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

        {/* 💡 하단 여백: 키보드 공간 확보용 */}
        <View style={{ height: 50 }} />
      </ScrollView>

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

const styles = StyleSheet.create({
  flex1: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  innerContainer: { 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
  },
  container: { 
    width: '100%', 
    backgroundColor: '#212121', 
    padding: 20, 
    borderRadius: 25, 
    alignItems: 'center',
    marginTop: 20 
  },
  logo: { width: 100, height: 100, resizeMode: 'contain' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20, color: '#ffffff' },
  middleText: { color: '#888888', fontSize: 14, alignSelf: 'flex-start', marginBottom: 8, marginLeft: 5 },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#444444', color: '#ffffff', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  focusedInput: { borderColor: '#A1BE44' },
  button: { width: '100%', height: 50, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginTop: 10 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  signupContainer: { flexDirection: 'row', marginTop: 30 },
  signupText: { color: '#888888', fontSize: 14 },
  signupLink: { color: '#2ecc71', fontSize: 14, fontWeight: 'bold' },

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 300, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 15, marginBottom: 25, textAlign: 'center', lineHeight: 20 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
});

export default LoginScreen;