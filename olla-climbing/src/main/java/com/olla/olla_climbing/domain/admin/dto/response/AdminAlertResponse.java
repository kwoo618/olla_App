package com.olla.olla_climbing.domain.admin.dto.response;

import com.olla.olla_climbing.domain.admin.entity.AdminAlert;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AdminAlertResponse {
    private Long id;
    private String title;
    private String content;
    private boolean isRead;
    private LocalDateTime createdAt;

    public static AdminAlertResponse from(AdminAlert alert) {
        return AdminAlertResponse.builder()
                .id(alert.getId())
                .title(alert.getTitle())
                .content(alert.getContent())
                .isRead(alert.isRead())
                .createdAt(alert.getCreatedAt())
                .build();
    }
}