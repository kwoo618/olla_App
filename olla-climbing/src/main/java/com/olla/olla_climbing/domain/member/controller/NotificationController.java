package com.olla.olla_climbing.domain.member.controller;

import com.olla.olla_climbing.domain.member.dto.response.MemberNotificationResponse;
import com.olla.olla_climbing.domain.member.entity.Member;
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

    // 엔티티 반환 시 Member → MemberDetail → Member 무한 순환 참조(StackOverflowError) 발생
    @GetMapping
    @Operation(summary = "내 알림 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Page<MemberNotificationResponse>>> getMyNotifications(
            @AuthenticationPrincipal Member member,
            @PageableDefault(size = 15) Pageable pageable) {

        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");

        Page<MemberNotificationResponse> response = notificationService.getMyNotifications(member.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(200, "내 알림 목록 조회 성공", response));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "알림 읽음 처리", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable("id") Long notiId,
            @AuthenticationPrincipal Member member) {

        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");

        notificationService.markAsRead(notiId, member.getId());
        return ResponseEntity.ok(ApiResponse.success(200, "알림 읽음 처리 완료", null));
    }
}