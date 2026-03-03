package com.olla.olla_climbing.domain.admin.dto.request;

import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class MembershipGrantRequest {

    @NotNull(message = "대상 회원 ID는 필수입니다.")
    private Long memberId;

    @NotNull(message = "이용권 타입(PERIOD 또는 COUNT)은 필수입니다.")
    private MembershipType type;

    // 기본값을 0으로 설정하여 null 방지
    private Integer addMonths = 0;

    private Integer addCount = 0;
}