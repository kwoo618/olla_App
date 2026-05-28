package com.olla.olla_climbing.domain.ranking.controller;

import com.olla.olla_climbing.domain.ranking.dto.response.BeginnerRankingResponse;
import com.olla.olla_climbing.domain.ranking.dto.response.EnduranceRankingResponse;
import com.olla.olla_climbing.domain.ranking.dto.response.SeriesRankingResponse;
import com.olla.olla_climbing.domain.ranking.service.BeginnerRankingService;
import com.olla.olla_climbing.domain.ranking.service.EnduranceRankingService;
import com.olla.olla_climbing.domain.ranking.service.SeriesRankingService;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import com.olla.olla_climbing.global.common.ApiResponse;
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

    @GetMapping("/beginner")
    @Operation(summary = "초보벽 단일 리드 랭킹 조회")
    public ResponseEntity<ApiResponse<BeginnerRankingResponse>> getBeginnerRanking(
            @RequestParam Difficulty difficulty) {
        return ResponseEntity.ok(ApiResponse.success(200, "초보벽 랭킹 조회 성공",
                beginnerRankingService.getBeginnerRanking(difficulty)));
    }

    @GetMapping("/series")
    @Operation(summary = "초보벽 연속 지구력 랭킹 조회")
    public ResponseEntity<ApiResponse<List<SeriesRankingResponse>>> getSeriesRanking() {
        return ResponseEntity.ok(ApiResponse.success(200, "연속 지구력 랭킹 조회 성공",
                seriesRankingService.getSeriesRanking()));
    }

    @GetMapping("/endurance/distance")
    @Operation(summary = "메인 지구력 거리 랭킹 조회")
    public ResponseEntity<ApiResponse<List<EnduranceRankingResponse>>> getEnduranceDistanceRanking() {
        return ResponseEntity.ok(ApiResponse.success(200, "지구력 거리 랭킹 조회 성공",
                enduranceRankingService.getEnduranceDistanceRanking()));
    }

    @GetMapping("/endurance/time")
    @Operation(summary = "메인 지구력 시간 랭킹 조회")
    public ResponseEntity<ApiResponse<List<EnduranceRankingResponse>>> getEnduranceTimeRanking() {
        return ResponseEntity.ok(ApiResponse.success(200, "지구력 시간 랭킹 조회 성공",
                enduranceRankingService.getEnduranceTimeRanking()));
    }
}