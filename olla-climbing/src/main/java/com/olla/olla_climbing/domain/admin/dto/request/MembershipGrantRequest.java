package com.olla.olla_climbing.domain.admin.dto.request;

import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class MembershipGrantRequest {

    @NotNull(message = "회원 ID는 필수입니다.")
    private Long memberId;

    @NotNull(message = "이용권 타입은 필수입니다.")
    private MembershipType type;

    private Integer addMonths;
    private Integer addCount;

    // 과거 회원 이관 및 시작일 수동 지정용 필드
    private LocalDate startDate;
}