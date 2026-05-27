package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.AdminNotificationResponse;
import com.olla.olla_climbing.domain.admin.entity.AdminNotification;
import com.olla.olla_climbing.domain.admin.repository.AdminNotificationRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminNotificationService {

    private final AdminNotificationRepository adminNotificationRepository;

    private final MemberRepository memberRepository;
    private final NotificationService notificationService;

    // 1. 관리자 본인의 시스템 알림 목록 조회
    @Transactional(readOnly = true)
    public Page<AdminNotificationResponse> getAlerts(Pageable pageable) {
        return adminNotificationRepository.findAll(pageable)
                .map(AdminNotificationResponse::from);
    }

    // 2. 관리자 시스템 알림 읽음 처리
    @Transactional
    public void markAlertAsRead(Long alertId) {
        AdminNotification alert = adminNotificationRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 알림입니다."));

        alert.markAsRead();
    }

    // 3. 관리자가 특정 회원에게 직접 알림 보내기 (수신함 발송 기능)
    @Transactional
    public void sendDirectMessageToMember(Long memberId, String title, String content) {
        // 1. 알림을 받을 회원을 조회합니다.
        Member receiver = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 2. NotificationService의 비동기(@Async) 메서드를 호출하여 알림을 발송(DB 적재)합니다.
        // 비동기로 동작하므로 발송 중 에러가 나도 관리자의 다른 작업(트랜잭션)에 영향을 주지 않습니다.
        notificationService.sendAdminDirectNotification(receiver, title, content);
    }
}