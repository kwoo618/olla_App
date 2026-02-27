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

    // =========================================================================================
    // [1. 초보벽 단일 리드 랭킹 전용] - 난이도(Difficulty) 구분이 있고, 마스터/챌린저 제도가 있음
    // =========================================================================================

    // [조회] 특정 난이도의 명예의 전당(Master) 유저들을 달성 날짜 최신순으로 가져옵니다.
    List<Ranking> findByRankTypeAndDifficultyAndMasterTrueOrderByBaseDateDesc(RankType rankType, Difficulty difficulty);

    // [조회] 특정 난이도 챌린저(Master=false) 랭킹 보드 중, 가장 최근에 랭킹이 업데이트된 '집계 날짜'를 찾습니다.
    @Query("SELECT MAX(r.baseDate) FROM Ranking r WHERE r.rankType = :rankType AND r.difficulty = :difficulty AND r.master = false")
    Optional<LocalDateTime> findLatestBaseDate(@Param("rankType") RankType rankType, @Param("difficulty") Difficulty difficulty);

    // [조회] 위에서 찾은 '최신 집계 날짜'를 기준으로, 1등부터 꼴등까지 순서대로(RankingAsc) 챌린저 목록을 가져옵니다.
    List<Ranking> findByRankTypeAndDifficultyAndMasterFalseAndBaseDateOrderByRankingAsc(RankType rankType, Difficulty difficulty, LocalDateTime baseDate);

    // [업데이트/동기화] 기록을 추가하거나 삭제할 때, 이 유저가 해당 난이도에 이미 랭킹 데이터가 있는지 찾습니다.
    Optional<Ranking> findByMemberAndRankTypeAndDifficulty(Member member, RankType rankType, Difficulty difficulty);

    // [재계산] 누군가의 점수가 변동되었을 때 전체 순위를 다시 매기기 위해, 점수 높은 순(내림차순) -> 동점 시 먼저 달성한 순(오름차순)으로 전체 챌린저를 가져옵니다.
    List<Ranking> findByRankTypeAndDifficultyAndMasterFalseOrderByScoreDescBaseDateAsc(RankType rankType, Difficulty difficulty);


    // =========================================================================================
    // [2. 통합 랭킹 전용] - 난이도 구분이 없고 마스터 제도가 없음 (초보벽 연속 지구력, 메인 지구력 거리/시간 공용)
    // =========================================================================================

    // [조회] 해당 랭킹(연속, 거리, 시간 등)의 가장 최근 집계 날짜를 찾습니다.
    @Query("SELECT MAX(r.baseDate) FROM Ranking r WHERE r.rankType = :rankType AND r.master = false")
    Optional<LocalDateTime> findLatestBaseDateByRankType(@Param("rankType") RankType rankType);

    // [조회] 찾은 '최신 집계 날짜'를 기준으로 1등부터 꼴등까지 순서대로 랭킹 목록을 가져옵니다.
    List<Ranking> findByRankTypeAndMasterFalseAndBaseDateOrderByRankingAsc(RankType rankType, LocalDateTime baseDate);

    // [업데이트/동기화] 기록을 추가하거나 삭제할 때, 이 유저가 해당 랭킹(연속, 거리, 시간 등)에 이미 데이터가 있는지 찾습니다.
    Optional<Ranking> findByMemberAndRankType(Member member, RankType rankType);

    // [재계산] 누군가의 점수가 변동되었을 때 전체 순위를 다시 매기기 위해, 점수 높은 순 -> 동점 시 먼저 달성한 순으로 전체 유저를 가져옵니다.
    List<Ranking> findByRankTypeAndMasterFalseOrderByScoreDescBaseDateAsc(RankType rankType);
}