package com.olla.olla_climbing.domain.member.service;

// 회원 가입 비즈니스 로직
// 중복 검사 -> 비밀번호 암호화 -> DB 저장

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.dto.request.SignupRequest;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service    // 스프링이 해당 클래스를 서비스 빈으로 등록
@RequiredArgsConstructor    // final로 선언된 필드를 매개변수로 받는 생성자를 자동 생성
public class AuthService {

    private final MemberRepository memberRepository;    // 회원 저장소
    private final PasswordEncoder passwordEncoder;      // 비밀번호 암호화 객체

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
}
