package com.olla.olla_climbing.domain.admin.dto.response;

import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.member.entity.Member;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class AdminMemberResponse {
    private Long memberId;
    private String name;
    private String profileImageUrl;
    private String phone;
    private String role;
    private boolean isDeleted;
    private List<MembershipDto> memberships;

    @Getter
    @Builder
    public static class MembershipDto {
        private Long membershipId;
        private String membershipStatus;
        private String membershipType;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer remainingCount;
    }

    public static AdminMemberResponse from(Member member, List<Membership> activeMemberships) {
        List<MembershipDto> membershipDtos = (activeMemberships == null) ? List.of() : activeMemberships.stream()
                .map(m -> MembershipDto.builder()
                        .membershipId(m.getId())
                        .membershipStatus(m.getStatus().name())
                        .membershipType(m.getMembershipTypeName())
                        .startDate(m.getStartDate())
                        .endDate(m.getEndDate())
                        .remainingCount(m.getRemainingCount())
                        .build())
                .collect(Collectors.toList());

        return AdminMemberResponse.builder()
                .memberId(member.getId())
                .name(member.getName())
                .profileImageUrl(member.getProfileImageUrl())
                .phone(member.getPhone())
                .role(member.getRole() != null ? member.getRole().name() : "USER")
                .isDeleted(member.isDeleted())
                .memberships(membershipDtos)
                .build();
    }
}