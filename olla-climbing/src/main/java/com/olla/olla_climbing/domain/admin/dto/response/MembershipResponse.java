package com.olla.olla_climbing.domain.admin.dto.response;

import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class MembershipResponse {
    private String membershipType;
    private MembershipStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer remainingCount;

    public static MembershipResponse from(Membership membership) {
        return MembershipResponse.builder()
                .membershipType(membership.getMembershipTypeName()) // 엔티티의 메서드 활용
                .status(membership.getStatus())
                .startDate(membership.getStartDate())
                .endDate(membership.getEndDate())
                .remainingCount(membership.getRemainingCount())
                .build();
    }
}