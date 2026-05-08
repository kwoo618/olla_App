package com.olla.olla_climbing.domain.admin.dto.response;

import com.olla.olla_climbing.domain.admin.entity.AdminNotification;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AdminNotificationResponse {
    private Long id;
    private String title;
    private String content;
    private boolean isRead;
    private LocalDateTime createdAt;

    public static AdminNotificationResponse from(AdminNotification alert) {
        return AdminNotificationResponse.builder()
                .id(alert.getId())
                .title(alert.getTitle())
                .content(alert.getContent())
                .isRead(alert.isRead())
                .createdAt(alert.getCreatedAt())
                .build();
    }
}