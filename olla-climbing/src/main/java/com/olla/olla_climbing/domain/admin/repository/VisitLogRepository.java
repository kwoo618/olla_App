package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.VisitLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

public interface VisitLogRepository extends JpaRepository<VisitLog, Long> {
    // 최근 1건의 방문 기록 조회 (쿨타임용)
    Optional<VisitLog> findTopByMemberIdOrderByCreatedAtDesc(Long memberId);

    // 특정 기간(오늘 하루) 방문 기록 조회 (대시보드용)
    List<VisitLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    // 최근 30일간의 모든 방문 기록 조회
    List<VisitLog> findByCreatedAtAfter(LocalDateTime dateTime);

    // 특정 기간 동안의 출석 날짜를 중복 없이 조회
    @Query("SELECT DISTINCT CAST(v.createdAt AS LocalDate) FROM VisitLog v " +
            "WHERE v.member.id = :memberId " +
            "AND v.createdAt >= :start " +
            "AND v.createdAt <= :end")
    List<LocalDate> findVisitDatesByMonth(@Param("memberId") Long memberId,
                                          @Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);

    @Query("SELECT v FROM VisitLog v WHERE v.member.id = :memberId " +
            "AND v.createdAt >= :start AND v.createdAt <= :end")
    List<VisitLog> findAllByMemberIdAndCreatedAtBetween(
            @Param("memberId") Long memberId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}