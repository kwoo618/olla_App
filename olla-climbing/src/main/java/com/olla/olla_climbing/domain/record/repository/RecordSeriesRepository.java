package com.olla.olla_climbing.domain.record.repository;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.record.entity.RecordSeries;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecordSeriesRepository extends JpaRepository<RecordSeries, Long> {

    // 최고 기록 1개 조회 (총점 기준 내림차순)
    Optional<RecordSeries> findTopByMemberIdOrderByTotalScoreDesc(Long memberId);

    // 전체 기록 최신 날짜순 조회
    List<RecordSeries> findByMemberIdOrderByRecordDateDesc(Long memberId);
}