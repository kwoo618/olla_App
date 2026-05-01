package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.response.MembershipResponse;
import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import com.olla.olla_climbing.domain.admin.service.MembershipAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// (동철 수정) member 정보에서 디테일 정보 조회 
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.olla.olla_climbing.domain.member.entity.Member;

@RestController
@RequestMapping("/api/v1/memberships")
@RequiredArgsConstructor
@Tag(name = "Membership API", description = "이용권 관리 및 조회 API")
public class MembershipController {

    private final MembershipAdminService membershipService;

    // 내 이용권 확인
    /* @GetMapping("/me")
    @Operation(summary = "내 이용권 조회", description = "현재 로그인한 사용자의 활성화된 이용권 상태를 조회합니다.")
    public ResponseEntity<MembershipResponse> getMyMembership(@RequestParam("memberId") Long memberId) {
        // 실제 운영 시에는 @RequestParam 대신 JWT 토큰에서 파싱한 @AuthenticationPrincipal 유저 ID를 사용해야 안전합니다.
        MembershipResponse response = membershipService.getMyMembership(memberId);
        return ResponseEntity.ok(response);
    }
    */

    // 로그인한 토큰에서 정보 가져오는 걸로 수정 (동철 수정)
    public ResponseEntity<MembershipResponse> getMyMembership(@AuthenticationPrincipal Member member) { // (동철 수정) 인증 객체 주입
    
    if (member == null) {
        throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
    }

        // (동철 수정) 토큰에서 추출한 실제 회원의 PK(id)를 사용
        MembershipResponse response = membershipService.getMyMembership(member.getId());
        return ResponseEntity.ok(response);
    }   
}