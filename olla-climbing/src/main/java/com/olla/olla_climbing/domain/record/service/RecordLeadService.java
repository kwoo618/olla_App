package com.olla.olla_climbing.domain.record.service;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.record.dto.request.RecordLeadRequest;
import com.olla.olla_climbing.domain.record.dto.response.RecordLeadResponse;
import com.olla.olla_climbing.domain.record.entity.RecordLead;
import com.olla.olla_climbing.domain.record.enums.AttemptType;
import com.olla.olla_climbing.domain.record.repository.RecordLeadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
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

        // 변환 로직을 위해 DTO의 값을 가변 변수로 꺼냄
        boolean isSuccess = request.getIsSuccess();
        Integer maxHoldNo = request.getMaxHoldNo();
        AttemptType attemptType = request.getAttemptType();
        int totalHolds = request.getDifficulty().getHoldCount();

        // [핵심] 총 홀드 수 도달 시 자동 성공 변환
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

        RecordLead record = RecordLead.builder()
                .member(member)
                .difficulty(request.getDifficulty())
                .attemptType(attemptType)
                .isSuccess(isSuccess)
                .maxHoldNo(maxHoldNo)
                .recordDate(request.getRecordDate())
                .build();

        return RecordLeadResponse.from(recordLeadRepository.save(record));
    }

    @Transactional(readOnly = true)
    public List<RecordLeadResponse> getBestRecords(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 서버 메모리를 쓰지 않고, 1등 데이터만 DB에서 바로 가져옴
        // 기존에는 모든 기록을 가져와서 자바 스트림으로 난이도별 최고 기록을 뽑아냈지만, 이제는 DB에서 난이도별 최고 기록만 가져오는 최적화된 쿼리를 사용
        // 이유: DB를 사용하면 인덱스 활용과 정렬, 그룹핑이 가능해서 훨씬 빠르게 결과를 얻을 수 있음. 반면에 자바 스트림으로 모든 데이터를 처리하면 메모리 사용량이 많아지고, 데이터가 많아질수록 성능이 급격히 떨어짐
        List<RecordLead> bestRecords = recordLeadRepository.findBestRecordsByMemberIdOptimized(member.getId());

        return bestRecords.stream()
                .map(RecordLeadResponse::from)
                .collect(Collectors.toList());
    }

    // 상세 내역 조회
    @Transactional(readOnly = true)
    public List<RecordLeadResponse> getDetailedHistory(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return recordLeadRepository.findByMemberIdOrderByRecordDateDesc(member.getId())
                .stream().map(RecordLeadResponse::from).collect(Collectors.toList());
    }

    // 기록 삭제 로직
    @Transactional
    public void deleteRecord(String loginId, Long recordId) {
        RecordLead record = recordLeadRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기록입니다."));

        // 내 기록이 맞는지 권한 체크 (팩트: 남의 기록을 지우면 대형 사고)
        if (!record.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("자신의 기록만 삭제할 수 있습니다.");
        }

        recordLeadRepository.delete(record);
    }
}