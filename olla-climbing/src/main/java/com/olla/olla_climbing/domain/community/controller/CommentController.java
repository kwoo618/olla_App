package com.olla.olla_climbing.domain.community.controller;

import com.olla.olla_climbing.domain.community.dto.request.CommentRequest;
import com.olla.olla_climbing.domain.community.dto.response.CommentResponse;
import com.olla.olla_climbing.domain.community.service.CommentService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Community Comment API", description = "게시글 댓글 및 대댓글 관리 API")
@RestController
@RequestMapping("/api/v1/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    @Operation(summary = "댓글/대댓글 작성", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> createComment(
            @PathVariable("postId") Long postId,
            @AuthenticationPrincipal Member member,
            @RequestBody CommentRequest request) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        commentService.createComment(postId, member.getLoginId(), request);
        return ResponseEntity.ok(ApiResponse.success(201, "댓글이 성공적으로 등록되었습니다.", null));
    }

    @GetMapping
    @Operation(summary = "댓글 목록 조회")
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getComments(
            @PathVariable("postId") Long postId,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<CommentResponse> response = commentService.getComments(postId, pageable);
        return ResponseEntity.ok(ApiResponse.success(200, "댓글 목록 조회 성공", response));
    }

    @DeleteMapping("/{commentId}")
    @Operation(summary = "댓글 삭제", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable("postId") Long postId,
            @PathVariable("commentId") Long commentId,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        commentService.deleteComment(commentId, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "댓글이 성공적으로 삭제되었습니다.", null));
    }
}