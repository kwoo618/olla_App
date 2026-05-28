package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.AdminNotificationSendRequest;
import com.olla.olla_climbing.domain.admin.dto.response.AdminNotificationResponse;
import com.olla.olla_climbing.domain.admin.service.AdminNotificationService;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/alerts")
@RequiredArgsConstructor
@Tag(name = "Admin Alert API", description = "관리자 알림 수신함 API")
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;

    @GetMapping
    @Operation(summary = "관리자 시스템 알림함 조회")
    public ResponseEntity<ApiResponse<Page<AdminNotificationResponse>>> getAlerts(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminNotificationService.getAlerts(pageable)));
    }

    @PatchMapping("/{alertId}/read")
    @Operation(summary = "관리자 시스템 알림 읽음 처리")
    public ResponseEntity<ApiResponse<Void>> markAlertAsRead(@PathVariable Long alertId) {
        adminNotificationService.markAlertAsRead(alertId);
        return ResponseEntity.ok(ApiResponse.success(200, "알림이 읽음 처리되었습니다.", null));
    }

    @PostMapping("/send")
    @Operation(summary = "특정 회원에게 1:1 알림 발송")
    public ResponseEntity<ApiResponse<Void>> sendDirectNotification(
            @Valid @RequestBody AdminNotificationSendRequest request) {
        adminNotificationService.sendDirectMessageToMember(
                request.getMemberId(), request.getTitle(), request.getContent());
        return ResponseEntity.ok(ApiResponse.success(200, "회원에게 알림이 성공적으로 발송되었습니다.", null));
    }
}