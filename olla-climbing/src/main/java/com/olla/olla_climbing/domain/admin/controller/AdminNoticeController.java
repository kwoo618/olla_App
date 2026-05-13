package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.NoticeCreateRequest;
import com.olla.olla_climbing.domain.admin.dto.request.NoticeUpdateRequest;
import com.olla.olla_climbing.domain.admin.dto.response.NoticeResponse;
import com.olla.olla_climbing.domain.admin.service.NoticeService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

@RestController
@RequestMapping("/api/v1/admin/notices")
@RequiredArgsConstructor
@Tag(name = "Admin Notice API")
public class AdminNoticeController {

    private final NoticeService noticeService;

    @GetMapping
    @Operation(summary = "공지사항 목록 조회")
    public ResponseEntity<ApiResponse<Page<NoticeResponse>>> getNotices(@PageableDefault(size = 10) Pageable pageable) {
        Page<NoticeResponse> response = noticeService.getNotices(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{noticeId}")
    @Operation(summary = "공지사항 상세 조회")
    public ResponseEntity<ApiResponse<NoticeResponse>> getNotice(@PathVariable("noticeId") Long noticeId) {
        NoticeResponse response = noticeService.getNotice(noticeId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    @Operation(summary = "공지사항 작성", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<NoticeResponse>> createNotice(
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody NoticeCreateRequest request) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        NoticeResponse response = noticeService.createNotice(member.getLoginId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{noticeId}")
    @Operation(summary = "공지사항 수정", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<NoticeResponse>> updateNotice(
            @AuthenticationPrincipal Member member,
            @PathVariable("noticeId") Long noticeId,
            @Valid @RequestBody NoticeUpdateRequest request) {
        if (member == null) throw new IllegalArgumentException("인증 권한이 없습니다.");
        NoticeResponse response = noticeService.updateNotice(noticeId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{noticeId}")
    @Operation(summary = "공지사항 삭제", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<String>> deleteNotice(
            @AuthenticationPrincipal Member member,
            @PathVariable("noticeId") Long noticeId) {
        if (member == null) throw new IllegalArgumentException("인증 권한이 없습니다.");
        noticeService.deleteNotice(noticeId);
        return ResponseEntity.ok(ApiResponse.success("공지사항이 삭제되었습니다."));
    }
}