package com.olla.olla_climbing.domain.member.service;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.dto.response.MemberResponse;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.olla.olla_climbing.domain.member.dto.request.MemberUpdateRequest;
import com.olla.olla_climbing.domain.member.MemberDetail;
import com.olla.olla_climbing.domain.member.MemberPrivacy;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;

    // Transactional(readOnly = true) -> 데이터 조회 시 성능 최적화, 트랜잭션 관리
    @Transactional(readOnly = true)
    public MemberResponse getMyInfo(String loginId) {
        // 1. 로그인 ID로 회원 조회 (없으면 예외 발생)
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 2. 엔티티를 DTO로 변환하여 반환
        return MemberResponse.from(member);
    }

    @Transactional // 더티 체킹을 위해 반드시 필요! (readOnly = true 쓰면 안 됨)
    public MemberResponse updateMyInfo(String loginId, MemberUpdateRequest request) {
        // 1. 회원 조회 (영속성 컨텍스트에 올라감 = JPA가 지켜보기 시작함)
        // JPA가 지켜보기 시작하게 하는 코드(영속성 컨텍스트에 올라감) : findById, findByLoginId 등으로 조회해서 엔티티 객체를 가져오는 것
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 2. 기본 정보 수정 (null 체크는 엔티티 안에서 함)
        member.updateBasicInfo(request.getName(), request.getPhone());

        // 3. 상세 정보 수정 (처음 입력하는 거라면 객체를 새로 만들어줘야 함)
        if (member.getMemberDetail() == null) {
            MemberDetail newDetail = new MemberDetail(member);
            newDetail.update(request.getAge(), request.getHeight(), request.getWeight(), request.getArmSpan(), request.getFootSize());
            member.setMemberDetail(newDetail);
            // 연관관계 편의 메서드나 양방향 매핑 설정에 따라 다를 수 있지만,
            // CascadeType.ALL이 걸려있으므로 이렇게만 둬도 저장이 됨 (나중에 보완)
            // cascade 옵션이 없으면, memberRepository.save(member)로 저장할 때, memberDetail도 같이 저장되도록 설정해야 함 (save 호출 필요)
        } else {
            member.getMemberDetail().update(request.getAge(), request.getHeight(), request.getWeight(), request.getArmSpan(), request.getFootSize());
        }

        // 4. 공개 설정 수정
        if (member.getMemberPrivacy() == null) {
            MemberPrivacy newPrivacy = new MemberPrivacy(member);
            newPrivacy.update(request.getIsPublicPhone(), request.getIsEmailPublic(), request.getIsHeightPublic(), request.getIsWeightPublic(), request.getIsArmSpanPublic(), request.getIsFootSizePublic());
            member.setMemberPrivacy(newPrivacy);
        } else {
            member.getMemberPrivacy().update(request.getIsPublicPhone(), request.getIsEmailPublic(), request.getIsHeightPublic(), request.getIsWeightPublic(), request.getIsArmSpanPublic(), request.getIsFootSizePublic());
        }

        // 5. DB 저장(save) 명령어 없음! @Transactional이 끝나면 알아서 UPDATE 됨 (Dirty Checking)

        // 6. 수정된 결과를 다시 DTO로 만들어서 반환
        return MemberResponse.from(member);
    }
}