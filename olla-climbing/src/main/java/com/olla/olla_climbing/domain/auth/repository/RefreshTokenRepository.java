package com.olla.olla_climbing.domain.auth.repository;

import com.olla.olla_climbing.domain.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// RefreshToken 엔티티를 관리하는 JPA 리포지토리 인터페이스
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    // 로그인 아이디로 토큰을 찾는 메서드
    Optional<RefreshToken> findByLoginId(String loginId);

    // 실제 토큰 값으로 토큰을 찾는 메서드 (로그아웃 시 토큰 삭제할 때 사용)
    Optional<RefreshToken> findByToken(String token);
}