import React, { useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { API_BASE_URL } from '../src/constants/Config';

const PersonalScreen = ({ navigation, route }: any) => {
  const { accountData } = route.params || {};

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [armSpan, setArmSpan] = useState('');
  const [footSize, setFootSize] = useState('');

  const [isHeightPublic, setIsHeightPublic] = useState(true);
  const [isWeightPublic, setIsWeightPublic] = useState(true);
  const [isArmPublic, setIsArmPublic] = useState(true);
  const [isFootPublic, setIsFootPublic] = useState(true);

  // ─── 커스텀 알림 모달 상태 추가 ───
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: () => {} });

  const showResultModal = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info', onConfirm: () => void = () => {}) => {
    setResultModalConfig({ title, message, type, onConfirm });
    setResultModalVisible(true);
  };

  const handleFinalSignup = async () => {
    if (!accountData) {
      showResultModal('오류', '계정 정보가 유실되었습니다. 다시 가입해주세요.', 'error', () => navigation.goBack());
      return;
    }

    try {
      // 1. 회원가입 요청
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        ...accountData,
        role: 'USER',
        detail: {
          height: parseFloat(height) || null,
          weight: parseFloat(weight) || null,
          armSpan: parseFloat(armSpan) || null,
          footSize: parseFloat(footSize) || null
        },
        privacy: {
          isPhonePublic: false,
          isEmailPublic: false,
          isHeightPublic: isHeightPublic,
          isWeightPublic: isWeightPublic,
          isArmSpanPublic: isArmPublic,
          isFootSizePublic: isFootPublic
        }
      });

      // Axios는 2xx 응답일 때 예외를 던지지 않으므로, 여기까지 왔으면 성공입니다.
      try {
        // 2. 자동 로그인 요청
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          loginId: accountData.loginId,
          password: accountData.password
        });

        // ✅ ApiResponse Depth 1단계 추가 반영 (loginResponse.data.data)
        const accessToken = loginResponse.data?.data?.data?.accessToken;
        const refreshToken = loginResponse.data?.data?.data?.refreshToken;

        if (accessToken) {
          await AsyncStorage.setItem('userToken', accessToken);
          if (refreshToken) {
            await AsyncStorage.setItem('refreshToken', refreshToken);
          }
        }
      } catch (loginError: any) {
        console.error("자동 로그인 에러:", loginError.response?.data?.message || loginError.message);
      }

      // ✅ Alert 제거 후 바로 화면 이동
      navigation.replace('Loading', { type: 'signup' });
      
    } catch (error: any) {
      // ✅ 에러 메시지 처리 반영 (error.response.data.message)
      const errorMsg = error.response?.data?.message || '서버와의 통신 중 오류가 발생했습니다.';
      console.error("회원가입 에러:", errorMsg);
      showResultModal('가입 실패', errorMsg, 'error');
    }
  };

  const CustomSwitch = ({ isOn, onToggle }: { isOn: boolean, onToggle: () => void }) => (
    <View style={styles.switchWrapper}>
      <Text style={styles.switchLabel}>{isOn ? '공개' : '비공개'}</Text>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={onToggle}
        style={[styles.switchTrack, { backgroundColor: isOn ? '#A1BE44' : '#555' }]}
      >
        <View style={[styles.switchThumb, { alignSelf: isOn ? 'flex-end' : 'flex-start' }]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.background} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.container} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
          bounces={false}
        >
          <Text style={styles.title}>개인정보</Text>

          {/* 💡 키 */}
          <View style={styles.inputHeader}>
            <Text style={styles.middleText}>키(선택)</Text>
            <CustomSwitch isOn={isHeightPublic} onToggle={() => setIsHeightPublic(!isHeightPublic)} />
          </View>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.inputText} placeholder="키를 입력하세요" placeholderTextColor="#ffffff80" value={height} onChangeText={setHeight} keyboardType="numeric" />
            <Text style={styles.unitText}>cm</Text>
          </View>

          {/* 💡 몸무게 */}
          <View style={styles.inputHeader}>
            <Text style={styles.middleText}>몸무게(선택)</Text>
            <CustomSwitch isOn={isWeightPublic} onToggle={() => setIsWeightPublic(!isWeightPublic)} />
          </View>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.inputText} placeholder="몸무게를 입력하세요" placeholderTextColor="#ffffff80" value={weight} onChangeText={setWeight} keyboardType="numeric" />
            <Text style={styles.unitText}>kg</Text>
          </View>

          {/* 💡 팔길이/윙스팬 */}
          <View style={styles.inputHeader}>
            <Text style={styles.middleText}>팔길이/윙스팬(선택)</Text>
            <CustomSwitch isOn={isArmPublic} onToggle={() => setIsArmPublic(!isArmPublic)} />
          </View>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.inputText} placeholder="팔길이를 입력하세요" placeholderTextColor="#ffffff80" value={armSpan} onChangeText={setArmSpan} keyboardType="numeric" />
            <Text style={styles.unitText}>cm</Text>
          </View>

          {/* 💡 발 사이즈 */}
          <View style={styles.inputHeader}>
            <Text style={styles.middleText}>발 사이즈(선택)</Text>
            <CustomSwitch isOn={isFootPublic} onToggle={() => setIsFootPublic(!isFootPublic)} />
          </View>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.inputText} placeholder="발 사이즈를 입력하세요" placeholderTextColor="#ffffff80" value={footSize} onChangeText={setFootSize} keyboardType="numeric" />
            <Text style={styles.unitText}>mm</Text>
          </View>

          <TouchableOpacity onPress={handleFinalSignup} style={styles.button}>
            <Text style={styles.buttonText}>회원가입 완료</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            <Text style={styles.goBackText}>이전 단계로</Text>
          </TouchableOpacity>
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
            <TouchableOpacity style={styles.resultModalBtn} onPress={() => {
              setResultModalVisible(false);
              if (typeof resultModalConfig.onConfirm === 'function') {
                resultModalConfig.onConfirm();
              }
            }}>
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
  background: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  container: {
    padding: 24, 
    alignItems: 'center',
    paddingBottom: 60,
  },
  title: {
    fontSize: 36, 
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 30,
    color: '#ffffff',
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  middleText: {
    color: '#ffffff',
    fontSize: 18, 
    marginLeft: 5,
    fontWeight: 'bold',
  },

  // 💡 단위를 고정 표시하기 위한 새로운 입력창 레이아웃
  inputWrapper: {
    width: '100%',
    height: 60, 
    backgroundColor: '#000000',
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#444444',
    paddingHorizontal: 15,
    marginBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18, 
    height: '100%',
    paddingVertical: 0, // 안드로이드 정렬 보정
  },
  unitText: {
    color: '#999999',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    color: '#888888',
    fontSize: 14, 
    marginRight: 8,
    fontWeight: 'bold',
  },
  switchTrack: {
    width: 50, 
    height: 28, 
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24, 
    height: 24, 
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  button: {
    width: '100%',
    height: 60, 
    backgroundColor: '#A1BE44',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12, 
    marginTop: 20,
  },
  buttonText: {
    color: '#000000',
    fontSize: 20, 
    fontWeight: 'bold',
  },
  goBackText: {
    color: '#888888',
    fontSize: 16, 
    textDecorationLine: 'underline',
  },

  // ─── 커스텀 알림 모달 전용 스타일 (통일) ───
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, 
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, 
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, 
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 
});

export default PersonalScreen;