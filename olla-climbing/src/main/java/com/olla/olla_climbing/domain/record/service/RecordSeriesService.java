package com.olla.olla_climbing.domain.record.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.ranking.service.SeriesRankingService;
import com.olla.olla_climbing.domain.record.dto.request.RecordSeriesRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordSeriesResponse;
import com.olla.olla_climbing.domain.record.entity.RecordSeries;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import com.olla.olla_climbing.domain.record.repository.RecordSeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecordSeriesService {

    private final RecordSeriesRepository recordSeriesRepository;
    private final MemberRepository memberRepository;
    private final SeriesRankingService seriesRankingService;

    @Transactional
    public RecordSeriesResponse saveRecord(String loginId, RecordSeriesRequest request) {
        Member member = findMember(loginId);

        List<Difficulty> sequence = request.getSequenceLog();
        double totalScore = calculateTotalScore(sequence);

        RecordSeries record = RecordSeries.builder()
                .member(member)
                .sequenceLog(sequence)
                .totalScore(totalScore)
                .recordDate(request.getRecordDate())
                .build();

        RecordSeries savedRecord = recordSeriesRepository.save(record);
        seriesRankingService.updateBeginnerSeriesRanking(member, savedRecord.getTotalScore());

        return RecordSeriesResponse.from(savedRecord);
    }

    @Transactional(readOnly = true)
    public RecordSeriesResponse getBestRecord(String loginId) {
        Member member = findMember(loginId);
        return recordSeriesRepository.findTopByMemberIdOrderByTotalScoreDesc(member.getId())
                .map(RecordSeriesResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<RecordSeriesResponse> getDetailedHistory(String loginId) {
        Member member = findMember(loginId);
        return recordSeriesRepository.findByMemberIdOrderByRecordDateDesc(member.getId())
                .stream().map(RecordSeriesResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public void deleteRecord(String loginId, Long recordId) {
        RecordSeries record = recordSeriesRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기록입니다."));

        if (!record.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("자신의 기록만 삭제할 수 있습니다.");
        }

        recordSeriesRepository.delete(record);
        seriesRankingService.syncSeriesRankingOnRecordDelete(record.getMember());
    }

    // ── private 헬퍼 ─────────────────────────────────────────────

    private Member findMember(String loginId) {
        return memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
    }

    // 공식: 난이도 기초점수 × (1 + 순서 × 0.1), 소수점 1자리 반올림
    private double calculateTotalScore(List<Difficulty> sequence) {
        double total = 0.0;
        for (int i = 0; i < sequence.size(); i++) {
            total += sequence.get(i).getBaseScore() * (1.0 + i * 0.1);
        }
        return Math.round(total * 10.0) / 10.0;
    }
}