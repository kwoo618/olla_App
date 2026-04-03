package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.AdminNotificationSendRequest;
import com.olla.olla_climbing.domain.admin.dto.response.AdminAlertResponse;
import com.olla.olla_climbing.domain.admin.service.AdminAlertService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberNotification;
import com.olla.olla_climbing.domain.member.repository.MemberNotificationRepository;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
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
@Tag(name = "Admin Alert API", description = "관리자 전용 알림 확인 API")
public class AdminAlertController {

    private final AdminAlertService adminAlertService;

    private final MemberRepository memberRepository;
    private final MemberNotificationRepository memberNotificationRepository;

    @GetMapping
    @Operation(summary = "관리자 알림 목록 조회", description = "만료 요약 등 관리자용 알림을 최신순으로 페이징하여 조회합니다.")
    public ResponseEntity<Page<AdminAlertResponse>> getAlerts(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<AdminAlertResponse> response = adminAlertService.getAlerts(pageable);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{alertId}/read")
    @Operation(summary = "알림 읽음 처리", description = "특정 알림을 클릭했을 때 읽음 상태(isRead = true)로 변경합니다.")
    public ResponseEntity<String> markAsRead(@PathVariable("alertId") Long alertId) {
        adminAlertService.markAlertAsRead(alertId);
        return ResponseEntity.ok("알림이 읽음 처리되었습니다.");
    }

    @PostMapping("/send")
    @Transactional
    @Operation(summary = "특정 회원에게 개별 알림 발송", description = "DB에 알림을 저장하여 앱 내에서 볼 수 있게 하고, 수신 동의 시 푸시 발송을 준비합니다.")
    public ResponseEntity<String> sendNotificationToMember(@Valid @RequestBody AdminNotificationSendRequest request) {

        // 1. 수신자 조회
        Member receiver = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 2. 수신 동의(ON/OFF)와 무관하게 앱 내 알림함(DB)에는 무조건 저장
        MemberNotification notification = MemberNotification.builder()
                .member(receiver)
                .title(request.getTitle())
                .content(request.getContent())
                .build();
        memberNotificationRepository.save(notification);

        // 3. 실제 스마트폰 푸시(FCM) 발송 여부 체크 (나중에 Epic 7 진행 시 사용할 뼈대)
        if (receiver.getNotificationSetting() != null) {
            boolean isGlobalOn = receiver.getNotificationSetting().isGlobalAlertOn();
            boolean isNoticeOn = receiver.getNotificationSetting().isNoticeAlertOn();

            if (isGlobalOn && isNoticeOn) {
                // TODO: 나중에 여기에 FCM 푸시 알림을 쏘는 코드
            }
        }

        return ResponseEntity.ok(receiver.getName() + " 회원님에게 알림이 성공적으로 전송되었습니다.");
    }
}