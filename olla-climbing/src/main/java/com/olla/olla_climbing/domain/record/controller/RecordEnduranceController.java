package com.olla.olla_climbing.domain.record.controller;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.record.dto.request.RecordEnduranceRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordEnduranceResponse;
import com.olla.olla_climbing.domain.record.service.RecordEnduranceService;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/records/endurance")
@RequiredArgsConstructor
public class RecordEnduranceController {

    private final RecordEnduranceService recordEnduranceService;

    @PostMapping
    @Operation(summary = "지구력 기록 저장", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<RecordEnduranceResponse>> saveRecord(
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody RecordEnduranceRequest request) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(201, "지구력 기록이 성공적으로 저장되었습니다.",
                recordEnduranceService.saveRecord(member.getLoginId(), request)));
    }

    @GetMapping("/best")
    @Operation(summary = "지구력 최고 기록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<RecordEnduranceResponse>> getBestRecord(
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "최고 기록 조회 성공",
                recordEnduranceService.getBestRecord(member.getLoginId())));
    }

    @GetMapping("/history")
    @Operation(summary = "지구력 상세 내역 전체 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<RecordEnduranceResponse>>> getDetailedHistory(
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "상세 내역 조회 성공",
                recordEnduranceService.getDetailedHistory(member.getLoginId())));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "지구력 기록 삭제", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> deleteRecord(
            @AuthenticationPrincipal Member member,
            @PathVariable Long id) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        recordEnduranceService.deleteRecord(member.getLoginId(), id);
        return ResponseEntity.ok(ApiResponse.success(200, "기록이 성공적으로 삭제되었습니다.", null));
    }
}