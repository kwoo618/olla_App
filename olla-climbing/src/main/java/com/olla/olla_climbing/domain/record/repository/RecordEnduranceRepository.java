package com.olla.olla_climbing.domain.record.repository;

import com.olla.olla_climbing.domain.record.entity.RecordEndurance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecordEnduranceRepository extends JpaRepository<RecordEndurance, Long> {

    // 거리 랭킹 강등/동기화를 위한 최고 기록 (totalScore 기준)
    Optional<RecordEndurance> findTopByMemberIdOrderByTotalScoreDesc(Long memberId);

    // 시간 랭킹 강등/동기화를 위한 최고 기록 (timeSeconds 기준)
    Optional<RecordEndurance> findTopByMemberIdOrderByTimeSecondsDesc(Long memberId);

    // 전체 상세 내역 최신순 조회
    List<RecordEndurance> findByMemberIdOrderByRecordDateDesc(Long memberId);
}