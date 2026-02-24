package com.olla.olla_climbing.domain.member.dto.response;

import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AlertResponse {
    // 응답은 null 상태가 없으므로 기본형(boolean) 사용
    private boolean isGlobalAlertOn;

    private boolean isMembershipWeekBeforeAlertOn;
    private boolean isMembershipDayBeforeAlertOn;
    private boolean isMembershipExpiredAlertOn;

    private boolean isNoticeAlertOn;
    private boolean isCrewParticipantChangeAlertOn;
    private boolean isCrewMeetingReminderAlertOn;

    private boolean isRankingChangeAlertOn;
    private boolean isWeeklyReportAlertOn;

    private boolean isInactivityAlertOn;
    private Integer inactivityDays;

    public static AlertResponse from(NotificationSetting setting) {
        // 알림 설정이 아예 없는 초기 상태에 대한 방어 로직
        if (setting == null) {
            return AlertResponse.builder().build();
        }

        return AlertResponse.builder()
                .isGlobalAlertOn(setting.isGlobalAlertOn())
                .isMembershipWeekBeforeAlertOn(setting.isMembershipWeekBeforeAlertOn())
                .isMembershipDayBeforeAlertOn(setting.isMembershipDayBeforeAlertOn())
                .isMembershipExpiredAlertOn(setting.isMembershipExpiredAlertOn())
                .isNoticeAlertOn(setting.isNoticeAlertOn())
                .isCrewParticipantChangeAlertOn(setting.isCrewParticipantChangeAlertOn())
                .isCrewMeetingReminderAlertOn(setting.isCrewMeetingReminderAlertOn())
                .isRankingChangeAlertOn(setting.isRankingChangeAlertOn())
                .isWeeklyReportAlertOn(setting.isWeeklyReportAlertOn())
                .isInactivityAlertOn(setting.isInactivityAlertOn())
                .inactivityDays(setting.getInactivityDays())
                .build();
    }
}