package com.olla.olla_climbing.domain.admin.dto.response;

import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.member.entity.Member;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class AdminMemberResponse {
    private Long memberId;
    private Long membershipId;
    private String name;
    private String phone;

    private String membershipStatus;
    private String membershipType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer remainingCount;

    public static AdminMemberResponse from(Member member, Membership membership) {
        if (membership == null) {
            return AdminMemberResponse.builder()
                    .memberId(member.getId())
                    .name(member.getName())
                    .phone(member.getPhone())
                    .membershipStatus("NONE")
                    .build();
        }

        return AdminMemberResponse.builder()
                .memberId(member.getId())
                .membershipId(membership.getId())
                .name(member.getName())
                .phone(member.getPhone())
                .membershipStatus(membership.getStatus().name())
                .membershipType(membership.getMembershipTypeName())
                .startDate(membership.getStartDate())
                .endDate(membership.getEndDate())
                .remainingCount(membership.getRemainingCount())
                .build();
    }
}