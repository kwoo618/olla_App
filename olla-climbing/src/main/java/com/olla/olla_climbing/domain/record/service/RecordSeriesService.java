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
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        List<Difficulty> sequence = request.getSequenceLog();
        double calculatedTotalScore = 0.0;

        // 공식: 해당 난이도 점수 × {1 + (순서 - 1) × 0.1}
        for (int i = 0; i < sequence.size(); i++) {
            Difficulty difficulty = sequence.get(i);
            int baseScore = difficulty.getBaseScore();
            double multiplier = 1.0 + (i * 0.1); // 순서는 0번 인덱스부터 시작하므로 그대로 i 사용
            calculatedTotalScore += (baseScore * multiplier);
        }

        // 소수점 첫째 자리까지만 유지되도록 반올림
        calculatedTotalScore = Math.round(calculatedTotalScore * 10.0) / 10.0;

        RecordSeries record = RecordSeries.builder()
                .member(member)
                .sequenceLog(sequence)
                .totalScore(calculatedTotalScore)
                .recordDate(request.getRecordDate())
                .build();

        RecordSeries savedRecord = recordSeriesRepository.save(record);

        seriesRankingService.updateBeginnerSeriesRanking(member, savedRecord.getTotalScore());

        return RecordSeriesResponse.from(recordSeriesRepository.save(record));
    }

    @Transactional(readOnly = true)
    public RecordSeriesResponse getBestRecord(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return recordSeriesRepository.findTopByMemberIdOrderByTotalScoreDesc(member.getId())
                .map(RecordSeriesResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<RecordSeriesResponse> getDetailedHistory(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

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
}