package com.olla.olla_climbing.domain.auth.controller;

import com.olla.olla_climbing.domain.auth.dto.request.ChangePasswordRequest;
import com.olla.olla_climbing.domain.auth.dto.request.LoginRequest;
import com.olla.olla_climbing.domain.auth.dto.request.LogoutRequest;
import com.olla.olla_climbing.domain.auth.dto.request.SignupRequest;
import com.olla.olla_climbing.domain.auth.dto.response.TokenResponse;
import com.olla.olla_climbing.domain.auth.service.AuthService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.service.MemberService;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final MemberService memberService;

    @PostMapping("/signup")
    @Operation(summary = "회원가입")
    public ResponseEntity<ApiResponse<TokenResponse>> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(ApiResponse.success(201, "회원가입이 완료되었습니다.", authService.signup(request)));
    }

    @GetMapping("/check-id")
    @Operation(summary = "아이디 중복 확인")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkDuplicateId(@RequestParam String loginId) {
        return ResponseEntity.ok(ApiResponse.success(200, "아이디 중복 확인 완료",
                Map.of("isDuplicate", memberService.existsByLoginId(loginId))));
    }

    @GetMapping("/check-phone")
    @Operation(summary = "전화번호 중복 확인 (O2O 연동 지원)")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkDuplicatePhone(@RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.success(200, "전화번호 중복 확인 완료",
                Map.of("isDuplicate", memberService.isPhoneAvailableForSignup(phone))));
    }

    @PostMapping("/login")
    @Operation(summary = "로그인")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(200, "로그인 성공", authService.login(request)));
    }

    @PostMapping("/logout")
    @Operation(summary = "로그아웃")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ApiResponse.success(200, "로그아웃이 완료되었습니다.", null));
    }

    @PostMapping("/find-id")
    @Operation(summary = "아이디 찾기 (마스킹)")
    public ResponseEntity<ApiResponse<String>> findId(@RequestParam String name, @RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.success(200, "아이디 찾기 성공",
                authService.findMaskedLoginId(name, phone)));
    }

    @PostMapping("/find-password")
    @Operation(summary = "임시 비밀번호 발송")
    public ResponseEntity<ApiResponse<Void>> findPassword(@RequestParam String loginId, @RequestParam String email) {
        authService.sendTempPassword(loginId, email);
        return ResponseEntity.ok(ApiResponse.success(200, "임시 비밀번호가 발송되었습니다.", null));
    }

    @PostMapping("/email/request")
    @Operation(summary = "이메일 인증번호 발송")
    public ResponseEntity<ApiResponse<Void>> requestEmailVerification(@RequestParam String email) {
        if (memberService.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }
        authService.requestEmailVerification(email);
        return ResponseEntity.ok(ApiResponse.success(200, "인증번호가 발송되었습니다.", null));
    }

    @PostMapping("/email/verify")
    @Operation(summary = "이메일 인증번호 검증")
    public ResponseEntity<ApiResponse<Void>> verifyEmailCode(@RequestParam String email, @RequestParam String code) {
        authService.verifyEmailCode(email, code);
        return ResponseEntity.ok(ApiResponse.success(200, "이메일 인증이 완료되었습니다.", null));
    }

    @PatchMapping("/password")
    @Operation(summary = "비밀번호 변경", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody ChangePasswordRequest request) {
        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");
        authService.changePassword(member.getLoginId(), request);
        return ResponseEntity.ok(ApiResponse.success(200, "비밀번호가 성공적으로 변경되었습니다.", null));
    }

    @PostMapping("/reissue")
    @Operation(summary = "Access Token 재발급")
    public ResponseEntity<ApiResponse<TokenResponse>> reissue(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        return ResponseEntity.ok(ApiResponse.success(200, "토큰이 재발급되었습니다.", authService.reissue(refreshToken)));
    }
}