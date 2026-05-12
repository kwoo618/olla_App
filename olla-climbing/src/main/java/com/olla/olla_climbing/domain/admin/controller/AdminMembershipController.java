package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.response.AdminMemberResponse;
import com.olla.olla_climbing.domain.admin.dto.request.MembershipGrantRequest;
import com.olla.olla_climbing.domain.admin.service.MembershipAdminService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

@RestController
@RequestMapping("/api/v1/admin/memberships")
@RequiredArgsConstructor
@Tag(name = "Admin Membership API")
public class AdminMembershipController {

    private final MembershipAdminService membershipAdminService;

    @PostMapping("/grant")
    @Operation(summary = "관리자: 이용권 부여", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<String>> grantMembership(
            @AuthenticationPrincipal Member admin,
            @Valid @RequestBody MembershipGrantRequest request) {
        if (admin == null) throw new IllegalArgumentException("인증 정보가 없습니다.");

        membershipAdminService.grantMembership(
                request.getMemberId(),
                request.getAddMonths(),
                request.getAddCount(),
                request.getStartDate()
        );
        return ResponseEntity.ok(ApiResponse.success("이용권이 성공적으로 부여되었습니다."));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "이용권 삭제 (관리자)")
    public ResponseEntity<ApiResponse<String>> deleteMembership(@PathVariable Long id) {
        membershipAdminService.deleteMembership(id);
        return ResponseEntity.ok(ApiResponse.success("이용권이 삭제되었습니다."));
    }

    @GetMapping("/members")
    @Operation(summary = "관리자용 회원 리스트 조회")
    public ResponseEntity<ApiResponse<Page<AdminMemberResponse>>> getMemberList(
            @RequestParam(value = "searchName", required = false) String searchName,
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AdminMemberResponse> response = membershipAdminService.getAdminMemberList(searchName, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{membershipId}/pause")
    @Operation(summary = "이용권 일시정지")
    public ResponseEntity<ApiResponse<String>> pauseMembership(@PathVariable("membershipId") Long membershipId) {
        membershipAdminService.pauseMembership(membershipId);
        return ResponseEntity.ok(ApiResponse.success("이용권이 성공적으로 일시정지 되었습니다."));
    }

    @PatchMapping("/{membershipId}/unpause")
    @Operation(summary = "이용권 정지 해제")
    public ResponseEntity<ApiResponse<String>> unpauseMembership(@PathVariable("membershipId") Long membershipId) {
        membershipAdminService.unpauseMembership(membershipId);
        return ResponseEntity.ok(ApiResponse.success("이용권이 성공적으로 정지 해제되었습니다."));
    }
}