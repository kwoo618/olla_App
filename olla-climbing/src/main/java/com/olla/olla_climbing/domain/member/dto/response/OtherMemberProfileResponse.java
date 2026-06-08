package com.olla.olla_climbing.domain.member.dto.response;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberDetail;
import com.olla.olla_climbing.domain.member.entity.MemberPrivacy;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OtherMemberProfileResponse {
    private Long memberId;
    private String name;
    private String profileImageUrl;

    // 공개 설정에 따라 노출 여부가 결정되는 필드들
    private Integer age;
    private String gender;
    private Double height;
    private Double weight;
    private Double armSpan;
    private Double footSize;

    // 엔티티와 프라이버시 설정을 대조하여 공개 가능한 정보만 담은 DTO를 생성합니다.
    public static OtherMemberProfileResponse of(Member member) {
        MemberDetail detail = member.getMemberDetail();
        MemberPrivacy privacy = member.getMemberPrivacy();

        // 기본적으로 이름과 프로필 사진은 공개한다고 가정 (정책에 따라 변경 가능)
        OtherMemberProfileResponseBuilder builder = OtherMemberProfileResponse.builder()
                .memberId(member.getId())
                .name(member.getName())
                .profileImageUrl(member.getProfileImageUrl())
                .gender(member.getGender());

        // 신체 정보 및 기타 정보 필터링 (Privacy 설정 체크)
        if (detail != null && privacy != null) {
            builder.age(detail.getAge());

            // 키 공개 여부
            if (privacy.isHeightPublic()) builder.height(detail.getHeight());
            // 몸무게 공개 여부
            if (privacy.isWeightPublic()) builder.weight(detail.getWeight());
            // 팔 길이 공개 여부
            if (privacy.isArmSpanPublic()) builder.armSpan(detail.getArmSpan());
            // 발 사이즈 공개 여부
            if (privacy.isFootSizePublic()) builder.footSize(detail.getFootSize());
        }

        return builder.build();
    }
}