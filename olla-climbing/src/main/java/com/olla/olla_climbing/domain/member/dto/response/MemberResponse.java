package com.olla.olla_climbing.domain.member.dto.response;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.MemberDetail;
import com.olla.olla_climbing.domain.member.MemberPrivacy;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MemberResponse {
    private Long id;
    private String loginId;
    private String name;
    private String email;
    private String phone;
    private DetailDto detail;
    private PrivacyDto privacy;

    // 회원의 상세 정보와 개인정보 공개 설정을 담는 내부 DTO 클래스
    // 새로운 클래스로 분리하여 MemberResponse의 가독성을 높이고, 필요한 정보만 포함하도록 설계
    // MemberDetail과 MemberPrivacy의 모든 필드를 포함하지 않고, 필요한 필드만 선택적으로 포함하여 응답의 크기를 줄임
    @Getter @Builder
    public static class DetailDto {
        private Integer age;
        private Double height;
        private Double weight;
        private Double armSpan;
        private Double footSize;
    }

    @Getter @Builder
    public static class PrivacyDto {
        private boolean isPhonePublic;
        private boolean isEmailPublic;
        private boolean isHeightPublic;
        private boolean isWeightPublic;
        private boolean isArmSpanPublic;
        private boolean isFootSizePublic;
    }

    public static MemberResponse from(Member member) {
        // MemberResponse를 만들 때, MemberDetail과 MemberPrivacy가 Null일 수 있으므로, Null 체크 후 DTO로 변환
        MemberDetail detail = member.getMemberDetail();
        MemberPrivacy privacy = member.getMemberPrivacy();

        return MemberResponse.builder()
                .id(member.getId())
                .loginId(member.getLoginId())
                .name(member.getName())
                .email(member.getEmail())
                .phone(member.getPhone())
                .detail(detail != null ? DetailDto.builder()
                        .age(detail.getAge())
                        .height(detail.getHeight())
                        .weight(detail.getWeight())
                        .armSpan(detail.getArmSpan())
                        .footSize(detail.getFootSize())
                        .build() : null)
                .privacy(privacy != null ? PrivacyDto.builder()
                        .isPhonePublic(privacy.isPhonePublic())
                        .isEmailPublic(privacy.isEmailPublic())
                        .isHeightPublic(privacy.isHeightPublic())
                        .isWeightPublic(privacy.isWeightPublic())
                        .isArmSpanPublic(privacy.isArmSpanPublic())
                        .isFootSizePublic(privacy.isFootSizePublic())
                        .build() : null)
                .build();
    }
}