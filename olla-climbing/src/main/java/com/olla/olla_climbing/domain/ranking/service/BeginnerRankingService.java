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
        // 💡 수정 1: 명예의 전당은 IsMasterTrue 여야 하며, 메서드명에 Difficulty가 누락되어 있던 것을 추가했습니다.
        List<Ranking> masterRankings = rankingRepository.findByRankTypeAndDifficultyAndIsMasterTrueOrderByBaseDateDesc(RankType.BEGINNER, difficulty);
        List<BeginnerRankingResponse.MasterDto> masterDtos = masterRankings.stream()
                .map(r -> BeginnerRankingResponse.MasterDto.builder()
                        .memberId(r.getMember().getId())
                        .name(r.getMember().getName())
                        .score(r.getScore())
                        .achievedAt(r.getBaseDate())
                        .build())
                .collect(Collectors.toList());

        List<BeginnerRankingResponse.ChallengerDto> challengerDtos = new ArrayList<>();
        LocalDateTime latestBaseDate = rankingRepository.findLatestBaseDate(RankType.BEGINNER, difficulty).orElse(null);

        if (latestBaseDate != null) {
            // 💡 수정 2: 파라미터 3개(RankType, Difficulty, BaseDate)를 받는 메서드로 정확히 매핑했습니다.
            List<Ranking> challengerRankings = rankingRepository.findByRankTypeAndDifficultyAndIsMasterFalseAndBaseDateOrderByRankingAsc(RankType.BEGINNER, difficulty, latestBaseDate);
            challengerDtos = challengerRankings.stream()
                    .map(r -> BeginnerRankingResponse.ChallengerDto.builder()
                            .memberId(r.getMember().getId())
                            .name(r.getMember().getName())
                            .ranking(r.getRanking())
                            .score(r.getScore())
                            .build())
                    .collect(Collectors.toList());
        }

        return BeginnerRankingResponse.builder().masters(masterDtos).challengers(challengerDtos).build();
    }

    // 초보벽 단일 리드 기록 추가/업데이트 시 랭킹 업데이트 로직
    @Transactional
    public void updateBeginnerRanking(Member member, RecordBeginner record) {
        Difficulty difficulty = record.getDifficulty();
        Ranking ranking = rankingRepository.findByMemberAndRankTypeAndDifficulty(member, RankType.BEGINNER, difficulty).orElse(null);

        // (동철 수정) 해당 난이도가 완등일때 만점으로 넣어줘야 되는데 그렇게 안 넣어줘서 500에러 발생 = 수정
        int safeMaxHoldNo = (record.getMaxHoldNo() != null) ? record.getMaxHoldNo() :
                            (record.isSuccess() ? difficulty.getHoldCount() : 0);

        boolean isNowMaster = record.isSuccess() || record.getMaxHoldNo() >= difficulty.getHoldCount();
        Double newScore = Double.valueOf(safeMaxHoldNo);
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
            // (동철 수정) 해당 난이도가 완등일때 만점으로 넣어줘야 되는데 그렇게 안 넣어줘서 500에러 발생 = 수정
            int safeMaxHoldNo = (bestRemainingRecord.getMaxHoldNo() != null) ? bestRemainingRecord.getMaxHoldNo() :
                                (bestRemainingRecord.isSuccess() ? difficulty.getHoldCount() : 0);

            boolean isStillMaster = bestRemainingRecord.isSuccess() || bestRemainingRecord.getMaxHoldNo() >= difficulty.getHoldCount();
            Double bestScore = Double.valueOf(safeMaxHoldNo);

            if (ranking.isMaster() != isStillMaster || !ranking.getScore().equals(bestScore)) {
                ranking.syncBestRecord(bestScore, isStillMaster);
                isRankingChanged = true;
            }
        }

        if (isRankingChanged) recalculateChallengerRankings(difficulty);
    }

    // 챌린저 랭킹 재계산 로직 (초보벽 단일 리드 난이도별)
    private void recalculateChallengerRankings(Difficulty difficulty) {
        // 💡 수정 3: 메서드명에 Difficulty 누락되어 있던 것을 매핑했습니다.
        List<Ranking> challengers = rankingRepository.findByRankTypeAndDifficultyAndIsMasterFalseOrderByScoreDescBaseDateAsc(RankType.BEGINNER, difficulty);
        int currentRank = 1;
        for (Ranking challenger : challengers) {
            challenger.updateRanking(currentRank);
            currentRank++;
        }
    }
}