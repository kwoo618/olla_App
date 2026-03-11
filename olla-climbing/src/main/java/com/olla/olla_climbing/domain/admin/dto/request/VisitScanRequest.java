package com.olla.olla_climbing.domain.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class VisitScanRequest {
    @NotBlank(message = "QR 토큰은 필수입니다.")
    private String qrToken;
}