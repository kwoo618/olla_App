package com.olla.olla_climbing.domain.member.controller;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberNotification;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification API", description = "유저 개인 알림함 API")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "내 알림 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Page<MemberNotification>>> getMyNotifications(
            @AuthenticationPrincipal Member member,
            @PageableDefault(size = 15) Pageable pageable) {
        Page<MemberNotification> response = notificationService.getMyNotifications(member.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(200, "내 알림 목록 조회 성공", response));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "알림 읽음 처리", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable("id") Long notiId,
            @AuthenticationPrincipal Member member) {
        notificationService.markAsRead(notiId, member.getId());
        return ResponseEntity.ok(ApiResponse.success(200, "알림 읽음 처리 완료", null));
    }
}