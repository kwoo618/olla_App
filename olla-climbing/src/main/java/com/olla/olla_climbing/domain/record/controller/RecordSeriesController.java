package com.olla.olla_climbing.domain.record.controller;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.record.dto.request.RecordSeriesRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordSeriesResponse;
import com.olla.olla_climbing.domain.record.service.RecordSeriesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/records/series")
@RequiredArgsConstructor
public class RecordSeriesController {

    private final RecordSeriesService recordSeriesService;

    @PostMapping
    @Operation(summary = "연속 리드 기록 저장", description = "연속 리드 등반 기록(배열)을 저장하고 총점을 계산합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<RecordSeriesResponse> saveSeriesRecord(
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody RecordSeriesRequest request) {

        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        return ResponseEntity.ok(recordSeriesService.saveRecord(member.getLoginId(), request));
    }

    @GetMapping("/best")
    @Operation(summary = "연속 리드 최고 기록 조회", description = "가장 높은 총점을 획득한 연속 리드 기록을 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<RecordSeriesResponse> getBestSeriesRecord(@AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        return ResponseEntity.ok(recordSeriesService.getBestRecord(member.getLoginId()));
    }

    @GetMapping("/history")
    @Operation(summary = "연속 리드 상세 내역 전체 조회", description = "모든 연속 리드 기록을 최신 날짜순으로 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<List<RecordSeriesResponse>> getDetailedSeriesHistory(@AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        return ResponseEntity.ok(recordSeriesService.getDetailedHistory(member.getLoginId()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "연속 리드 기록 삭제", description = "자신의 특정 연속 리드 기록을 삭제합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> deleteSeriesRecord(
            @AuthenticationPrincipal Member member,
            @PathVariable("id") Long recordId) {

        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        recordSeriesService.deleteRecord(member.getLoginId(), recordId);
        return ResponseEntity.ok("기록이 성공적으로 삭제되었습니다.");
    }
}