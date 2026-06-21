package com.olla.olla_climbing.domain.auth.service;

import com.olla.olla_climbing.domain.auth.dto.request.ChangePasswordRequest;
import com.olla.olla_climbing.domain.auth.dto.request.LoginRequest;
import com.olla.olla_climbing.domain.auth.dto.request.LogoutRequest;
import com.olla.olla_climbing.domain.auth.dto.request.SignupRequest;
import com.olla.olla_climbing.domain.auth.dto.response.TokenResponse;
import com.olla.olla_climbing.domain.auth.entity.EmailVerification;
import com.olla.olla_climbing.domain.auth.entity.RefreshToken;
import com.olla.olla_climbing.domain.auth.repository.EmailVerificationRepository;
import com.olla.olla_climbing.domain.auth.repository.RefreshTokenRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberDetail;
import com.olla.olla_climbing.domain.member.entity.MemberPrivacy;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.admin.service.GoogleSheetsService;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
import com.olla.olla_climbing.global.util.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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

    // ── 이메일 인증 ──────────────────────────────────────────────

    @Transactional
    public void requestEmailVerification(String email) {
        String code = String.valueOf((int) (Math.random() * 899999) + 100000);

        EmailVerification verification = EmailVerification.builder()
                .email(email)
                .code(code)
                .expiredAt(LocalDateTime.now().plusMinutes(5))
                .isConfirmed(false)
                .build();

        verificationRepository.save(verification);
        emailService.sendVerificationCode(email, code);
    }

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

        verification.confirm();

        // 인증 완료 시 해당 이메일의 이전 인증 레코드 일괄 삭제 (테이블 무한 누적 방지)
        verificationRepository.deleteAllByEmailExcept(email, verification.getId());

        return true;
    }

    // ── 회원가입 ──────────────────────────────────────────────────

    @Transactional
    public TokenResponse signup(SignupRequest request) {
        // 이메일 인증 완료 여부 확인
        EmailVerification verification = verificationRepository.findTopByEmailOrderByCreatedAtDesc(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("이메일 인증 기록이 없습니다."));
        if (!verification.isConfirmed()) {
            throw new IllegalArgumentException("이메일 인증이 완료되지 않았습니다.");
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());
        Optional<Member> existingMemberOpt = memberRepository.findByPhone(request.getPhone());
        Member targetMember;
        boolean isBrandNewMember = false;

        if (existingMemberOpt.isPresent()) {
            targetMember = existingMemberOpt.get();

            // 비밀번호가 이미 있으면 정식 온라인 회원 → 중복 가입 차단
            if (StringUtils.hasText(targetMember.getPassword())) {
                throw new IllegalArgumentException("이미 가입된 전화번호입니다.");
            }

            // 아이디 중복 체크 (자신의 임시 ID가 아닌 경우만)
            if (!request.getLoginId().equals(targetMember.getLoginId()) &&
                    memberRepository.findByLoginId(request.getLoginId()).isPresent()) {
                throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
            }

            // 오프라인 회원 → 온라인 앱 계정으로 승급
            targetMember.upgradeToOnlineMember(
                    request.getLoginId(), encodedPassword, request.getEmail(),
                    request.getGender(), request.getBirthDate()
            );
        } else {
            if (memberRepository.findByLoginId(request.getLoginId()).isPresent()) {
                throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
            }
            if (memberRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("이미 가입된 이메일입니다.");
            }

            targetMember = request.toEntity(encodedPassword);
            isBrandNewMember = true;
        }

        initializeMemberDetails(targetMember, request);
        Member savedMember = memberRepository.save(targetMember);

        if (isBrandNewMember) {
            googleSheetsService.syncNewMember(savedMember);
            googleSheetsService.syncUnregisteredMember(savedMember);
        } else {
            googleSheetsService.syncNewMember(savedMember);
        }

        return buildTokenResponse(savedMember);
    }

    // ── 로그인 / 로그아웃 ─────────────────────────────────────────

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
                .role(member.getRole().name())
                .name(member.getName())
                .build();
    }

    @Transactional
    public void logout(LogoutRequest request) {
        refreshTokenRepository.findByToken(request.getRefreshToken())
                .ifPresent(token -> {
                    // 로그아웃 시 FCM 토큰 초기화 → 로그아웃 후 알림 수신 방지
                    memberRepository.findByLoginId(token.getLoginId())
                            .ifPresent(member -> member.updateFcmToken(null));
                    refreshTokenRepository.delete(token);
                });
    }

    // ── 토큰 재발급 ──────────────────────────────────────────────

    @Transactional
    public TokenResponse reissue(String refreshToken) {
        // 1. 토큰 자체가 유효한지 검증 (서명, 만료 여부)
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 리프레시 토큰입니다. 다시 로그인해주세요.");
        }

        // 2. DB에 저장된 토큰과 일치하는지 확인 (탈취/재사용 방지)
        // findByToken → findByLoginId로 변경 (동시 요청 경합 방지)
        String loginIdFromToken = jwtTokenProvider.getLoginId(refreshToken);

        RefreshToken savedToken = refreshTokenRepository.findByLoginId(loginIdFromToken)
                .orElseThrow(() -> new IllegalArgumentException("등록되지 않은 리프레시 토큰입니다. 다시 로그인해주세요."));

        Member member = memberRepository.findByLoginId(savedToken.getLoginId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 3. 새 AccessToken + RefreshToken 발급 (RefreshToken Rotation)
        String newAccessToken = jwtTokenProvider.createAccessToken(member.getLoginId(), member.getRole().name());
        String newRefreshToken = jwtTokenProvider.createRefreshToken(member.getLoginId());

        savedToken.updateToken(newRefreshToken);

        return TokenResponse.builder()
                .grantType("Bearer")
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .role(member.getRole().name())
                .name(member.getName())
                .build();
    }

    // ── 아이디/비밀번호 찾기 ──────────────────────────────────────

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

        if (member.getEmail() == null || !member.getEmail().equals(email)) {
            throw new IllegalArgumentException("입력하신 정보가 일치하지 않습니다.");
        }

        String tempPassword = UUID.randomUUID().toString().substring(0, 8);
        member.updatePassword(passwordEncoder.encode(tempPassword));
        emailService.sendTemporaryPassword(member.getEmail(), tempPassword);

        log.info("임시 비밀번호 발급 완료: loginId={}", member.getLoginId());
    }

    @Transactional
    public void changePassword(String loginId, ChangePasswordRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!passwordEncoder.matches(request.getOldPassword(), member.getPassword())) {
            throw new IllegalArgumentException("기존 비밀번호가 일치하지 않습니다.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), member.getPassword())) {
            throw new IllegalArgumentException("새 비밀번호는 기존 비밀번호와 다르게 설정해야 합니다.");
        }

        member.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        log.info("비밀번호 변경 완료: loginId={}", loginId);
    }

    // ── private 헬퍼 ─────────────────────────────────────────────

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

    private TokenResponse buildTokenResponse(Member member) {
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
}