package com.olla.olla_climbing.domain.admin.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class VisitScanRequest {
    @NotBlank(message = "QR 토큰은 필수입니다.") //[cite: 3]
    private String qrToken; //[cite: 3]

    // 동반인 차감을 위한 횟수 (기본값 1)
    @Min(value = 1, message = "차감 횟수는 최소 1 이상이어야 합니다.")
    private Integer deductionCount = 1;
}