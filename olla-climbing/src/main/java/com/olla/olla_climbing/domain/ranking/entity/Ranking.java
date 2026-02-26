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

// 나중에 유저의 '마이페이지'에서 "이 유저가 보유한 모든 랭킹 배지를 보여줘"라고 할 때, 테이블이 3개면 쿼리를 3번 날리거나 복잡한 JOIN을 해야 한다
// 그래서 랭킹 테이블 하나로 통합해서 관리하는 게 낫다고 판단(null이 들어가서 불필요한 칼럼이 생기긴 하지만, 쿼리 최적화 측면에서 더 효율적일 것으로 예상)
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
    @Column(nullable = false, length = 50)
    private RankType rankType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = true) // nullable 명시
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
        this.rankType = rankType;
        this.difficulty = difficulty;
        this.ranking = ranking;
        this.score = score;
        this.isMaster = isMaster;
    }

    // 기존 기록 경신 (아직 도전자일 때)
    public void updateScore(Double newScore) {
        this.score = newScore;
        this.baseDate = LocalDateTime.now(); // 갱신된 시간으로 업데이트
    }

    // 마스터로 승급할 때
    public void updateToMaster(Double finalScore) {
        this.score = finalScore;
        this.isMaster = true;
        this.ranking = null; // 마스터는 순위가 무의미하므로 null 처리
        this.baseDate = LocalDateTime.now(); // 달성일
    }

    // 기록 삭제 등으로 인해 마스터에서 강등되거나 점수가 깎일 때 사용
    public void syncBestRecord(Double bestScore, boolean isMaster) {
        this.score = bestScore;
        this.isMaster = isMaster;
        this.baseDate = LocalDateTime.now();
        // 마스터가 아니게 되었다면, 다음 순위 재계산 로직에서 순위가 부여
    }

    // 순위 업데이트 (마스터가 아닌 도전자일 때)
    public void updateRanking(Integer newRanking) {
        this.ranking = newRanking;
        this.baseDate = LocalDateTime.now();
    }
}