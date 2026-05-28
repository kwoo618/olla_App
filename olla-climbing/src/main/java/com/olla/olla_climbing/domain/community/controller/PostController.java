package com.olla.olla_climbing.domain.community.controller;

import com.olla.olla_climbing.domain.community.dto.request.PostCreateRequest;
import com.olla.olla_climbing.domain.community.dto.request.PostUpdateRequest;
import com.olla.olla_climbing.domain.community.dto.response.PostResponse;
import com.olla.olla_climbing.domain.community.service.PostService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping
    @Operation(summary = "게시글 작성", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<PostResponse>> createPost(
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody PostCreateRequest request) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(201, "게시글이 등록되었습니다.",
                postService.createPost(request, member.getLoginId())));
    }

    @GetMapping
    @Operation(summary = "게시글 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getPostList(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "목록 조회 성공",
                postService.getPostList(pageable, member.getLoginId())));
    }

    @GetMapping("/{id}")
    @Operation(summary = "게시글 상세 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<PostResponse>> getPostDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "상세 조회 성공",
                postService.getPostDetail(id, member.getLoginId())));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "게시글 수정", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<PostResponse>> updatePost(
            @PathVariable Long id,
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody PostUpdateRequest request) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "게시글이 수정되었습니다.",
                postService.updatePost(id, member.getLoginId(), request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "게시글 삭제", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        postService.deletePost(id, member);
        return ResponseEntity.ok(ApiResponse.success(200, "게시글이 삭제되었습니다.", null));
    }

    @GetMapping("/search")
    @Operation(summary = "게시글 키워드 검색")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> searchPosts(
            @RequestParam String keyword,
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "검색 성공",
                postService.searchPosts(keyword, pageable, member.getLoginId())));
    }

    @GetMapping("/me")
    @Operation(summary = "내가 쓴 게시글 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getMyPosts(
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공",
                postService.getMyPosts(member.getLoginId(), pageable)));
    }

    @GetMapping("/me/applied")
    @Operation(summary = "내가 참여한 게시글 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getMyAppliedPosts(
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공",
                postService.getMyAppliedPosts(member.getLoginId(), pageable)));
    }

    @PostMapping("/{id}/like")
    @Operation(summary = "게시글 좋아요 토글", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Boolean>> toggleLike(
            @PathVariable Long id,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");
        return ResponseEntity.ok(ApiResponse.success(200, "좋아요 처리 완료",
                postService.toggleLike(id, member.getLoginId())));
    }

    @PatchMapping("/{id}/close")
    @Operation(summary = "게시글 수동 마감", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> closePost(
            @PathVariable Long id,
            @AuthenticationPrincipal Member member) {
        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");
        postService.closePost(id, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "모집이 마감되었습니다.", null));
    }
}