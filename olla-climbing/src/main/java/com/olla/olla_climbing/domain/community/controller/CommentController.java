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
    @Operation(summary = "댓글/대댓글 작성", description = "게시글에 댓글을 작성합니다. parentId가 있으면 대댓글이 됩니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<String>> createComment(
            @PathVariable("postId") Long postId,
            @AuthenticationPrincipal Member member,
            @RequestBody CommentRequest request) {

        commentService.createComment(postId, member.getLoginId(), request);
        return ResponseEntity.ok(ApiResponse.success("댓글이 등록되었습니다."));
    }

    @GetMapping
    @Operation(summary = "댓글 목록 조회", description = "해당 게시글의 댓글을 페이징하여 조회합니다.")
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getComments(
            @PathVariable("postId") Long postId,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(commentService.getComments(postId, pageable)));
    }

    @DeleteMapping("/{commentId}")
    @Operation(summary = "댓글 삭제", description = "자신이 쓴 댓글을 삭제(Soft Delete)합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<String>> deleteComment(
            @PathVariable("postId") Long postId, // postId는 경로상 포함
            @PathVariable("commentId") Long commentId,
            @AuthenticationPrincipal Member member) {

        commentService.deleteComment(commentId, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success("댓글이 삭제되었습니다."));
    }
}