package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.response.MembershipResponse;
import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import com.olla.olla_climbing.domain.admin.service.MembershipAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/memberships")
@RequiredArgsConstructor
@Tag(name = "Membership API", description = "이용권 관리 및 조회 API")
public class MembershipController {

    private final MembershipAdminService membershipService;

    // 1. [유저용] 내 이용권 확인
    @GetMapping("/me")
    @Operation(summary = "내 이용권 조회", description = "현재 로그인한 사용자의 활성화된 이용권 상태를 조회합니다.")
    public ResponseEntity<MembershipResponse> getMyMembership(@RequestParam("memberId") Long memberId) {
        // 실제 운영 시에는 @RequestParam 대신 JWT 토큰에서 파싱한 @AuthenticationPrincipal 유저 ID를 사용해야 안전합니다.
        MembershipResponse response = membershipService.getMyMembership(memberId);
        return ResponseEntity.ok(response);
    }

    // 2. [관리자용] 이용권 부여 및 연장
    @PostMapping("/admin/grant")
    @Operation(summary = "[관리자] 이용권 부여/연장", description = "관리자가 특정 회원에게 기간권이나 횟수권을 부여합니다.")
    public ResponseEntity<String> grantMembership(
            @RequestParam("memberId") Long memberId,
            @RequestParam("type") MembershipType type,
            @RequestParam(value = "addMonths", required = false, defaultValue = "0") Integer addMonths,
            @RequestParam(value = "addCount", required = false, defaultValue = "0") Integer addCount) {

        membershipService.grantMembership(memberId, type, addMonths, addCount);
        return ResponseEntity.ok("이용권이 성공적으로 부여/연장되었습니다.");
    }
}