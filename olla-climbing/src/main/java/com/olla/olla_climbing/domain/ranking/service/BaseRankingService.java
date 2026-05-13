package com.olla.olla_climbing.domain.ranking.service;

import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import com.olla.olla_climbing.domain.member.entity.Member;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// 랭킹 서비스들의 공통 로직을 담은 추상 클래스(series 랭킹과 endurance 랭킹에서 사용)
public abstract class BaseRankingService {

    protected final RankingRepository rankingRepository;

    // 공통적으로 사용할 레포지토리를 부모 클래스에서 관리
    protected BaseRankingService(RankingRepository rankingRepository) {
        this.rankingRepository = rankingRepository;
    }

    // 1. 공통 조회: 최신 집계일 기준 랭킹 엔티티 목록 반환 (상세 변환은 자식 클래스가 담당)
    // RankType을 기준으로 최신 집계일을 찾고, 해당 날짜의 랭킹 목록을 반환합니다. 최신 집계일이 없으면 빈 리스트를 반환합니다.
    protected List<Ranking> getRankingsByLatestBaseDate(RankType rankType) {
        LocalDateTime latestBaseDate = rankingRepository.findLatestBaseDateByRankType(rankType).orElse(null);
        if (latestBaseDate != null) {
            // 💡 수정: MasterFalse -> IsMasterFalse
            return rankingRepository.findByRankTypeAndIsMasterFalseAndBaseDateOrderByRankingAsc(rankType, latestBaseDate);
        }
        return new ArrayList<>();
    }

    // 2. 공통 업데이트 로직
    // 기록 추가/업데이트 시, 해당 유저의 랭킹 데이터가 있는지 찾습니다. 기존 랭킹이 있으면 점수를 비교하여 업데이트 여부를 결정하고, 없으면 새로 생성합니다. 랭킹이 변경된 경우 전체 랭킹을 재계산합니다.
    protected void updateRankingLogic(Member member, RankType rankType, Double newScore) {
        Ranking ranking = rankingRepository.findByMemberAndRankType(member, rankType).orElse(null);
        boolean isRankingChanged = false;

        if (ranking != null) {
            if (newScore > ranking.getScore()) {
                ranking.updateScore(newScore, null);
                isRankingChanged = true;
            }
        } else {
            // 💡 [수정] 빌더에도 null 추가 (혹은 빌더에서 제외 가능)
            ranking = Ranking.builder().member(member).baseDate(LocalDateTime.now()).rankType(rankType).difficulty(null).score(newScore).isMaster(false).attemptType(null).build();
            rankingRepository.save(ranking);
            isRankingChanged = true;
        }

        if (isRankingChanged) recalculateRankings(rankType);
    }

    // 3. 공통 삭제 동기화 로직
    // 기록 삭제 시, 해당 유저의 랭킹 데이터가 있는지 찾습니다. 삭제된 기록이 랭킹 점수에 영향을 미치는 경우(즉, 삭제 후 더 낮은 점수가 된다면), 랭킹을 업데이트하거나 삭제합니다. 랭킹이 변경된 경우 전체 랭킹을 재계산합니다.
    protected void syncRankingLogic(Member member, RankType rankType, Double bestScore) {
        Ranking ranking = rankingRepository.findByMemberAndRankType(member, rankType).orElse(null);
        if (ranking == null) return;

        boolean isRankingChanged = false;

        if (bestScore == null) {
            rankingRepository.delete(ranking);
            isRankingChanged = true;
        } else {
            if (!ranking.getScore().equals(bestScore)) {
                ranking.syncBestRecord(bestScore, false, null);
                isRankingChanged = true;
            }
        }

        if (isRankingChanged) recalculateRankings(rankType);
    }

    // 4. 공통 재계산 로직
    // 랭킹이 변경된 경우, 해당 RankType의 모든 도전자 랭킹을 최신 점수 기준으로 재정렬하여 순위를 업데이트합니다. 마스터는 순위에서 제외됩니다.
    protected void recalculateRankings(RankType rankType) {
        LocalDateTime now = LocalDateTime.now(); // (동철 수정) 모든 랭킹 데이터 동일한 시각 가지도록 현재 시각 고정 (밀리초 단위 일치)
        // 💡 수정: MasterFalse -> IsMasterFalse
        List<Ranking> rankings = rankingRepository.findByRankTypeAndIsMasterFalseOrderByScoreDescBaseDateAsc(rankType);
        int currentRank = 1;
        for (Ranking ranking : rankings) {
            ranking.updateRanking(currentRank);
            ranking.syncBaseDate(now); // (동철 수정) 모든 유저의 baseDate를 동일하게 맞춰서 한꺼번에 조회
            currentRank++;
        }
    }
}