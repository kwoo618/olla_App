package com.olla.olla_climbing.domain.member.service;

import com.olla.olla_climbing.domain.admin.service.GoogleSheetsService;
import com.olla.olla_climbing.domain.image.service.ImageService;
import com.olla.olla_climbing.domain.member.dto.request.MemberUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.request.NotificationUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.response.MemberResponse;
import com.olla.olla_climbing.domain.member.dto.response.NotificationResponse;
import com.olla.olla_climbing.domain.member.dto.response.OtherMemberProfileResponse;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberDetail;
import com.olla.olla_climbing.domain.member.entity.MemberPrivacy;
import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final GoogleSheetsService googleSheetsService;
    private final ImageService imageService;
    private final RankingRepository rankingRepository;

    @Transactional(readOnly = true)
    public boolean existsByLoginId(String loginId) {
        return memberRepository.findByLoginIdAndIsDeletedFalse(loginId).isPresent();
    }

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return memberRepository.existsByEmail(email);
    }

    @Transactional(readOnly = true)
    public boolean existsByPhone(String phone) {
        return memberRepository.existsByPhone(phone);
    }

    @Transactional(readOnly = true)
    public MemberResponse getMyInfo(String loginId) {
        Member member = memberRepository.findWithDetailsByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        return MemberResponse.from(member);
    }

    @Transactional
    public MemberResponse updateMyInfo(String loginId, MemberUpdateRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 해당 정보 수정은 관리자에게 요청해야 함
        updateProfileImage(member, request.getProfileImageUrl());
        updateMemberDetail(member, request);
        updateMemberPrivacy(member, request);

        Member savedMember = memberRepository.save(member);
        googleSheetsService.syncNewMember(savedMember);

        return MemberResponse.from(savedMember);
    }

    @Transactional
    public void updateMemberByAdmin(Long memberId, MemberUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 관리자만 이름, 전화번호, 성별, 생년월일 수정 가능
        member.updateBasicInfo(request.getName(), request.getPhone());
        member.updateAdditionalInfo(request.getGender(), resolveBirthDate(member, request));

        // 관리자 수정 시 구글 시트도 동기화
        googleSheetsService.syncNewMember(member);

        log.info("관리자 회원 정보 수정 완료: memberId={}", memberId);
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

        Long memberId = member.getId();

        rankingRepository.deleteAllByMember(member);

        member.withdraw();

        googleSheetsService.updateMembershipStatus(memberId, "EXPIRED");

        log.info("회원 탈퇴 완료: loginId={}", loginId);
    }

    @Transactional
    public void withdrawMemberById(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        rankingRepository.deleteAllByMember(member);

        member.withdraw();

        googleSheetsService.updateMembershipStatus(memberId, "EXPIRED");

        log.info("관리자 강제 탈퇴 완료: memberId={}", memberId);
    }

    @Transactional
    public void updateFcmToken(String loginId, String fcmToken) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));
        member.updateFcmToken(fcmToken);
        memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public NotificationResponse getNotificationSettings(String loginId) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));

        if (member.getNotificationSetting() == null) {
            return NotificationResponse.builder()
                    .isGlobalNotificationOn(true)
                    .isMembershipNotificationOn(true)
                    .isActivityNotificationOn(true)
                    .isCrewNotificationOn(true)
                    .isNoticeNotificationOn(true)
                    .build();
        }
        return NotificationResponse.from(member.getNotificationSetting());
    }

    @Transactional
    public NotificationResponse updateNotificationSettings(String loginId, NotificationUpdateRequest request) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));

        if (member.getNotificationSetting() == null) {
            member.assignNotificationSetting(new NotificationSetting(member));
        }

        member.getNotificationSetting().update(
                request.getIsGlobalNotificationOn(),
                request.getIsMembershipNotificationOn(),
                request.getIsActivityNotificationOn(),
                request.getIsCrewNotificationOn(),
                request.getIsNoticeNotificationOn()
        );

        return NotificationResponse.from(member.getNotificationSetting());
    }

    @Transactional
    public String updateProfileImage(String loginId, MultipartFile file) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));
        String imageUrl = imageService.uploadImage(file);
        member.updateProfileImage(imageUrl);
        return imageUrl;
    }

    @Transactional(readOnly = true)
    public boolean isPhoneAvailableForSignup(String phone) {
        return memberRepository.findByPhone(phone)
                .map(member -> StringUtils.hasText(member.getPassword()))
                .orElse(false);
    }

    // ── private 헬퍼 ─────────────────────────────────────────────

    private LocalDate resolveBirthDate(Member member, MemberUpdateRequest request) {
        return request.getBirthDate() != null ? request.getBirthDate() : member.getBirthDate();
    }

    private void updateProfileImage(Member member, String requestImageUrl) {
        if ("DEFAULT".equals(requestImageUrl)) {
            member.updateProfileImage(null);
        } else if (StringUtils.hasText(requestImageUrl)) {
            member.updateProfileImage(requestImageUrl);
        }
    }

    private void updateMemberDetail(Member member, MemberUpdateRequest request) {
        if (member.getMemberDetail() == null) {
            member.setMemberDetail(new MemberDetail(member));
        }
        member.getMemberDetail().update(
                request.getHeight(), request.getWeight(),
                request.getArmSpan(), request.getFootSize()
        );
    }

    private void updateMemberPrivacy(Member member, MemberUpdateRequest request) {
        if (member.getMemberPrivacy() == null) {
            member.setMemberPrivacy(new MemberPrivacy(member));
        }
        MemberPrivacy privacy = member.getMemberPrivacy();
        privacy.update(
                request.getIsPublicPhone() != null ? request.getIsPublicPhone() : privacy.isPhonePublic(),
                request.getIsEmailPublic() != null ? request.getIsEmailPublic() : privacy.isEmailPublic(),
                request.getIsHeightPublic() != null ? request.getIsHeightPublic() : privacy.isHeightPublic(),
                request.getIsWeightPublic() != null ? request.getIsWeightPublic() : privacy.isWeightPublic(),
                request.getIsArmSpanPublic() != null ? request.getIsArmSpanPublic() : privacy.isArmSpanPublic(),
                request.getIsFootSizePublic() != null ? request.getIsFootSizePublic() : privacy.isFootSizePublic()
        );
    }
}