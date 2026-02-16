package com.olla.olla_climbing.domain.member.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AlertUpdateRequest {
    // null이 들어올 수 있도록 모두 래퍼 클래스(Boolean, Integer) 사용
    private Boolean isGlobalAlertOn;

    private Boolean isMembershipWeekBeforeAlertOn;
    private Boolean isMembershipDayBeforeAlertOn;
    private Boolean isMembershipExpiredAlertOn;

    private Boolean isNoticeAlertOn;
    private Boolean isCrewParticipantChangeAlertOn;
    private Boolean isCrewMeetingReminderAlertOn;

    private Boolean isRankingChangeAlertOn;
    private Boolean isWeeklyReportAlertOn;

    private Boolean isInactivityAlertOn;
    private Integer inactivityDays;
}