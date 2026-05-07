package com.olla.olla_climbing.domain.auth.controller;

import com.olla.olla_climbing.domain.auth.dto.request.LoginRequest;
import com.olla.olla_climbing.domain.auth.dto.request.LogoutRequest;
import com.olla.olla_climbing.domain.auth.dto.request.SignupRequest;
import com.olla.olla_climbing.domain.auth.dto.response.TokenResponse;
import com.olla.olla_climbing.domain.auth.service.AuthService;
import com.olla.olla_climbing.domain.member.service.MemberService; // 아이디 중복확인 코드 추가 (동철 수정)
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
// 회원가입에서 아이디 중복 확인 코드 추가 (동철 수정)
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.Map;
import java.util.HashMap;

@RestController // "API를 처리하는 컨트롤러"
@RequestMapping("/api/v1/auth") // 이 컨트롤러의 기본 URL 경로 설정
@RequiredArgsConstructor    // 자동 주입
public class AuthController {

    private final AuthService authService;
    private final MemberService memberService; // 회원가입 화면에서 아이디 중복 확인 코드 수정 (동철 수정)

    @PostMapping("/signup")
    @Operation(summary = "회원가입", description = "신규 회원 가입을 처리하고 즉시 JWT 토큰을 반환합니다.")
    public ResponseEntity<ApiResponse<TokenResponse>> signup(@Valid @RequestBody SignupRequest request) {
        TokenResponse response = authService.signup(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 회원가입 할때 아이디 중복 확인하는거 추가 (동철 수정)
    @GetMapping("/check-id")
    @Operation(summary = "아이디 중복 확인")
    public ResponseEntity<?> checkDuplicateId(@RequestParam("loginId") String loginId) {
        // 서비스 호출
        boolean isDuplicate = memberService.existsByLoginId(loginId);
    
        Map<String, Boolean> responseData = new HashMap<>();
        responseData.put("isDuplicate", isDuplicate);
    
        // ResponseEntity에 담아서 리턴
        return ResponseEntity.ok(responseData);
    }

    @PostMapping("/login") // POST /api/v1/auth/login
    @Operation(summary = "로그인", description = "회원 정보를 받아 로그인 처리 후 JWT 토큰을 반환합니다.")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {

        TokenResponse tokenResponse = authService.login(request);
        return ResponseEntity.ok(tokenResponse); // 로그인 성공 시 JWT 토큰 반환
    }

    @PostMapping("/logout")
    @Operation(summary = "로그아웃", description = "Refresh Token을 DB에서 삭제하여 로그아웃 처리합니다.")
    public ResponseEntity<String> logout(@RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok("로그아웃이 완료되었습니다.");
    }

    @PostMapping("/find-id")
    @Operation(summary = "아이디 찾기 (마스킹)")
    public ResponseEntity<ApiResponse<String>> findId(@RequestParam String name, @RequestParam String phone) {
        String maskedId = authService.findMaskedLoginId(name, phone);
        return ResponseEntity.ok(ApiResponse.success(maskedId));
    }

    @PostMapping("/find-password")
    @Operation(summary = "임시 비밀번호 발송")
    public ResponseEntity<ApiResponse<Void>> findPassword(@RequestParam String name,
                                                          @RequestParam String phone,
                                                          @RequestParam String loginId) {
        authService.sendTempPassword(name, phone, loginId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/email/request")
    @Operation(summary = "이메일 인증번호 발송", description = "회원가입 전 이메일 소유 확인을 위해 인증번호를 발송합니다.")
    public ResponseEntity<ApiResponse<String>> requestEmailVerification(@RequestParam String email) {
        authService.requestEmailVerification(email);
        return ResponseEntity.ok(ApiResponse.success("인증번호가 발송되었습니다."));
    }

    @PostMapping("/email/verify")
    @Operation(summary = "이메일 인증번호 검증", description = "발송된 인증번호가 맞는지 확인하고 인증 완료 처리를 합니다.")
    public ResponseEntity<ApiResponse<String>> verifyEmailCode(@RequestParam String email, @RequestParam String code) {
        authService.verifyEmailCode(email, code);
        return ResponseEntity.ok(ApiResponse.success("이메일 인증이 완료되었습니다."));
    }
}
