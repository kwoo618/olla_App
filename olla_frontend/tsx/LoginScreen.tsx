import React, { useState, useRef } from 'react';
import messaging from '@react-native-firebase/messaging';
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

  // 💡 포커스 상태 (연두색 테두리 효과용)
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // 스크롤뷰 및 비밀번호 입력창 참조
  const scrollViewRef = useRef<ScrollView>(null);
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

      console.log('=== 로그인 응답 전체 ===');
      console.log(JSON.stringify(response.data, null, 2));

      const token = response.data?.data?.data?.accessToken;
      const refreshToken = response.data?.data?.data?.refreshToken;
      const role = response.data?.data?.data?.role;

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        if (role) await AsyncStorage.setItem('userRole', role);

        // 로그인 성공 시 기기의 FCM 토큰을 발급받아 서버에 저장 요청 [FCM]
        try {
          // 기기 알림 권한 승인 요청 (iOS 필수)
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (enabled) {
            // 디바이스 토큰 획득
            const fcmToken = await messaging().getToken();
            
            // 백엔드에 토큰 전달 (백엔드 팀에 해당 API 생성 요청 필요)
            await axios.post(`${API_BASE_URL}/members/fcm-token`, 
              { deviceToken: fcmToken }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
            // console.log('FCM 토큰 전송 성공:', fcmToken);
          }
        } catch (fcmError) {
          // console.error('FCM 토큰 발급/전송 오류:', fcmError);
        }

        
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
    setFocusedField('password');
    // 비밀번호 칸으로 넘어갈 때 화면 끌어올림
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 220, animated: true });
    }, 100);
  };

  // 💡 포커스를 잃었을 때 호출 (키보드 닫기)
  const handleBlur = () => {
    setFocusedField(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
          handleBlur();
        }}
      >
        <ScrollView 
          ref={scrollViewRef}
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
          
          {/* 하단 여백: 키보드 공간 확보용 */}
          <View style={{ height: 50 }} />
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

// ─────────────────────────── 스타일 (글씨 및 레이아웃 확대 적용 버전 통합) ───────────────────────────
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
    padding: 24, // 24 유지 (넓은 여백)
    borderRadius: 25, 
    alignItems: 'center',
    marginTop: 20 
  },
  logo: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 10 }, // 큰 로고 유지
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 25, color: '#ffffff' }, // 큰 폰트 유지
  middleText: { color: '#888888', fontSize: 16, alignSelf: 'flex-start', marginBottom: 8, marginLeft: 5 },
  
  input: { 
    width: '100%', 
    height: 60, // 높이 확대 유지
    borderWidth: 1, 
    borderColor: '#444444', 
    color: '#ffffff', 
    fontSize: 18, // 폰트 크기 확대 유지
    borderRadius: 12, 
    paddingHorizontal: 15, 
    marginBottom: 20 
  },
  focusedInput: { borderColor: '#A1BE44' }, // 연두색 테두리 활성화
  
  button: { 
    width: '100%', 
    height: 60, // 버튼 높이 확대 유지
    backgroundColor: '#A1BE44', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 12, 
    marginTop: 10 
  },
  buttonText: { color: '#000000', fontSize: 20, fontWeight: 'bold' }, // 검정색 글씨 + 크기 확대 유지
  
  signupContainer: { flexDirection: 'row', marginTop: 30 },
  signupText: { color: '#888888', fontSize: 16 },
  signupLink: { color: '#2ecc71', fontSize: 16, fontWeight: 'bold' },

  // ─── 커스텀 알림 모달 전용 스타일 (통일) ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default LoginScreen;