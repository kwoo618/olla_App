package com.olla.olla_climbing.domain.record.controller;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.record.dto.request.RecordBeginnerRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordBeginnerResponse;
import com.olla.olla_climbing.domain.record.service.RecordBeginnerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/records/beginner") // URL 공통 부분 추출!
@RequiredArgsConstructor
public class RecordBeginnerController {

    private final RecordBeginnerService recordLeadService;

    @PostMapping
    @Operation(summary = "리드 기록 저장", description = "리드 등반 기록을 저장합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<RecordBeginnerResponse> saveLeadRecord(@AuthenticationPrincipal Member member, @Valid @RequestBody RecordBeginnerRequest request) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        RecordBeginnerResponse response = recordLeadService.saveRecord(member.getLoginId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/best")
    @Operation(summary = "난이도별 최고 기록 조회", description = "각 난이도(색상)별 회원의 가장 높은 기록을 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<List<RecordBeginnerResponse>> getBestLeadRecords(
            @AuthenticationPrincipal Member member) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        List<RecordBeginnerResponse> responses = recordLeadService.getBestRecords(member.getLoginId());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/history")
    @Operation(summary = "리드 기록 전체 상세 내역", description = "모든 리드 등반 기록을 날짜 최신순으로 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<List<RecordBeginnerResponse>> getDetailedLeadHistory(
            @AuthenticationPrincipal Member member) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        List<RecordBeginnerResponse> responses = recordLeadService.getDetailedHistory(member.getLoginId());
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "리드 기록 삭제", description = "자신의 특정 리드 기록을 삭제합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> deleteLeadRecord(
            @AuthenticationPrincipal Member member,
            @PathVariable("id") Long recordId) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        recordLeadService.deleteRecord(member.getLoginId(), recordId);
        return ResponseEntity.ok("기록이 성공적으로 삭제되었습니다.");
    }
}
