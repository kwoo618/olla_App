package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.response.AdminMemberResponse;
import com.olla.olla_climbing.domain.admin.dto.request.MembershipGrantRequest;
import com.olla.olla_climbing.domain.admin.service.MembershipAdminService;
import com.olla.olla_climbing.domain.member.entity.Member;
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
@Tag(name = "Admin Membership API", description = "관리자 전용 이용권 부여/관리 API")
public class AdminMembershipController {

    private final MembershipAdminService membershipAdminService;

    @PostMapping("/grant")
    @Operation(summary = "이용권 부여/연장", description = "관리자 권한으로 특정 회원에게 기간권이나 횟수권을 부여합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> grantMembership(
            @AuthenticationPrincipal Member admin,
            @Valid @RequestBody MembershipGrantRequest request) {

        if (admin == null) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }

        // DTO에서 값을 꺼내어 기존 Service 메서드에 전달
        membershipAdminService.grantMembership(
                request.getMemberId(),
                request.getType(),
                request.getAddMonths(),
                request.getAddCount()
        );

        return ResponseEntity.ok("이용권이 성공적으로 처리되었습니다.");
    }

    @GetMapping("/members")
    @Operation(summary = "관리자용 회원 리스트 조회", description = "전체 회원 목록을 페이징 및 정렬하여 조회합니다.")
    public ResponseEntity<Page<AdminMemberResponse>> getMemberList(
            @RequestParam(value = "searchName", required = false) String searchName,
            // 프론트에서 sort=name,desc 또는 sort=membershipType,asc 등으로 보낼 수 있음
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<AdminMemberResponse> response = membershipAdminService.getAdminMemberList(searchName, pageable);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{membershipId}/pause")
    @Operation(summary = "이용권 일시정지", description = "관리자가 회원의 활성화된 이용권을 일시정지합니다.")
    public ResponseEntity<String> pauseMembership(@PathVariable("membershipId") Long membershipId) {
        membershipAdminService.pauseMembership(membershipId);
        return ResponseEntity.ok("이용권이 성공적으로 일시정지 되었습니다.");
    }

    @PatchMapping("/{membershipId}/unpause")
    @Operation(summary = "이용권 정지 해제", description = "관리자가 일시정지된 이용권을 해제하고 기간을 연장합니다.")
    public ResponseEntity<String> unpauseMembership(@PathVariable("membershipId") Long membershipId) {
        membershipAdminService.unpauseMembership(membershipId);
        return ResponseEntity.ok("이용권 일시정지가 해제되었습니다.");
    }


}