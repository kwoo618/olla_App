package com.olla.olla_climbing.domain.member.controller;

import com.olla.olla_climbing.domain.member.dto.request.LoginRequest;
import com.olla.olla_climbing.domain.member.dto.request.SignupRequest;
import com.olla.olla_climbing.domain.member.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController // "API를 처리하는 컨트롤러"
@RequestMapping("/api/v1/auth") // 이 컨트롤러의 기본 URL 경로 설정
@RequiredArgsConstructor    // 자동 주입
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup") // POST /api/v1/auth/signup
    @Operation(summary = "회원가입", description = "회원 정보를 받아 신규 회원을 등록합니다.") // 이걸 붙이면 Swagger에 "회원가입 (회원 정보를 받아 신규 회원을 등록합니다.)" 라고 친절한 설명이 뜸
    public ResponseEntity<String> signup(@Valid @RequestBody SignupRequest request){

        // ResponseEntity는 HTTP 상태 코드(스티커)와 데이터(내용물)
        // ex) 200 OK + "회원가입이 완료되었습니다." or 400 Bad Request + "아이디가 이미 존재합니다."

        // @Valid: 요청 데이터 검증(SignupRequest안에 붙인 규칙[@NotBlank, @Pattern 등..] 검사)
        // @RequestBody: 요청에 담긴 JSON 데이터를 SignupRequest 객체로 변환

        authService.signup(request);
        return ResponseEntity.ok("회원가입이 완료되었습니다.");
    }

    @PostMapping("/login") // POST /api/v1/auth/login
    @Operation(summary = "로그인", description = "회원 정보를 받아 로그인 처리 후 JWT 토큰을 반환합니다.")
    public ResponseEntity<String> login(@Valid @RequestBody LoginRequest request) {
        String token = authService.login(request);
        return ResponseEntity.ok(token); // 로그인 성공 시 JWT 토큰 반환
    }
}
