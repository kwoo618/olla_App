package com.olla.olla_climbing.domain.ranking.repository;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RankingRepository extends JpaRepository<Ranking, Long> {

    // [1. 초보벽 전용] Master -> IsMaster 로 모두 변경
    List<Ranking> findByRankTypeAndDifficultyAndIsMasterTrueOrderByBaseDateDesc(RankType rankType, Difficulty difficulty);

    @Query("SELECT MAX(r.baseDate) FROM Ranking r WHERE r.rankType = :rankType AND r.difficulty = :difficulty AND r.isMaster = false")
    Optional<LocalDateTime> findLatestBaseDate(@Param("rankType") RankType rankType, @Param("difficulty") Difficulty difficulty);

    List<Ranking> findByRankTypeAndDifficultyAndIsMasterFalseAndBaseDateOrderByRankingAsc(RankType rankType, Difficulty difficulty, LocalDateTime baseDate);

    Optional<Ranking> findByMemberAndRankTypeAndDifficulty(Member member, RankType rankType, Difficulty difficulty);

    List<Ranking> findByRankTypeAndDifficultyAndIsMasterFalseOrderByScoreDescBaseDateAsc(RankType rankType, Difficulty difficulty);


    // [2. 통합 랭킹 전용] Master -> IsMaster 로 모두 변경
    @Query("SELECT MAX(r.baseDate) FROM Ranking r WHERE r.rankType = :rankType AND r.isMaster = false")
    Optional<LocalDateTime> findLatestBaseDateByRankType(@Param("rankType") RankType rankType);

    List<Ranking> findByRankTypeAndIsMasterFalseAndBaseDateOrderByRankingAsc(RankType rankType, LocalDateTime baseDate);

    Optional<Ranking> findByMemberAndRankType(Member member, RankType rankType);

    List<Ranking> findByRankTypeAndIsMasterFalseOrderByScoreDescBaseDateAsc(RankType rankType);
}