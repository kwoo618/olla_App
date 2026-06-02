package com.olla.olla_climbing.domain.member.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {

    @JsonProperty("isGlobalNotificationOn")
    private boolean isGlobalNotificationOn;

    @JsonProperty("isMembershipNotificationOn")
    private boolean isMembershipNotificationOn;

    @JsonProperty("isActivityNotificationOn")
    private boolean isActivityNotificationOn;

    @JsonProperty("isCrewNotificationOn")
    private boolean isCrewNotificationOn;

    @JsonProperty("isNoticeNotificationOn")
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