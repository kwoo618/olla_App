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
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping
    @Operation(summary = "게시글 작성", description = "새로운 게시글을 작성합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<PostResponse>> createPost(@AuthenticationPrincipal Member member, @Valid @RequestBody PostCreateRequest request){

        if (member == null) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }

        PostResponse response = postService.createPost(request, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(201, "게시글이 등록되었습니다.", response));
    }

    @GetMapping
    @Operation(summary = "게시글 목록 조회", description = "게시글 목록을 최신순으로 페이징하여 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getPostList(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal Member member) {

        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");

        Page<PostResponse> response = postService.getPostList(pageable, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "목록 조회 성공", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "게시글 상세 조회", description = "게시글 ID로 상세 정보를 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<PostResponse>> getPostDetail(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member) {

        if (member == null) throw new IllegalArgumentException("로그인이 필요합니다.");

        PostResponse response = postService.getPostDetail(postId, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "상세 조회 성공", response));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "게시글 수정", description = "작성자가 자신의 모집글을 수정합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    // 💡 수정: 누락되었던 ApiResponse 래핑 적용
    public ResponseEntity<ApiResponse<PostResponse>> updatePost(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member,
            @Valid @RequestBody PostUpdateRequest request) {

        if (member == null) throw new IllegalArgumentException("인증 정보가 없습니다.");

        PostResponse response = postService.updatePost(postId, member.getLoginId(), request);
        return ResponseEntity.ok(ApiResponse.success(200, "게시글이 수정되었습니다.", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "게시글 삭제", description = "작성자 또는 관리자가 글을 삭제합니다.")
    // 💡 수정: String 대신 Void를 사용하여 데이터가 null 임을 명확히 전달
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member) {

        postService.deletePost(postId, member);
        return ResponseEntity.ok(ApiResponse.success(200, "게시글이 삭제되었습니다.", null));
    }

    @GetMapping("/search")
    @Operation(summary = "게시글 키워드 검색", description = "제목 또는 내용에 키워드가 포함된 글을 검색합니다.")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> searchPosts(
            @RequestParam("keyword") String keyword,
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {

        Page<PostResponse> response = postService.searchPosts(keyword, pageable, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "검색 성공", response));
    }

    @GetMapping("/me")
    @Operation(summary = "내가 쓴 게시글 조회", description = "마이페이지용: 내가 작성한 모집글 목록을 가져옵니다.")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getMyPosts(
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {

        Page<PostResponse> response = postService.getMyPosts(member.getLoginId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", response));
    }

    @GetMapping("/me/applied")
    @Operation(summary = "내가 참여한 게시글 조회", description = "마이페이지용: 내가 참여 신청한 모집글 목록을 가져옵니다.")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getMyAppliedPosts(
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal Member member) {

        Page<PostResponse> response = postService.getMyAppliedPosts(member.getLoginId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", response));
    }

    @PostMapping("/{id}/like")
    @Operation(summary = "게시글 좋아요 토글", description = "좋아요를 누릅니다. 이미 눌렀다면 취소됩니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Boolean>> toggleLike(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member) {

        boolean result = postService.toggleLike(postId, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "좋아요 처리 완료", result));
    }

    @PatchMapping("/{id}/close")
    @Operation(summary = "게시글 수동 마감", description = "작성자가 모집을 수동으로 마감합니다.")
    // 💡 수정: String 대신 Void를 사용하여 데이터가 null 임을 명확히 전달
    public ResponseEntity<ApiResponse<Void>> closePost(
            @PathVariable("id") Long postId,
            @AuthenticationPrincipal Member member) {

        postService.closePost(postId, member.getLoginId());
        return ResponseEntity.ok(ApiResponse.success(200, "모집이 마감되었습니다.", null));
    }
}