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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecordBeginnerService {

    private final RecordBeginnerRepository recordBeginnerRepository;
    private final MemberRepository memberRepository;
    private final BeginnerRankingService beginnerRankingService;

    // 기록 저장
    @Transactional
    public RecordBeginnerResponse saveRecord(String loginId, RecordBeginnerRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 변환 로직을 위해 DTO의 값을 가변 변수로 꺼냄
        boolean isSuccess = request.getIsSuccess();
        Integer maxHoldNo = request.getMaxHoldNo();
        AttemptType attemptType = request.getAttemptType();
        int totalHolds = request.getDifficulty().getHoldCount();

        // 총 홀드 수 도달 시 자동 성공 변환
        if (!isSuccess && maxHoldNo != null && maxHoldNo == totalHolds) {
            isSuccess = true;
            maxHoldNo = null;
            // 만약 왕복으로 신청했는데 꼭대기에서 떨어졌다면, '편도 성공'으로 취급
            if (attemptType == AttemptType.ROUND_TRIP) {
                attemptType = AttemptType.ONE_WAY;
            }
        }

        // 실패 시 홀드 번호 누락/오류 방지 검증
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
                // (동철 수정) 위에서 변환 처리한 attemptType 변수를 그대로 넣어줍니다.
                // (기존에 request.getAttemptType()으로 다시 덮어씌워서 변환 로직이 무시되는 버그 방지)
                .attemptType(attemptType) 
                .build();

        RecordBeginner savedRecord = recordBeginnerRepository.save(record);

        beginnerRankingService.updateBeginnerRanking(member, savedRecord);

        // (동철 수정) 불필요하게 두 번 save() 되던 코드를 하나로 깔끔하게 정리했습니다.
        return RecordBeginnerResponse.from(savedRecord);
    }

    // 난이도별 최고 기록 조회 (메모리 최적화 버전)
    @Transactional(readOnly = true)
    public List<RecordBeginnerResponse> getBestRecords(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        List<RecordBeginnerResponse> bestRecords = new ArrayList<>();

        for (Difficulty difficulty : Difficulty.values()) {
            // 쿼리 자체에서 AttemptTypeDesc(왕복 Z -> 편도 A 내림차순 정렬)를 걸면
            // DB가 알아서 동점일 때 왕복을 가장 위로 올려서 반환합니다. 데이터가 오염되지 않습니다.
            recordBeginnerRepository.findTopByMemberAndDifficultyOrderByIsSuccessDescMaxHoldNoDescAttemptTypeDesc(member, difficulty)
                    .ifPresent(record -> bestRecords.add(RecordBeginnerResponse.from(record)));
        }

        return bestRecords;
    }

    // 상세 내역 조회
    @Transactional(readOnly = true)
    public List<RecordBeginnerResponse> getDetailedHistory(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return recordBeginnerRepository.findByMemberIdOrderByRecordDateDesc(member.getId())
                .stream().map(RecordBeginnerResponse::from).collect(Collectors.toList());
    }

    // 기록 삭제 로직
    @Transactional
    public void deleteRecord(String loginId, Long recordId) {
        RecordBeginner record = recordBeginnerRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기록입니다."));

        // 내 기록이 맞는지 권한 체크 (팩트: 남의 기록을 지우면 대형 사고)
        if (!record.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("자신의 기록만 삭제할 수 있습니다.");
        }

        recordBeginnerRepository.delete(record);

        // 기록이 삭제되면 랭킹도 다시 산정해야 하므로, 랭킹 서비스에 해당 회원과 난이도를 알려서 랭킹을 동기화하도록 요청
        beginnerRankingService.syncRankingOnRecordDelete(record.getMember(), record.getDifficulty());
    }
}