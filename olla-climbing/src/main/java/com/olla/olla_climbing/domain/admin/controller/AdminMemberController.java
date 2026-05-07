package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.AdminMemberCreateRequest;
import com.olla.olla_climbing.domain.admin.service.MembershipAdminService;
import com.olla.olla_climbing.domain.member.dto.request.MemberUpdateRequest;
import com.olla.olla_climbing.domain.member.service.MemberService;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/members")
public class AdminMemberController {

    private final MembershipAdminService membershipAdminService;
    private final MemberService memberService;

    // 관리자 - 오프라인 회원 신규 등록
    @PostMapping("/offline")
    public String createOfflineMember(@Valid @RequestBody AdminMemberCreateRequest request) {
        membershipAdminService.createOfflineMember(request);
        return "오프라인 회원 등록 및 시트 연동 성공";
    }

    // AdminMemberController.java 에 추가
    @PatchMapping("/{memberId}")
    @Operation(summary = "오프라인 회원 정보 수정", description = "관리자가 회원의 이름, 전화번호 등 기본 정보를 수정합니다.")
    public ResponseEntity<ApiResponse<Void>> updateMemberInfo(
            @PathVariable Long memberId,
            @RequestBody MemberUpdateRequest request) {

        memberService.updateMemberByAdmin(memberId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}