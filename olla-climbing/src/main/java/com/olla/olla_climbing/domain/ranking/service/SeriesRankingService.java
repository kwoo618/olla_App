package com.olla.olla_climbing.domain.ranking.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.ranking.dto.response.SeriesRankingResponse;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import com.olla.olla_climbing.domain.record.entity.RecordSeries;
import com.olla.olla_climbing.domain.record.repository.RecordSeriesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SeriesRankingService extends BaseRankingService {

    private final RecordSeriesRepository recordSeriesRepository;

    public SeriesRankingService(RankingRepository rankingRepository,
                                RecordSeriesRepository recordSeriesRepository) {
        super(rankingRepository);
        this.recordSeriesRepository = recordSeriesRepository;
    }

    @Transactional(readOnly = true)
    public List<SeriesRankingResponse> getSeriesRanking() {
        return getRankingsByLatestBaseDate(RankType.BEGINNER_SERIES).stream()
                .map(r -> {
                    RecordSeries best = recordSeriesRepository
                            .findTopByMemberIdOrderByTotalScoreDesc(r.getMember().getId())
                            .orElse(null);
                    return SeriesRankingResponse.builder()
                            .memberId(r.getMember().getId())
                            .name(r.getMember().getName())
                            .profileImageUrl(r.getMember().getProfileImageUrl())
                            .ranking(r.getRanking())
                            .totalScore(r.getScore())
                            .sequenceLog(best != null ? best.getSequenceLog() : new ArrayList<>())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateBeginnerSeriesRanking(Member member, Double totalScore) {
        updateRankingLogic(member, RankType.BEGINNER_SERIES, totalScore);
    }

    @Transactional
    public void syncSeriesRankingOnRecordDelete(Member member) {
        Double bestScore = recordSeriesRepository
                .findTopByMemberIdOrderByTotalScoreDesc(member.getId())
                .map(RecordSeries::getTotalScore)
                .orElse(null);
        syncRankingLogic(member, RankType.BEGINNER_SERIES, bestScore);
    }
}