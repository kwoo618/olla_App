package com.olla.olla_climbing.domain.record.controller;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.record.dto.request.RecordBeginnerRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordBeginnerResponse;
import com.olla.olla_climbing.domain.record.service.RecordBeginnerService;
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
@RequestMapping("/api/v1/records/beginner")
@RequiredArgsConstructor
public class RecordBeginnerController {

    private final RecordBeginnerService recordBeginnerService;

    @PostMapping
    @Operation(summary = "초보벽 기록 저장", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<RecordBeginnerResponse>> saveRecord(
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody RecordBeginnerRequest request) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(201, "초보벽 기록이 성공적으로 저장되었습니다.",
                recordBeginnerService.saveRecord(member.getLoginId(), request)));
    }

    @GetMapping("/best")
    @Operation(summary = "난이도별 최고 기록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<RecordBeginnerResponse>>> getBestRecords(
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "최고 기록 조회 성공",
                recordBeginnerService.getBestRecords(member.getLoginId())));
    }

    @GetMapping("/history")
    @Operation(summary = "기록 전체 상세 내역", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<RecordBeginnerResponse>>> getDetailedHistory(
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "상세 내역 조회 성공",
                recordBeginnerService.getDetailedHistory(member.getLoginId())));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "기록 삭제", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> deleteRecord(
            @AuthenticationPrincipal Member member,
            @PathVariable Long id) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        recordBeginnerService.deleteRecord(member.getLoginId(), id);
        return ResponseEntity.ok(ApiResponse.success(200, "기록이 성공적으로 삭제되었습니다.", null));
    }
}