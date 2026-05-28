package com.olla.olla_climbing.domain.ranking.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.ranking.dto.response.BeginnerRankingResponse;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import com.olla.olla_climbing.domain.record.entity.RecordBeginner;
import com.olla.olla_climbing.domain.record.enums.AttemptType;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import com.olla.olla_climbing.domain.record.repository.RecordBeginnerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BeginnerRankingService {

    private final RankingRepository rankingRepository;
    private final RecordBeginnerRepository recordRepository;

    @Transactional(readOnly = true)
    public BeginnerRankingResponse getBeginnerRanking(Difficulty difficulty) {
        List<Ranking> masterRankings = rankingRepository
                .findByRankTypeAndDifficultyAndIsMasterTrueOrderByBaseDateDesc(RankType.BEGINNER, difficulty);

        List<BeginnerRankingResponse.MasterDto> masterDtos = masterRankings.stream()
                .map(r -> BeginnerRankingResponse.MasterDto.builder()
                        .memberId(r.getMember().getId())
                        .name(r.getMember().getName())
                        .profileImageUrl(r.getMember().getProfileImageUrl())
                        .score(Math.floor(r.getScore()))
                        .attemptType(r.getAttemptType())
                        .achievedAt(r.getBaseDate())
                        .build())
                .collect(Collectors.toList());

        List<BeginnerRankingResponse.ChallengerDto> challengerDtos = new ArrayList<>();
        LocalDateTime latestBaseDate = rankingRepository
                .findLatestBaseDate(RankType.BEGINNER, difficulty).orElse(null);

        if (latestBaseDate != null) {
            challengerDtos = rankingRepository
                    .findByRankTypeAndDifficultyAndIsMasterFalseAndBaseDateOrderByRankingAsc(
                            RankType.BEGINNER, difficulty, latestBaseDate)
                    .stream()
                    .map(r -> BeginnerRankingResponse.ChallengerDto.builder()
                            .memberId(r.getMember().getId())
                            .name(r.getMember().getName())
                            .profileImageUrl(r.getMember().getProfileImageUrl())
                            .ranking(r.getRanking())
                            .score(Math.floor(r.getScore()))
                            .attemptType(r.getAttemptType())
                            .achievedAt(r.getBaseDate())
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
        Ranking ranking = rankingRepository
                .findByMemberAndRankTypeAndDifficulty(member, RankType.BEGINNER, difficulty)
                .orElse(null);

        int safeMaxHoldNo = (record.getMaxHoldNo() != null)
                ? record.getMaxHoldNo()
                : (record.isSuccess() ? difficulty.getHoldCount() : 0);

        boolean isNowMaster = record.isSuccess() || safeMaxHoldNo >= difficulty.getHoldCount();
        Double newScore = Double.valueOf(safeMaxHoldNo);
        boolean isRankingChanged = false;

        if (ranking != null) {
            if (isNowMaster && !ranking.isMaster()) {
                ranking.updateToMaster(newScore, record.getAttemptType());
                isRankingChanged = true;
            } else if (newScore > ranking.getScore()) {
                ranking.updateScore(newScore, record.getAttemptType());
                isRankingChanged = true;
            }
        } else {
            rankingRepository.save(Ranking.builder()
                    .member(member)
                    .baseDate(record.getRecordDate().atStartOfDay())
                    .rankType(RankType.BEGINNER)
                    .difficulty(difficulty)
                    .score(newScore)
                    .isMaster(isNowMaster)
                    .attemptType(record.getAttemptType())
                    .build());
            isRankingChanged = true;
        }

        if (isRankingChanged) recalculateChallengerRankings(difficulty);
    }

    @Transactional
    public void syncRankingOnRecordDelete(Member member, Difficulty difficulty) {
        Ranking ranking = rankingRepository
                .findByMemberAndRankTypeAndDifficulty(member, RankType.BEGINNER, difficulty)
                .orElse(null);
        if (ranking == null) return;

        RecordBeginner best = recordRepository
                .findTopByMemberAndDifficultyOrderByIsSuccessDescMaxHoldNoDescAttemptTypeDesc(member, difficulty)
                .orElse(null);

        if (best == null) {
            rankingRepository.delete(ranking);
        } else {
            int safeMaxHoldNo = (best.getMaxHoldNo() != null)
                    ? best.getMaxHoldNo()
                    : (best.isSuccess() ? difficulty.getHoldCount() : 0);
            boolean isStillMaster = best.isSuccess() || safeMaxHoldNo >= difficulty.getHoldCount();
            ranking.syncBestRecord(Double.valueOf(safeMaxHoldNo), isStillMaster, best.getAttemptType());
        }

        recalculateChallengerRankings(difficulty);
    }

    // 점수 내림차순, 달성일 오름차순으로 챌린저 랭킹 재계산
    private void recalculateChallengerRankings(Difficulty difficulty) {
        List<Ranking> challengers = rankingRepository
                .findByRankTypeAndDifficultyAndIsMasterFalseOrderByScoreDescBaseDateAsc(RankType.BEGINNER, difficulty);
        int rank = 1;
        for (Ranking r : challengers) r.updateRanking(rank++);
    }
}