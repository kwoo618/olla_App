package com.olla.olla_climbing.domain.auth.service;

// 회원 가입 비즈니스 로직
// 중복 검사 -> 비밀번호 암호화 -> DB 저장

import com.olla.olla_climbing.domain.admin.service.GoogleSheetsService;
import com.olla.olla_climbing.domain.auth.dto.request.LoginRequest;
import com.olla.olla_climbing.domain.auth.dto.request.LogoutRequest;
import com.olla.olla_climbing.domain.auth.dto.request.SignupRequest;
import com.olla.olla_climbing.domain.auth.dto.response.TokenResponse;
import com.olla.olla_climbing.domain.auth.entity.RefreshToken;
import com.olla.olla_climbing.domain.auth.repository.RefreshTokenRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

// @Service를 붙이지 않으면 스프링이 인식 못함(일반 자바 파일 취급) -> 의존성 주입 불가
@Service    // 스프링이 해당 클래스를 서비스 빈으로 등록
@RequiredArgsConstructor    // final로 선언된 필드를 매개변수로 받는 생성자를 자동 생성
public class AuthService {

    private final MemberRepository memberRepository;    // 회원 저장소
    private final PasswordEncoder passwordEncoder;      // 비밀번호 암호화 객체
    private final JwtTokenProvider jwtTokenProvider;    // JWT 토큰을 생성하고 검증하는 컴포넌트
    private final RefreshTokenRepository refreshTokenRepository;    // 리프레시 토큰 저장소

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

        if (existingMemberOpt.isPresent()) {
            Member existingMember = existingMemberOpt.get();

            // 2-1. 이미 loginId가 존재한다면? -> 이미 앱에 가입한 진짜 회원
            if (existingMember.getLoginId() != null) {
                throw new IllegalArgumentException("이미 가입된 전화번호입니다.");
            }

            // 2-2. loginId가 없다면? -> 오프라인 데스크에서 등록된 유령 회원!
            // 유령 회원의 빈칸(아이디, 비밀번호)을 채워 온라인 회원으로 승급(Merge)
            // (주의: 성별, 생년월일은 이미 관리자가 오프라인 등록 시 입력했으므로 덮어쓰지 않거나 정책에 따라 유지)
            existingMember.upgradeToOnlineMember(
                    request.getLoginId(),
                    encodedPassword,
                    request.getEmail(),
                    request.getGender(),
                    request.getBirthDate()
            );

        } else {
            // 3. 기존 회원이 아니면 완전 신규 회원으로 Insert
            Member newMember = request.toEntity(encodedPassword);
            Member savedMember = memberRepository.save(newMember);

            //  앱을 통해 처음으로 우리 암장에 가입하는 완전 신규 회원일 때만 시트에 Append 합니다.
            sendToGoogleSheets(savedMember);
        }
    }

    // 로그인 비즈니스 로직 (최신 버전 하나만 남김!)
    @Transactional
    public TokenResponse login(LoginRequest request) {
        // 1. 회원 확인 및 비밀번호 검증
        Member member = memberRepository.findByLoginId(request.getLoginId())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 아이디입니다."));

        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // 2. 토큰 생성
        String accessToken = jwtTokenProvider.createAccessToken(member.getLoginId(), member.getRole().name());
        String refreshToken = jwtTokenProvider.createRefreshToken(member.getLoginId());

        // 3. Refresh Token DB 저장 로직 (있으면 업데이트, 없으면 새로 저장)
        refreshTokenRepository.findByLoginId(member.getLoginId())
                .ifPresentOrElse(
                        token -> token.updateToken(refreshToken),
                        () -> refreshTokenRepository.save(new RefreshToken(member.getLoginId(), refreshToken))
                );

        // 4. 응답 반환
        return TokenResponse.builder()
                .grantType("Bearer")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    // 로그아웃 시 클라이언트와 서버의 역할 분담?
    // 클라이언트(앱): 스마트폰 기기 내부(안전한 저장소)에 보관하고 있던 Access Token과 Refresh Token을 깨끗하게 지워서 비워버림
    // 서버(백엔드): 클라이언트가 지웠다고 해도, 혹시나 나쁜 놈이 토큰을 복사해 뒀을 수 있으니 DB(refresh_token 테이블)에 저장된 해당 유저의 토큰 기록을 아예 삭제(Delete)
    @Transactional
    public void logout(LogoutRequest request) {
        // 1. 클라이언트가 보낸 리프레시 토큰이 DB에 존재하는지 확인
        refreshTokenRepository.findByToken(request.getRefreshToken())
                .ifPresent(token -> {
                    // 2. 존재한다면 DB에서 해당 토큰 삭제
                    refreshTokenRepository.delete(token);
                });

        // 만약 DB에 토큰이 이미 없다면(이미 로그아웃 되었거나 만료되어 삭제된 상태),
        // 굳이 에러를 뱉지 않고 조용히 성공 처리(무시)하는 것이 클라이언트 입장에서 더 좋습니다.
    }

    private void sendToGoogleSheets(Member member) {
        String birthDateStr = member.getBirthDate() != null ?
                member.getBirthDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
        String createdAtStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));

        // 전송 규격: [No, 이름, 성별, 연락처, 생년월일, "", 최초등록일]
        List<Object> rowData = List.of(
                member.getId(),
                member.getName(),
                member.getGender() != null ? member.getGender() : "",
                member.getPhone(),
                birthDateStr,
                "", // 나이 (시트에서 ARRAYFORMULA로 자동 계산되므로 빈칸 전송)
                createdAtStr
        );

        // 시트 1번 탭 이름 ("올라클라이밍 회원정보" - 실제 시트 탭 이름과 일치해야 함)
        googleSheetsService.appendRow("올라클라이밍 회원정보", rowData);
    }
}
