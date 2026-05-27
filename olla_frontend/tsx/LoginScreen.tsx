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
  Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// ✅ 새로 설치한 라이브러리 Import
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const LoginScreen = ({ navigation }: any) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // 💡 포커스 상태 (연두색 테두리 효과 및 스크롤 제어용)
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // 컴포넌트 참조 Ref
  const passwordRef = useRef<TextInput>(null);
  const scrollRef = useRef<KeyboardAwareScrollView>(null); // 스크롤뷰 제어용 Ref 추가

  // ─── 커스텀 알림 결과 모달 상태 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info' });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResultModalConfig({ title, message, type });
    setResultModalVisible(true);
  };

  // ===== 계정 찾기 관련 State =====
  const [findIdModalVisible, setFindIdModalVisible] = useState(false);
  const [findIdName, setFindIdName] = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');

  // 비밀번호 찾기: 아이디 + 이메일 방식
  const [findPwModalVisible, setFindPwModalVisible] = useState(false);
  const [findPwLoginId, setFindPwLoginId] = useState('');
  const [findPwEmail, setFindPwEmail] = useState('');

  // ✅ 전화번호 자동 하이픈 변환 함수
  const formatPhone = (text: string, setPhoneFunc: (val: string) => void) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
    setPhoneFunc(formatted);
  };

  const handleFindId = async () => {
    if (!findIdName || !findIdPhone) {
      showResultModal('알림', '이름과 전화번호를 모두 입력해주세요.', 'info');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/find-id`, null, {
        params: { name: findIdName, phone: findIdPhone }
      });
      
      setFindIdModalVisible(false);
      
      setTimeout(() => {
        const maskedId = response.data?.data?.data; 
        showResultModal('아이디 찾기 성공', `회원님의 아이디는\n[ ${maskedId} ] 입니다.`, 'success');
        setFindIdName('');
        setFindIdPhone('');
      }, Platform.OS === 'ios' ? 400 : 150);

    } catch (error: any) {
      setFindIdModalVisible(false);
      
      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '일치하는 정보가 없습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, Platform.OS === 'ios' ? 400 : 150);
    }
  };

  const handleFindPassword = async () => {
    if (!findPwLoginId || !findPwEmail) {
      showResultModal('알림', '아이디와 이메일을 모두 입력해주세요.', 'info');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/find-password`, null, {
        params: { loginId: findPwLoginId, email: findPwEmail }
      });
      
      setFindPwModalVisible(false);

      setTimeout(() => {
        showResultModal('비밀번호 발송', '임시 비밀번호가 등록된 이메일로 발송되었습니다.', 'success');
        setFindPwLoginId('');
        setFindPwEmail('');
      }, Platform.OS === 'ios' ? 400 : 150);

    } catch (error: any) {
      setFindPwModalVisible(false);

      setTimeout(() => {
        const errorMessage = error.response?.data?.message || '입력하신 정보가 일치하지 않습니다.';
        showResultModal('오류', errorMessage, 'error');
      }, Platform.OS === 'ios' ? 400 : 150);
    }
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

      const token = response.data?.data?.data?.accessToken;
      const refreshToken = response.data?.data?.data?.refreshToken;
      const role = response.data?.data?.data?.role;

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        if (role) await AsyncStorage.setItem('userRole', role);

        try {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (enabled) {
            const fcmToken = await messaging().getToken();
            await axios.post(`${API_BASE_URL}/members/fcm-token`, 
              { deviceToken: fcmToken }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        } catch (fcmError) {
          console.error('FCM 토큰 발급/전송 오류:', fcmError);
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
  };

  const handleFocus = (field: string) => {
    setFocusedField(field);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  return (
    <>
      <KeyboardAwareScrollView 
        ref={scrollRef}
        style={styles.flex1}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true} 
        extraScrollHeight={120} // ✅ 입력창이 포커스될 때 화면 중간까지 스크롤을 올려주는 여백
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={focusedField !== null} // ✅ 입력 중(포커스 상태)일 때만 스크롤 생성
        resetScrollToCoords={{ x: 0, y: 0 }} // ✅ 입력이 끝나고 키보드가 내려가면 원래 상태(정중앙)로 자동 복귀
      >
        <TouchableOpacity 
          style={styles.touchableWrapper} 
          activeOpacity={1} 
          onPress={() => {
            Keyboard.dismiss();
            handleBlur();
          }}
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
                onFocus={() => handleFocus('loginId')}
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
                onFocus={() => handleFocus('password')}
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

              <View style={styles.accountFindRow}>
                <TouchableOpacity onPress={() => {
                  setFindIdName('');
                  setFindIdPhone('');
                  setFindIdModalVisible(true);
                }}>
                  <Text style={styles.accountFindText}>아이디 찾기</Text>
                </TouchableOpacity>
                <Text style={styles.accountFindDivider}>|</Text>
                <TouchableOpacity onPress={() => {
                  setFindPwLoginId('');
                  setFindPwEmail('');
                  setFindPwModalVisible(true);
                }}>
                  <Text style={styles.accountFindText}>비밀번호 찾기</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
          <View style={{ height: 50 }} />
        </TouchableOpacity>
      </KeyboardAwareScrollView>

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

      {/* 아이디 찾기 모달 */}
      <Modal visible={findIdModalVisible} animationType="fade" transparent>
        <View style={styles.inputModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
            <View style={styles.inputModalBox}>
              <View style={styles.inputModalHeader}>
                <Text style={styles.inputModalTitle}>아이디 찾기</Text>
                <TouchableOpacity onPress={() => setFindIdModalVisible(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="이름을 입력하세요"
                placeholderTextColor="#999"
                value={findIdName}
                onChangeText={setFindIdName}
              />
              <TextInput
                style={styles.inputField}
                placeholder="010-0000-0000"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={13}
                value={findIdPhone}
                onChangeText={(text) => formatPhone(text, setFindIdPhone)}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleFindId}>
                <Text style={styles.submitBtnText}>아이디 찾기</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 비밀번호 찾기 모달 - 아이디 + 이메일 방식 */}
      <Modal visible={findPwModalVisible} animationType="fade" transparent>
        <View style={styles.inputModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
            <View style={styles.inputModalBox}>
              <View style={styles.inputModalHeader}>
                <Text style={styles.inputModalTitle}>비밀번호 찾기</Text>
                <TouchableOpacity onPress={() => setFindPwModalVisible(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="아이디를 입력하세요"
                placeholderTextColor="#999"
                value={findPwLoginId}
                onChangeText={setFindPwLoginId}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.inputField}
                placeholder="가입한 이메일을 입력하세요"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={findPwEmail}
                onChangeText={setFindPwEmail}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleFindPassword}>
                <Text style={styles.submitBtnText}>임시 비밀번호 발송</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', // 세로 중앙 정렬 유지
    paddingVertical: 20 
  },
  touchableWrapper: { 
    width: '100%', 
    alignItems: 'center' 
    // flex: 1은 KeyboardAwareScrollView와 충돌을 일으킬 수 있어 제거했습니다.
  }, 
  innerContainer: { 
    alignItems: 'center', 
    paddingHorizontal: 20,
    width: '100%'
  },
  container: { 
    width: '100%', 
    backgroundColor: '#212121', 
    padding: 24,
    borderRadius: 25, 
    alignItems: 'center',
    marginTop: 20 
  },
  logo: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 10 },
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 25, color: '#ffffff' },
  middleText: { color: '#888888', fontSize: 16, alignSelf: 'flex-start', marginBottom: 8, marginLeft: 5 },
  
  input: { 
    width: '100%', 
    height: 60,
    borderWidth: 1, 
    borderColor: '#444444', 
    color: '#ffffff', 
    fontSize: 18,
    borderRadius: 12, 
    paddingHorizontal: 15, 
    marginBottom: 20 
  },
  focusedInput: { borderColor: '#A1BE44' },
  
  button: { 
    width: '100%', 
    height: 60,
    backgroundColor: '#A1BE44', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 12, 
    marginTop: 10 
  },
  buttonText: { color: '#000000', fontSize: 20, fontWeight: 'bold' },
  
  signupContainer: { flexDirection: 'row', marginTop: 30 },
  signupText: { color: '#888888', fontSize: 16 },
  signupLink: { color: '#2ecc71', fontSize: 16, fontWeight: 'bold' },

  accountFindRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 25, gap: 15 },
  accountFindText: { color: '#999999', fontSize: 15, textDecorationLine: 'underline' },
  accountFindDivider: { color: '#555555', fontSize: 15 },

  inputModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  inputModalBox: { width: 320, backgroundColor: '#2A2A2A', borderRadius: 16, padding: 20 },
  inputModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  inputModalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  inputField: { backgroundColor: '#1A1A1A', color: '#FFF', borderRadius: 8, padding: 15, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#444' },
  submitBtn: { backgroundColor: '#A1BE44', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { color: '#999999', fontSize: 24, paddingHorizontal: 5 },

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' },
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});

export default LoginScreen;