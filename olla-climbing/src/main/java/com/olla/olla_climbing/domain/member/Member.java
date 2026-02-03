package com.olla.olla_climbing.domain.member;

import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "member") // DB 테이블 이름을 'member'로 지정
public class Member extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Auto Increment
    private Long id;

    @Column(nullable = false, unique = true) // 필수, 중복 불가
    private String loginId;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false) // 이메일은 필수
    private String email;

    @Enumerated(EnumType.STRING) // DB에 글자(USER, ADMIN)로 저장
    private Role role;

    // 프로필 공개 여부 (기본값 false)
    private boolean isProfilePublic;

    // 기록 공개 여부 (기본값 false)
    private boolean isRecordPublic;

    // 생성자 (회원가입 할 때 씀)
    @Builder
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