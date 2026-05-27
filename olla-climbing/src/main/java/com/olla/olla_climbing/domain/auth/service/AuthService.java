package com.olla.olla_climbing.domain.auth.service;

import com.olla.olla_climbing.domain.auth.dto.request.ChangePasswordRequest;
import com.olla.olla_climbing.domain.auth.entity.EmailVerification;
import com.olla.olla_climbing.domain.auth.repository.EmailVerificationRepository;
import com.olla.olla_climbing.global.util.EmailService;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final GoogleSheetsService googleSheetsService;
    private final EmailService emailService;
    private final EmailVerificationRepository verificationRepository;

    // =========================================================================
    // 1. [Epic 14] 이메일 인증 관련 (DB 정석 로직)
    // =========================================================================

    /**
     * 인증번호 발송 및 DB 저장
     */
    @Transactional
    public void requestEmailVerification(String email) {
        String code = String.valueOf((int)(Math.random() * 899999) + 100000);

        EmailVerification verification = EmailVerification.builder()
                .email(email)
                .code(code)
                .expiredAt(LocalDateTime.now().plusMinutes(5)) // 5분 유효
                .isConfirmed(false)
                .build();

        verificationRepository.save(verification);
        emailService.sendVerificationCode(email, code);
    }

    /**
     * 인증번호 검증 (프론트 확인 버튼 클릭 시)
     */
    @Transactional
    public boolean verifyEmailCode(String email, String code) {
        EmailVerification verification = verificationRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new IllegalArgumentException("인증 요청 내역이 없습니다."));

        if (verification.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("인증 시간이 만료되었습니다.");
        }

        if (!verification.getCode().equals(code)) {
            throw new IllegalArgumentException("인증 번호가 일치하지 않습니다.");
        }

        verification.confirm(); // isConfirmed = true 처리
        return true;
    }

    // =========================================================================
    // 2. 회원가입 및 승급 (비즈니스 핵심)
    // =========================================================================

    @Transactional
    public TokenResponse signup(SignupRequest request) {
        // 1. 이메일 인증 여부 최종 확인
        EmailVerification verification = verificationRepository.findTopByEmailOrderByCreatedAtDesc(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("이메일 인증 기록이 없습니다."));

        if (!verification.isConfirmed()) {
            throw new IllegalArgumentException("이메일 인증이 완료되지 않았습니다.");
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());

        // 2. 전화번호를 통해 기존 회원(오프라인 가입자 포함) 데이터가 있는지 먼저 조회합니다.
        Optional<Member> existingMemberOpt = memberRepository.findByPhone(request.getPhone());
        Member targetMember;
        boolean isBrandNewMember = false;

        // 3. 기존 회원이 존재하는 경우, 해당 회원을 온라인 앱 계정으로 승급(업데이트) 처리합니다.
        if (existingMemberOpt.isPresent()) {
            targetMember = existingMemberOpt.get();

            // 🌟 [버그 수정]: 가상 ID가 채워진 오프라인 회원 우회를 위해 '비밀번호' 존재 유무로 가입 여부를 판단합니다.
            if (org.springframework.util.StringUtils.hasText(targetMember.getPassword())) {
                throw new IllegalArgumentException("이미 가입된 전화번호입니다.");
            }

            // 아이디 중복 체크 (자신이 가진 임시 ID가 아닐 때만 중복 예외 처리)
            if (!request.getLoginId().equals(targetMember.getLoginId()) &&
                    memberRepository.findByLoginId(request.getLoginId()).isPresent()) {
                throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
            }

            // 오프라인 유령 계정을 정식 온라인 앱 계정으로 승급(매핑)
            targetMember.upgradeToOnlineMember(
                    request.getLoginId(), encodedPassword, request.getEmail(),
                    request.getGender(), request.getBirthDate()
            );
        } else {
            // 완전히 처음 방문한 신규 회원인 경우
            if (memberRepository.findByLoginId(request.getLoginId()).isPresent()) {
                throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
            }
            if (memberRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("이미 가입된 이메일입니다.");
            }

            targetMember = request.toEntity(encodedPassword);
            isBrandNewMember = true;
        }

        // 신체 스펙 및 개인정보 동의 데이터 설정
        initializeMemberDetails(targetMember, request);
        Member savedMember = memberRepository.save(targetMember);

        // 신규 회원인 경우에만 구글 시트 신규 라인 배치
        if (isBrandNewMember) {
            googleSheetsService.syncNewMember(savedMember);
            googleSheetsService.syncUnregisteredMember(savedMember);
        }

        return createTokenResponse(savedMember);
    }

    // 상세정보 설정을 위한 내부 메서드 (코드 가독성을 위해 분리)
    private void initializeMemberDetails(Member member, SignupRequest request) {
        MemberDetail detail = new MemberDetail(member);
        if (request.getDetail() != null) {
            SignupRequest.MemberDetailDto d = request.getDetail();
            detail.update(d.getHeight(), d.getWeight(), d.getArmSpan(), d.getFootSize());
        }
        member.setMemberDetail(detail);

        MemberPrivacy privacy = new MemberPrivacy(member);
        if (request.getPrivacy() != null) {
            SignupRequest.PrivacyDto p = request.getPrivacy();
            privacy.update(p.isPhonePublic(), p.isEmailPublic(), p.isHeightPublic(),
                    p.isWeightPublic(), p.isArmSpanPublic(), p.isFootSizePublic());
        }
        member.setMemberPrivacy(privacy);
    }

    // =========================================================================
    // 3. 아이디/비밀번호 찾기 및 로그인 (기존 로직 유지 및 보완)
    // =========================================================================

    @Transactional(readOnly = true)
    public String findMaskedLoginId(String name, String phone) {
        Member member = memberRepository.findByPhoneAndIsDeletedFalse(phone)
                .orElseThrow(() -> new IllegalArgumentException("일치하는 정보가 없습니다."));

        if (!member.getName().equals(name)) {
            throw new IllegalArgumentException("이름과 전화번호 정보가 일치하지 않습니다.");
        }

        String id = member.getLoginId();
        if (id == null) throw new IllegalArgumentException("앱 가입 이력이 없는 오프라인 회원입니다.");

        return id.substring(0, id.length() - 2) + "**";
    }

    @Transactional
    public void sendTempPassword(String loginId, String email) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!member.getEmail().equals(email) || member.getEmail() == null) {
            throw new IllegalArgumentException("입력하신 정보가 일치하지 않습니다.");
        }

        String tempPassword = UUID.randomUUID().toString().substring(0, 8);

        member.updatePassword(passwordEncoder.encode(tempPassword));

        if (member.getEmail() == null) {
            throw new IllegalArgumentException("등록된 이메일이 없어 임시 비밀번호를 발송할 수 없습니다.");
        }
        emailService.sendTemporaryPassword(member.getEmail(), tempPassword);

        log.info("임시 비밀번호 발급 완료 (대상 아이디): {}", member.getLoginId());
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
        member.updateRefreshToken(refreshToken);

        refreshTokenRepository.findByLoginId(member.getLoginId())
                .ifPresentOrElse(
                        token -> token.updateToken(refreshToken),
                        () -> refreshTokenRepository.save(new RefreshToken(member.getLoginId(), refreshToken))
                );

        return TokenResponse.builder()
                .grantType("Bearer")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(member.getRole().name())
                .name(member.getName())
                .build();
    }

    @Transactional
    public void logout(LogoutRequest request) {
        refreshTokenRepository.findByToken(request.getRefreshToken())
                .ifPresent(refreshTokenRepository::delete);
    }

    private TokenResponse createTokenResponse(Member member) {
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
                .role(member.getRole().name())
                .name(member.getName())
                .build();
    }

    @Transactional
    public void changePassword(String loginId, ChangePasswordRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 1. 기존 비밀번호가 맞는지 확인
        if (!passwordEncoder.matches(request.getOldPassword(), member.getPassword())) {
            throw new IllegalArgumentException("기존 비밀번호가 일치하지 않습니다.");
        }

        // 2. 새 비밀번호가 기존과 똑같은지 확인
        if (passwordEncoder.matches(request.getNewPassword(), member.getPassword())) {
            throw new IllegalArgumentException("새 비밀번호는 기존 비밀번호와 다르게 설정해야 합니다.");
        }

        // 3. 변경 및 암호화 저장
        member.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        log.info("비밀번호 변경 완료: {}", loginId);
    }
}