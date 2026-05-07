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
    // 💡 수정: 반환 타입을 ResponseEntity<ApiResponse<PostResponse>> 로 변경
    public ResponseEntity<ApiResponse<PostResponse>> createPost(@AuthenticationPrincipal Member member, @Valid @RequestBody PostCreateRequest request){

        if (member ==null) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }

        PostResponse response = postService.createPost(request, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @Operation(summary = "게시글 목록 조회", description = "게시글 목록을 최신순으로 페이징하여 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getPostList(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal Member member) { // 💡 로그인 유저 정보 받기

        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");

        // 서비스로 로그인 아이디 전달
        Page<PostResponse> response = postService.getPostList(pageable, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "게시글 상세 조회", description = "게시글 ID로 상세 정보를 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<PostResponse>> getPostDetail(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member) { // 로그인 정보 파라미터 추가

        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");

        // 로그인 아이디를 서비스로 전달
        PostResponse response = postService.getPostDetail(postId, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(response));
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

    @GetMapping("/search")
    @Operation(summary = "게시글 키워드 검색", description = "제목 또는 내용에 키워드가 포함된 글을 검색합니다.")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> searchPosts(
            @RequestParam("keyword") String keyword,
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {

        return ResponseEntity.ok(ApiResponse.success(postService.searchPosts(keyword, pageable, member.getLoginId())));
    }

    @GetMapping("/me")
    @Operation(summary = "내가 쓴 게시글 조회", description = "마이페이지용: 내가 작성한 모집글 목록을 가져옵니다.")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getMyPosts(
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {

        return ResponseEntity.ok(ApiResponse.success(postService.getMyPosts(member.getLoginId(), pageable)));
    }

    @GetMapping("/me/applied")
    @Operation(summary = "내가 참여한 게시글 조회", description = "마이페이지용: 내가 참여 신청한 모집글 목록을 가져옵니다.")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getMyAppliedPosts(
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {

        return ResponseEntity.ok(ApiResponse.success(postService.getMyAppliedPosts(member.getLoginId(), pageable)));
    }

    @PostMapping("/{id}/like")
    @Operation(summary = "게시글 좋아요 토글", description = "좋아요를 누릅니다. 이미 눌렀다면 취소됩니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Boolean>> toggleLike(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member) {

        boolean result = postService.toggleLike(postId, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
