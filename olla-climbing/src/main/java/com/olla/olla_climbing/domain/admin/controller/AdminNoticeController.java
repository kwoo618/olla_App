package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.request.NoticeCreateRequest;
import com.olla.olla_climbing.domain.admin.dto.request.NoticeUpdateRequest;
import com.olla.olla_climbing.domain.admin.dto.response.NoticeResponse;
import com.olla.olla_climbing.domain.admin.service.NoticeService;
import com.olla.olla_climbing.domain.member.entity.Member;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// (동철 수정) 사용자 조회 import
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

@RestController
@RequestMapping("/api/v1/admin/notices")
@RequiredArgsConstructor
@Tag(name = "Admin Notice API", description = "관리자 전용 공지사항 작성/수정/삭제 API")
public class AdminNoticeController {

    private final NoticeService noticeService;

    // (동철 수정) 공지 목록 조회 추가 
    @GetMapping
    @Operation(summary = "공지사항 목록 조회", description = "모든 사용자가 공지사항 목록을 조회할 수 있습니다.")
    public ResponseEntity<Page<NoticeResponse>> getNotices(
            @PageableDefault(size = 10) Pageable pageable) {
        System.out.println("======= [확인] 공지사항 조회 API 호출됨 =======");
        return ResponseEntity.ok(noticeService.getNotices(pageable));
    }

    // (동철 수정) 공지 상세 조회 추가
    @GetMapping("/{noticeId}")
    @Operation(summary = "공지사항 상세 조회", description = "특정 공지사항의 상세 내용을 조회합니다.")
    public ResponseEntity<NoticeResponse> getNotice(@PathVariable("noticeId") Long noticeId) {
        return ResponseEntity.ok(noticeService.getNotice(noticeId));
    }


    @PostMapping
    @Operation(summary = "공지사항 작성", description = "관리자 권한으로 새로운 공지사항을 작성합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<NoticeResponse> createNotice(
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody NoticeCreateRequest request) {

        if (member == null) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }

        NoticeResponse response = noticeService.createNotice(member.getLoginId(), request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{noticeId}")
    @Operation(summary = "공지사항 수정", description = "기존 공지사항을 수정합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<NoticeResponse> updateNotice(
            @AuthenticationPrincipal Member member,
            @PathVariable("noticeId") Long noticeId,
            @Valid @RequestBody NoticeUpdateRequest request) {

        if (member == null) {
            throw new IllegalArgumentException("인증 권한이 없습니다.");
        }

        NoticeResponse response = noticeService.updateNotice(noticeId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{noticeId}")
    @Operation(summary = "공지사항 삭제", description = "공지사항을 삭제합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> deleteNotice(
            @AuthenticationPrincipal Member member,
            @PathVariable("noticeId") Long noticeId) {

        if (member == null) {
            throw new IllegalArgumentException("인증 권한이 없습니다.");
        }

        noticeService.deleteNotice(noticeId);
        return ResponseEntity.ok("공지사항이 성공적으로 삭제되었습니다.");
    }
}