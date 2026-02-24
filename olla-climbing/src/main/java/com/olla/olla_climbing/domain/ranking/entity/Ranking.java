package com.olla.olla_climbing.domain.ranking.entity;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access= AccessLevel.PROTECTED)
@Table(name = "ranking")
public class Ranking extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private LocalDateTime baseDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Difficulty difficulty;

    @Column(nullable = true)
    private Integer ranking;

    // 최고 도달 홀드 수(초보벽) 또는 총점(연속/메인)
    @Column(nullable = false)
    private Double score;

    // true: 왕복 완료 명예의 전당, false: 도전 중인 랭커
    @Column(nullable = false)
    private boolean isMaster;

    @Builder
    public Ranking(Member member, LocalDateTime baseDate, RankType rankType, Difficulty difficulty, Integer ranking, Double score, boolean isMaster) {
        this.member = member;
        this.baseDate = baseDate;
        this.difficulty = difficulty;
        this.ranking = ranking;
        this.score = score;
        this.isMaster = isMaster;
    }
}
