package com.olla.olla_climbing.domain.ranking.repository;

import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.record.enums.Difficulty; // 경로 수정 반영
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RankingRepository extends JpaRepository<Ranking, Long> {

    // 1. 마스터 목록 조회
    List<Ranking> findByRankTypeAndDifficultyAndIsMasterTrueOrderByBaseDateDesc(
            RankType rankType, Difficulty difficulty);

    // 2. 도전자 목록 조회를 위한 가장 최근 집계일(baseDate) 조회
    // SELECT MAX(r.baseDate) FROM Ranking r WHERE r.rankType = :rankType AND r.difficulty = :difficulty AND r.isMaster = false:
    // MAX(r.baseDate): 도전자 랭킹에서 가장 최신의 집계일을 찾는 쿼리입니다. 랭킹은 주기적으로 업데이트되므로, 도전자 목록을 조회할 때 최신 집계일을 기준으로 조회해야 합니다.
    @Query("SELECT MAX(r.baseDate) FROM Ranking r WHERE r.rankType = :rankType AND r.difficulty = :difficulty AND r.isMaster = false")
    Optional<LocalDateTime> findLatestBaseDate(@Param("rankType") RankType rankType, @Param("difficulty") Difficulty difficulty);

    // 3. 도전자 목록 조회 (특정 날짜 기준, 순위 오름차순)
    List<Ranking> findByRankTypeAndDifficultyAndIsMasterFalseAndBaseDateOrderByRankingAsc(
            RankType rankType, Difficulty difficulty, LocalDateTime baseDate);
}