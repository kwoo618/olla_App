package com.olla.olla_climbing.domain.member;

import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity // 1. JPA에게 "이건 DB 테이블이랑 짝꿍이야"라고 알려줌
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "member") // 2. DB 테이블 이름을 명시적으로 'member'로 지정
public class Member extends BaseTimeEntity { // 3. 상속: 생성일/수정일 자동 관리

    @Id // 4. Primary Key (주민등록번호 같은 식별자)
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 5. Auto Increment (1, 2, 3... 번호 자동 증가)
    private Long id;

    @Column(nullable = false, unique = true) // 6. 필수 입력(Not Null) + 중복 금지(Unique)
    private String loginId;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false) // 이메일은 필수
    private String email;

    @Enumerated(EnumType.STRING) // 7. Enum을 DB에 저장할 때 숫자가 아니라 문자("USER")로 저장해라
    private Role role;

    // 프로필 공개 여부 (기본값 false)
    private boolean isProfilePublic;

    // 기록 공개 여부 (기본값 false)
    private boolean isRecordPublic;

    // 생성자 (회원가입 할 때 씀)
    @Builder // 8. 객체를 만들 때 헷갈리지 않게 도와주는 도구
    public Member(String loginId, String password, String name, String phone, String email, Role role) {
        this.loginId = loginId;
        this.password = password;
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.role = role;
        this.isProfilePublic = false; // 가입 시 기본 비공개
        this.isRecordPublic = false;
    }
}