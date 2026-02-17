package com.olla.olla_climbing.domain.record.service;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.record.dto.request.RecordEnduranceRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordEnduranceResponse;
import com.olla.olla_climbing.domain.record.entity.RecordEndurance;
import com.olla.olla_climbing.domain.record.repository.RecordEnduranceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecordEnduranceService {

    private final RecordEnduranceRepository enduranceRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public RecordEnduranceResponse saveRecord(String loginId, RecordEnduranceRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        RecordEndurance record = RecordEndurance.builder()
                .member(member)
                .completedOneWays(request.getCompletedOneWays())
                .dropZone(request.getDropZone())
                .timeSeconds(request.getTimeSeconds())
                .recordDate(request.getRecordDate())
                .build();

        return RecordEnduranceResponse.from(enduranceRepository.save(record));
    }

    @Transactional(readOnly = true)
    public RecordEnduranceResponse getBestRecord(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 최고 기록이 없으면 null 반환 (또는 빈 객체 반환)
        return enduranceRepository.findBestRecordByMemberIdOptimized(member.getId())
                .map(RecordEnduranceResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<RecordEnduranceResponse> getDetailedHistory(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return enduranceRepository.findByMemberIdOrderByRecordDateDesc(member.getId())
                .stream().map(RecordEnduranceResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public void deleteRecord(String loginId, Long recordId) {
        RecordEndurance record = enduranceRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기록입니다."));

        if (!record.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("자신의 기록만 삭제할 수 있습니다.");
        }

        enduranceRepository.delete(record);
    }
}