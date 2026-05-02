package com.olla.olla_climbing.domain.auth.service;

import lombok.Getter; // (동철 수정) 프론트에서 토큰정보 받아오려면 필요
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
import java.util.Optional;

@Service    
@RequiredArgsConstructor    
@Getter 
public class AuthService {

    private final MemberRepository memberRepository;    
    private final PasswordEncoder passwordEncoder;      
    private final JwtTokenProvider jwtTokenProvider;    
    private final RefreshTokenRepository refreshTokenRepository;    

    private final GoogleSheetsService googleSheetsService;

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
                detailDto.getAge(),
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

        // 앱을 통해 처음 가입하는 완전 신규 회원일 때만 시트에 Append
        if (isBrandNewMember) {
            sendToGoogleSheets(savedMember);
        }
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
                .build();
    }

    @Transactional
    public void logout(LogoutRequest request) {
        refreshTokenRepository.findByToken(request.getRefreshToken())
                .ifPresent(token -> {
                    refreshTokenRepository.delete(token);
                });
    }

    private void sendToGoogleSheets(Member member) {
        String birthDateStr = member.getBirthDate() != null ?
                member.getBirthDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
        String createdAtStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));

        List<Object> rowData = List.of(
                member.getId(),
                member.getName(),
                member.getGender() != null ? member.getGender() : "",
                member.getPhone(),
                birthDateStr,
                "", 
                createdAtStr
        );

        googleSheetsService.appendRow("올라클라이밍 회원정보", rowData);
    }
}