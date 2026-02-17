package com.olla.olla_climbing.domain.record.controller;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.record.dto.request.RecordEnduranceRequest;
import com.olla.olla_climbing.domain.record.dto.request.RecordLeadRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordEnduranceResponse;
import com.olla.olla_climbing.domain.record.dto.response.RecordLeadResponse;
import com.olla.olla_climbing.domain.record.service.RecordEnduranceService;
import com.olla.olla_climbing.domain.record.service.RecordLeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/records")
@RequiredArgsConstructor
public class RecordEnduranceController {

    private final RecordEnduranceService recordEnduranceService;

    @PostMapping
    @Operation(summary = "지구력 기록 저장", description = "지구력 등반 기록을 저장합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<RecordEnduranceResponse> saveEnduranceRecord(
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody RecordEnduranceRequest request) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        RecordEnduranceResponse response = recordEnduranceService.saveRecord(member.getLoginId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/best")
    @Operation(summary = "지구력 최고 기록 조회", description = "존버 가중치가 적용된 회원의 지구력 최고 기록 1개를 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<RecordEnduranceResponse> getBestEnduranceRecord(
            @AuthenticationPrincipal Member member) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        RecordEnduranceResponse response = recordEnduranceService.getBestRecord(member.getLoginId());
        // 기록이 아예 없을 경우 204 No Content 를 던지거나, 빈 객체를 보내는 방식 중 선택 (여기선 200 OK에 데이터만 null)
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    @Operation(summary = "지구력 상세 내역 전체 조회", description = "지구력 기록 전체를 최신 날짜순으로 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<List<RecordEnduranceResponse>> getDetailedEnduranceHistory(
            @AuthenticationPrincipal Member member) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        List<RecordEnduranceResponse> responses = recordEnduranceService.getDetailedHistory(member.getLoginId());
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "지구력 기록 삭제", description = "자신의 특정 지구력 기록을 삭제합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> deleteEnduranceRecord(
            @AuthenticationPrincipal Member member,
            @PathVariable("id") Long recordId) {

        if (member == null) {
            throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        }

        recordEnduranceService.deleteRecord(member.getLoginId(), recordId);
        return ResponseEntity.ok("기록이 성공적으로 삭제되었습니다.");
    }
}