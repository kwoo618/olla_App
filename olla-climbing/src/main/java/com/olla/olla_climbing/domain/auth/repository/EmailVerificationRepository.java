package com.olla.olla_climbing.domain.auth.repository;

import com.olla.olla_climbing.domain.auth.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    // 가장 최근에 발송된 인증 번호를 찾는 메서드
    Optional<EmailVerification> findTopByEmailOrderByCreatedAtDesc(String email);

}