package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.VisitLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VisitLogRepository extends JpaRepository<VisitLog, Long> {
    // 최근 1건의 방문 기록 조회 (쿨타임용)
    Optional<VisitLog> findTopByMemberIdOrderByCreatedAtDesc(Long memberId);

    // 특정 기간(오늘 하루) 방문 기록 조회 (대시보드용)
    List<VisitLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}