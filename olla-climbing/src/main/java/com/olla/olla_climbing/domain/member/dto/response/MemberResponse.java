package com.olla.olla_climbing.domain.member.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberDetail;
import com.olla.olla_climbing.domain.member.entity.MemberPrivacy;
import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
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
    private String profileImageUrl;
    private String role;
    private String gender;
    private String birthDate;
    private Integer age;
    private Double height;
    private Double weight;
    private Double armSpan;
    private Double footSize;

    // [수정] is 접두사 Boolean 필드 전체 @JsonProperty 추가
    @JsonProperty("isPhonePublic")
    private Boolean isPhonePublic;

    @JsonProperty("isEmailPublic")
    private Boolean isEmailPublic;

    @JsonProperty("isHeightPublic")
    private Boolean isHeightPublic;

    @JsonProperty("isWeightPublic")
    private Boolean isWeightPublic;

    @JsonProperty("isArmSpanPublic")
    private Boolean isArmSpanPublic;

    @JsonProperty("isFootSizePublic")
    private Boolean isFootSizePublic;

    @JsonProperty("isGlobalNotificationOn")
    private Boolean isGlobalNotificationOn;

    @JsonProperty("isMembershipNotificationOn")
    private Boolean isMembershipNotificationOn;

    @JsonProperty("isActivityNotificationOn")
    private Boolean isActivityNotificationOn;

    @JsonProperty("isCrewNotificationOn")
    private Boolean isCrewNotificationOn;

    @JsonProperty("isNoticeNotificationOn")
    private Boolean isNoticeNotificationOn;

    public static MemberResponse from(Member member) {
        MemberDetail detail = member.getMemberDetail();
        MemberPrivacy privacy = member.getMemberPrivacy();
        NotificationSetting noti = member.getNotificationSetting();

        Integer calculatedYearAge = null;
        if (member.getBirthDate() != null) {
            calculatedYearAge = java.time.LocalDate.now().getYear() - member.getBirthDate().getYear();
        } else if (detail != null) {
            calculatedYearAge = detail.getAge();
        }

        return MemberResponse.builder()
                .id(member.getId())
                .loginId(member.getLoginId())
                .name(member.getName())
                .email(member.getEmail())
                .phone(member.getPhone())
                .profileImageUrl(member.getProfileImageUrl())
                .gender(member.getGender())
                .birthDate(member.getBirthDate() != null ? member.getBirthDate().toString() : null)
                .role(member.getRole() != null ? member.getRole().name() : "USER")
                .age(calculatedYearAge)
                .height(detail != null ? detail.getHeight() : null)
                .weight(detail != null ? detail.getWeight() : null)
                .armSpan(detail != null ? detail.getArmSpan() : null)
                .footSize(detail != null ? detail.getFootSize() : null)
                .isPhonePublic(privacy != null ? privacy.isPhonePublic() : false)
                .isEmailPublic(privacy != null ? privacy.isEmailPublic() : false)
                .isHeightPublic(privacy != null ? privacy.isHeightPublic() : false)
                .isWeightPublic(privacy != null ? privacy.isWeightPublic() : false)
                .isArmSpanPublic(privacy != null ? privacy.isArmSpanPublic() : false)
                .isFootSizePublic(privacy != null ? privacy.isFootSizePublic() : false)
                .isGlobalNotificationOn(noti != null ? noti.isGlobalNotificationOn() : true)
                .isMembershipNotificationOn(noti != null ? noti.isMembershipNotificationOn() : true)
                .isActivityNotificationOn(noti != null ? noti.isActivityNotificationOn() : true)
                .isCrewNotificationOn(noti != null ? noti.isCrewNotificationOn() : true)
                .isNoticeNotificationOn(noti != null ? noti.isNoticeNotificationOn() : true)
                .build();
    }
}