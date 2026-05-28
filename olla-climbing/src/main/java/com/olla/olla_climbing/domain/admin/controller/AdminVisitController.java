package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.VisitScanRequest;
import com.olla.olla_climbing.domain.admin.dto.response.VisitDashboardResponse;
import com.olla.olla_climbing.domain.admin.dto.response.VisitScanResponse;
import com.olla.olla_climbing.domain.admin.service.VisitService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/visits")
@RequiredArgsConstructor
@Tag(name = "Admin Visit API")
public class AdminVisitController {

    private final VisitService visitService;

    @PostMapping("/scan")
    @Operation(summary = "QR 스캔 입장 처리", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<VisitScanResponse>> scanQrAndEnter(
            @AuthenticationPrincipal Member admin,
            @Valid @RequestBody VisitScanRequest request) {
        if (admin == null) throw new IllegalArgumentException("관리자 인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(
                visitService.processEntry(request.getQrToken(), admin.getLoginId(), request.getDeductionCount())));
    }

    @GetMapping("/today")
    @Operation(summary = "당일 출석 대시보드 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<VisitDashboardResponse>> getTodayVisitDashboard() {
        return ResponseEntity.ok(ApiResponse.success(visitService.getTodayDashboard()));
    }
}