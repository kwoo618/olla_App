package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.AdminNotificationSendRequest;
import com.olla.olla_climbing.domain.admin.dto.response.AdminNotificationResponse;
import com.olla.olla_climbing.domain.admin.service.AdminNotificationService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberNotification;
import com.olla.olla_climbing.domain.member.repository.MemberNotificationRepository;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/alerts")
@RequiredArgsConstructor
@Tag(name = "Admin Alert API")
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;
    private final MemberRepository memberRepository;
    private final MemberNotificationRepository memberNotificationRepository;

    @GetMapping
    @Operation(summary = "관리자 알림함 조회")
    public ResponseEntity<ApiResponse<Page<AdminNotificationResponse>>> getAlerts(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AdminNotificationResponse> response = adminNotificationService.getAlerts(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{alertId}/read")
    @Operation(summary = "관리자 알림 읽음 처리")
    public ResponseEntity<ApiResponse<String>> markAlertAsRead(@PathVariable("alertId") Long alertId) {
        adminNotificationService.markAlertAsRead(alertId);
        return ResponseEntity.ok(ApiResponse.success("알림이 읽음 처리되었습니다."));
    }

    @PostMapping("/send")
    @Transactional
    @Operation(summary = "특정 회원에게 개별 알림 발송")
    public ResponseEntity<ApiResponse<String>> sendNotificationToMember(@Valid @RequestBody AdminNotificationSendRequest request) {
        Member receiver = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        MemberNotification notification = MemberNotification.builder()
                .member(receiver)
                .title(request.getTitle())
                .content(request.getContent())
                .build();
        memberNotificationRepository.save(notification);
        return ResponseEntity.ok(ApiResponse.success("알림이 성공적으로 전송되었습니다."));
    }
}