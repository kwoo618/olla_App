package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.VisitLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VisitLogRepository extends JpaRepository<VisitLog, Long> {
    // 최근 1건의 방문 기록 조회 (이제 쿨타임용으로는 안 쓰지만, 혹시 몰라 유지)
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

    // 특정 회원이 특정 기간(당일)에 출석한 기록이 '존재하는지' 여부만 빠르게 반환
    boolean existsByMemberIdAndCreatedAtBetween(Long memberId, LocalDateTime start, LocalDateTime end);
}