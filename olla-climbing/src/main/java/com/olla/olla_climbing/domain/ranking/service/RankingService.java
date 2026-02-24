package com.olla.olla_climbing.domain.ranking.service;

import com.olla.olla_climbing.domain.ranking.dto.response.BeginnerRankingResponse;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import com.olla.olla_climbing.domain.record.repository.RecordBeginnerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.record.entity.RecordBeginner;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RankingService {

    private final RankingRepository rankingRepository;
    private final RecordBeginnerRepository recordRepository;

    @Transactional(readOnly = true)
    public BeginnerRankingResponse getBeginnerRanking(Difficulty difficulty) {

        // 메서드명 변경 반영: MasterTrue
        List<Ranking> masterRankings = rankingRepository
                .findByRankTypeAndDifficultyAndMasterTrueOrderByBaseDateDesc(RankType.BEGINNER, difficulty);

        List<BeginnerRankingResponse.MasterDto> masterDtos = masterRankings.stream()
                .map(r -> BeginnerRankingResponse.MasterDto.builder()
                        .memberId(r.getMember().getId())
                        .name(r.getMember().getName())
                        .score(r.getScore())
                        .achievedAt(r.getBaseDate())
                        .build())
                .collect(Collectors.toList());

        List<BeginnerRankingResponse.ChallengerDto> challengerDtos = new ArrayList<>();

        LocalDateTime latestBaseDate = rankingRepository.findLatestBaseDate(RankType.BEGINNER, difficulty)
                .orElse(null);

        if (latestBaseDate != null) {
            // 메서드명 변경 반영: MasterFalse
            List<Ranking> challengerRankings = rankingRepository
                    .findByRankTypeAndDifficultyAndMasterFalseAndBaseDateOrderByRankingAsc(
                            RankType.BEGINNER, difficulty, latestBaseDate);

            challengerDtos = challengerRankings.stream()
                    .map(r -> BeginnerRankingResponse.ChallengerDto.builder()
                            .memberId(r.getMember().getId())
                            .name(r.getMember().getName())
                            .ranking(r.getRanking())
                            .score(r.getScore())
                            .build())
                    .collect(Collectors.toList());
        }

        return BeginnerRankingResponse.builder()
                .masters(masterDtos)
                .challengers(challengerDtos)
                .build();
    }

    @Transactional
    public void updateBeginnerRanking(Member member, RecordBeginner record) {
        Difficulty difficulty = record.getDifficulty();

        Ranking ranking = rankingRepository.findByMemberAndRankTypeAndDifficulty(
                member, RankType.BEGINNER, difficulty).orElse(null);

        boolean isNowMaster = record.isSuccess() || record.getMaxHoldNo() >= difficulty.getHoldCount();
        Double newScore = Double.valueOf(record.getMaxHoldNo());

        boolean isRankingChanged = false;

        if (ranking != null) {
            if (ranking.isMaster()) return;

            if (isNowMaster) {
                ranking.updateToMaster(newScore);
                isRankingChanged = true;
            } else if (newScore > ranking.getScore()) {
                ranking.updateScore(newScore);
                isRankingChanged = true;
            }
        } else {
            ranking = Ranking.builder()
                    .member(member)
                    .baseDate(LocalDateTime.now())
                    .rankType(RankType.BEGINNER)
                    .difficulty(difficulty)
                    .score(newScore)
                    .isMaster(isNowMaster)
                    .build();
            rankingRepository.save(ranking);
            if (!isNowMaster) isRankingChanged = true;
        }

        if (isRankingChanged) {
            recalculateChallengerRankings(difficulty);
        }
    }

    @Transactional
    public void syncRankingOnRecordDelete(Member member, Difficulty difficulty) {

        Ranking ranking = rankingRepository.findByMemberAndRankTypeAndDifficulty(
                member, RankType.BEGINNER, difficulty).orElse(null);

        if (ranking == null) return;

        RecordBeginner bestRemainingRecord = recordRepository
                .findTopByMemberAndDifficultyOrderBySuccessDescMaxHoldNoDesc(member, difficulty)
                .orElse(null);

        boolean isRankingChanged = false;

        if (bestRemainingRecord == null) {
            rankingRepository.delete(ranking);
            isRankingChanged = true;
        } else {
            boolean isStillMaster = bestRemainingRecord.isSuccess() ||
                    bestRemainingRecord.getMaxHoldNo() >= difficulty.getHoldCount();
            Double bestScore = Double.valueOf(bestRemainingRecord.getMaxHoldNo());

            if (ranking.isMaster() != isStillMaster || !ranking.getScore().equals(bestScore)) {
                ranking.syncBestRecord(bestScore, isStillMaster);
                isRankingChanged = true;
            }
        }

        if (isRankingChanged) {
            recalculateChallengerRankings(difficulty);
        }
    }

    private void recalculateChallengerRankings(Difficulty difficulty) {
        // 메서드명 변경 반영: MasterFalse
        List<Ranking> challengers = rankingRepository
                .findByRankTypeAndDifficultyAndMasterFalseOrderByScoreDescBaseDateAsc(
                        RankType.BEGINNER, difficulty);

        int currentRank = 1;
        for (Ranking challenger : challengers) {
            challenger.updateRanking(currentRank);
            currentRank++;
        }
    }
}