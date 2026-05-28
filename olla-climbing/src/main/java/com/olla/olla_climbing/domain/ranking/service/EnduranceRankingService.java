package com.olla.olla_climbing.domain.ranking.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.ranking.dto.response.EnduranceRankingResponse;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import com.olla.olla_climbing.domain.record.entity.RecordEndurance;
import com.olla.olla_climbing.domain.record.repository.RecordEnduranceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class EnduranceRankingService extends BaseRankingService {

    private final RecordEnduranceRepository recordEnduranceRepository;

    public EnduranceRankingService(RankingRepository rankingRepository,
                                   RecordEnduranceRepository recordEnduranceRepository) {
        super(rankingRepository);
        this.recordEnduranceRepository = recordEnduranceRepository;
    }

    @Transactional(readOnly = true)
    public List<EnduranceRankingResponse> getEnduranceDistanceRanking() {
        return buildRankingList(RankType.MAIN_ENDURANCE_DISTANCE);
    }

    @Transactional(readOnly = true)
    public List<EnduranceRankingResponse> getEnduranceTimeRanking() {
        return buildRankingList(RankType.MAIN_ENDURANCE_TIME);
    }

    @Transactional
    public void updateMainEnduranceDistanceRanking(Member member, Double totalScore) {
        updateRankingLogic(member, RankType.MAIN_ENDURANCE_DISTANCE, totalScore);
    }

    @Transactional
    public void updateMainEnduranceTimeRanking(Member member, Double timeSeconds) {
        updateRankingLogic(member, RankType.MAIN_ENDURANCE_TIME, timeSeconds);
    }

    @Transactional
    public void syncMainDistanceRankingOnRecordDelete(Member member) {
        Double best = recordEnduranceRepository
                .findTopByMemberIdOrderByTotalScoreDesc(member.getId())
                .map(RecordEndurance::getTotalScore)
                .orElse(null);
        syncRankingLogic(member, RankType.MAIN_ENDURANCE_DISTANCE, best);
    }

    @Transactional
    public void syncMainTimeRankingOnRecordDelete(Member member) {
        Double best = recordEnduranceRepository
                .findTopByMemberIdOrderByTimeSecondsDesc(member.getId())
                .map(r -> Double.valueOf(r.getTimeSeconds()))
                .orElse(null);
        syncRankingLogic(member, RankType.MAIN_ENDURANCE_TIME, best);
    }

    // ── private 헬퍼 ─────────────────────────────────────────────

    private List<EnduranceRankingResponse> buildRankingList(RankType rankType) {
        return getRankingsByLatestBaseDate(rankType).stream()
                .map(r -> {
                    RecordEndurance best = fetchBestRecord(rankType, r.getMember().getId());
                    return EnduranceRankingResponse.builder()
                            .memberId(r.getMember().getId())
                            .name(r.getMember().getName())
                            .profileImageUrl(r.getMember().getProfileImageUrl())
                            .ranking(r.getRanking())
                            .score(r.getScore())
                            .oneWayCount(best != null ? best.getOneWayCount() : 0)
                            .additionalBlocks(best != null ? best.getAdditionalBlocks() : 0)
                            .timeSeconds(best != null ? best.getTimeSeconds() : 0)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private RecordEndurance fetchBestRecord(RankType rankType, Long memberId) {
        if (rankType == RankType.MAIN_ENDURANCE_DISTANCE) {
            return recordEnduranceRepository.findTopByMemberIdOrderByTotalScoreDesc(memberId).orElse(null);
        }
        return recordEnduranceRepository.findTopByMemberIdOrderByTimeSecondsDesc(memberId).orElse(null);
    }
}