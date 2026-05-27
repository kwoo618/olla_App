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
        TokenResponse response = authService.signup(request);
        return ResponseEntity.ok(ApiResponse.success(201, "회원가입이 완료되었습니다.", response));
    }

    @GetMapping("/check-id")
    @Operation(summary = "아이디 중복 확인")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkDuplicateId(@RequestParam("loginId") String loginId) {
        boolean isDuplicate = memberService.existsByLoginId(loginId);
        return ResponseEntity.ok(ApiResponse.success(200, "아이디 중복 확인 완료", Map.of("isDuplicate", isDuplicate)));
    }

    @GetMapping("/check-phone")
    @Operation(summary = "전화번호 중복 확인 (O2O 연동 지원)")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkDuplicatePhone(@RequestParam("phone") String phone) {
        // 비밀번호가 없는 오프라인 회원인 경우 중복이 아닌 것(false)으로 판단하는 새 로직 호출
        boolean isDuplicate = memberService.isPhoneAvailableForSignup(phone);
        return ResponseEntity.ok(ApiResponse.success(200, "전화번호 중복 확인 완료", Map.of("isDuplicate", isDuplicate)));
    }

    @PostMapping("/login")
    @Operation(summary = "로그인")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(200, "로그인 성공", response));
    }

    @PostMapping("/logout")
    @Operation(summary = "로그아웃")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ApiResponse.success(200, "로그아웃이 완료되었습니다.", null));
    }

    @PostMapping("/find-id")
    @Operation(summary = "아이디 찾기 (마스킹)")
    public ResponseEntity<ApiResponse<String>> findId(@RequestParam("name") String name, @RequestParam("phone") String phone) {
        String maskedId = authService.findMaskedLoginId(name, phone);
        return ResponseEntity.ok(ApiResponse.success(200, "아이디 찾기 성공", maskedId));
    }

    @PostMapping("/find-password")
    @Operation(summary = "임시 비밀번호 발송")
    public ResponseEntity<ApiResponse<Void>> findPassword(
            @RequestParam("loginId") String loginId,
            @RequestParam("email") String email) {
        authService.sendTempPassword(loginId, email);
        return ResponseEntity.ok(ApiResponse.success(200, "임시 비밀번호가 발송되었습니다.", null));
    }

    @PostMapping("/email/request")
    @Operation(summary = "이메일 인증번호 발송")
    public ResponseEntity<ApiResponse<Void>> requestEmailVerification(@RequestParam("email") String email) {
        if (memberService.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }
        authService.requestEmailVerification(email);
        return ResponseEntity.ok(ApiResponse.success(200, "인증번호가 발송되었습니다.", null));
    }

    @PostMapping("/email/verify")
    @Operation(summary = "이메일 인증번호 검증")
    public ResponseEntity<ApiResponse<Void>> verifyEmailCode(@RequestParam("email") String email, @RequestParam("code") String code) {
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
}