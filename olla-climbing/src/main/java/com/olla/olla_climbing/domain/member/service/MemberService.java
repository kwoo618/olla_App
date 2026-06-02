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
        // N+1 방지를 위해 detail, privacy, notificationSetting 을 한 번의 쿼리로 함께 조회
        Member member = memberRepository.findWithDetailsByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        return MemberResponse.from(member);
    }

    @Transactional
    public MemberResponse updateMyInfo(String loginId, MemberUpdateRequest request) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        member.updateBasicInfo(request.getName(), request.getPhone());
        member.updateAdditionalInfo(request.getGender(), resolveBirthDate(member, request));
        updateProfileImage(member, request.getProfileImageUrl());
        updateMemberDetail(member, request);
        updateMemberPrivacy(member, request);

        memberRepository.save(member);

        // 이름/연락처/암벽화사이즈 등 시트에 반영되는 정보가 변경될 수 있으므로 동기화
        googleSheetsService.syncNewMember(member);

        return MemberResponse.from(member);
    }

    @Transactional
    public void updateMemberByAdmin(Long memberId, MemberUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        member.updateBasicInfo(request.getName(), request.getPhone());
        member.updateAdditionalInfo(request.getGender(), resolveBirthDate(member, request));

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
        member.withdraw();
        log.info("회원 탈퇴 완료: loginId={}", loginId);
    }

    @Transactional
    public void withdrawMemberById(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        member.withdraw();
        log.info("관리자 강제 탈퇴 완료: memberId={}", memberId);
    }

    @Transactional
    public void updateFcmToken(String loginId, String fcmToken) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));
        member.updateFcmToken(fcmToken);
        memberRepository.save(member); // 더티체킹 의존 대신 명시적 저장
    }

    @Transactional(readOnly = true)
    public NotificationResponse getNotificationSettings(String loginId) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));

        if (member.getNotificationSetting() == null) {
            // 설정이 없으면 기본값(전체 ON) 반환
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

    // 오프라인(비밀번호 없음) 회원은 중복으로 보지 않아 O2O 연동 가입 허용
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