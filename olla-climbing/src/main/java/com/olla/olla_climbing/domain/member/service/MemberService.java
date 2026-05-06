package com.olla.olla_climbing.domain.member.service;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import com.olla.olla_climbing.domain.member.dto.request.AlertUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.response.AlertResponse;
import com.olla.olla_climbing.domain.member.dto.response.MemberResponse;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.olla.olla_climbing.domain.member.dto.request.MemberUpdateRequest;
import com.olla.olla_climbing.domain.member.entity.MemberDetail;
import com.olla.olla_climbing.domain.member.entity.MemberPrivacy;
import org.springframework.util.StringUtils;

// 💡 (동철 수정) 날짜 처리에 필요한 클래스 임포트 추가
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;

    // 회원가입 화면에서 DB 아이디 중복 확인 로직 (동철 수정)
    @Transactional(readOnly = true)
    public boolean existsByLoginId(String loginId) {
        return memberRepository.findByLoginId(loginId).isPresent();
    }

    // Transactional(readOnly = true) -> 데이터 조회 시 성능 최적화, 트랜잭션 관리
    @Transactional(readOnly = true)
    public MemberResponse getMyInfo(String loginId) {
        // 1. 회원 조회
        // N+1 방지를 위해 @EntityGraph가 적용된 쿼리를 사용합니다.
        // 이제 member, detail, privacy, notification 테이블을 JOIN해서 쿼리 1방에 가져옵니다.
        Member member = memberRepository.findWithDetailsByLoginId(loginId)
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

        // (동철 수정) 에러 유발하던 중복 로직 및 파라미터 불일치 코드 정리
        member.updateBasicInfo(request.getName(), request.getPhone());

        LocalDate parsedBirthDate = member.getBirthDate();
        // 날짜 파싱 로직
        if (request.getBirthDate() != null && !request.getBirthDate().trim().isEmpty()) {
            try {
                parsedBirthDate = LocalDate.parse(request.getBirthDate().trim());
            } catch (DateTimeParseException e) {
                // 에러 시 로그만 남기고 기존 값을 유지하거나 적절한 처리를 함
                System.out.println("날짜 파싱 에러: " + request.getBirthDate());
            }
        }

        member.updateAdditionalInfo(request.getGender(), parsedBirthDate);

        // 프로필 이미지 처리 로직 고도화
        String requestImageUrl = request.getProfileImageUrl();

        if ("DEFAULT".equals(requestImageUrl)) {
            // 프론트에서 "DEFAULT"라는 문자열을 보내면 사진 삭제(기본 이미지로 변경) 신호로 간주
            member.updateProfileImage(null); // DB 컬럼을 null로 비움
        } else if (org.springframework.util.StringUtils.hasText(requestImageUrl)) {
            // 실제 S3 URL 값이 넘어오면 해당 주소로 업데이트
            member.updateProfileImage(requestImageUrl);
        }

        // 3. 상세 정보 수정 (처음 입력하는 거라면 객체를 새로 만들어줘야 함)
        /* if (member.getMemberDetail() == null) {
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
        */ 

       //  상세 정보 수정 로직 통합 (수정할때 데이터 꼬일 수 있어서 수정)
        if (member.getMemberDetail() == null) {
            member.setMemberDetail(new MemberDetail(member));
        }
        member.getMemberDetail().update(
            request.getAge(), request.getHeight(), request.getWeight(), 
            request.getArmSpan(), request.getFootSize()
        );

        //  공개 설정 수정 - Boolean null 체크 추가 (데이터 유실 방지)
        if (member.getMemberPrivacy() == null) {
            member.setMemberPrivacy(new MemberPrivacy(member));
        }
        
        member.getMemberPrivacy().update(
            request.getIsPublicPhone() != null ? request.getIsPublicPhone() : member.getMemberPrivacy().isPhonePublic(),
            request.getIsEmailPublic() != null ? request.getIsEmailPublic() : member.getMemberPrivacy().isEmailPublic(),
            request.getIsHeightPublic() != null ? request.getIsHeightPublic() : member.getMemberPrivacy().isHeightPublic(),
            request.getIsWeightPublic() != null ? request.getIsWeightPublic() : member.getMemberPrivacy().isWeightPublic(),
            request.getIsArmSpanPublic() != null ? request.getIsArmSpanPublic() : member.getMemberPrivacy().isArmSpanPublic(),
            request.getIsFootSizePublic() != null ? request.getIsFootSizePublic() : member.getMemberPrivacy().isFootSizePublic()
        );

        // 5. DB 저장(save) 명령어 없음! @Transactional이 끝나면 알아서 UPDATE 됨 (Dirty Checking)
        memberRepository.save(member);

        // 6. 수정된 결과를 다시 DTO로 만들어서 반환
        return MemberResponse.from(member);
    }

    // 알림 설정 업데이트 비즈니스 로직
    @Transactional
    public AlertResponse updateAlertSettings(String loginId, AlertUpdateRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        if (member.getNotificationSetting() == null) {
            // 최초 설정 시
            NotificationSetting newSetting = new NotificationSetting(member);
            newSetting.update(
                    request.getIsGlobalAlertOn(), request.getIsMembershipWeekBeforeAlertOn(),
                    request.getIsMembershipDayBeforeAlertOn(), request.getIsMembershipExpiredAlertOn(),
                    request.getIsNoticeAlertOn(), request.getIsCrewParticipantChangeAlertOn(),
                    request.getIsCrewMeetingReminderAlertOn(), request.getIsRankingChangeAlertOn(),
                    request.getIsWeeklyReportAlertOn(), request.getIsInactivityAlertOn(),
                    request.getInactivityDays()
            );
            member.setNotificationSetting(newSetting);
        } else {
            // 기존 설정 변경 시
            member.getNotificationSetting().update(
                    request.getIsGlobalAlertOn(), request.getIsMembershipWeekBeforeAlertOn(),
                    request.getIsMembershipDayBeforeAlertOn(), request.getIsMembershipExpiredAlertOn(),
                    request.getIsNoticeAlertOn(), request.getIsCrewParticipantChangeAlertOn(),
                    request.getIsCrewMeetingReminderAlertOn(), request.getIsRankingChangeAlertOn(),
                    request.getIsWeeklyReportAlertOn(), request.getIsInactivityAlertOn(),
                    request.getInactivityDays()
            );
        }

        // 업데이트된 결과를 DTO로 변환하여 반환
        return AlertResponse.from(member.getNotificationSetting());
    }

    // 관리자 페이지에서 회원 정보 수정 로직 추가 - 이름, 전화번호, 성별, 생년월일 자유롭게 수정 가능
    @Transactional
    public void updateMemberByAdmin(Long memberId, MemberUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 관리자는 이름, 전화번호, 성별, 생년월일을 자유롭게 수정 가능해야 함
        member.updateBasicInfo(request.getName(), request.getPhone());

        // 생년월일 파싱 및 추가 정보 업데이트
        LocalDate parsedBirthDate = null;
        if (StringUtils.hasText(request.getBirthDate())) {
            try {
                parsedBirthDate = LocalDate.parse(request.getBirthDate().trim());
            } catch (Exception e) {
                // 파싱 실패 시 기존 값 유지
                parsedBirthDate = member.getBirthDate();
            }
        }
        member.updateAdditionalInfo(request.getGender(), parsedBirthDate);

        // Dirty Checking에 의해 별도의 save 없이 트랜잭션 종료 시 업데이트됨
    }
}