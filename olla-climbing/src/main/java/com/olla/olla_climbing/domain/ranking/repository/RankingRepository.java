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

    // 1. IsMaster -> Master 로 수정됨
    List<Ranking> findByRankTypeAndDifficultyAndMasterTrueOrderByBaseDateDesc(
            RankType rankType, Difficulty difficulty);

    // 2. r.isMaster -> r.master 로 수정됨
    @Query("SELECT MAX(r.baseDate) FROM Ranking r WHERE r.rankType = :rankType AND r.difficulty = :difficulty AND r.master = false")
    Optional<LocalDateTime> findLatestBaseDate(@Param("rankType") RankType rankType, @Param("difficulty") Difficulty difficulty);

    // 3. IsMaster -> Master 로 수정됨
    List<Ranking> findByRankTypeAndDifficultyAndMasterFalseAndBaseDateOrderByRankingAsc(
            RankType rankType, Difficulty difficulty, LocalDateTime baseDate);

    // 4. 특정 유저의 기존 랭킹 데이터 찾기
    Optional<Ranking> findByMemberAndRankTypeAndDifficulty(
            Member member, RankType rankType, Difficulty difficulty);

    // 5. IsMaster -> Master 로 수정됨
    List<Ranking> findByRankTypeAndDifficultyAndMasterFalseOrderByScoreDescBaseDateAsc(
            RankType rankType, Difficulty difficulty);
}