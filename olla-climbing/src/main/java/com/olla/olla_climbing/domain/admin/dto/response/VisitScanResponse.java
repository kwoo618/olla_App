package com.olla.olla_climbing.domain.admin.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VisitScanResponse {
    private String statusCode; // "SUCCESS"(초록), "WARNING"(노랑), "ERROR"(빨강)
    private String memberName; // "최강우"
    private String remainingInfo; // "잔여 3회" 또는 "2026-11-01 까지"
    private String message; // "정상 입장되었습니다."
}