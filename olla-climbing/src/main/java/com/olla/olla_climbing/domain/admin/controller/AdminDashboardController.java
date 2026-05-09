package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.response.AdminDashboardResponse;
import com.olla.olla_climbing.domain.admin.service.AdminDashboardService;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@Tag(name = "Admin Dashboard API", description = "관리자 메인 대시보드 통계 API")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping
    @Operation(summary = "대시보드 통계 조회", description = "혼잡도 그래프, 활성 이용권, 만료 임박 회원 통계를 반환합니다.")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboardStats() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getDashboardStats()));
    }
}