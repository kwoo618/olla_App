package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.AdminMemberCreateRequest;
import com.olla.olla_climbing.domain.admin.service.MembershipAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/members")
public class AdminMemberController {

    private final MembershipAdminService membershipAdminService;

    // 관리자 - 오프라인 회원 신규 등록
    @PostMapping("/offline")
    public String createOfflineMember(@Valid @RequestBody AdminMemberCreateRequest request) {
        membershipAdminService.createOfflineMember(request);
        return "오프라인 회원 등록 및 시트 연동 성공";
    }
}