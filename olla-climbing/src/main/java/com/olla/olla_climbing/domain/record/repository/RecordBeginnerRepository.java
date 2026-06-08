package com.olla.olla_climbing.domain.record.repository;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.record.entity.RecordBeginner;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecordBeginnerRepository extends JpaRepository<RecordBeginner, Long> {

    // GROUP BY로 한 번에 조회
    @Query("SELECT r FROM RecordBeginner r WHERE r.member = :member AND r.id IN " +
            "(SELECT MAX(r2.id) FROM RecordBeginner r2 WHERE r2.member = :member " +
            "AND r2.isSuccess = true GROUP BY r2.difficulty) ORDER BY r.difficulty")
    List<RecordBeginner> findBestSuccessRecordsByMember(@Param("member") Member member);

    // 성공 기록 없는 경우 최고 홀드 기록 조회 (fallback용)
    Optional<RecordBeginner> findTopByMemberAndDifficultyOrderByIsSuccessDescMaxHoldNoDescAttemptTypeDesc(
            Member member, Difficulty difficulty);

    List<RecordBeginner> findByMemberIdOrderByRecordDateDesc(Long memberId);
}