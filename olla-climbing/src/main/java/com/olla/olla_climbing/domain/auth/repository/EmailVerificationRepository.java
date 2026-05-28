package com.olla.olla_climbing.domain.auth.repository;

import com.olla.olla_climbing.domain.auth.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findTopByEmailOrderByCreatedAtDesc(String email);

    // 인증 완료 후 동일 이메일의 나머지 레코드 삭제 (무한 누적 방지)
    @Modifying
    @Query("DELETE FROM EmailVerification e WHERE e.email = :email AND e.id != :excludeId")
    void deleteAllByEmailExcept(@Param("email") String email, @Param("excludeId") Long excludeId);

    // 매일 새벽 만료된 인증 레코드 일괄 삭제용
    @Modifying
    @Query("DELETE FROM EmailVerification e WHERE e.expiredAt < :now AND e.isConfirmed = false")
    void deleteExpiredVerifications(@Param("now") LocalDateTime now);
}