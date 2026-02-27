package com.olla.olla_climbing.domain.record.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.ranking.service.EnduranceRankingService;
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
    private final EnduranceRankingService enduranceRankingService;

    // 기록 저장
    @Transactional
    public RecordEnduranceResponse saveRecord(String loginId, RecordEnduranceRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        RecordEndurance record = RecordEndurance.builder()
                .member(member)
                .oneWayCount(request.getOneWayCount())
                .additionalBlocks(request.getAdditionalBlocks())
                .timeSeconds(request.getTimeSeconds())
                .recordDate(request.getRecordDate())
                .build();

        RecordEndurance savedRecord = enduranceRepository.save(record);

        // 거리 랭킹과 시간 랭킹 각각 업데이트
        enduranceRankingService.updateMainEnduranceDistanceRanking(member, savedRecord.getTotalScore());
        enduranceRankingService.updateMainEnduranceTimeRanking(member, Double.valueOf(savedRecord.getTimeSeconds()));

        return RecordEnduranceResponse.from(savedRecord);
    }

    // 최고 기록 조회 (거리 랭킹 기준)
    @Transactional(readOnly = true)
    public RecordEnduranceResponse getBestRecord(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 최고 기록 조회 시, 기본적으로 '거리 기준' 최고 기록을 반환하도록 설정
        return enduranceRepository.findTopByMemberIdOrderByTotalScoreDesc(member.getId())
                .map(RecordEnduranceResponse::from)
                .orElse(null);
    }

    // 전체 상세 내역 조회
    @Transactional(readOnly = true)
    public List<RecordEnduranceResponse> getDetailedHistory(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return enduranceRepository.findByMemberIdOrderByRecordDateDesc(member.getId())
                .stream().map(RecordEnduranceResponse::from).collect(Collectors.toList());
    }

    // 기록 삭제
    @Transactional
    public void deleteRecord(String loginId, Long recordId) {
        RecordEndurance record = enduranceRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기록입니다."));

        if (!record.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("자신의 기록만 삭제할 수 있습니다.");
        }

        enduranceRepository.delete(record);

        // 삭제 시 두 랭킹 모두 강등/동기화 진행
        enduranceRankingService.syncMainDistanceRankingOnRecordDelete(record.getMember());
        enduranceRankingService.syncMainTimeRankingOnRecordDelete(record.getMember());
    }
}