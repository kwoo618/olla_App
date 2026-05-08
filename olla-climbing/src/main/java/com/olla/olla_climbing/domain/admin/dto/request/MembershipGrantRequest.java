package com.olla.olla_climbing.domain.admin.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class MembershipGrantRequest {

    @NotNull(message = "회원 ID는 필수입니다.")
    private Long memberId;

    private Integer addMonths;  // 개월 수 (기간권용)
    private Integer addCount;   // 횟수 (횟수권용)

    private LocalDate startDate; // 시작일 수동 지정용
}