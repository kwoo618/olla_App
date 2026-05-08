package com.olla.olla_climbing.domain.member.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NotificationUpdateRequest {
    private Boolean isGlobalNotificationOn;
    private Boolean isMembershipNotificationOn;
    private Boolean isActivityNotificationOn;
    private Boolean isCrewNotificationOn;
    private Boolean isNoticeNotificationOn;
}