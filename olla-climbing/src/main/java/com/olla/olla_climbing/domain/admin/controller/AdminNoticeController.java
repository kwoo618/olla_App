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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin/notices")
@RequiredArgsConstructor
@Tag(name = "Admin Notice API")
public class AdminNoticeController {

    private final NoticeService noticeService;

    @GetMapping
    @Operation(summary = "공지사항 목록 조회")
    public ResponseEntity<ApiResponse<Page<NoticeResponse>>> getNotices(
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(noticeService.getNotices(pageable)));
    }

    @GetMapping("/{noticeId}")
    @Operation(summary = "공지사항 상세 조회")
    public ResponseEntity<ApiResponse<NoticeResponse>> getNotice(@PathVariable Long noticeId) {
        return ResponseEntity.ok(ApiResponse.success(noticeService.getNotice(noticeId)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "공지사항 작성", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<NoticeResponse>> createNotice(
            @AuthenticationPrincipal Member member,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @Valid @RequestPart(value = "request") NoticeCreateRequest request) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(noticeService.createNotice(member.getLoginId(), request, file)));
    }

    @PutMapping("/{noticeId}")
    @Operation(summary = "공지사항 수정", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<NoticeResponse>> updateNotice(
            @AuthenticationPrincipal Member member,
            @PathVariable Long noticeId,
            @Valid @RequestBody NoticeUpdateRequest request) {
        if (member == null) throw new IllegalArgumentException("인증 권한이 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(noticeService.updateNotice(noticeId, request)));
    }

    @DeleteMapping("/{noticeId}")
    @Operation(summary = "공지사항 삭제", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> deleteNotice(
            @AuthenticationPrincipal Member member,
            @PathVariable Long noticeId) {
        if (member == null) throw new IllegalArgumentException("인증 권한이 없습니다.");
        noticeService.deleteNotice(noticeId);
        return ResponseEntity.ok(ApiResponse.success(200, "공지사항이 삭제되었습니다.", null));
    }
}