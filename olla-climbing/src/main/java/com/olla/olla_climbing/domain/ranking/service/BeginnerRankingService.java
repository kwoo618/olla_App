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

    // 초보벽 단일 리드 랭킹 조회 (난이도별로 명예의 전당과 챌린저 구분)
    @Transactional(readOnly = true)
    public BeginnerRankingResponse getBeginnerRanking(Difficulty difficulty) {
        List<Ranking> masterRankings = rankingRepository.findByRankTypeAndDifficultyAndIsMasterTrueOrderByBaseDateDesc(RankType.BEGINNER, difficulty);

        List<BeginnerRankingResponse.MasterDto> masterDtos = masterRankings.stream()
                .map(r -> {
                    AttemptType type = (r.getScore() % 1 != 0) ? AttemptType.ROUND_TRIP : AttemptType.ONE_WAY;
                    return BeginnerRankingResponse.MasterDto.builder()
                            .memberId(r.getMember().getId())
                            .name(r.getMember().getName())
                            .profileImageUrl(r.getMember().getProfileImageUrl()) // 💡 추가
                            .score(Math.floor(r.getScore()))
                            .attemptType(type)
                            .achievedAt(r.getBaseDate())
                            .build();
                }).collect(Collectors.toList());

        List<BeginnerRankingResponse.ChallengerDto> challengerDtos = new ArrayList<>();
        LocalDateTime latestBaseDate = rankingRepository.findLatestBaseDate(RankType.BEGINNER, difficulty).orElse(null);

        if (latestBaseDate != null) {
            List<Ranking> challengerRankings = rankingRepository.findByRankTypeAndDifficultyAndIsMasterFalseAndBaseDateOrderByRankingAsc(RankType.BEGINNER, difficulty, latestBaseDate);

            challengerDtos = challengerRankings.stream()
                    .map(r -> {
                        AttemptType type = r.getAttemptType();
                        return BeginnerRankingResponse.ChallengerDto.builder()
                                .memberId(r.getMember().getId())
                                .name(r.getMember().getName())
                                .profileImageUrl(r.getMember().getProfileImageUrl()) // 💡 추가
                                .ranking(r.getRanking())
                                .score(Math.floor(r.getScore()))
                                .attemptType(type)
                                .achievedAt(r.getBaseDate())
                                .build();
                    }).collect(Collectors.toList());
        }
        return BeginnerRankingResponse.builder().masters(masterDtos).challengers(challengerDtos).build();
    }

    @Transactional
    public void updateBeginnerRanking(Member member, RecordBeginner record) {
        Difficulty difficulty = record.getDifficulty();
        Ranking ranking = rankingRepository.findByMemberAndRankTypeAndDifficulty(member, RankType.BEGINNER, difficulty).orElse(null);

        int safeMaxHoldNo = (record.getMaxHoldNo() != null) ? record.getMaxHoldNo() :
                (record.isSuccess() ? difficulty.getHoldCount() : 0);

        boolean isNowMaster = record.isSuccess() || safeMaxHoldNo >= difficulty.getHoldCount();

        // 순수한 홀드 수를 저장합니다.
        Double newScore = Double.valueOf(safeMaxHoldNo);

        boolean isRankingChanged = false;

        if (ranking != null) {
            // 마스터 처리나 점수 갱신 로직은 동철님이 수정한 것(왕복 갱신 가능)을
            // 랭킹 테이블 내의 attempt_type 비교 로직으로 교체해야 완벽하지만,
            // 현재 구조에서는 동철님 의도대로 작동시키기 위해 아래와 같이 단순화합니다.
            if (isNowMaster && !ranking.isMaster()) {
                ranking.updateToMaster(newScore, record.getAttemptType()); // 💡 타입 같이 전달
                isRankingChanged = true;
            } else if (newScore > ranking.getScore()) {
                ranking.updateScore(newScore, record.getAttemptType());
                isRankingChanged = true;
            }
        } else {
            ranking = Ranking.builder()
                    .member(member)
                    .baseDate(record.getRecordDate().atStartOfDay())
                    .rankType(RankType.BEGINNER)
                    .difficulty(difficulty)
                    .score(newScore)
                    .isMaster(isNowMaster)
                    .attemptType(record.getAttemptType())
                    .build();
            rankingRepository.save(ranking);
        }

        if (isRankingChanged) recalculateChallengerRankings(difficulty);
    }

    // 챌린저 랭킹 재계산 시 순수 점수와 달성일(baseDate)로만 정렬
    private void recalculateChallengerRankings(Difficulty difficulty) {
        // 점수가 높을수록(Desc), 달성일이 빠를수록(Asc) 높은 랭킹을 줍니다.
        List<Ranking> challengers = rankingRepository.findByRankTypeAndDifficultyAndIsMasterFalseOrderByScoreDescBaseDateAsc(RankType.BEGINNER, difficulty);
        int currentRank = 1;
        for (Ranking challenger : challengers) {
            challenger.updateRanking(currentRank);
            currentRank++;
        }
    }

    // 초보벽 단일 리드 기록 삭제 시 랭킹 동기화 로직
    @Transactional
    public void syncRankingOnRecordDelete(Member member, Difficulty difficulty) {
        Ranking ranking = rankingRepository.findByMemberAndRankTypeAndDifficulty(member, RankType.BEGINNER, difficulty).orElse(null);
        if (ranking == null) return;

        RecordBeginner bestRemainingRecord = recordRepository.findTopByMemberAndDifficultyOrderByIsSuccessDescMaxHoldNoDescAttemptTypeDesc(member, difficulty).orElse(null);

        if (bestRemainingRecord == null) {
            rankingRepository.delete(ranking);
        } else {
            int safeMaxHoldNo = (bestRemainingRecord.getMaxHoldNo() != null) ? bestRemainingRecord.getMaxHoldNo() :
                    (bestRemainingRecord.isSuccess() ? difficulty.getHoldCount() : 0);

            boolean isStillMaster = bestRemainingRecord.isSuccess() || safeMaxHoldNo >= difficulty.getHoldCount();

            ranking.syncBestRecord(Double.valueOf(safeMaxHoldNo), isStillMaster, bestRemainingRecord.getAttemptType());
        }
        recalculateChallengerRankings(difficulty);
    }

}