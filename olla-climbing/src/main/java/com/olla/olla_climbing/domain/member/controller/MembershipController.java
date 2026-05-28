package com.olla.olla_climbing.domain.member.controller;

import com.olla.olla_climbing.domain.admin.dto.response.MembershipResponse;
import com.olla.olla_climbing.domain.admin.service.MembershipAdminService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/memberships")
@RequiredArgsConstructor
@Tag(name = "Membership API")
public class MembershipController {

    private final MembershipAdminService membershipService;

    @GetMapping("/me")
    @Operation(summary = "내 이용권 목록 조회")
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> getMyMembership(
            @AuthenticationPrincipal Member member) {

        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");

        List<MembershipResponse> response = membershipService.getMyMembership(member.getId());
        return ResponseEntity.ok(ApiResponse.success(200, "내 이용권 조회 성공", response));
    }
}