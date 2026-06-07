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

    @Version
    private Long version;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    private Integer durationMonth;   // 기간권: 개월 수 (null이면 기간권 아님)
    private Integer remainingCount;  // 일일권: 남은 횟수 (null이면 일일권 아님)

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
        if (this.durationMonth != null) {
            this.endDate = this.startDate.plusMonths(durationMonth);
        }
    }

    // 한 회원이 기간권+일일권 동시 보유 시 "회원권+일일권"으로 표기
    public String getMembershipTypeName() {
        boolean hasPeriod = this.durationMonth != null;
        boolean hasCount  = this.remainingCount != null;
        if (hasPeriod && hasCount) return "회원권+일일권";
        if (hasPeriod) return "회원권";
        if (hasCount)  return "일일권";
        return "없음";
    }

    public void pause() {
        if (this.endDate == null || this.isPaused) return;
        this.isPaused = true;
        this.pauseStartDate = LocalDate.now();
        this.remainingDaysAtPause = ChronoUnit.DAYS.between(this.pauseStartDate, this.endDate);
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

    public void expire() { this.status = MembershipStatus.EXPIRED; }

    public void markAsDeleted() {
        this.isDeleted = true;
        this.status = MembershipStatus.EXPIRED;
    }

    public void useCount(int deductionCount) {
        if (this.remainingCount == null || this.remainingCount < deductionCount) {
            throw new IllegalStateException("잔여 횟수가 부족합니다.");
        }
        this.remainingCount -= deductionCount;
        if (this.remainingCount <= 0) this.status = MembershipStatus.EXPIRED;
    }

    public void increaseAccumulatedVisits() {
        if (this.accumulatedVisits == null) this.accumulatedVisits = 0;
        this.accumulatedVisits++;
    }

    public void addDuration(int addMonths) {
        this.durationMonth += addMonths;
        this.endDate = this.endDate.plusMonths(addMonths);
    }

    public void addRemainingCount(int addCount) {
        this.remainingCount += addCount;
    }
}