package com.olla.olla_climbing.domain.admin.entity;

import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Membership extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    private Integer durationMonth; // 기간권: 개월 수
    private Integer remainingCount; // 횟수권: 남은 횟수

    private LocalDate startDate;
    private LocalDate endDate;

    @Column(nullable = false)
    private boolean isDeleted = false;

    @Enumerated(EnumType.STRING)
    private MembershipStatus status = MembershipStatus.ACTIVE;

    private boolean isPaused = false;
    private LocalDate pauseStartDate;
    private Long remainingDaysAtPause;

    private Integer accumulatedVisits = 0;

    @Builder
    public Membership(Member member, LocalDate startDate, Integer durationMonth, Integer remainingCount) {
        this.member = member;
        this.startDate = startDate != null ? startDate : LocalDate.now();
        this.durationMonth = durationMonth;
        this.remainingCount = remainingCount;

        // 기간권일 경우 종료일 자동 계산
        if (this.durationMonth != null) {
            this.endDate = this.startDate.plusMonths(durationMonth);
        }
    }

    // 💡 [추가] 외부(DTO, 시트)에서 권종을 알아야 할 때 사용하는 비즈니스 메서드
    public String getMembershipTypeName() {
        if (this.durationMonth != null) return "PERIOD";
        if (this.remainingCount != null) return "COUNT";
        return "NONE";
    }

    // 기존의 일시정지(pause), 해제(unpause) 로직은 동일하게 유지
    public void pause() {
        if (this.endDate == null || this.isPaused) return;
        this.isPaused = true;
        this.pauseStartDate = LocalDate.now();
        this.remainingDaysAtPause = ChronoUnit.DAYS.between(pauseStartDate, this.endDate);
        this.status = MembershipStatus.HOLDING;
    }

    public void unpause() {
        if (!this.isPaused) return;
        this.endDate = LocalDate.now().plusDays(this.remainingDaysAtPause);
        this.isPaused = false;
        this.pauseStartDate = null;
        this.remainingDaysAtPause = null;
        this.status = MembershipStatus.ACTIVE;
    }

    public void expire() {
        this.status = MembershipStatus.EXPIRED;
    }

    public void decreaseCount(int count) {
        if (this.remainingCount == null || this.remainingCount < count) {
            throw new IllegalArgumentException("잔여 횟수가 부족합니다.");
        }
        this.remainingCount -= count;
        if (this.remainingCount <= 0) {
            this.status = MembershipStatus.EXPIRED;
        }
    }

    public void increaseAccumulatedVisits() {
        if (this.accumulatedVisits == null) {
            this.accumulatedVisits = 0;
        }
        this.accumulatedVisits++;
    }

    public void markAsDeleted() {
        this.isDeleted = true;
    }

    public void addDuration(int addMonths) {
        this.durationMonth += addMonths;
        this.endDate = this.endDate.plusMonths(addMonths);
    }
    public void addRemainingCount(int addCount) {
        this.remainingCount += addCount;
    }

    public void useCount(int deductionCount) {
        if (this.remainingCount == null || this.remainingCount < deductionCount) {
            throw new IllegalStateException("잔여 횟수가 부족합니다.");
        }
        this.remainingCount -= deductionCount;
    }

}