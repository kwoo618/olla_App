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

    @PostMapping("/offline")
    @Operation(summary = "오프라인 회원 신규 등록")
    public ResponseEntity<ApiResponse<String>> createOfflineMember(@Valid @RequestBody AdminMemberCreateRequest request) {
        membershipAdminService.createOfflineMember(request);
        return ResponseEntity.ok(ApiResponse.success("오프라인 회원 등록 및 시트 연동 성공"));
    }

    @PatchMapping("/{memberId}/info")
    @Operation(summary = "오프라인 회원 정보 수정 (관리자)")
    public ResponseEntity<ApiResponse<String>> updateMemberInfo(
            @PathVariable("memberId") Long memberId,
            @RequestBody MemberUpdateRequest request) {
        memberService.updateMemberByAdmin(memberId, request);
        return ResponseEntity.ok(ApiResponse.success("회원 정보가 성공적으로 수정되었습니다."));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "회원 강제 삭제 (관리자)")
    public ResponseEntity<ApiResponse<String>> deleteMember(@PathVariable("id") Long id) {
        memberService.withdrawMemberById(id);
        return ResponseEntity.ok(ApiResponse.success("회원이 성공적으로 삭제되었습니다."));
    }
}