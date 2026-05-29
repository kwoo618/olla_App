import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Modal, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLogin } from '../ts/Login';

const LoginScreen = ({ navigation }: any) => {
  // 💡 백엔드 통신 및 데이터 로직은 모두 훅에서 가져옵니다.
  const {
    loginId, setLoginId,
    password, setPassword,
    findIdModalVisible, setFindIdModalVisible,
    findIdName, setFindIdName,
    findIdPhone, setFindIdPhone, formatPhone,
    findPwModalVisible, setFindPwModalVisible,
    findPwLoginId, setFindPwLoginId,
    findPwEmail, setFindPwEmail,
    resultModalVisible, resultModalConfig, closeResultModal,
    handleFindId, handleFindPassword, handleLogin
  } = useLogin(navigation);

  // 💡 화면 UI 제어용 상태 (포커스 테두리 전환용)
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // 💡 화면 UI 컴포넌트 제어용 Ref
  const passwordRef = useRef<TextInput>(null);
  const scrollRef = useRef<KeyboardAwareScrollView>(null);

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
        extraScrollHeight={120}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={focusedField !== null}
        resetScrollToCoords={{ x: 0, y: 0 }}
      >
        <TouchableOpacity 
          style={styles.touchableWrapper} 
          activeOpacity={1} 
          onPress={() => { Keyboard.dismiss(); handleBlur(); }}
        >
          <View style={styles.innerContainer}>
            <Image source={require('../assets/olla_logo_white.png')} style={styles.logo} />

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
                <TouchableOpacity onPress={() => { setFindIdName(''); setFindIdPhone(''); setFindIdModalVisible(true); }}>
                  <Text style={styles.accountFindText}>아이디 찾기</Text>
                </TouchableOpacity>
                <Text style={styles.accountFindDivider}>|</Text>
                <TouchableOpacity onPress={() => { setFindPwLoginId(''); setFindPwEmail(''); setFindPwModalVisible(true); }}>
                  <Text style={styles.accountFindText}>비밀번호 찾기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={{ height: 50 }} />
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* ─── 커스텀 알림 결과 모달 ─── */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={closeResultModal}>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalBox}>
            <Text style={[styles.resultModalTitle, resultModalConfig.type === 'error' ? { color: '#FF4D4D' } : { color: '#A1BE44' }]}>
              {resultModalConfig.title}
            </Text>
            <Text style={styles.resultModalMessage}>{resultModalConfig.message}</Text>
            <TouchableOpacity style={styles.resultModalBtn} onPress={closeResultModal}>
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
                onChangeText={(text) => formatPhone(text)}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleFindId}>
                <Text style={styles.submitBtnText}>아이디 찾기</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 비밀번호 찾기 모달 */}
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
    justifyContent: 'center',
    paddingVertical: 20 
  },
  touchableWrapper: { 
    width: '100%', 
    alignItems: 'center' 
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