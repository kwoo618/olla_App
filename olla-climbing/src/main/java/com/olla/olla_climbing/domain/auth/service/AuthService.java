package com.olla.olla_climbing.domain.auth.service;

import com.olla.olla_climbing.global.util.EmailService;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import com.olla.olla_climbing.domain.admin.service.GoogleSheetsService;
import com.olla.olla_climbing.domain.auth.dto.request.LoginRequest;
import com.olla.olla_climbing.domain.auth.dto.request.LogoutRequest;
import com.olla.olla_climbing.domain.auth.dto.request.SignupRequest;
import com.olla.olla_climbing.domain.auth.dto.response.TokenResponse;
import com.olla.olla_climbing.domain.auth.entity.RefreshToken;
import com.olla.olla_climbing.domain.auth.repository.RefreshTokenRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberDetail; 
import com.olla.olla_climbing.domain.member.entity.MemberPrivacy; 
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service    
@RequiredArgsConstructor    
@Getter 
public class AuthService {

    private final MemberRepository memberRepository;    
    private final PasswordEncoder passwordEncoder;      
    private final JwtTokenProvider jwtTokenProvider;    
    private final RefreshTokenRepository refreshTokenRepository;
    private final GoogleSheetsService googleSheetsService;
    private final EmailService emailService;

    private final Map<String, String> verificationStorage = new ConcurrentHashMap<>();

    // 1. 인증번호 발송 요청
    public void requestEmailVerification(String email) {
        String code = String.valueOf((int)(Math.random() * 899999) + 100000); // 6자리 난수
        verificationStorage.put(email, code);
        emailService.sendVerificationCode(email, code);

        // 5분 뒤 삭제 스케줄링 등을 추가할 수 있음
    }

    // 2. 인증번호 확인
    public boolean verifyCode(String email, String code) {
        String savedCode = verificationStorage.get(email);
        return savedCode != null && savedCode.equals(code);
    }

    @Transactional
    public void signup(SignupRequest request) {

        // 1. 가입하려는 아이디가 이미 있는지 확인
        if(memberRepository.findByLoginId(request.getLoginId()).isPresent()){
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }

        // 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        // 2. 전화번호를 기반으로 기존 데스크 등록 회원(더미)인지 확인
        Optional<Member> existingMemberOpt = memberRepository.findByPhone(request.getPhone());
        
        Member targetMember; // 💡 중복 선언 에러 방지를 위해 변수 하나로 통일
        boolean isBrandNewMember = false; 

        if (existingMemberOpt.isPresent()) {
            targetMember = existingMemberOpt.get();

            // 이미 앱에 가입한 진짜 회원
            if (targetMember.getLoginId() != null) {
                throw new IllegalArgumentException("이미 가입된 전화번호입니다.");
            }

            // 오프라인 데스크에서 등록된 유령 회원 -> 온라인 회원으로 승급
            targetMember.upgradeToOnlineMember(
                    request.getLoginId(),
                    encodedPassword,
                    request.getEmail(),
                    request.getGender(),
                    request.getBirthDate()
            );

        } else {
            // 기존 회원이 아니면 완전 신규 회원으로 엔티티 생성
            targetMember = request.toEntity(encodedPassword);
            isBrandNewMember = true;
        }

        // 상세 정보(MemberDetail) 연동 
        MemberDetail detail = new MemberDetail(targetMember);
        if (request.getDetail() != null) {
            SignupRequest.MemberDetailDto detailDto = request.getDetail();
            detail.update(
                detailDto.getHeight(),
                detailDto.getWeight(),
                detailDto.getArmSpan(),
                detailDto.getFootSize()
            );
        }
        targetMember.setMemberDetail(detail);

        // 개인정보 공개 설정(MemberPrivacy) 연동 
        MemberPrivacy privacy = new MemberPrivacy(targetMember);
        if (request.getPrivacy() != null) {
            SignupRequest.PrivacyDto privacyDto = request.getPrivacy();
            privacy.update(
                privacyDto.isPhonePublic(),
                privacyDto.isEmailPublic(),
                privacyDto.isHeightPublic(),
                privacyDto.isWeightPublic(),
                privacyDto.isArmSpanPublic(),
                privacyDto.isFootSizePublic()
            );
        }
        targetMember.setMemberPrivacy(privacy);

        // 최종 저장
        Member savedMember = memberRepository.save(targetMember);

        // 앱을 통해 처음 가입하는 완전 신규 회원일 때만 시트에 동기화
        if (isBrandNewMember) {
            googleSheetsService.syncNewMember(savedMember); // 시트 1
            googleSheetsService.syncUnregisteredMember(savedMember); // ✨ 시트 2
        }
    }

    // [Epic 14] 아이디 찾기 (마스킹 처리)
    @Transactional(readOnly = true)
    public String findMaskedLoginId(String name, String phone) {
        // 1. 삭제되지 않은 회원 중 전화번호로 검색
        // 검색할때 -(하이픈) 붙여야 함
        Member member = memberRepository.findByPhoneAndIsDeletedFalse(phone)
                .orElseThrow(() -> new IllegalArgumentException("일치하는 정보가 없습니다."));

        // 2. 이름 검증
        if (!member.getName().equals(name)) {
            throw new IllegalArgumentException("이름과 전화번호 정보가 일치하지 않습니다.");
        }

        String id = member.getLoginId();
        if (id == null) throw new IllegalArgumentException("앱 가입 이력이 없는 오프라인 회원입니다.");

        // 3. 마스킹 (아이디 끝 2자리만 **)
        if (id.length() < 2) return "**"; // 방어 코드
        return id.substring(0, id.length() - 2) + "**";
    }

    // [Epic 14] 비밀번호 찾기 (임시 비밀번호 이메일 발송)
    @Transactional
    public void sendTempPassword(String name, String phone, String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!member.getName().equals(name) || !member.getPhone().equals(phone)) {
            throw new IllegalArgumentException("입력하신 정보가 일치하지 않습니다.");
        }

        // 8자리 무작위 임시 비밀번호 생성
        String tempPassword = UUID.randomUUID().toString().substring(0, 8);

        // DB에 암호화하여 저장
        member.updatePassword(passwordEncoder.encode(tempPassword));

        // 이메일 발송
        emailService.sendTemporaryPassword(member.getEmail(), tempPassword);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        Member member = memberRepository.findByLoginId(request.getLoginId())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 아이디입니다."));

        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        String accessToken = jwtTokenProvider.createAccessToken(member.getLoginId(), member.getRole().name());
        String refreshToken = jwtTokenProvider.createRefreshToken(member.getLoginId());

        refreshTokenRepository.findByLoginId(member.getLoginId())
                .ifPresentOrElse(
                        token -> token.updateToken(refreshToken),
                        () -> refreshTokenRepository.save(new RefreshToken(member.getLoginId(), refreshToken))
                );

        return TokenResponse.builder()
                .grantType("Bearer")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(member.getRole().name()) // 추가[cite: 27]
                .name(member.getName())
                .build();
    }

    @Transactional
    public void logout(LogoutRequest request) {
        refreshTokenRepository.findByToken(request.getRefreshToken())
                .ifPresent(token -> {
                    refreshTokenRepository.delete(token);
                });
    }

}