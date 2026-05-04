package com.olla.olla_climbing.domain.ranking.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.ranking.dto.response.BeginnerRankingResponse;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import com.olla.olla_climbing.domain.record.entity.RecordBeginner;
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

    // 초보벽 단일 리드 랭킹 조회 (난이도별로 명예의 전당과 챌린저 구분)
    @Transactional(readOnly = true)
    public BeginnerRankingResponse getBeginnerRanking(Difficulty difficulty) {
        List<Ranking> masterRankings = rankingRepository.findByRankTypeAndDifficultyAndIsMasterTrueOrderByBaseDateDesc(RankType.BEGINNER, difficulty);
        
        List<BeginnerRankingResponse.MasterDto> masterDtos = masterRankings.stream()
                .map(r -> {
                    // (동철 수정) 점수에 0.5가 더해져 있다면 왕복(ROUND_TRIP), 아니면 편도(ONE_WAY)로 확실하게 판단!
                    String attemptType = (r.getScore() != null && r.getScore() % 1 != 0) ? "ROUND_TRIP" : "ONE_WAY";

                    return BeginnerRankingResponse.MasterDto.builder()
                            .memberId(r.getMember().getId())
                            .name(r.getMember().getName())
                            .score(Math.floor(r.getScore())) // 프론트엔드에는 0.5를 제거한 순수 홀드 수만 전달
                            .attemptType(attemptType) // (동철 수정) DTO에 왕복/편도 명확히 주입
                            .achievedAt(r.getBaseDate())
                            .build();
                })
                .collect(Collectors.toList());

        List<BeginnerRankingResponse.ChallengerDto> challengerDtos = new ArrayList<>();
        LocalDateTime latestBaseDate = rankingRepository.findLatestBaseDate(RankType.BEGINNER, difficulty).orElse(null);

        if (latestBaseDate != null) {
            List<Ranking> challengerRankings = rankingRepository.findByRankTypeAndDifficultyAndIsMasterFalseAndBaseDateOrderByRankingAsc(RankType.BEGINNER, difficulty, latestBaseDate);
            
            challengerDtos = challengerRankings.stream()
                    .map(r -> {
                        // (동철 수정) 챌린저 역시 점수를 통해 왕복/편도 판단
                        String attemptType = (r.getScore() != null && r.getScore() % 1 != 0) ? "ROUND_TRIP" : "ONE_WAY";

                        return BeginnerRankingResponse.ChallengerDto.builder()
                                .memberId(r.getMember().getId())
                                .name(r.getMember().getName())
                                .ranking(r.getRanking())
                                .score(Math.floor(r.getScore())) // 순수 홀드 수만 전달
                                .attemptType(attemptType) // (동철 수정) DTO에 왕복/편도 명확히 주입
                                .achievedAt(r.getBaseDate())
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        return BeginnerRankingResponse.builder().masters(masterDtos).challengers(challengerDtos).build();
    }

    // 초보벽 단일 리드 기록 추가/업데이트 시 랭킹 업데이트 로직
    @Transactional
    public void updateBeginnerRanking(Member member, RecordBeginner record) {
        Difficulty difficulty = record.getDifficulty();
        Ranking ranking = rankingRepository.findByMemberAndRankTypeAndDifficulty(member, RankType.BEGINNER, difficulty).orElse(null);

        int safeMaxHoldNo = (record.getMaxHoldNo() != null) ? record.getMaxHoldNo() :
                            (record.isSuccess() ? difficulty.getHoldCount() : 0);

        boolean isNowMaster = record.isSuccess() || safeMaxHoldNo >= difficulty.getHoldCount();
        
        // (동철 수정) 왕복(ROUND_TRIP)이면 0.5점을 더해서, 무조건 편도보다 점수가 높게 만들어 랭킹을 이기게 만듦!
        Double newScore = Double.valueOf(safeMaxHoldNo);
        if (record.getAttemptType() != null && "ROUND_TRIP".equalsIgnoreCase(record.getAttemptType().name())) {
            newScore += 0.5;
        }

        boolean isRankingChanged = false;

        if (ranking != null) {
            if (ranking.isMaster()) {
                // (동철 수정) 기존에는 무조건 return 해버려서 편도 마스터가 왕복 마스터로 갱신을 못했음.
                // 점수(newScore)가 기존 점수보다 높으면(편도 -> 왕복으로 갱신되면) 업데이트 하도록 수정!
                if (newScore > ranking.getScore()) {
                    ranking.updateToMaster(newScore);
                    isRankingChanged = true;
                } else {
                    return;
                }
            } else {
                if (isNowMaster) {
                    ranking.updateToMaster(newScore);
                    isRankingChanged = true;
                } else if (newScore > ranking.getScore()) {
                    ranking.updateScore(newScore);
                    isRankingChanged = true;
                }
            }
        } else {
            ranking = Ranking.builder().member(member).baseDate(LocalDateTime.now()).rankType(RankType.BEGINNER).difficulty(difficulty).score(newScore).isMaster(isNowMaster).build();
            rankingRepository.save(ranking);
            if (!isNowMaster) isRankingChanged = true;
        }

        if (isRankingChanged) recalculateChallengerRankings(difficulty);
    }

    // 초보벽 단일 리드 기록 삭제 시 랭킹 동기화 로직
    @Transactional
    public void syncRankingOnRecordDelete(Member member, Difficulty difficulty) {
        Ranking ranking = rankingRepository.findByMemberAndRankTypeAndDifficulty(member, RankType.BEGINNER, difficulty).orElse(null);
        if (ranking == null) return;

        RecordBeginner bestRemainingRecord = recordRepository.findTopByMemberAndDifficultyOrderByIsSuccessDescMaxHoldNoDesc(member, difficulty).orElse(null);
        boolean isRankingChanged = false;

        if (bestRemainingRecord == null) {
            rankingRepository.delete(ranking);
            isRankingChanged = true;
        } else {
            int safeMaxHoldNo = (bestRemainingRecord.getMaxHoldNo() != null) ? bestRemainingRecord.getMaxHoldNo() :
                                (bestRemainingRecord.isSuccess() ? difficulty.getHoldCount() : 0);

            boolean isStillMaster = bestRemainingRecord.isSuccess() || safeMaxHoldNo >= difficulty.getHoldCount();
            
            // (동철 수정) 삭제 후 남은 기록이 왕복이면 똑같이 0.5점 가산 유지
            Double bestScore = Double.valueOf(safeMaxHoldNo);
            if (bestRemainingRecord.getAttemptType() != null && "ROUND_TRIP".equalsIgnoreCase(bestRemainingRecord.getAttemptType().name())) {
                bestScore += 0.5;
            }

            if (ranking.isMaster() != isStillMaster || !ranking.getScore().equals(bestScore)) {
                ranking.syncBestRecord(bestScore, isStillMaster);
                isRankingChanged = true;
            }
        }

        if (isRankingChanged) recalculateChallengerRankings(difficulty);
    }

    private void recalculateChallengerRankings(Difficulty difficulty) {
        List<Ranking> challengers = rankingRepository.findByRankTypeAndDifficultyAndIsMasterFalseOrderByScoreDescBaseDateAsc(RankType.BEGINNER, difficulty);
        int currentRank = 1;
        for (Ranking challenger : challengers) {
            challenger.updateRanking(currentRank);
            currentRank++;
        }
    }
}