package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.AdminNotificationResponse;
import com.olla.olla_climbing.domain.admin.entity.AdminNotification;
import com.olla.olla_climbing.domain.admin.repository.AdminNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminNotificationService {

    private final AdminNotificationRepository adminNotificationRepository;

    // 1. 관리자 알림 목록 조회 (최신순)
    @Transactional(readOnly = true)
    public Page<AdminNotificationResponse> getAlerts(Pageable pageable) {
        return adminNotificationRepository.findAll(pageable)
                .map(AdminNotificationResponse::from);
    }

    // 2. 관리자 알림 읽음 처리
    @Transactional
    public void markAlertAsRead(Long alertId) {
        AdminNotification alert = adminNotificationRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 알림입니다."));

        // 엔티티의 markAsRead 호출 (Dirty Checking으로 자동 UPDATE)
        alert.markAsRead();
    }
}