import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { usePersonal } from '../ts/Personal';

const PersonalScreen = ({ navigation, route }: any) => {
  // 비즈니스 로직(Hook)에서 데이터와 제어 함수를 가져옵니다.
  const {
    height, setHeight,
    weight, setWeight,
    armSpan, setArmSpan,
    footSize, setFootSize,
    isHeightPublic, setIsHeightPublic,
    isWeightPublic, setIsWeightPublic,
    isArmPublic, setIsArmPublic,
    isFootPublic, setIsFootPublic,
    resultModalVisible, resultModalConfig, closeResultModal,
    handleFinalSignup
  } = usePersonal(navigation, route);

  // 내부 컴포넌트로 분리했던 스위치
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
    <>
      {/* ✅ 통합된 KeyboardAwareScrollView 적용 
          전체를 감싸던 TouchableOpacity를 제거했습니다. 
          keyboardShouldPersistTaps="handled" 속성이 화면 빈 공간 클릭 시 키보드를 닫아주는 역할을 대신합니다. */}
      <KeyboardAwareScrollView 
        style={styles.background} 
        contentContainerStyle={styles.container}
        enableOnAndroid={true} // 안드로이드 호환성 핵심
        extraScrollHeight={30} // 키보드와 입력창 사이 여유 공간 추가
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.title}>개인정보</Text>

        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>키(선택)</Text>
          <CustomSwitch isOn={isHeightPublic} onToggle={() => setIsHeightPublic(!isHeightPublic)} />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.inputText} 
            placeholder="키를 입력하세요" 
            placeholderTextColor="#ffffff80" 
            value={height} 
            onChangeText={setHeight} 
            keyboardType="numeric" 
          />
          <Text style={styles.unitText}>cm</Text>
        </View>

        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>몸무게(선택)</Text>
          <CustomSwitch isOn={isWeightPublic} onToggle={() => setIsWeightPublic(!isWeightPublic)} />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.inputText} 
            placeholder="몸무게를 입력하세요" 
            placeholderTextColor="#ffffff80" 
            value={weight} 
            onChangeText={setWeight} 
            keyboardType="numeric" 
          />
          <Text style={styles.unitText}>kg</Text>
        </View>

        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>팔길이/윙스팬(선택)</Text>
          <CustomSwitch isOn={isArmPublic} onToggle={() => setIsArmPublic(!isArmPublic)} />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.inputText} 
            placeholder="팔길이를 입력하세요" 
            placeholderTextColor="#ffffff80" 
            value={armSpan} 
            onChangeText={setArmSpan} 
            keyboardType="numeric" 
          />
          <Text style={styles.unitText}>cm</Text>
        </View>

        <View style={styles.inputHeader}>
          <Text style={styles.middleText}>발 사이즈(선택)</Text>
          <CustomSwitch isOn={isFootPublic} onToggle={() => setIsFootPublic(!isFootPublic)} />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.inputText} 
            placeholder="발 사이즈를 입력하세요" 
            placeholderTextColor="#ffffff80" 
            value={footSize} 
            onChangeText={setFootSize} 
            keyboardType="numeric" 
          />
          <Text style={styles.unitText}>mm</Text>
        </View>

        <TouchableOpacity onPress={handleFinalSignup} style={styles.button}>
          <Text style={styles.buttonText}>회원가입 완료</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={styles.goBackText}>이전 단계로</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* ✅ 모달은 스크롤뷰 외부에 배치하여 안전하게 렌더링 */}
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
    </>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1A1A1A' },
  container: { padding: 24, alignItems: 'center', paddingBottom: 60, width: '100%' },
  title: { fontSize: 36, fontWeight: 'bold', marginTop: 60, marginBottom: 30, color: '#ffffff', alignSelf: 'center' },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 },
  middleText: { color: '#ffffff', fontSize: 18, marginLeft: 5, fontWeight: 'bold' },
  inputWrapper: { width: '100%', height: 60, backgroundColor: '#000000', borderRadius: 12, borderWidth: 1, borderColor: '#444444', paddingHorizontal: 15, marginBottom: 25, flexDirection: 'row', alignItems: 'center' },
  inputText: { flex: 1, color: '#ffffff', fontSize: 18, height: '100%', paddingVertical: 0 },
  unitText: { color: '#999999', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  switchWrapper: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { color: '#888888', fontSize: 14, marginRight: 8, fontWeight: 'bold' },
  switchTrack: { width: 50, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  switchThumb: { width: 24, height: 24, backgroundColor: '#ffffff', borderRadius: 12 },
  button: { width: '100%', height: 60, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginTop: 20 },
  buttonText: { color: '#000000', fontSize: 20, fontWeight: 'bold' },
  goBackText: { color: '#888888', fontSize: 16, textDecorationLine: 'underline' },
  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { width: 320, backgroundColor: '#212121', borderRadius: 16, padding: 20, alignItems: 'center' }, 
  resultModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 }, 
  resultModalMessage: { color: '#ffffff', fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 22 }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, 
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 
});

export default PersonalScreen; 