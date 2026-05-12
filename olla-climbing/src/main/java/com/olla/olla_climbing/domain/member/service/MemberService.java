package com.olla.olla_climbing.domain.member.service;

import com.olla.olla_climbing.domain.admin.service.GoogleSheetsService;
import com.olla.olla_climbing.domain.community.repository.CommentRepository;
import com.olla.olla_climbing.domain.community.repository.PostParticipantRepository;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.dto.response.OtherMemberProfileResponse;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import com.olla.olla_climbing.domain.member.dto.request.NotificationUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.response.NotificationResponse;
import com.olla.olla_climbing.domain.member.dto.response.MemberResponse;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.global.exception.CustomException;
import com.olla.olla_climbing.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.olla.olla_climbing.domain.member.dto.request.MemberUpdateRequest;
import com.olla.olla_climbing.domain.member.entity.MemberDetail;
import com.olla.olla_climbing.domain.member.entity.MemberPrivacy;

import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final GoogleSheetsService googleSheetsService;

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostParticipantRepository postParticipantRepository;

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

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return memberRepository.existsByEmail(email); // 이메일 중복 확인용
    }

    @Transactional
    public void withdrawMember(String loginId) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND)); // 💡 1단계 예외 적용

        // 💡 [핵심] 커뮤니티 데이터 연쇄 삭제 (좀비 데이터 방지용 벌크 연산)
        postParticipantRepository.deleteByMemberId(member.getId()); // 모임 참가 내역 물리 삭제
        commentRepository.softDeleteByMemberId(member.getId());     // 댓글 소프트 삭제
        postRepository.softDeleteByMemberId(member.getId());        // 게시글 소프트 삭제

        member.withdraw(); // 엔티티 내부의 데이터 변조(Soft Delete) 로직 실행
        log.info("회원 탈퇴 완료 (연관 데이터 안전 삭제 처리됨): loginId={}", loginId);
    }

    @Transactional
    public void withdrawMemberById(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND)); // 💡 1단계 예외 적용

        // 💡 [핵심] 관리자 강제 탈퇴 시에도 연쇄 삭제 동일하게 적용
        postParticipantRepository.deleteByMemberId(member.getId());
        commentRepository.softDeleteByMemberId(member.getId());
        postRepository.softDeleteByMemberId(member.getId());

        member.withdraw();
        log.info("관리자에 의한 회원 강제 탈퇴 완료 (연관 데이터 안전 삭제 처리됨): {}", memberId);
    }

    @Transactional
    public void updateFcmToken(String loginId, String fcmToken) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));
        member.updateFcmToken(fcmToken);
    }

    @Transactional
    public NotificationResponse updateNotificationSettings(String loginId, NotificationUpdateRequest request) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));

        // 💡 팩트 체크: NotificationSetting.java의 update는 5개의 인자를 받습니다.
        member.getNotificationSetting().update(
                request.getIsGlobalNotificationOn(),
                request.getIsMembershipNotificationOn(),
                request.getIsActivityNotificationOn(),
                request.getIsCrewNotificationOn(),
                request.getIsNoticeNotificationOn()
        );

        return NotificationResponse.from(member.getNotificationSetting());
    }

    @Transactional(readOnly = true)
    public NotificationResponse getNotificationSettings(String loginId) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));

        return NotificationResponse.from(member.getNotificationSetting());
    }

    @Transactional(readOnly = true)
    public boolean existsByPhone(String phone) {
        return memberRepository.existsByPhone(phone);
    }
}