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
    // 1. 기본 정보
    private Long id;
    private String loginId;
    private String name;
    private String email;
    private String phone;
    private String profileImageUrl;
    private String role;
    private String gender;
    private String birthDate;

    // 2. 신체 상세 정보 (프론트엔드 요청: 중첩 객체 제거, 평탄화 적용)
    private Integer age;
    private Double height;
    private Double weight;
    private Double armSpan;
    private Double footSize;

    // 3. 개인정보 공개 여부
    private Boolean isPhonePublic;
    private Boolean isEmailPublic;
    private Boolean isHeightPublic;
    private Boolean isWeightPublic;
    private Boolean isArmSpanPublic;
    private Boolean isFootSizePublic;

    // 4. 알림 설정 (💡 에러 해결: 새로 리팩토링한 5가지 스위치 적용)
    private Boolean isGlobalNotificationOn;
    private Boolean isMembershipNotificationOn;
    private Boolean isActivityNotificationOn;
    private Boolean isCrewNotificationOn;
    private Boolean isNoticeNotificationOn;

    public static MemberResponse from(Member member) {
        MemberDetail detail = member.getMemberDetail();
        MemberPrivacy privacy = member.getMemberPrivacy();
        NotificationSetting noti = member.getNotificationSetting();

        Integer calculatedYearAge = null;
        if (member.getBirthDate() != null) {
            calculatedYearAge = java.time.LocalDate.now().getYear() - member.getBirthDate().getYear();
        } else if (detail != null) {
            calculatedYearAge = detail.getAge(); // 생년월일이 없으면 기존 상세정보의 나이 사용
        }

        return MemberResponse.builder()
                .id(member.getId())
                .loginId(member.getLoginId())
                .name(member.getName())
                .gender(member.getGender())
                .birthDate(member.getBirthDate() != null ? member.getBirthDate().toString() : null)
                .email(member.getEmail())
                .phone(member.getPhone())
                .profileImageUrl(member.getProfileImageUrl())
                .role(member.getRole() != null ? member.getRole().name() : "USER")

                // Detail 매핑 (Null 안전 보장)
                .age(calculatedYearAge)
                .height(detail != null ? detail.getHeight() : null)
                .weight(detail != null ? detail.getWeight() : null)
                .armSpan(detail != null ? detail.getArmSpan() : null)
                .footSize(detail != null ? detail.getFootSize() : null)

                // Privacy 매핑 (Null이면 기본값 false 설정)
                .isPhonePublic(privacy != null ? privacy.isPhonePublic() : false)
                .isEmailPublic(privacy != null ? privacy.isEmailPublic() : false)
                .isHeightPublic(privacy != null ? privacy.isHeightPublic() : false)
                .isWeightPublic(privacy != null ? privacy.isWeightPublic() : false)
                .isArmSpanPublic(privacy != null ? privacy.isArmSpanPublic() : false)
                .isFootSizePublic(privacy != null ? privacy.isFootSizePublic() : false)

                // Notification 매핑 (Null이면 기본값 true 설정, 💡 에러 원인 해결 구간)
                .isGlobalNotificationOn(noti != null ? noti.isGlobalNotificationOn() : true)
                .isMembershipNotificationOn(noti != null ? noti.isMembershipNotificationOn() : true)
                .isActivityNotificationOn(noti != null ? noti.isActivityNotificationOn() : true)
                .isCrewNotificationOn(noti != null ? noti.isCrewNotificationOn() : true)
                .isNoticeNotificationOn(noti != null ? noti.isNoticeNotificationOn() : true)
                .build();
    }
}