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
    private Long membershipId; // 🔥 프론트엔드의 일시정지 통신을 위해 반드시 추가되어야 하는 필드!
    private String name;
    private String phone;

    private String role;
    private boolean isDeleted;

    private String membershipStatus;
    private String membershipType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer remainingCount;

    public static AdminMemberResponse from(Member member, Membership membership) {
        if (membership == null) {
            return AdminMemberResponse.builder()
                    .memberId(member.getId())
                    // membershipId는 매핑하지 않음 (null)
                    .name(member.getName())
                    .phone(member.getPhone())
                    .role(member.getRole() != null ? member.getRole().name() : "USER") // 💡 Null 방어
                    .isDeleted(member.isDeleted())
                    .membershipStatus("NONE")
                    .build();
        }

        return AdminMemberResponse.builder()
                .memberId(member.getId())
                .membershipId(membership.getId()) // (동철 수정) 멤버십 아이디 주는게 없어서 추가 
                .name(member.getName())
                .phone(member.getPhone())
                .role(member.getRole() != null ? member.getRole().name() : "USER") // 💡 Null 방어
                .isDeleted(member.isDeleted())
                .membershipStatus(membership.getStatus().name())
                .membershipType(membership.getMembershipTypeName())
                .startDate(membership.getStartDate()) // (동철 수정) 시작일 
                .endDate(membership.getEndDate())
                .remainingCount(membership.getRemainingCount())
                .build();
    }
}