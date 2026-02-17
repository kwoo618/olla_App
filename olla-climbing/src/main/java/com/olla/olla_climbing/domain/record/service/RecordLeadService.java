package com.olla.olla_climbing.domain.record.service;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.record.dto.request.RecordLeadRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordLeadResponse;
import com.olla.olla_climbing.domain.record.entity.RecordLead;
import com.olla.olla_climbing.domain.record.repository.RecordLeadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecordLeadService {

    private final RecordLeadRepository recordLeadRepository;
    private final MemberRepository memberRepository;

    // 기록 저장
    @Transactional
    public RecordLeadResponse saveRecord(String loginId, RecordLeadRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // [팩트 체크 방어 로직] 실패 홀드 번호 유효성 검사
        if (!request.getIsSuccess()) {
            if (request.getMaxHoldNo() == null) {
                throw new IllegalArgumentException("실패 기록에는 도달한 홀드 번호가 필수입니다.");
            }
            if (request.getMaxHoldNo() > request.getDifficulty().getHoldCount() || request.getMaxHoldNo() <= 0) {
                throw new IllegalArgumentException("입력한 홀드 번호가 해당 난이도의 전체 홀드 수 범위를 벗어납니다.");
            }
        }

        RecordLead record = RecordLead.builder()
                .member(member)
                .difficulty(request.getDifficulty())
                .attemptType(request.getAttemptType())
                .isSuccess(request.getIsSuccess())
                .maxHoldNo(request.getMaxHoldNo())
                .recordDate(request.getRecordDate())
                .build();

        RecordLead savedRecord = recordLeadRepository.save(record);
        return RecordLeadResponse.from(savedRecord);
    }

    // 날짜별 기록 조회
    @Transactional(readOnly = true)
    public List<RecordLeadResponse> getRecordsByDate(String loginId, LocalDate date) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        List<RecordLead> records = recordLeadRepository.findByMemberIdAndRecordDate(member.getId(), date);

        return records.stream()
                .map(RecordLeadResponse::from)
                .collect(Collectors.toList());
    }
}