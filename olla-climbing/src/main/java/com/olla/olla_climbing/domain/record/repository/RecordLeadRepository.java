package com.olla.olla_climbing.domain.record.repository;

import com.olla.olla_climbing.domain.record.entity.RecordLead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecordLeadRepository extends JpaRepository<RecordLead, Long> {

    // 1. 메모리 최적화: DB 안에서 점수 알고리즘을 돌려 난이도별 1등만 추출
    @Query(value =
            "SELECT * FROM (" +
                    "  SELECT r.*, " +
                    "    ROW_NUMBER() OVER (" +
                    "      PARTITION BY r.difficulty " +
                    "      ORDER BY CASE " +
                    "        WHEN r.attempt_type = 'ROUND_TRIP' AND r.is_success = true THEN 100000 " +
                    "        WHEN r.attempt_type = 'ROUND_TRIP' AND r.is_success = false THEN 10000 - r.max_hold_no " +
                    "        WHEN r.attempt_type = 'ONE_WAY' AND r.is_success = true THEN 1000 " +
                    "        WHEN r.attempt_type = 'ONE_WAY' AND r.is_success = false THEN r.max_hold_no " +
                    "        ELSE 0 END DESC" +
                    "    ) as rn " +
                    "  FROM record_lead r " +
                    "  WHERE r.member_id = :memberId " +
                    ") as ranked_records " +
                    "WHERE ranked_records.rn = 1",
            nativeQuery = true)
    List<RecordLead> findBestRecordsByMemberIdOptimized(@Param("memberId") Long memberId);

    // 2. 상세 내역용 날짜순 정렬 쿼리
    List<RecordLead> findByMemberIdOrderByRecordDateDesc(Long memberId);
}