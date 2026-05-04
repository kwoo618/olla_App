package com.olla.olla_climbing.domain.member.controller;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/visit")
@RequiredArgsConstructor
@Tag(name = "User Visit API", description = "유저 전용 출입 및 QR 발급 API")
public class VisitController {

    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/qr")
    @Operation(summary = "입장용 일회용 QR 토큰 발급", description = "3분 뒤 만료되는 입장 전용 QR 토큰을 발급합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> generateQrToken(@AuthenticationPrincipal Member member) {
        // 유저 정보를 바탕으로 3분짜리 일회용 특수 토큰 발급
        String qrToken = jwtTokenProvider.createQrToken(member.getLoginId());

        // 프론트엔드는 이 문자열을 받아서 라이브러리를 통해 QR 이미지로 변환하여 화면에 띄웁니다.
        return ResponseEntity.ok(qrToken);
    }
}