package com.olla.olla_climbing.domain.auth.entity;

import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 사용자가 로그인할 때 발급해 준 Refresh Token을 DB에 저장해 둘 테이블
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "refresh_token")
public class RefreshToken extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 사용자의 토큰인지 알아야 하므로 로그인 아이디를 저장 (1명당 1개의 토큰만 유지하도록 unique)
    // 로그인 아이디는 중복되면 안 되므로 unique = true, null도 허용하지 않음
    // 다중 기기를 허용하려면 unique 제약조건을 지우고, 어떤 기기인지 구분할 수 있는 deviceId나 userAgent 컬럼을 추가해서 1:N 구조로 바꿔야 함
    // 하지만 지금은 간단하게 1명당 1개의 토큰만 유지하는 구조로 감
    @Column(nullable = false, unique = true)
    private String loginId;

    // 실제 토큰 값 (JWT 토큰 길이가 길 수 있으므로 512자 정도로 넉넉하게 잡음)
    @Column(nullable = false, length = 512)
    private String token;

    @Builder
    public RefreshToken(String loginId, String token) {
        this.loginId = loginId;
        this.token = token;
    }

    // 토큰 재발급 시 기존 토큰 값을 업데이트(더티 체킹)하기 위한 메서드
    public void updateToken(String token) {
        this.token = token;
    }
}