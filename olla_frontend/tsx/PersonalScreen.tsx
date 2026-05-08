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
  Alert 
} from 'react-native';

const API_BASE_URL = 'http://192.168.0.23:8080/api/v1';

const PersonalScreen = ({ navigation, route }: any) => {
  const { accountData } = route.params || {};

  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [armSpan, setArmSpan] = useState('');
  const [footSize, setFootSize] = useState('');

  const [isAgePublic, setIsAgePublic] = useState(true);
  const [isHeightPublic, setIsHeightPublic] = useState(true);
  const [isWeightPublic, setIsWeightPublic] = useState(true);
  const [isArmPublic, setIsArmPublic] = useState(true);
  const [isFootPublic, setIsFootPublic] = useState(true);

  const handleFinalSignup = async () => {
    if (!accountData) {
      Alert.alert('오류', '계정 정보가 유실되었습니다. 다시 가입해주세요.');
      navigation.goBack();
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        ...accountData,
        role: 'USER',
        detail: {
          age: parseInt(age) || null,
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

      if (response.status === 200 || response.status === 201) {
        
        try {
          const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            loginId: accountData.loginId,
            password: accountData.password
          });

          const accessToken = loginResponse.data?.data?.accessToken || loginResponse.data?.accessToken;
          const refreshToken = loginResponse.data?.data?.refreshToken || loginResponse.data?.refreshToken;

          if (accessToken) {
            await AsyncStorage.setItem('userToken', accessToken);
            if (refreshToken) {
              await AsyncStorage.setItem('refreshToken', refreshToken);
            }
          }
        } catch (loginError) {
          console.error("자동 로그인 에러:", loginError);
        }

        // ✅ Alert 제거 후 바로 화면 이동
        navigation.replace('Loading', { type: 'signup' });
      }
    } catch (error: any) {
      console.error("회원가입 에러:", error.response?.data);
      const errorMsg = error.response?.data?.message || '서버와의 통신 중 오류가 발생했습니다.';
      Alert.alert('가입 실패', errorMsg);
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