package com.olla.olla_climbing.domain.member.entity;

import com.olla.olla_climbing.domain.member.enums.Role;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.util.StringUtils;

import java.time.LocalDate;

@Entity // 1. JPA에게 "이건 DB 테이블이랑 짝꿍이야"라고 알려줌
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)  // 파라미터가 없는 기본 생성자(public Member() {}), 아무나 못 쓰게 protected
@Table(name = "member") // 2. DB 테이블 이름을 명시적으로 'member'로 지정
public class Member extends BaseTimeEntity { // 3. 상속: 생성일/수정일 자동 관리

    @Id // 4. Primary Key (주민등록번호 같은 식별자)
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 5. Auto Increment (1, 2, 3... 번호 자동 증가)
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

    @Enumerated(EnumType.STRING) // 7. Enum을 DB에 저장할 때 숫자가 아니라 문자("USER")로 저장해라
    private Role role;

    // 프로필 공개 여부 (기본값 false)
    private boolean isProfilePublic;

    // 기록 공개 여부 (기본값 false)
    private boolean isRecordPublic;

    // 프로필 이미지 URL 저장용 컬럼
    @Column(name = "profile_image_url", length = 1000)
    private String profileImageUrl;

    // 프로필 이미지 수정 메서드 (더티 체킹용)
    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    // one-to-one 양방향 매핑: MemberDetail과 MemberPrivacy는 Member를 참조, Member는 Detail과 Privacy를 참조
    // mappedBy = "member": MemberDetail과 MemberPrivacy에서 "member" 필드가 이 관계의 주인이라는 뜻, DB에서는 MemberDetail과 MemberPrivacy 테이블에 member_id 외래키가 생김
    // fetch = FetchType.LAZY: Member를 조회할 때 Detail과 Privacy는 바로 가져오지 않고, 실제로 사용할 때 가져옴(성능 최적화)
    // cascade = CascadeType.ALL: Member가 저장될 때 Detail, Privacy도 같이 저장됨
    // 양방향 매핑 이유? Member에서 Detail과 Privacy를 바로 참조할 수 있게 해서 편리하게 접근하려고, 예) member.getMemberDetail().getHeight() 이런 식으로
    @OneToOne(mappedBy = "member", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private MemberDetail memberDetail;

    // @Setter 대신 setMemberPrivacy() 메서드를 만들어서, MemberPrivacy를 세팅할 때, MemberPrivacy에도 "네 주인은 나야"라고 명시적으로 알려주는 것이 좋음 (연관관계 편의 메서드)
    @OneToOne(mappedBy = "member", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private MemberPrivacy memberPrivacy;

    public void setMemberDetail(MemberDetail memberDetail) {
        this.memberDetail = memberDetail;
    }

    public void setMemberPrivacy(MemberPrivacy memberPrivacy) {
        this.memberPrivacy = memberPrivacy;
    }

    // 알림 설정
    @OneToOne(mappedBy = "member", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private NotificationSetting notificationSetting;

    public void setNotificationSetting(NotificationSetting notificationSetting) {
        this.notificationSetting = notificationSetting;
    }

    // 회원 탈퇴 여부를 나타내는 필드, 실제로 DB에서 회원 데이터를 삭제하는 대신 이 필드를 true로 바꿔서 탈퇴 처리
    private boolean isDeleted = false; // 기본값은 false(활동 중)

    // 생성자 (회원가입 할 때 씀)
    @Builder //
    public Member(String loginId, String password, String name, String phone, String email, Role role, String gender, LocalDate birthDate) {
        this.loginId = loginId;
        this.password = password;
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.role = role;
        this.gender = gender;
        this.birthDate = birthDate;
        this.isProfilePublic = false;
        this.isRecordPublic = false;
    }

    public void upgradeToOnlineMember(String loginId, String encodedPassword, String email, String gender, LocalDate birthDate) {
        this.loginId = loginId;
        this.password = encodedPassword;
        // 기존에 없던 부가 정보도 업데이트
        if (email != null) this.email = email;
        if (gender != null) this.gender = gender;
        if (birthDate != null) this.birthDate = birthDate;
    }

    // 회원의 기본 정보(이름, 전화번호) 업데이트 메서드
    public void updateBasicInfo(String name, String phone) {

        // name != null -> StringUtils.hasText(name) : null 체크 + 빈 문자열 체크, 빈 문자열("")은 null이 아니지만 유효한 값이 아니므로 같이 체크
        if (StringUtils.hasText(name)) {
            this.name = name;
        }
        if (StringUtils.hasText(phone)) {
            this.phone = phone;
        }
    }

    // 💡 (동철 추가) 마이페이지에서 성별과 생년월일을 수정할 수 있게 해주는 갱신용 메서드 추가
    public void updateAdditionalInfo(String gender, LocalDate birthDate) {
        if (gender != null) {
            this.gender = gender;
        }
        if (birthDate != null) {
            this.birthDate = birthDate;
        }
    }

    // 비밀번호 업데이트 메서드 (임시 비밀번호 발급 시 사용)
    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword; // 임시 비밀번호 암호화본 저장용
    }

    // 탈퇴 처리 메서드
    public void withdraw() {
        this.isDeleted = true;
        String now = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));

        // 1. 아이디 변조 (재가입 허용 및 식별자 유지)
        if (this.loginId != null) {
            this.loginId = "del_" + now + "_" + this.loginId + "_" + this.id;
        }

        // 2. 전화번호 변조 (Unique 제약 조건 우회)
        this.phone = "del_" + now + "_" + this.phone + "_" + this.id;

        // 3. 개인정보 익명화
        this.name = "탈퇴회원" + "_" + this.name + "_" + this.id;  //
        this.email = null;
    }

    public void updateFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
    }
}