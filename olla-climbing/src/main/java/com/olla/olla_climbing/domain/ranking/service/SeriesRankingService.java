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

    // 생성자에서 부모 클래스의 레포지토리와 자신의 레포지토리를 초기화
    public SeriesRankingService(RankingRepository rankingRepository, RecordSeriesRepository recordSeriesRepository) {
        super(rankingRepository); // 부모에게 레포지토리 전달
        this.recordSeriesRepository = recordSeriesRepository;
    }

    // 시리즈 랭킹 조회 시, 최신 집계일 기준 랭킹 목록을 가져오고, 각 랭킹 엔티티에 대해 해당 유저의 최고 기록을 조회하여 SeriesRankingResponse로 변환하는 메서드입니다.
    @Transactional(readOnly = true)
    public List<SeriesRankingResponse> getSeriesRanking() {
        List<Ranking> rankings = getRankingsByLatestBaseDate(RankType.BEGINNER_SERIES);

        return rankings.stream().map(r -> {
            RecordSeries bestRecord = recordSeriesRepository.findTopByMemberIdOrderByTotalScoreDesc(r.getMember().getId()).orElse(null);
            return SeriesRankingResponse.builder()
                    .memberId(r.getMember().getId())
                    .name(r.getMember().getName())
                    .ranking(r.getRanking())
                    .totalScore(r.getScore())
                    .sequenceLog(bestRecord != null ? bestRecord.getSequenceLog() : new ArrayList<>())
                    .build();
        }).collect(Collectors.toList());
    }

    // 시리즈 기록 추가/업데이트 시 랭킹 업데이트 로직
    @Transactional
    public void updateBeginnerSeriesRanking(Member member, Double totalScore) {
        updateRankingLogic(member, RankType.BEGINNER_SERIES, totalScore);
    }

    // 시리즈 기록 삭제 시 랭킹 동기화 로직
    @Transactional
    public void syncSeriesRankingOnRecordDelete(Member member) {
        RecordSeries bestRecord = recordSeriesRepository.findTopByMemberIdOrderByTotalScoreDesc(member.getId()).orElse(null);
        syncRankingLogic(member, RankType.BEGINNER_SERIES, bestRecord != null ? bestRecord.getTotalScore() : null);
    }
}