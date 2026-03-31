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
    private String name;
    private String phone;

    // 이용권 관련 정보
    private String membershipStatus; // ACTIVE, HOLDING, EXPIRED, NONE(미등록)
    private String membershipType;   // PERIOD(기간권), COUNT(횟수권), null
    private LocalDate endDate;       // 기간권일 경우 만료일
    private Integer remainingCount;  // 횟수권일 경우 남은 횟수

    // Member 엔티티와 Membership 엔티티 2개를 받아서 하나의 DTO로 합치는 팩토리 메서드
    public static AdminMemberResponse from(Member member, Membership membership) {
        if (membership == null) {
            // 활성화/정지된 이용권이 아예 없는 회원 (신규 가입자 또는 완전 만료자)
            return AdminMemberResponse.builder()
                    .memberId(member.getId())
                    .name(member.getName())
                    .phone(member.getPhone())
                    .membershipStatus("NONE")
                    .build();
        }

        // 이용권이 있는 회원
        return AdminMemberResponse.builder()
                .memberId(member.getId())
                .name(member.getName())
                .phone(member.getPhone())
                .membershipStatus(membership.getStatus().name())
                .membershipType(membership.getMembershipType().name())
                .endDate(membership.getEndDate())
                .remainingCount(membership.getRemainingCount())
                .build();
    }
}