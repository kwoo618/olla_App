package com.olla.olla_climbing.domain.record.entity;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.record.converter.DifficultyListConverter;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "record_series")
public class RecordSeries extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // JSON 컨버터 적용
    // MySQL/MariaDB에서 보기 좋게 columnDefinition = "json" 설정
    @Convert(converter = DifficultyListConverter.class)
    @Column(columnDefinition = "json", nullable = false)
    private List<Difficulty> sequenceLog;

    @Column(nullable = false)
    private Double totalScore;

    @Column(nullable = false)
    private LocalDate recordDate;

    @Builder
    public RecordSeries(Member member, List<Difficulty> sequenceLog, Double totalScore, LocalDate recordDate) {
        this.member = member;
        this.sequenceLog = sequenceLog;
        this.totalScore = totalScore;
        this.recordDate = recordDate;
    }
}