package com.olla.olla_climbing.domain.record.entity;

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
@Table(name = "record_endurance")
public class RecordEndurance extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private Integer oneWayCount; // 편도 완주 횟수 (예: 왕복 1바퀴 = 2)

    @Column(nullable = true)
    private Integer additionalBlocks; // 추가 진행 칸 수 (0 ~ 26)

    @Column(nullable = false)
    private Integer timeSeconds; // 기록 시간 (초 단위)

    @Column(nullable = false)
    private Double totalScore; // 거리 랭킹용 점수(거리(칸수) 우선, 거리가 같으면 시간이 길수록 높은 점수)

    @Column(nullable = false)
    private LocalDate recordDate;

    @Builder
    public RecordEndurance(Member member, Integer oneWayCount, Integer additionalBlocks, Integer timeSeconds, LocalDate recordDate) {
        this.member = member;
        this.oneWayCount = oneWayCount;
        this.additionalBlocks = additionalBlocks;
        this.timeSeconds = timeSeconds;
        this.recordDate = recordDate;

        // 거리(칸수) 우선, 거리가 같으면 시간이 길수록 높은 점수
        int totalBlocks = (oneWayCount * 27) + additionalBlocks;
        this.totalScore = Double.valueOf((totalBlocks * 10000) + timeSeconds);
    }
}