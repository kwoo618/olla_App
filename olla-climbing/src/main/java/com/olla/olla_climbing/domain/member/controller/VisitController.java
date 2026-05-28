package com.olla.olla_climbing.domain.member.controller;

import com.olla.olla_climbing.domain.admin.service.VisitService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.common.ApiResponse;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/visit")
@RequiredArgsConstructor
@Tag(name = "User Visit API")
public class VisitController {

    private final JwtTokenProvider jwtTokenProvider;
    private final VisitService visitService;

    @GetMapping("/qr")
    @Operation(summary = "입장용 QR 토큰 발급", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<String>> generateQrToken(@AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "QR 토큰 발급 성공",
                jwtTokenProvider.createQrToken(member.getLoginId())));
    }

    @GetMapping("/my-history")
    @Operation(summary = "내 출석 캘린더 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<LocalDate>>> getMyVisitHistory(
            @AuthenticationPrincipal Member member,
            @RequestParam String yearMonth) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "출석 기록 조회 성공",
                visitService.getMonthlyVisitDates(member.getId(), yearMonth)));
    }
}