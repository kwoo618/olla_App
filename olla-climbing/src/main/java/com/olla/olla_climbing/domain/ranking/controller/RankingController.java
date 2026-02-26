package com.olla.olla_climbing.domain.ranking.controller;

import com.olla.olla_climbing.domain.ranking.dto.response.BeginnerRankingResponse;
import com.olla.olla_climbing.domain.ranking.dto.response.EnduranceRankingResponse;
import com.olla.olla_climbing.domain.ranking.dto.response.SeriesRankingResponse;
import com.olla.olla_climbing.domain.ranking.service.BeginnerRankingService;
import com.olla.olla_climbing.domain.ranking.service.EnduranceRankingService;
import com.olla.olla_climbing.domain.ranking.service.SeriesRankingService;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rankings")
@RequiredArgsConstructor
@Tag(name = "Ranking API", description = "랭킹 조회 관련 API")
public class RankingController {

    private final BeginnerRankingService beginnerRankingService;
    private final SeriesRankingService seriesRankingService;
    private final EnduranceRankingService enduranceRankingService;

    // 1. 초보벽 단일 리드 랭킹 조회
    // 예: GET /api/v1/rankings/beginner?difficulty=YELLOW
    @GetMapping("/beginner")
    @Operation(summary = "초보벽 리드 랭킹 조회", description = "특정 난이도의 마스터 및 챌린저 랭킹 목록을 조회합니다.")
    public ResponseEntity<BeginnerRankingResponse> getBeginnerRanking(
            @RequestParam("difficulty") Difficulty difficulty) {

        BeginnerRankingResponse response = beginnerRankingService.getBeginnerRanking(difficulty);
        return ResponseEntity.ok(response);
    }

    // 2. 초보벽 연속 지구력 랭킹 조회
    // 예: GET /api/v1/rankings/series
    @GetMapping("/series")
    @Operation(summary = "초보벽 연속 지구력 랭킹 조회", description = "난이도 배열(Sequence)이 포함된 연속 지구력 전체 랭킹을 조회합니다.")
    public ResponseEntity<List<SeriesRankingResponse>> getSeriesRanking() {

        List<SeriesRankingResponse> responses = seriesRankingService.getSeriesRanking();
        return ResponseEntity.ok(responses);
    }

    // 3. 센터 메인 지구력 - 거리 랭킹 조회
    // 예: GET /api/v1/rankings/endurance/distance
    @GetMapping("/endurance/distance")
    @Operation(summary = "메인 지구력 거리 랭킹 조회", description = "도달한 칸 수를 최우선 기준으로 산정한 랭킹을 조회합니다.")
    public ResponseEntity<List<EnduranceRankingResponse>> getEnduranceDistanceRanking() {

        List<EnduranceRankingResponse> responses = enduranceRankingService.getEnduranceDistanceRanking();
        return ResponseEntity.ok(responses);
    }

    // 4. 센터 메인 지구력 - 시간 랭킹 조회
    // 예: GET /api/v1/rankings/endurance/time
    @GetMapping("/endurance/time")
    @Operation(summary = "메인 지구력 시간 랭킹 조회", description = "버틴 시간을 기준으로 산정한 랭킹을 조회합니다.")
    public ResponseEntity<List<EnduranceRankingResponse>> getEnduranceTimeRanking() {

        List<EnduranceRankingResponse> responses = enduranceRankingService.getEnduranceTimeRanking();
        return ResponseEntity.ok(responses);
    }
}