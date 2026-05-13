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
    @Operation(summary = "초보벽 단일 리드 랭킹 조회", description = "특정 난이도의 초보벽 최고 기록 랭킹을 조회합니다.")
    public ResponseEntity<ApiResponse<BeginnerRankingResponse>> getBeginnerRanking(@RequestParam Difficulty difficulty) {
        BeginnerRankingResponse response = beginnerRankingService.getBeginnerRanking(difficulty);
        return ResponseEntity.ok(ApiResponse.success(200, "초보벽 랭킹 조회 성공", response));
    }

    @GetMapping("/series")
    @Operation(summary = "초보벽 연속 지구력 랭킹 조회", description = "난이도 배열(Sequence)이 포함된 연속 지구력 전체 랭킹을 조회합니다.")
    public ResponseEntity<ApiResponse<List<SeriesRankingResponse>>> getSeriesRanking() {
        List<SeriesRankingResponse> responses = seriesRankingService.getSeriesRanking();
        return ResponseEntity.ok(ApiResponse.success(200, "연속 지구력 랭킹 조회 성공", responses));
    }

    @GetMapping("/endurance/distance")
    @Operation(summary = "메인 지구력 거리 랭킹 조회", description = "도달한 칸 수를 최우선 기준으로 산정한 랭킹을 조회합니다.")
    public ResponseEntity<ApiResponse<List<EnduranceRankingResponse>>> getEnduranceDistanceRanking() {
        List<EnduranceRankingResponse> responses = enduranceRankingService.getEnduranceDistanceRanking();
        return ResponseEntity.ok(ApiResponse.success(200, "지구력 거리 랭킹 조회 성공", responses));
    }

    @GetMapping("/endurance/time")
    @Operation(summary = "메인 지구력 시간 랭킹 조회", description = "완등에 걸린 시간을 기준으로 산정한 랭킹을 조회합니다.")
    public ResponseEntity<ApiResponse<List<EnduranceRankingResponse>>> getEnduranceTimeRanking() {
        List<EnduranceRankingResponse> responses = enduranceRankingService.getEnduranceTimeRanking();
        return ResponseEntity.ok(ApiResponse.success(200, "지구력 시간 랭킹 조회 성공", responses));
    }
}