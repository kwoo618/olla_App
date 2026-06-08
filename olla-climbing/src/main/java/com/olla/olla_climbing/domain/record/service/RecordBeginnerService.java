package com.olla.olla_climbing.domain.record.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.ranking.service.BeginnerRankingService;
import com.olla.olla_climbing.domain.record.dto.request.RecordBeginnerRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordBeginnerResponse;
import com.olla.olla_climbing.domain.record.entity.RecordBeginner;
import com.olla.olla_climbing.domain.record.enums.AttemptType;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import com.olla.olla_climbing.domain.record.repository.RecordBeginnerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecordBeginnerService {

    private final RecordBeginnerRepository recordBeginnerRepository;
    private final MemberRepository memberRepository;
    private final BeginnerRankingService beginnerRankingService;

    @Transactional
    public RecordBeginnerResponse saveRecord(String loginId, RecordBeginnerRequest request) {
        Member member = findMember(loginId);

        boolean isSuccess = request.getIsSuccess();
        Integer maxHoldNo = request.getMaxHoldNo();
        AttemptType attemptType = request.getAttemptType();
        int totalHolds = request.getDifficulty().getHoldCount();

        // 마지막 홀드 도달 시 자동 성공 처리
        if (!isSuccess && maxHoldNo != null && maxHoldNo == totalHolds) {
            isSuccess = true;
            maxHoldNo = null;
            if (attemptType == AttemptType.ROUND_TRIP) {
                attemptType = AttemptType.ONE_WAY;
            }
        }

        if (!isSuccess) {
            if (maxHoldNo == null) {
                throw new IllegalArgumentException("실패 기록에는 도달한 홀드 번호가 필수입니다.");
            }
            if (maxHoldNo > totalHolds || maxHoldNo <= 0) {
                throw new IllegalArgumentException("입력한 홀드 번호가 해당 난이도의 전체 홀드 수 범위를 벗어납니다.");
            }
        }

        RecordBeginner record = RecordBeginner.builder()
                .member(member)
                .difficulty(request.getDifficulty())
                .isSuccess(isSuccess)
                .maxHoldNo(maxHoldNo)
                .recordDate(request.getRecordDate())
                .attemptType(attemptType)
                .build();

        RecordBeginner savedRecord = recordBeginnerRepository.save(record);
        beginnerRankingService.updateBeginnerRanking(member, savedRecord);

        return RecordBeginnerResponse.from(savedRecord);
    }

    @Transactional(readOnly = true)
    public List<RecordBeginnerResponse> getBestRecords(String loginId) {
        Member member = findMember(loginId);

        // 성공 기록 한 번에 조회
        List<RecordBeginner> successRecords = recordBeginnerRepository
                .findBestSuccessRecordsByMember(member);

        Map<Difficulty, RecordBeginner> successMap = successRecords.stream()
                .collect(Collectors.toMap(RecordBeginner::getDifficulty, r -> r));

        List<RecordBeginnerResponse> bestRecords = new ArrayList<>();

        for (Difficulty difficulty : Difficulty.values()) {
            if (successMap.containsKey(difficulty)) {
                // 성공 기록 있으면 사용
                bestRecords.add(RecordBeginnerResponse.from(successMap.get(difficulty)));
            } else {
                // 성공 기록 없으면 최고 홀드 기록 조회 (fallback - 난이도별 1개 쿼리)
                recordBeginnerRepository
                        .findTopByMemberAndDifficultyOrderByIsSuccessDescMaxHoldNoDescAttemptTypeDesc(
                                member, difficulty)
                        .ifPresent(record -> bestRecords.add(RecordBeginnerResponse.from(record)));
            }
        }

        return bestRecords;
    }

    @Transactional(readOnly = true)
    public List<RecordBeginnerResponse> getDetailedHistory(String loginId) {
        Member member = findMember(loginId);
        return recordBeginnerRepository.findByMemberIdOrderByRecordDateDesc(member.getId())
                .stream().map(RecordBeginnerResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public void deleteRecord(String loginId, Long recordId) {
        RecordBeginner record = recordBeginnerRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기록입니다."));

        if (!record.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("자신의 기록만 삭제할 수 있습니다.");
        }

        recordBeginnerRepository.delete(record);
        beginnerRankingService.syncRankingOnRecordDelete(record.getMember(), record.getDifficulty());
    }

    private Member findMember(String loginId) {
        return memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
    }
}