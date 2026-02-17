package com.olla.olla_climbing.domain.record.repository;

import com.olla.olla_climbing.domain.record.entity.RecordEndurance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecordEnduranceRepository extends JpaRepository<RecordEndurance, Long> {

    // 최고 기록 조회
    // 공식: (완등 편도 수 * 1,000,000) + (정/역방향 점수 * 10,000) + (시간 점수)
    @Query(value =
            "SELECT * FROM record_endurance r " +
                    "WHERE r.member_id = :memberId " +
                    "ORDER BY " +
                    "  (r.completed_one_ways * 1000000) + " +
                    "  (CASE WHEN r.completed_one_ways % 2 = 0 THEN " +
                    "      (r.drop_zone * 10000) " +                 // 정방향: 숫자가 클수록(호랑이=5) 높은 점수
                    "   ELSE " +
                    "      ((6 - r.drop_zone) * 10000) " +           // 역방향: 숫자가 작을수록(쥐=1) 높은 점수 (6-1=5만점)
                    "   END) + " +
                    "  LEAST(r.time_seconds, 9999) DESC " +
                    "LIMIT 1",
            nativeQuery = true)
    Optional<RecordEndurance> findBestRecordByMemberIdOptimized(@Param("memberId") Long memberId);
    // 전체 상세 내역 최신순 조회
    List<RecordEndurance> findByMemberIdOrderByRecordDateDesc(Long memberId);
}