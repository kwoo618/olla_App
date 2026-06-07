package com.olla.olla_climbing.domain.member.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.olla.olla_climbing.domain.member.entity.MemberNotification;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MemberNotificationResponse {

    private Long id;
    private String title;
    private String content;

    @JsonProperty("isRead")
    private boolean isRead;

    private LocalDateTime createdAt;

    public static MemberNotificationResponse from(MemberNotification notification) {
        return MemberNotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .content(notification.getContent())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}