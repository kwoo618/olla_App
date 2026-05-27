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
@Tag(name = "Admin Alert API", description = "관리자 알림 및 수신함 관리 API")
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;

    @GetMapping
    @Operation(summary = "관리자 시스템 알림함 조회", description = "관리자 대시보드에서 시스템 알림 내역을 조회합니다.")
    public ResponseEntity<ApiResponse<Page<AdminNotificationResponse>>> getAlerts(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AdminNotificationResponse> response = adminNotificationService.getAlerts(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{alertId}/read")
    @Operation(summary = "관리자 시스템 알림 읽음 처리", description = "특정 관리자 알림을 읽음(read=true) 상태로 변경합니다.")
    public ResponseEntity<ApiResponse<String>> markAlertAsRead(@PathVariable("alertId") Long alertId) {
        adminNotificationService.markAlertAsRead(alertId);
        return ResponseEntity.ok(ApiResponse.success("알림이 읽음 처리되었습니다."));
    }

    @PostMapping("/send")
    @Operation(summary = "특정 회원에게 1:1 알림 발송", description = "관리자가 특정 회원(memberId)을 지정하여 앱 내 수신함으로 직접 알림을 발송합니다.")
    public ResponseEntity<ApiResponse<String>> sendDirectNotification(
            @Valid @RequestBody AdminNotificationSendRequest request) {

        adminNotificationService.sendDirectMessageToMember(
                request.getMemberId(),
                request.getTitle(),
                request.getContent()
        );

        return ResponseEntity.ok(ApiResponse.success("회원에게 알림이 성공적으로 발송되었습니다."));
    }
}