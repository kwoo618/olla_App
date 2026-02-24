package com.olla.olla_climbing.domain.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "notification_setting")
public class NotificationSetting {

    @Id
    private Long memberId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    // 1. 마스터 알림 (이게 꺼지면 아래 모든 알림이 안 울림)
    @Column(nullable = false)
    private boolean isGlobalAlertOn;

    // 2. 회원권 관련 알림
    @Column(nullable = false)
    private boolean isMembershipWeekBeforeAlertOn; // 1주 전
    @Column(nullable = false)
    private boolean isMembershipDayBeforeAlertOn;  // 하루 전
    @Column(nullable = false)
    private boolean isMembershipExpiredAlertOn;    // 종료 시

    // 3. 커뮤니티 알림
    @Column(nullable = false)
    private boolean isNoticeAlertOn; // 공지사항
    @Column(nullable = false)
    private boolean isCrewParticipantChangeAlertOn; // 모집글 인원 변동
    @Column(nullable = false)
    private boolean isCrewMeetingReminderAlertOn; // 운동 모임 리마인드

    // 4. 기록 및 랭킹 알림
    @Column(nullable = false)
    private boolean isRankingChangeAlertOn; // 순위 변동
    @Column(nullable = false)
    private boolean isWeeklyReportAlertOn;  // 주간 등반 리포트

    // 5. 동기부여(미출석) 알림
    @Column(nullable = false)
    private boolean isInactivityAlertOn; // 미출석 알림 ON/OFF

    @Column(nullable = true)
    private Integer inactivityDays; // 며칠 미출석 시 알릴 것인지 (예: 3일. null이면 작동안함)

    // 생성자 (회원가입 시 초기 세팅)
    public NotificationSetting(Member member) {
        this.member = member;
        this.isGlobalAlertOn = true;

        // 기본적으로 정보성/활동성 알림은 ON
        this.isMembershipWeekBeforeAlertOn = true;
        this.isMembershipDayBeforeAlertOn = true;
        this.isMembershipExpiredAlertOn = true;
        this.isNoticeAlertOn = true;
        this.isCrewParticipantChangeAlertOn = true;
        this.isCrewMeetingReminderAlertOn = true;
        this.isRankingChangeAlertOn = true;
        this.isWeeklyReportAlertOn = true;

        // 동기부여 알림은 사용자가 직접 설정하도록 초기엔 OFF
        this.isInactivityAlertOn = false;
        this.inactivityDays = null;
    }

    // 데이터 업데이트 편의 메서드 (null 방어 로직 포함)
    public void update(Boolean global, Boolean memWeek, Boolean memDay, Boolean memExp,
                       Boolean notice, Boolean crewPart, Boolean crewRemind,
                       Boolean rank, Boolean weekly, Boolean inactive, Integer inactiveDays) {

        if (global != null) this.isGlobalAlertOn = global;
        if (memWeek != null) this.isMembershipWeekBeforeAlertOn = memWeek;
        if (memDay != null) this.isMembershipDayBeforeAlertOn = memDay;
        if (memExp != null) this.isMembershipExpiredAlertOn = memExp;
        if (notice != null) this.isNoticeAlertOn = notice;
        if (crewPart != null) this.isCrewParticipantChangeAlertOn = crewPart;
        if (crewRemind != null) this.isCrewMeetingReminderAlertOn = crewRemind;
        if (rank != null) this.isRankingChangeAlertOn = rank;
        if (weekly != null) this.isWeeklyReportAlertOn = weekly;

        if (inactive != null) this.isInactivityAlertOn = inactive;
        if (inactiveDays != null) this.inactivityDays = inactiveDays;
    }
}