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

    // 생성자에서 부모 클래스의 레포지토리와 자신의 레포지토리를 초기화
    public EnduranceRankingService(RankingRepository rankingRepository, RecordEnduranceRepository recordEnduranceRepository) {
        super(rankingRepository); // 부모에게 레포지토리 전달
        this.recordEnduranceRepository = recordEnduranceRepository;
    }

    // 거리 랭킹과 시간 랭킹을 각각 조회하는 메서드
    @Transactional(readOnly = true)
    public List<EnduranceRankingResponse> getEnduranceDistanceRanking() {
        return getEnduranceRankingList(RankType.MAIN_ENDURANCE_DISTANCE);
    }

    // 거리 랭킹과 시간 랭킹을 각각 조회하는 메서드
    @Transactional(readOnly = true)
    public List<EnduranceRankingResponse> getEnduranceTimeRanking() {
        return getEnduranceRankingList(RankType.MAIN_ENDURANCE_TIME);
    }

    // 랭킹 조회 시, RankType에 따라 최신 집계일 기준 랭킹 목록을 가져오고, 각 랭킹 엔티티에 대해 해당 유저의 최고 기록을 조회하여 EnduranceRankingResponse로 변환하는 공통 메서드입니다.
    private List<EnduranceRankingResponse> getEnduranceRankingList(RankType rankType) {
        List<Ranking> rankings = getRankingsByLatestBaseDate(rankType);

        return rankings.stream().map(r -> {
            RecordEndurance bestRecord = null;
            if (rankType == RankType.MAIN_ENDURANCE_DISTANCE) {
                bestRecord = recordEnduranceRepository.findTopByMemberIdOrderByTotalScoreDesc(r.getMember().getId()).orElse(null);
            } else if (rankType == RankType.MAIN_ENDURANCE_TIME) {
                bestRecord = recordEnduranceRepository.findTopByMemberIdOrderByTimeSecondsDesc(r.getMember().getId()).orElse(null);
            }

            return EnduranceRankingResponse.builder()
                    .memberId(r.getMember().getId())
                    .name(r.getMember().getName())
                    .ranking(r.getRanking())
                    .score(r.getScore())
                    .oneWayCount(bestRecord != null ? bestRecord.getOneWayCount() : 0)
                    .additionalBlocks(bestRecord != null ? bestRecord.getAdditionalBlocks() : 0)
                    .timeSeconds(bestRecord != null ? bestRecord.getTimeSeconds() : 0)
                    .build();
        }).collect(Collectors.toList());
    }

    // 기록 추가/업데이트 시, 해당 유저의 랭킹 데이터가 있는지 찾습니다. 기존 랭킹이 있으면 점수를 비교하여 업데이트 여부를 결정하고, 없으면 새로 생성합니다. 랭킹이 변경된 경우 전체 랭킹을 재계산합니다.
    @Transactional
    public void updateMainEnduranceDistanceRanking(Member member, Double totalScore) {
        updateRankingLogic(member, RankType.MAIN_ENDURANCE_DISTANCE, totalScore);
    }

    // 기록 삭제 시, 해당 유저의 랭킹 데이터가 있는지 찾습니다. 삭제된 기록이 랭킹 점수에 영향을 미치는 경우(즉, 삭제 후 더 낮은 점수가 된다면), 랭킹을 업데이트하거나 삭제합니다. 랭킹이 변경된 경우 전체 랭킹을 재계산합니다.
    @Transactional
    public void syncMainDistanceRankingOnRecordDelete(Member member) {
        RecordEndurance bestRecord = recordEnduranceRepository.findTopByMemberIdOrderByTotalScoreDesc(member.getId()).orElse(null);
        syncRankingLogic(member, RankType.MAIN_ENDURANCE_DISTANCE, bestRecord != null ? bestRecord.getTotalScore() : null);
    }

    // 기록 추가/업데이트 시, 해당 유저의 랭킹 데이터가 있는지 찾습니다. 기존 랭킹이 있으면 점수를 비교하여 업데이트 여부를 결정하고, 없으면 새로 생성합니다. 랭킹이 변경된 경우 전체 랭킹을 재계산합니다.
    @Transactional
    public void updateMainEnduranceTimeRanking(Member member, Double timeScore) {
        updateRankingLogic(member, RankType.MAIN_ENDURANCE_TIME, timeScore);
    }

    // 기록 삭제 시, 해당 유저의 랭킹 데이터가 있는지 찾습니다. 삭제된 기록이 랭킹 점수에 영향을 미치는 경우(즉, 삭제 후 더 낮은 점수가 된다면), 랭킹을 업데이트하거나 삭제합니다. 랭킹이 변경된 경우 전체 랭킹을 재계산합니다.
    @Transactional
    public void syncMainTimeRankingOnRecordDelete(Member member) {
        RecordEndurance bestRecord = recordEnduranceRepository.findTopByMemberIdOrderByTimeSecondsDesc(member.getId()).orElse(null);
        syncRankingLogic(member, RankType.MAIN_ENDURANCE_TIME, bestRecord != null ? Double.valueOf(bestRecord.getTimeSeconds()) : null);
    }
}