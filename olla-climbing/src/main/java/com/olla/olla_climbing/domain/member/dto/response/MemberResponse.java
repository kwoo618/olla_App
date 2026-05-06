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


    private DetailDto detail;
    private PrivacyDto privacy;
    private AlertDto alert;

    // 회원의 상세 정보와 개인정보 공개 설정을 담는 내부 DTO 클래스
    // 새로운 클래스로 분리하여 MemberResponse의 가독성을 높이고, 필요한 정보만 포함하도록 설계
    // MemberDetail과 MemberPrivacy의 모든 필드를 포함하지 않고, 필요한 필드만 선택적으로 포함하여 응답의 크기를 줄임
    // API 응답용 DTO는 보통 public으로 열어둠, Swagger 같은 API 문서화 도구에서 자동으로 인식할 수 있도록
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

    @Getter @Builder
    public static class AlertDto {
        private boolean isGlobalAlertOn;
        private boolean isMembershipWeekBeforeAlertOn;
        private boolean isMembershipDayBeforeAlertOn;
        private boolean isMembershipExpiredAlertOn;
        private boolean isNoticeAlertOn;
        private boolean isCrewParticipantChangeAlertOn;
        private boolean isCrewMeetingReminderAlertOn;
        private boolean isRankingChangeAlertOn;
        private boolean isWeeklyReportAlertOn;
        private boolean isInactivityAlertOn;
        private Integer inactivityDays;
    }

    // 자바 개발자들 사이의 암묵적인 룰(네이밍 컨벤션)
    // from: 매개변수를 딱 1개 받아서 객체를 만들 때 주로 쓰는 이름 (예: Member 1개를 받아서 MemberResponse로 변환)
    // of: 매개변수를 여러 개 받아서 객체를 만들 때 주로 쓰는 이름
    public static MemberResponse from(Member member) {
        // MemberResponse를 만들 때, MemberDetail과 MemberPrivacy가 Null일 수 있으므로, Null 체크 후 DTO로 변환
        MemberDetail detail = member.getMemberDetail();
        MemberPrivacy privacy = member.getMemberPrivacy();
        NotificationSetting noti = member.getNotificationSetting();

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
                .detail(detail != null ? DetailDto.builder()
                        .age(member.getMemberDetail().getAge()) // age는 MemberDetail에서 계산된 값이므로, MemberResponse에서 직접 계산하지 않고, MemberDetail에서 가져옴
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
                .alert(noti != null ? AlertDto.builder()
                        .isGlobalAlertOn(noti.isGlobalAlertOn())
                        .isMembershipWeekBeforeAlertOn(noti.isMembershipWeekBeforeAlertOn())
                        .isMembershipDayBeforeAlertOn(noti.isMembershipDayBeforeAlertOn())
                        .isMembershipExpiredAlertOn(noti.isMembershipExpiredAlertOn())
                        .isNoticeAlertOn(noti.isNoticeAlertOn())
                        .isCrewParticipantChangeAlertOn(noti.isCrewParticipantChangeAlertOn())
                        .isCrewMeetingReminderAlertOn(noti.isCrewMeetingReminderAlertOn())
                        .isRankingChangeAlertOn(noti.isRankingChangeAlertOn())
                        .isWeeklyReportAlertOn(noti.isWeeklyReportAlertOn())
                        .isInactivityAlertOn(noti.isInactivityAlertOn())
                        .inactivityDays(noti.getInactivityDays())
                        .build() : null)
                .build();
    }
}