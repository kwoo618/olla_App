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

    // is 접두사 필드는 Lombok @Setter 사용 시 Jackson이 setter 이름을 못 찾아
    // 값이 null로 저장되는 버그 발생 → 수동 setter로 해결
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