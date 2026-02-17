package com.olla.olla_climbing.domain.record.repository;

import com.olla.olla_climbing.domain.record.entity.RecordLead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface RecordLeadRepository extends JpaRepository<RecordLead, Long> {
    // 특정 회원의 날짜별 기록 조회를 위한 메서드
    List<RecordLead> findByMemberIdAndRecordDate(Long memberId, LocalDate recordDate);
}