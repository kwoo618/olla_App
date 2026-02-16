package com.olla.olla_climbing.domain.member.controller;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.dto.request.MemberUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.response.MemberResponse;
import com.olla.olla_climbing.domain.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.olla.olla_climbing.domain.member.dto.request.AlertUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.response.AlertResponse;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping("/me")
    // @Operation: Swagger에서 API 문서에 대한 설명을 추가하는 어노테이션입니다. summary는 간단한 설명, description은 자세한 설명을 작성할 수 있습니다.
    @Operation(summary = "내 정보 조회", description = "로그인한 회원의 기본 정보, 상세 정보 및 공개 설정 상태를 조회합니다.",
            security = @SecurityRequirement(name = "bearerAuth"))   // Swagger에서 이 API가 인증이 필요한 엔드포인트임을 명시, "bearerAuth"는 SecurityConfig에서 정의한 보안 스킴 이름과 일치해야 합니다.
    // ResponseEntity<MemberResponse> 사용한 이유?
    // 1. HTTP 상태 코드 제어: ResponseEntity를 사용하면 응답의 HTTP 상태 코드를 명시적으로 설정할 수 있습니다. 예를 들어, 성공 시 200 OK, 인증 실패 시 401 Unauthorized 등을 반환할 수 있습니다.
    // 2. 응답 헤더 제어: ResponseEntity를 사용하면 응답 헤더도 함께 설정할 수 있습니다. 예를 들어, CORS 헤더, 캐싱 헤더 등을 추가할 수 있습니다.
    // 3. 일관된 API 응답 구조: ResponseEntity를 사용하면 API 응답의 구조를 일관되게 유지할 수 있습니다. 예를 들어, 성공 시 데이터와 메시지를 포함하는 구조로 응답을 통일할 수 있습니다.
    public ResponseEntity<MemberResponse> getMyInfo(@AuthenticationPrincipal Member member) {   // @AuthenticationPrincipal: 현재 인증된 사용자의 정보를 가져오는 어노테이션입니다. JwtAuthenticationFilter에서 인증이 성공하면 SecurityContext에 저장된 회원 정보를 이 매개변수로 주입합니다.
        // JwtAuthenticationFilter를 통과하지 못했거나 인증 정보가 없는 경우
        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        // 토큰에서 추출한 회원 ID(loginId)로 서비스에 조회 요청
        MemberResponse response = memberService.getMyInfo(member.getLoginId());

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/me")
    @Operation(summary = "내 정보 수정", description = "로그인한 회원의 정보를 수정합니다. (수정할 필드만 전송 가능)",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<MemberResponse> updateMyInfo(
            @AuthenticationPrincipal Member member,
            @RequestBody MemberUpdateRequest request) { // 클라이언트가 보낸 JSON 데이터를 받음

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        // 서비스에 '누구의 정보'를 '어떻게' 수정할지 넘겨줌
        MemberResponse response = memberService.updateMyInfo(member.getLoginId(), request);

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/me/alert")
    @Operation(summary = "알림 설정 수정", description = "로그인한 회원의 확장된 알림 설정을 수정합니다.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<AlertResponse> updateAlertSettings(@AuthenticationPrincipal Member member, @RequestBody AlertUpdateRequest request) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        // 서비스에 알림 수정 요청
        AlertResponse response = memberService.updateAlertSettings(member.getLoginId(), request);

        return ResponseEntity.ok(response);
    }
}