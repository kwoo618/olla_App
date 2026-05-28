package com.olla.olla_climbing.domain.ranking.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public abstract class BaseRankingService {

    protected final RankingRepository rankingRepository;

    protected BaseRankingService(RankingRepository rankingRepository) {
        this.rankingRepository = rankingRepository;
    }

    // 최신 집계일 기준 도전자 랭킹 목록 조회
    protected List<Ranking> getRankingsByLatestBaseDate(RankType rankType) {
        LocalDateTime latestBaseDate = rankingRepository.findLatestBaseDateByRankType(rankType).orElse(null);
        if (latestBaseDate == null) return new ArrayList<>();
        return rankingRepository.findByRankTypeAndIsMasterFalseAndBaseDateOrderByRankingAsc(rankType, latestBaseDate);
    }

    // 기록 추가/갱신 시 랭킹 업데이트
    protected void updateRankingLogic(Member member, RankType rankType, Double newScore) {
        Ranking ranking = rankingRepository.findByMemberAndRankType(member, rankType).orElse(null);
        boolean isRankingChanged = false;

        if (ranking != null) {
            if (newScore > ranking.getScore()) {
                ranking.updateScore(newScore, null);
                isRankingChanged = true;
            }
        } else {
            ranking = Ranking.builder()
                    .member(member)
                    .baseDate(LocalDateTime.now())
                    .rankType(rankType)
                    .difficulty(null)
                    .score(newScore)
                    .isMaster(false)
                    .attemptType(null)
                    .build();
            rankingRepository.save(ranking);
            isRankingChanged = true;
        }

        if (isRankingChanged) recalculateRankings(rankType);
    }

    // 기록 삭제 시 랭킹 동기화
    protected void syncRankingLogic(Member member, RankType rankType, Double bestScore) {
        Ranking ranking = rankingRepository.findByMemberAndRankType(member, rankType).orElse(null);
        if (ranking == null) return;

        boolean isRankingChanged = false;

        if (bestScore == null) {
            rankingRepository.delete(ranking);
            isRankingChanged = true;
        } else if (!ranking.getScore().equals(bestScore)) {
            ranking.syncBestRecord(bestScore, false, null);
            isRankingChanged = true;
        }

        if (isRankingChanged) recalculateRankings(rankType);
    }

    // 전체 도전자 랭킹 재계산 (점수 내림차순, 동점 시 달성일 오름차순)
    // 모든 레코드에 동일한 baseDate 적용으로 일괄 조회 가능하게 함
    protected void recalculateRankings(RankType rankType) {
        LocalDateTime now = LocalDateTime.now();
        List<Ranking> rankings = rankingRepository.findByRankTypeAndIsMasterFalseOrderByScoreDescBaseDateAsc(rankType);
        int currentRank = 1;
        for (Ranking ranking : rankings) {
            ranking.updateRanking(currentRank++);
            ranking.syncBaseDate(now);
        }
    }
}