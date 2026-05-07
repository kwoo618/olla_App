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
            double multiplier = 1.0 + (i * 0.1); 
            calculatedTotalScore += (baseScore * multiplier);
        }

        calculatedTotalScore = Math.round(calculatedTotalScore * 10.0) / 10.0;

        RecordSeries record = RecordSeries.builder()
                .member(member)
                .sequenceLog(sequence)
                .totalScore(calculatedTotalScore)
                .recordDate(request.getRecordDate())
                .build();

        // (동철 수정) 1. 기록을 한 번만 저장
        RecordSeries savedRecord = recordSeriesRepository.save(record);

        // (동철 수정) 2. 에러 해결: 기존 메서드 사양에 맞춰 인자를 2개(member, score)로 수정
        // 💡 주의: 이 메서드가 내부에서 'SERIES' 타입으로 저장하고 있는지 확인이 필요합니다.
        seriesRankingService.updateBeginnerSeriesRanking(member, savedRecord.getTotalScore());

        // (동철 수정) 3. 중복 저장 제거 및 savedRecord 반환
        return RecordSeriesResponse.from(savedRecord);
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