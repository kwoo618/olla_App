package com.olla.olla_climbing.domain.auth.scheduler;

import com.olla.olla_climbing.domain.auth.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailVerificationScheduler {

    private final EmailVerificationRepository verificationRepository;

    // 매일 새벽 3시 30분: 만료된 미인증 이메일 레코드 일괄 삭제
    // (다른 스케줄러와 실행 시간 분리: 3:00 DB백업 / 3:30 이메일 정리)
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void deleteExpiredVerifications() {
        verificationRepository.deleteExpiredVerifications(LocalDateTime.now());
        log.info("만료된 이메일 인증 레코드 정리 완료");
    }
}