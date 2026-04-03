package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.AdminAlertResponse;
import com.olla.olla_climbing.domain.admin.entity.AdminAlert;
import com.olla.olla_climbing.domain.admin.repository.AdminAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAlertService {

    private final AdminAlertRepository adminAlertRepository;

    // 1. 관리자 알림 목록 조회 (최신순)
    @Transactional(readOnly = true)
    public Page<AdminAlertResponse> getAlerts(Pageable pageable) {
        return adminAlertRepository.findAll(pageable)
                .map(AdminAlertResponse::from);
    }

    // 2. 관리자 알림 읽음 처리
    @Transactional
    public void markAlertAsRead(Long alertId) {
        AdminAlert alert = adminAlertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 알림입니다."));

        // 엔티티의 markAsRead 호출 (Dirty Checking으로 자동 UPDATE)
        alert.markAsRead();
    }
}