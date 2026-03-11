package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.VisitScanRequest;
import com.olla.olla_climbing.domain.admin.service.VisitService;
import com.olla.olla_climbing.domain.member.entity.Member;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/visits")
@RequiredArgsConstructor
@Tag(name = "Admin Visit API", description = "관리자 전용 회원 출입 관리 API")
public class AdminVisitController {

    private final VisitService visitService;

    @PostMapping("/scan")
    @Operation(summary = "QR 스캔 입장 처리", description = "회원의 QR 코드를 스캔하여 이용권을 차감하고 입장을 승인합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> scanQrAndEnter(
            @AuthenticationPrincipal Member admin,
            @Valid @RequestBody VisitScanRequest request) {

        if (admin == null) {
            throw new IllegalArgumentException("관리자 인증 정보가 없습니다.");
        }

        visitService.processEntry(request.getQrToken(), admin.getLoginId());
        return ResponseEntity.ok("입장 처리가 완료되었습니다.");
    }
}