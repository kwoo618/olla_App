package com.olla.olla_climbing.domain.member.dto.response;

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

    private Boolean isPhonePublic;
    private Boolean isEmailPublic;
    private Boolean isHeightPublic;
    private Boolean isWeightPublic;
    private Boolean isArmSpanPublic;
    private Boolean isFootSizePublic;

    private Boolean isGlobalNotificationOn;
    private Boolean isMembershipNotificationOn;
    private Boolean isActivityNotificationOn;
    private Boolean isCrewNotificationOn;
    private Boolean isNoticeNotificationOn;

    public static MemberResponse from(Member member) {
        MemberDetail detail = member.getMemberDetail();
        MemberPrivacy privacy = member.getMemberPrivacy();
        NotificationSetting noti = member.getNotificationSetting();

        // 💡 연 나이 계산 (현재 연도 - 출생 연도)
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