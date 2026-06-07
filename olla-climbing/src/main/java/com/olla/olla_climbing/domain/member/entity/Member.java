package com.olla.olla_climbing.domain.member.entity;

import com.olla.olla_climbing.domain.member.enums.Role;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "member")
public class Member extends BaseTimeEntity {

    @Version
    private Long version;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 50)
    private String loginId;

    @Column(length = 255)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String phone;

    @Column(length = 10)
    private String gender;

    @Column
    private LocalDate birthDate;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column
    private String fcmToken;

    @Enumerated(EnumType.STRING)
    private Role role;

    private boolean isProfilePublic;
    private boolean isRecordPublic;

    @Column(name = "profile_image_url", length = 1000)
    private String profileImageUrl;

    private boolean isDeleted = false;

    @OneToOne(mappedBy = "member", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private MemberDetail memberDetail;

    @OneToOne(mappedBy = "member", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private MemberPrivacy memberPrivacy;

    @OneToOne(mappedBy = "member", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private NotificationSetting notificationSetting;

    @Builder
    public Member(String loginId, String password, String name, String phone,
                  String gender, LocalDate birthDate, String email, Role role) {
        this.loginId = loginId;
        this.password = password;
        this.name = name;
        this.phone = phone;
        this.gender = gender;
        this.birthDate = birthDate;
        this.email = email;
        this.role = (role != null) ? role : Role.USER;
        this.isDeleted = false;
    }

    public void setMemberDetail(MemberDetail memberDetail) { this.memberDetail = memberDetail; }
    public void setMemberPrivacy(MemberPrivacy memberPrivacy) { this.memberPrivacy = memberPrivacy; }
    public void assignNotificationSetting(NotificationSetting s) { this.notificationSetting = s; }
    public void updateProfileImage(String url) { this.profileImageUrl = url; }
    public void updateFcmToken(String token) { this.fcmToken = token; }
    public void updatePassword(String encodedPassword) { this.password = encodedPassword; }

    public void updateBasicInfo(String name, String phone) {
        if (StringUtils.hasText(name)) this.name = name;
        if (StringUtils.hasText(phone)) this.phone = phone;
    }

    public void updateAdditionalInfo(String gender, LocalDate birthDate) {
        if (gender != null) this.gender = gender;
        if (birthDate != null) this.birthDate = birthDate;
    }

    public void upgradeToOnlineMember(String loginId, String encodedPassword,
                                      String email, String gender, LocalDate birthDate) {
        this.loginId = loginId;
        this.password = encodedPassword;
        this.email = email;
        if (gender != null) this.gender = gender;
        if (birthDate != null) this.birthDate = birthDate;
        this.role = Role.USER;
    }

    public void withdraw() {
        this.isDeleted = true;
        this.fcmToken = null;
        String now = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        if (this.loginId != null && !this.loginId.startsWith("del_")) {
            this.loginId = "del_" + now + "_" + this.loginId + "_" + this.id;
        }
        if (this.phone != null && !this.phone.startsWith("del_")) {
            this.phone = "del_" + now + "_" + this.phone + "_" + this.id;
        }
        this.name = "탈퇴회원_" + this.id;
        this.email = "del_" + now + "_" + this.id + "@deleted.com";
        this.profileImageUrl = null;
    }
}