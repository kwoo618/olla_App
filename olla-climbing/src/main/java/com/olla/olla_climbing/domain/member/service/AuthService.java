package com.olla.olla_climbing.domain.member.service;

// 회원 가입 비즈니스 로직
// 중복 검사 -> 비밀번호 암호화 -> DB 저장

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.dto.request.LoginRequest;
import com.olla.olla_climbing.domain.member.dto.request.SignupRequest;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

// @Service를 붙이지 않으면 스프링이 인식 못함(일반 자바 파일 취급) -> 의존성 주입 불가
@Service    // 스프링이 해당 클래스를 서비스 빈으로 등록
@RequiredArgsConstructor    // final로 선언된 필드를 매개변수로 받는 생성자를 자동 생성
public class AuthService {

    private final MemberRepository memberRepository;    // 회원 저장소
    private final PasswordEncoder passwordEncoder;      // 비밀번호 암호화 객체

    private final JwtTokenProvider jwtTokenProvider;    // JWT 토큰을 생성하고 검증하는 컴포넌트

    // 회원 가입 비즈니스 로직
    @Transactional
    public void signup(SignupRequest request) {

        // 1. 중복 검사
        // DB에서 loginId로 조회했을 때 값이 있으면(isPresent)
        if(memberRepository.findByLoginId(request.getLoginId()).isPresent()){
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }

        // 2. 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        // 3. DB 저장
        Member newMember = request.toEntity(encodedPassword);

        // 4. 저장
        memberRepository.save(newMember);
    }

    // 로그인 비즈니스 로직
    @Transactional(readOnly = true)   // 읽기 전용 트랜잭션, 성능 최적화
    public String login(LoginRequest request){
        // 1. 회원 조회: 로그인 ID로 DB에서 회원을 조회, 없으면 예외 발생
        Member member = memberRepository.findByLoginId(request.getLoginId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이디입니다."));

        // 2. 비밀번호 검증: 입력한 비밀번호와 DB에 저장된 암호화된 비밀번호가 일치하는지 확인, 일치하지 않으면 예외 발생
        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())){
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // 3. JWT 토큰 생성: 로그인 ID를 기반으로 JWT 토큰을 생성하여 반환
        return jwtTokenProvider.createToken(member.getLoginId());
    }
}
