package com.olla.olla_climbing.domain.community.controller;

import com.olla.olla_climbing.domain.community.dto.request.PostCreateRequest;
import com.olla.olla_climbing.domain.community.dto.response.PostResponse;
import com.olla.olla_climbing.domain.community.dto.request.PostUpdateRequest;
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
@RequestMapping("/api/vi/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping
    @Operation(summary = "게시글 작성", description = "새로운 게시글을 작성합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<PostResponse> createPost(@AuthenticationPrincipal Member member, @Valid @RequestBody PostCreateRequest request){

        if (member ==null) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }

        PostResponse response = postService.createPost(member.getLoginId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "게시글 목록 조회", description = "모든 사용자가 최신순으로 페이징된 게시글 목록을 조회합니다.")
    public ResponseEntity<Page<PostResponse>> getPostList(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(postService.getPostList(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "게시글 상세 조회", description = "게시글 ID로 게시글 상세 정보를 조회합니다.")
    public ResponseEntity<PostResponse> getPostDetail(@PathVariable("id") Long postId) {

        // PathVariable: URL 경로에서 {id} 부분을 postId 변수에 매핑

        PostResponse response = postService.getPostDetail(postId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "게시글 수정", description = "작성자가 자신의 모집글을 수정합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<PostResponse> updatePost(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody PostUpdateRequest request) {

        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");

        PostResponse response = postService.updatePost(postId, member.getLoginId(), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "게시글 삭제", description = "작성자가 자신의 모집글을 삭제(Soft Delete)합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> deletePost(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member) {

        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");

        postService.deletePost(postId, member.getLoginId());
        return ResponseEntity.ok("게시글이 성공적으로 삭제되었습니다.");
    }
}
