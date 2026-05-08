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

    // 1. 마스터 스위치
    @Column(nullable = false)
    private boolean isGlobalNotificationOn = true;

    // 2. 이용권 만료 관련
    @Column(nullable = false)
    private boolean isMembershipNotificationOn = true;

    // 3. 내 활동 (댓글, 좋아요)
    @Column(nullable = false)
    private boolean isActivityNotificationOn = true;

    // 4. 모임/크루 (참여, 취소, 리마인드)
    @Column(nullable = false)
    private boolean isCrewNotificationOn = true;

    // 5. 공지사항 및 이벤트
    @Column(nullable = false)
    private boolean isNoticeNotificationOn = true;

    public NotificationSetting(Member member) {
        this.member = member;
    }

    public void update(Boolean global, Boolean membership, Boolean activity, Boolean crew, Boolean notice) {
        if (global != null) this.isGlobalNotificationOn = global;
        if (membership != null) this.isMembershipNotificationOn = membership;
        if (activity != null) this.isActivityNotificationOn = activity;
        if (crew != null) this.isCrewNotificationOn = crew;
        if (notice != null) this.isNoticeNotificationOn = notice;
    }
}