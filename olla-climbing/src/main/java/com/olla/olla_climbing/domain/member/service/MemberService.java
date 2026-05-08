package com.olla.olla_climbing.domain.member.service;

import com.olla.olla_climbing.domain.admin.service.GoogleSheetsService;
import com.olla.olla_climbing.domain.member.dto.response.OtherMemberProfileResponse;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import com.olla.olla_climbing.domain.member.dto.request.AlertUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.response.AlertResponse;
import com.olla.olla_climbing.domain.member.dto.response.MemberResponse;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.olla.olla_climbing.domain.member.dto.request.MemberUpdateRequest;
import com.olla.olla_climbing.domain.member.entity.MemberDetail;
import com.olla.olla_climbing.domain.member.entity.MemberPrivacy;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final GoogleSheetsService googleSheetsService;

    // 회원가입 화면에서 DB 아이디 중복 확인 로직 (동철 수정)
    @Transactional(readOnly = true)
    public boolean existsByLoginId(String loginId) {
        return memberRepository.findByLoginIdAndIsDeletedFalse(loginId).isPresent();
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
        if (request.getBirthDate() != null) {
            parsedBirthDate = request.getBirthDate();
        }
        member.updateAdditionalInfo(request.getGender(), parsedBirthDate);

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

       //  상세 정보 수정 로직 통합 (수정할때 데이터 꼬일 수 있어서 수정)
        if (member.getMemberDetail() == null) {
            member.setMemberDetail(new MemberDetail(member));
        }
        member.getMemberDetail().update(
                request.getHeight(), request.getWeight(),
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

    @Transactional
    public void updateMemberByAdmin(Long memberId, MemberUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        member.updateBasicInfo(request.getName(), request.getPhone());

        LocalDate parsedBirthDate = request.getBirthDate() != null ? request.getBirthDate() : member.getBirthDate();
        member.updateAdditionalInfo(request.getGender(), parsedBirthDate);

        log.info("관리자가 회원 정보 수정 완료: {}", member.getId());

        // googleSheetsService.updateMemberRow(member);
    }

    @Transactional(readOnly = true)
    public OtherMemberProfileResponse getOtherMemberProfile(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        if (member.isDeleted()) {
            throw new IllegalArgumentException("탈퇴한 회원의 정보는 조회할 수 없습니다.");
        }

        return OtherMemberProfileResponse.of(member);
    }

    @Transactional
    public void withdrawMember(String loginId) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 이미 탈퇴한 회원입니다."));

        // 엔티티 내부의 withdraw() 호출 (isDeleted = true, loginId/phone 변조 수행)
        member.withdraw();
        log.info("회원 탈퇴 완료: {}", member.getId());
    }
}