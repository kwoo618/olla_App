package com.olla.olla_climbing.domain.record.controller;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.record.dto.request.RecordLeadRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordLeadResponse;
import com.olla.olla_climbing.domain.record.service.RecordLeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/records")
@RequiredArgsConstructor
public class RecordController {

    private final RecordLeadService recordLeadService;

    @PostMapping("/leads")
    @Operation(summary = "리드 기록 저장", description = "리드 등반 기록을 저장합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<RecordLeadResponse> saveLeadRecord(@AuthenticationPrincipal Member member, @Valid @RequestBody RecordLeadRequest request) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        RecordLeadResponse response = recordLeadService.saveRecord(member.getLoginId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/leads/best")
    @Operation(summary = "난이도별 최고 기록 조회", description = "각 난이도(색상)별 회원의 가장 높은 기록을 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<List<RecordLeadResponse>> getBestLeadRecords(
            @AuthenticationPrincipal Member member) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        List<RecordLeadResponse> responses = recordLeadService.getBestRecords(member.getLoginId());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/leads/history")
    @Operation(summary = "리드 기록 전체 상세 내역", description = "모든 리드 등반 기록을 날짜 최신순으로 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<List<RecordLeadResponse>> getDetailedLeadHistory(
            @AuthenticationPrincipal Member member) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        List<RecordLeadResponse> responses = recordLeadService.getDetailedHistory(member.getLoginId());
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/leads/{id}")
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