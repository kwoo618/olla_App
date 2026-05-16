package com.olla.olla_climbing.domain.member.controller;

import com.olla.olla_climbing.domain.member.dto.request.FcmTokenRequest;
import com.olla.olla_climbing.domain.member.dto.request.MemberUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.request.NotificationUpdateRequest;
import com.olla.olla_climbing.domain.member.dto.response.MemberResponse;
import com.olla.olla_climbing.domain.member.dto.response.NotificationResponse;
import com.olla.olla_climbing.domain.member.dto.response.OtherMemberProfileResponse;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.service.MemberService;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping("/me")
    @Operation(summary = "내 프로필 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<MemberResponse>> getMemberProfile(@AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        MemberResponse response = memberService.getMyInfo(member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "프로필 조회 성공", response));
    }

    @PatchMapping("/me/info")
    @Operation(summary = "내 정보 수정", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> updateMemberInfo(
            @AuthenticationPrincipal Member member,
            @RequestBody MemberUpdateRequest request) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        memberService.updateMyInfo(member.getLoginId(), request);
        return ResponseEntity.ok(ApiResponse.success(200, "내 정보가 수정되었습니다.", null));
    }

    @GetMapping("/me/notifications/settings")
    @Operation(summary = "내 알림 설정 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<NotificationResponse>> getNotificationSettings(@AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        NotificationResponse response = memberService.getNotificationSettings(member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "알림 설정 조회 성공", response));
    }

    @PatchMapping("/me/notifications/settings")
    @Operation(summary = "내 알림 설정 수정", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<NotificationResponse>> updateNotificationSettings(
            @AuthenticationPrincipal Member member,
            @RequestBody NotificationUpdateRequest request) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        NotificationResponse response = memberService.updateNotificationSettings(member.getLoginId(), request);
        return ResponseEntity.ok(ApiResponse.success(200, "알림 설정이 수정되었습니다.", response));
    }

    @GetMapping("/{memberId}/profile")
    @Operation(summary = "타 회원 프로필 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<OtherMemberProfileResponse>> getOtherMemberProfile(@PathVariable("memberId") Long memberId) {
        OtherMemberProfileResponse response = memberService.getOtherMemberProfile(memberId);
        return ResponseEntity.ok(ApiResponse.success(200, "타 회원 프로필 조회 성공", response));
    }

    @DeleteMapping("/me")
    @Operation(summary = "회원 탈퇴", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> withdrawMember(@AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        memberService.withdrawMember(member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "회원 탈퇴가 정상적으로 처리되었습니다.", null));
    }

    @PostMapping("/me/fcm-token")
    @Operation(summary = "FCM 토큰 저장", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> updateFcmToken(
            @AuthenticationPrincipal Member member,
            @RequestBody FcmTokenRequest request) {
        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");
        memberService.updateFcmToken(member.getLoginId(), request.getToken());
        return ResponseEntity.ok(ApiResponse.success(200, "FCM 토큰이 갱신되었습니다.", null));
    }

    @PostMapping(value = "/me/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "프로필 이미지 업로드 (S3)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<String>> uploadProfileImage(
            @AuthenticationPrincipal Member member,
            @RequestPart("image") MultipartFile image) { // 프론트에서 body: image 로 보냄

        if (member == null) throw new IllegalArgumentException("로그인 인증 정보가 없습니다.");

        String imageUrl = memberService.updateProfileImage(member.getLoginId(), image);

        // 프론트 요청대로 data 안에 profileImageUrl(문자열)을 그대로 내려줍니다.
        return ResponseEntity.ok(ApiResponse.success(200, "프로필 이미지가 성공적으로 업로드되었습니다.", imageUrl));
    }
}