package com.olla.olla_climbing.domain.member.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("isGlobalNotificationOn")
    public void setIsGlobalNotificationOn(Boolean value) { this.isGlobalNotificationOn = value; }

    @JsonProperty("isMembershipNotificationOn")
    public void setIsMembershipNotificationOn(Boolean value) { this.isMembershipNotificationOn = value; }

    @JsonProperty("isActivityNotificationOn")
    public void setIsActivityNotificationOn(Boolean value) { this.isActivityNotificationOn = value; }

    @JsonProperty("isCrewNotificationOn")
    public void setIsCrewNotificationOn(Boolean value) { this.isCrewNotificationOn = value; }

    @JsonProperty("isNoticeNotificationOn")
    public void setIsNoticeNotificationOn(Boolean value) { this.isNoticeNotificationOn = value; }
}