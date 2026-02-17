package com.olla.olla_climbing.domain.record.entity;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.record.enums.EnduranceZone;
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
@Table(name = "record_endurance")
public class RecordEndurance extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private Integer completedOneWays; // 편도 완주 횟수 (예: 왕복 1바퀴 = 2)

    @Column(nullable = true)
    private EnduranceZone dropZone; // 마지막 추락 구역 (완벽히 완주 후 내려왔다면 null)

    @Column(nullable = false)
    private Integer timeSeconds; // 기록 시간 (초 단위)

    @Column(nullable = false)
    private LocalDate recordDate;

    @Builder
    public RecordEndurance(Member member, Integer completedOneWays, EnduranceZone dropZone, Integer timeSeconds, LocalDate recordDate) {
        this.member = member;
        this.completedOneWays = completedOneWays;
        this.dropZone = dropZone;
        this.timeSeconds = timeSeconds;
        this.recordDate = recordDate;
    }
}