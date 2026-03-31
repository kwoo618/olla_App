package com.olla.olla_climbing.domain.admin.entity;

import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "membership")
public class Membership extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MembershipType membershipType;

    // 기간권 전용 필드 (횟수권일 경우 null 허용)
    private LocalDate startDate;
    private LocalDate endDate;

    // 횟수권 전용 필드 (기간권일 경우 null 허용)
    private Integer remainingCount;

    private LocalDate holdStartDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MembershipStatus status;

    @Builder
    public Membership(Member member, MembershipType membershipType, LocalDate startDate, LocalDate endDate, Integer remainingCount, MembershipStatus status) {
        this.member = member;
        this.membershipType = membershipType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.remainingCount = remainingCount;
        this.status = status != null ? status : MembershipStatus.ACTIVE;
    }

    // --- 비즈니스 로직 메서드 ---

    // 1. 기간권 연장 로직
    public void extendPeriod(int addMonths) {
        if (this.membershipType != MembershipType.PERIOD) {
            throw new IllegalArgumentException("기간권만 기간을 연장할 수 있습니다.");
        }
        // 기존 종료일이 오늘보다 이전이면 만료된 것이므로 오늘부터 새로 시작, 아니면 기존 종료일에 합산
        LocalDate baseDate = (this.endDate != null && this.endDate.isAfter(LocalDate.now())) ? this.endDate : LocalDate.now();
        this.endDate = baseDate.plusMonths(addMonths);
        this.status = MembershipStatus.ACTIVE;
    }

    // 2. 횟수권 추가 로직
    public void addCount(int addCount) {
        if (this.membershipType != MembershipType.COUNT) {
            throw new IllegalArgumentException("횟수권만 횟수를 추가할 수 있습니다.");
        }
        this.remainingCount = (this.remainingCount != null ? this.remainingCount : 0) + addCount;
        this.status = MembershipStatus.ACTIVE;
    }

    // 3. 만료 처리 로직
    public void expire() {
        this.status = MembershipStatus.EXPIRED;
    }

    // 4. 입장 시 횟수 차감 로직 (새로 추가)
    public void decreaseCount() {
        if (this.membershipType != MembershipType.COUNT) {
            return; // 기간권은 차감할 횟수가 없으므로 패스
        }
        if (this.remainingCount == null || this.remainingCount <= 0) {
            throw new IllegalStateException("잔여 횟수가 부족합니다.");
        }
        this.remainingCount -= 1;

        // 차감 후 0회가 되면 자동으로 만료 처리
        if (this.remainingCount == 0) {
            this.expire();
        }
    }

    // 5. 이용권 일시정지 처리 로직 (새로 추가)
    public void pause() {
        if (this.status != MembershipStatus.ACTIVE) {
            throw new IllegalStateException("활성 상태의 이용권만 일시정지할 수 있습니다.");
        }

        this.status = MembershipStatus.HOLDING;
        this.holdStartDate = LocalDate.now(); // 정지 시작일 기록
    }

    // 6. 이용권 일시정지 해제 로직 (새로 추가)
    public void unpause() {
        if (this.status != MembershipStatus.HOLDING) {
            throw new IllegalStateException("일시정지 상태의 이용권만 해제할 수 있습니다.");
        }

        // 기간권일 경우: 정지되어 있던 일수만큼 만료일(endDate) 연장
        if (this.membershipType == MembershipType.PERIOD && this.holdStartDate != null && this.endDate != null) {
            long holdDays = java.time.temporal.ChronoUnit.DAYS.between(this.holdStartDate, LocalDate.now());

            // 만약 당일 정지 후 당일 해제했다면 holdDays는 0이므로 endDate 변화 없음
            if (holdDays > 0) {
                this.endDate = this.endDate.plusDays(holdDays);
            }
        }

        // 공통: 상태를 다시 활성으로 변경하고 정지 시작일 초기화
        this.status = MembershipStatus.ACTIVE;
        this.holdStartDate = null;
    }
}