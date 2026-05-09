package com.olla.olla_climbing.domain.member.dto.response;

import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {
    private boolean isGlobalNotificationOn;
    private boolean isMembershipNotificationOn;
    private boolean isActivityNotificationOn;
    private boolean isCrewNotificationOn;
    private boolean isNoticeNotificationOn;

    public static NotificationResponse from(NotificationSetting setting) {
        if (setting == null) return NotificationResponse.builder().build();
        return NotificationResponse.builder()
                .isGlobalNotificationOn(setting.isGlobalNotificationOn())
                .isMembershipNotificationOn(setting.isMembershipNotificationOn())
                .isActivityNotificationOn(setting.isActivityNotificationOn())
                .isCrewNotificationOn(setting.isCrewNotificationOn())
                .isNoticeNotificationOn(setting.isNoticeNotificationOn())
                .build();
    }
}