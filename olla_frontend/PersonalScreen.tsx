import React, { useState } from 'react';
import axios from 'axios';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert 
} from 'react-native';

const PersonalScreen = ({ navigation, route }: any) => {
  // 1️⃣ 이전 화면(SignupScreen)에서 전달받은 데이터 추출
  const { accountData } = route.params || {};

  // 2. 데이터 저장소 (신체 정보)
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [armSpan, setArmSpan] = useState('');
  const [footSize, setFootSize] = useState('');

  // 3. 공개/비공개 스위치 상태
  const [isAgePublic, setIsAgePublic] = useState(true);
  const [isHeightPublic, setIsHeightPublic] = useState(true);
  const [isWeightPublic, setIsWeightPublic] = useState(true);
  const [isArmPublic, setIsArmPublic] = useState(true);
  const [isFootPublic, setIsFootPublic] = useState(true);

  // 🚀 최종 회원가입 제출 함수
  const handleFinalSignup = async () => {
    // 이전 데이터가 없는 경우 방어 로직
    if (!accountData) {
      Alert.alert('오류', '계정 정보가 유실되었습니다. 다시 가입해주세요.');
      navigation.goBack();
      return;
    }

    try {
      // 💡 [수정 1] 마법의 주소 10.0.2.2 로 변경!
      const response = await axios.post('http://192.168.45.12:8080/api/v1/auth/signup', {
        ...accountData, // 아이디, 비번, 이름, 이메일, 전화번호 등
        role: 'USER',
        detail: {
          age: parseInt(age) || null,
          height: parseFloat(height) || null,
          weight: parseFloat(weight) || null,
          armSpan: parseFloat(armSpan) || null,
          footSize: parseFloat(footSize) || null
        },
        privacy: {
          isPhonePublic: false, // 연락처는 기본 비공개
          isEmailPublic: false,
          isHeightPublic: isHeightPublic,
          isWeightPublic: isWeightPublic,
          isArmSpanPublic: isArmPublic,
          isFootSizePublic: isFootPublic
        }
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert('성공', '회원가입이 성공적으로 완료되었습니다!', [
          // 💡 [수정 2] 로딩 스크린에 'signup' 꼬리표를 달아서 보냅니다!
          { text: '확인', onPress: () => navigation.replace('Loading', { type: 'signup' }) }
        ]);
      }
    } catch (error: any) {
      console.error("회원가입 에러:", error.response?.data);
      const errorMsg = error.response?.data?.message || '서버와의 통신 중 오류가 발생했습니다.';
      Alert.alert('가입 실패', errorMsg);
    }
  };

  // 커스텀 스위치 컴포넌트
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
    <View style={styles.background}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>개인정보</Text>

        {/* 나이 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>나이(선택)</Text>
          <CustomSwitch isOn={isAgePublic} onToggle={() => setIsAgePublic(!isAgePublic)} />
        </View>
        <TextInput style={styles.input} placeholder="나이를 입력하세요" placeholderTextColor="#ffffff80" value={age} onChangeText={setAge} keyboardType="numeric" />

        {/* 키 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>키(cm)</Text>
          <CustomSwitch isOn={isHeightPublic} onToggle={() => setIsHeightPublic(!isHeightPublic)} />
        </View>
        <TextInput style={styles.input} placeholder="키를 입력하세요" placeholderTextColor="#ffffff80" value={height} onChangeText={setHeight} keyboardType="numeric" />

        {/* 몸무게 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>몸무게(kg)</Text>
          <CustomSwitch isOn={isWeightPublic} onToggle={() => setIsWeightPublic(!isWeightPublic)} />
        </View>
        <TextInput style={styles.input} placeholder="몸무게를 입력하세요" placeholderTextColor="#ffffff80" value={weight} onChangeText={setWeight} keyboardType="numeric" />

        {/* 팔길이 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>팔길이(윙스팬 cm)</Text>
          <CustomSwitch isOn={isArmPublic} onToggle={() => setIsArmPublic(!isArmPublic)} />
        </View>
        <TextInput style={styles.input} placeholder="팔길이를 입력하세요" placeholderTextColor="#ffffff80" value={armSpan} onChangeText={setArmSpan} keyboardType="numeric" />

        {/* 발 사이즈 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>발 사이즈(mm)</Text>
          <CustomSwitch isOn={isFootPublic} onToggle={() => setIsFootPublic(!isFootPublic)} />
        </View>
        <TextInput style={styles.input} placeholder="발 사이즈를 입력하세요" placeholderTextColor="#ffffff80" value={footSize} onChangeText={setFootSize} keyboardType="numeric" />

        <TouchableOpacity onPress={handleFinalSignup} style={styles.button}>
          <Text style={styles.buttonText}>회원가입 완료</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 15 }}>
          <Text style={{ color: '#888' }}>이전 단계로</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  container: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
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
    fontSize: 16,
    marginLeft: 5,
  },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#000000',
    color: '#ffffff',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    color: '#888888',
    fontSize: 12,
    marginRight: 8,
  },
  switchTrack: {
    width: 45,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  button: {
    width: '100%',
    height: 60,
    backgroundColor: '#A1BE44',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    marginTop: 20,
  },
  buttonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default PersonalScreen;