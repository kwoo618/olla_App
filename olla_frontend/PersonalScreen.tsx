import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';

const PersonalScreen = ({ navigation }: any) => { // 👈 네비게이션 추가
  // 1. 데이터 저장소 (모두 선택 사항)
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [armSpan, setArmSpan] = useState('');
  const [footSize, setFootSize] = useState('');

  // 2. 공개/비공개 스위치 상태 (true: 공개/초록색, false: 비공개/회색)
  const [isAgePublic, setIsAgePublic] = useState(true);
  const [isHeightPublic, setIsHeightPublic] = useState(true);
  const [isWeightPublic, setIsWeightPublic] = useState(true);
  const [isArmPublic, setIsArmPublic] = useState(true);
  const [isFootPublic, setIsFootPublic] = useState(true);

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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>개인정보</Text>

        {/* 나이 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>나이(선택)</Text>
          <CustomSwitch isOn={isAgePublic} onToggle={() => setIsAgePublic(!isAgePublic)} />
        </View>
        <TextInput style={styles.input} placeholder="나이를 입력하세요" placeholderTextColor="#ffffff80" value={age} onChangeText={setAge} keyboardType="numeric" />

        {/* 키 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>키(선택)</Text>
          <CustomSwitch isOn={isHeightPublic} onToggle={() => setIsHeightPublic(!isHeightPublic)} />
        </View>
        <TextInput style={styles.input} placeholder="키를 입력하세요" placeholderTextColor="#ffffff80" value={height} onChangeText={setHeight} keyboardType="numeric" />

        {/* 몸무게 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>몸무게(선택)</Text>
          <CustomSwitch isOn={isWeightPublic} onToggle={() => setIsWeightPublic(!isWeightPublic)} />
        </View>
        <TextInput style={styles.input} placeholder="몸무게를 입력하세요" placeholderTextColor="#ffffff80" value={weight} onChangeText={setWeight} keyboardType="numeric" />

        {/* 팔길이 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>팔길이(선택)</Text>
          <CustomSwitch isOn={isArmPublic} onToggle={() => setIsArmPublic(!isArmPublic)} />
        </View>
        <TextInput style={styles.input} placeholder="팔길이를 입력하세요" placeholderTextColor="#ffffff80" value={armSpan} onChangeText={setArmSpan} keyboardType="numeric" />

        {/* 발 사이즈 */}
        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>발 사이즈(선택)</Text>
          <CustomSwitch isOn={isFootPublic} onToggle={() => setIsFootPublic(!isFootPublic)} />
        </View>
        <TextInput style={styles.input} placeholder="발 사이즈를 입력하세요" placeholderTextColor="#ffffff80" value={footSize} onChangeText={setFootSize} keyboardType="numeric" />

        <TouchableOpacity onPress={() => navigation.navigate('Loading')} style={styles.button}>
          <Text style={styles.buttonText}>회원가입</Text>
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
  // 커스텀 스위치 스타일
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