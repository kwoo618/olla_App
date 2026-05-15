package com.olla.olla_climbing.domain.admin.controller;

import com.olla.olla_climbing.domain.admin.dto.response.NoticeResponse;
import com.olla.olla_climbing.domain.admin.service.NoticeService;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notices") // 💡 admin이 빠진 유저 전용 URL
@RequiredArgsConstructor
@Tag(name = "Notice API", description = "사용자용 공지사항 API")
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping
    @Operation(summary = "공지사항 목록 조회 (유저용)")
    public ResponseEntity<ApiResponse<Page<NoticeResponse>>> getNotices(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        // 기존 NoticeService에 이미 만들어져 있는 getNotices 메서드를 그대로 재활용합니다!
        Page<NoticeResponse> response = noticeService.getNotices(pageable);
        return ResponseEntity.ok(ApiResponse.success(200, "공지사항 목록 조회 성공", response));
    }
}