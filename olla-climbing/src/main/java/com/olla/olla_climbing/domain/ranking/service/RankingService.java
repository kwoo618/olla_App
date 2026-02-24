package com.olla.olla_climbing.domain.ranking.service;

import com.olla.olla_climbing.domain.ranking.dto.response.BeginnerRankingResponse;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RankingService {

    private final RankingRepository rankingRepository;

    @Transactional(readOnly = true)
    public BeginnerRankingResponse getBeginnerRanking(Difficulty difficulty) {

        // 1. 마스터 그룹 조회 및 DTO 변환
        List<Ranking> masterRankings = rankingRepository
                .findByRankTypeAndDifficultyAndIsMasterTrueOrderByBaseDateDesc(RankType.BEGINNER, difficulty);

        List<BeginnerRankingResponse.MasterDto> masterDtos = masterRankings.stream()
                .map(r -> BeginnerRankingResponse.MasterDto.builder()
                        .memberId(r.getMember().getId())
                        .name(r.getMember().getName())
                        .score(r.getScore())
                        .achievedAt(r.getBaseDate())
                        .build())
                .collect(Collectors.toList());

        // 2. 도전자 그룹 조회 및 DTO 변환
        List<BeginnerRankingResponse.ChallengerDto> challengerDtos = new ArrayList<>();

        // 가장 최근에 랭킹이 집계된 날짜를 찾음
        LocalDateTime latestBaseDate = rankingRepository.findLatestBaseDate(RankType.BEGINNER, difficulty)
                .orElse(null);

        // 집계된 날짜가 있다면 해당 날짜의 랭킹 데이터를 가져옴
        if (latestBaseDate != null) {
            List<Ranking> challengerRankings = rankingRepository
                    .findByRankTypeAndDifficultyAndIsMasterFalseAndBaseDateOrderByRankingAsc(
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

        // 3. 최종 응답 객체 조립
        return BeginnerRankingResponse.builder()
                .masters(masterDtos)
                .challengers(challengerDtos)
                .build();
    }
}