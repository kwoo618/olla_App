import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ActivityIndicator, Linking } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSignup } from '../ts/Signup';

const SignupScreen = ({ navigation }: any) => {
  const {
    id, handleIdChange, idError, idSuccess, isIdChecked, checkDuplicateId,
    password, validatePassword, passwordError,
    passwordConfirm, validatePasswordConfirm, passwordConfirmError,
    name, setName,
    gender, setGender,
    birth, formatBirth, birthError,
    phone, formatPhone, phoneError,
    email, validateEmail, emailError, emailSuccess, isEmailSent, isEmailVerified, sendEmailVerification, isSendingEmail,
    emailCode, setEmailCode, emailCodeError, setEmailCodeError, setEmailCodeSuccess, emailCodeSuccess, verifyEmailCode, isVerifyingEmail,
    focusedField, setFocusedField, isCheckingNext, handleNextStep,
    passwordRef, confirmRef, nameRef, birthRef, emailRef, emailCodeRef, phoneRef,
    resultModalVisible, resultModalConfig, closeResultModal, showResultModal
  } = useSignup(navigation);

  const [isTermsChecked, setIsTermsChecked] = useState(false);

  return (
    <>
      <KeyboardAwareScrollView 
        style={{ flex: 1, backgroundColor: '#1A1A1A' }}
        contentContainerStyle={styles.background} 
        enableOnAndroid={true} 
        extraScrollHeight={30} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          <Text style={styles.title}>회원가입</Text>

          {/* 아이디 */}
          <Text style={styles.middleText}>아이디</Text>
          <View style={[styles.inputRow, focusedField === 'id' && styles.focusedInput, idError !== '' && styles.inputRowError]}>
            <TextInput
              style={styles.inputFlex}
              placeholder="영문+숫자 4~15자"
              placeholderTextColor="#ffffff80"
              value={id}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="next"
              onFocus={() => setFocusedField('id')}
              onBlur={() => setFocusedField(null)}
              onChangeText={handleIdChange}
            />
            <TouchableOpacity style={styles.checkButton} onPress={checkDuplicateId}>
              <Text style={styles.checkButtonText}>중복확인</Text>
            </TouchableOpacity>
          </View>
          {idError !== '' && <Text style={styles.errorText}>{idError}</Text>}
          {idSuccess !== '' && focusedField === 'id' && <Text style={styles.successText}>{idSuccess}</Text>}

          {/* 비밀번호 */}
          <Text style={styles.middleText}>비밀번호</Text>
          <TextInput
            ref={passwordRef}
            style={[styles.input, focusedField === 'password' && styles.focusedInput, passwordError ? styles.inputError : null]}
            placeholder="영문, 숫자, 특수문자 포함 6자 이상"
            placeholderTextColor="#ffffff80"
            secureTextEntry
            autoCapitalize="none"
            textContentType="oneTimeCode"
            returnKeyType="next"
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => confirmRef.current?.focus()}
            value={password}
            onChangeText={validatePassword}
          />
          {passwordError !== '' && <Text style={styles.errorText}>{passwordError}</Text>}

          {/* 비밀번호 재입력 */}
          <Text style={styles.middleText}>비밀번호 재입력</Text>
          <TextInput
            ref={confirmRef}
            style={[styles.input, focusedField === 'confirm' && styles.focusedInput, passwordConfirmError ? styles.inputError : null]}
            placeholder="비밀번호를 다시 입력하세요"
            placeholderTextColor="#ffffff80"
            secureTextEntry
            autoCapitalize="none"
            textContentType="oneTimeCode"
            returnKeyType="next"
            onFocus={() => setFocusedField('confirm')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => nameRef.current?.focus()}
            value={passwordConfirm}
            onChangeText={validatePasswordConfirm}
          />
          {passwordConfirmError !== '' && <Text style={styles.errorText}>{passwordConfirmError}</Text>}

          <View style={styles.divider} />

          {/* 이름 */}
          <Text style={styles.middleText}>이름</Text>
          <TextInput
            ref={nameRef}
            style={[styles.input, focusedField === 'name' && styles.focusedInput]}
            placeholder="이름을 입력하세요"
            placeholderTextColor="#ffffff80"
            returnKeyType="next"
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => birthRef.current?.focus()}
            value={name}
            onChangeText={setName}
          />

          {/* 성별 */}
          <Text style={styles.middleText}>성별</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity style={[styles.genderBtn, gender === '남' && styles.genderBtnActive]} onPress={() => setGender('남')}>
              <Text style={[styles.genderBtnText, gender === '남' && styles.genderBtnTextActive]}>남자</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderBtn, gender === '여' && styles.genderBtnActive]} onPress={() => setGender('여')}>
              <Text style={[styles.genderBtnText, gender === '여' && styles.genderBtnTextActive]}>여자</Text>
            </TouchableOpacity>
          </View>

          {/* 생년월일 */}
          <Text style={styles.middleText}>생년월일</Text>
          <TextInput
            ref={birthRef}
            style={[styles.input, focusedField === 'birth' && styles.focusedInput, birthError ? styles.inputError : null]}
            placeholder="YYYY-MM-DD (예: 1999-01-01)"
            placeholderTextColor="#ffffff80"
            keyboardType="number-pad"
            maxLength={10}
            returnKeyType="next"
            onFocus={() => setFocusedField('birth')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => phoneRef.current?.focus()}
            value={birth}
            onChangeText={formatBirth}
          />
          {birthError !== '' && <Text style={styles.errorText}>{birthError}</Text>}

          {/* 전화번호 */}
          <Text style={styles.middleText}>전화번호</Text>
          <TextInput
            ref={phoneRef}
            style={[styles.input, focusedField === 'phone' && styles.focusedInput, phoneError !== '' ? styles.inputError : null]}
            placeholder="010-0000-0000"
            placeholderTextColor="#ffffff80"
            keyboardType="phone-pad"
            maxLength={13}
            returnKeyType="next"
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => emailRef.current?.focus()}
            value={phone}
            onChangeText={formatPhone}
          />
          {phoneError !== '' && <Text style={styles.errorText}>{phoneError}</Text>}

          {/* 이메일 */}
          <Text style={styles.middleText}>이메일</Text>
          <View style={[styles.inputRow, focusedField === 'email' && styles.focusedInput, emailError !== '' && styles.inputRowError]}>
            <TextInput
              ref={emailRef}
              style={[styles.inputFlex, (isSendingEmail || isEmailSent || isEmailVerified) && { color: '#999999' }]}
              placeholder="example@email.com"
              placeholderTextColor="#ffffff80"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onSubmitEditing={sendEmailVerification}
              value={email}
              onChangeText={validateEmail}
              editable={!(isSendingEmail || isEmailSent || isEmailVerified)}
            />
            <TouchableOpacity
              style={[styles.checkButton, (isSendingEmail || isEmailVerified) && styles.checkButtonDisabled]}
              onPress={sendEmailVerification}
              disabled={isSendingEmail || isEmailVerified}
            >
              <Text style={styles.checkButtonText}>
                {isEmailVerified ? '인증완료' : isSendingEmail ? '발송중' : isEmailSent ? '재발송' : '인증발송'}
              </Text>
            </TouchableOpacity>
          </View>
          {emailError !== '' && <Text style={styles.errorText}>{emailError}</Text>}
          {emailSuccess !== '' && !isEmailVerified && focusedField === 'email' && <Text style={styles.successText}>{emailSuccess}</Text>}
          {isEmailVerified && focusedField === 'email' && <Text style={styles.successText}>✓ 이메일 인증 완료</Text>}

          {/* 이메일 인증코드 입력 */}
          {isEmailSent && !isEmailVerified && (
            <>
              <Text style={styles.middleText}>인증코드</Text>
              <View style={[styles.inputRow, focusedField === 'emailCode' && styles.focusedInput, emailCodeError !== '' && styles.inputRowError]}>
                <TextInput
                  ref={emailCodeRef}
                  style={styles.inputFlex}
                  placeholder="인증코드 6자리 입력"
                  placeholderTextColor="#ffffff80"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onFocus={() => setFocusedField('emailCode')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={verifyEmailCode}
                  value={emailCode}
                  onChangeText={(text) => { setEmailCode(text); setEmailCodeError(''); setEmailCodeSuccess(''); }}
                />
                <TouchableOpacity style={[styles.checkButton, isVerifyingEmail && styles.checkButtonDisabled]} onPress={verifyEmailCode} disabled={isVerifyingEmail}>
                  <Text style={styles.checkButtonText}>{isVerifyingEmail ? '확인중' : '인증확인'}</Text>
                </TouchableOpacity>
              </View>
              {emailCodeError !== '' && <Text style={styles.errorText}>{emailCodeError}</Text>}
              {emailCodeSuccess !== '' && focusedField === 'emailCode' && <Text style={styles.successText}>{emailCodeSuccess}</Text>}
              
              <TouchableOpacity onPress={() => showResultModal('안내!', '스팸함을 확인해 보십시오.\n\n인증 메일이 스팸 또는 프로모션 탭으로\n분류되었을 수 있습니다.', 'info')}>
                <Text style={styles.spamGuideText}>이메일이 안 왔나요?</Text>
              </TouchableOpacity>
            </>
          )}

          {/* 개인정보처리방침 동의 영역 */}
          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={styles.checkboxWrapper} 
              onPress={() => setIsTermsChecked(!isTermsChecked)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, isTermsChecked && styles.checkboxChecked]}>
                {isTermsChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>(필수) 개인정보처리방침에 동의합니다.</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.termsLinkButton}
              onPress={() => Linking.openURL('https://www.termsfeed.com/live/934afa2d-b905-435a-9800-be35ec29dff2')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.termsArrow}>＞</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleNextStep}
            disabled={isCheckingNext || !isTermsChecked || !isIdChecked || !isEmailVerified} 
            style={[styles.button, (!isIdChecked || !isEmailVerified || !isTermsChecked || isCheckingNext) && styles.buttonDisabled]}
          >
            {isCheckingNext ? <ActivityIndicator color="#000000" size="small" /> : <Text style={styles.buttonText}>다음으로</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* 커스텀 알림 결과 모달 */}
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
  background: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  container: { width: '100%', backgroundColor: '#212121', padding: 24, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }, 
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 25, color: '#ffffff', textAlign: 'center' }, 
  middleText: { color: '#ffffff', fontSize: 16, alignSelf: 'flex-start', marginBottom: 8, marginLeft: 5, marginTop: 10 }, 

  input: { width: '100%', height: 60, borderWidth: 1, borderColor: '#444444', color: '#ffffff', fontSize: 18, borderRadius: 12, paddingHorizontal: 15, marginBottom: 5 }, 
  inputRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 60, borderWidth: 1, borderColor: '#444444', borderRadius: 12, marginBottom: 5, paddingRight: 5 }, 
  inputFlex: { flex: 1, height: '100%', color: '#ffffff', fontSize: 18, paddingHorizontal: 15 }, 

  checkButton: { backgroundColor: '#A1BE44', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 }, 
  checkButtonDisabled: { backgroundColor: '#555555' },
  checkButtonText: { color: '#000000', fontSize: 15, fontWeight: 'bold' }, 

  errorText: { color: '#ff4d4d', fontSize: 14, alignSelf: 'flex-start', marginLeft: 5, marginBottom: 10 }, 
  successText: { color: '#A1BE44', fontSize: 14, alignSelf: 'flex-start', marginLeft: 5, marginBottom: 10 }, 
  divider: { height: 1, backgroundColor: '#333333', marginVertical: 15 },

  focusedInput: { borderColor: '#A1BE44' },
  inputError: { borderColor: '#ff4d4d' },
  inputRowError: { borderColor: '#ff4d4d' },

  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  genderBtn: { flex: 1, backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#444444', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginHorizontal: 4 }, 
  genderBtnActive: { borderColor: '#A1BE44', backgroundColor: 'rgba(161, 190, 68, 0.1)' },
  genderBtnText: { color: '#999999', fontSize: 18, fontWeight: 'bold' }, 
  genderBtnTextActive: { color: '#A1BE44' },

  button: { width: '100%', height: 60, backgroundColor: '#A1BE44', justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginTop: 15 }, 
  buttonDisabled: { backgroundColor: '#333333' },
  buttonText: { color: '#000000', fontSize: 20, fontWeight: 'bold' }, 

  resultModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  resultModalBox: { 
    width: '90%', 
    backgroundColor: '#212121', 
    borderRadius: 25,
    paddingVertical: 45,
    paddingHorizontal: 35,
    alignItems: 'center' 
  }, 
  resultModalTitle: { 
    fontSize: 28,
    fontWeight: 'bold', 
    marginBottom: 8
  }, 
  resultModalMessage: { 
    color: '#ffffff', 
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 24 
  }, 
  resultModalBtn: { width: '100%', backgroundColor: '#A1BE44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, 
  resultModalBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }, 
  spamGuideText: { color: '#888888', fontSize: 14, alignSelf: 'flex-start', marginLeft: 5, marginTop: 6, marginBottom: 4, textDecorationLine: 'underline' },

  termsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, paddingHorizontal: 5 },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#666666', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#A1BE44', borderColor: '#A1BE44' },
  checkmark: { color: '#000000', fontSize: 14, fontWeight: 'bold' },
  termsText: { color: '#ffffff', fontSize: 16 },
  termsLinkButton: { padding: 5 },
  termsArrow: { color: '#999999', fontSize: 18, fontWeight: 'bold' },
});

export default SignupScreen;