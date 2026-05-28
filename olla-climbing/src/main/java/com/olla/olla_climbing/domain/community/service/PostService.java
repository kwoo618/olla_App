package com.olla.olla_climbing.domain.community.service;

import com.olla.olla_climbing.domain.community.dto.request.PostCreateRequest;
import com.olla.olla_climbing.domain.community.dto.request.PostUpdateRequest;
import com.olla.olla_climbing.domain.community.dto.response.PostResponse;
import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostLike;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
import com.olla.olla_climbing.domain.community.repository.PostLikeRepository;
import com.olla.olla_climbing.domain.community.repository.PostParticipantRepository;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.enums.Role;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final PostParticipantRepository participantRepository;
    private final PostLikeRepository postLikeRepository;

    @Transactional
    public PostResponse createPost(PostCreateRequest request, String loginId) {
        Member member = findActiveMember(loginId);

        Post post = Post.builder()
                .member(member)
                .title(request.getTitle())
                .content(request.getContent())
                .isDifferentGym(request.getIsDifferentGym())
                .gymPlace(request.getGymPlace())
                .meetDateTime(request.getMeetDateTime())
                .maxMember(request.getMaxMember())
                .build();

        postRepository.save(post);
        participantRepository.save(new PostParticipant(post, member));

        return PostResponse.of(post, true, false, 0L);
    }

    @Transactional
    public PostResponse updatePost(Long postId, String loginId, PostUpdateRequest request) {
        Post post = findActivePost(postId);

        if (!post.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("게시글 작성자만 수정할 수 있습니다.");
        }
        if (request.getMaxMember() < post.getMemberCount()) {
            throw new IllegalArgumentException("현재 참여 인원보다 모집 인원을 적게 설정할 수 없습니다.");
        }

        post.updatePost(request.getTitle(), request.getContent(), request.getIsDifferentGym(),
                request.getGymPlace(), request.getMeetDateTime(), request.getMaxMember());

        boolean isLiked = postLikeRepository.existsByPostAndMember(post, post.getMember());
        long likeCount = postLikeRepository.countByPostId(post.getId());

        return PostResponse.of(post, true, isLiked, likeCount);
    }

    @Transactional
    public PostResponse getPostDetail(Long postId, String loginId) {
        Post post = findActivePost(postId);
        post.increaseViewCount();

        Member member = findActiveMember(loginId);
        boolean isApplied = participantRepository.existsByPostAndMember(post, member);
        boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
        long likeCount = postLikeRepository.countByPostId(postId);

        return PostResponse.of(post, isApplied, isLiked, likeCount);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getPostList(Pageable pageable, String loginId) {
        Member member = findActiveMember(loginId);
        return postRepository.findByIsDeletedFalseOrderByCreatedAtDesc(pageable)
                .map(post -> toPostResponse(post, member));
    }

    @Transactional
    public void deletePost(Long postId, Member currentMember) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        if (!post.getMember().getId().equals(currentMember.getId()) && currentMember.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("게시글 작성자 또는 관리자만 삭제할 수 있습니다.");
        }

        post.markAsDeleted();
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> searchPosts(String keyword, Pageable pageable, String loginId) {
        Member member = findActiveMember(loginId);
        return postRepository.findByTitleContainingOrContentContainingAndIsDeletedFalseOrderByCreatedAtDesc(
                        keyword, keyword, pageable)
                .map(post -> toPostResponse(post, member));
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getMyPosts(String loginId, Pageable pageable) {
        Member member = findActiveMember(loginId);
        return postRepository.findByMemberIdAndIsDeletedFalseOrderByCreatedAtDesc(member.getId(), pageable)
                .map(post -> {
                    boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
                    long likeCount = postLikeRepository.countByPostId(post.getId());
                    return PostResponse.of(post, true, isLiked, likeCount);
                });
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getMyAppliedPosts(String loginId, Pageable pageable) {
        Member member = findActiveMember(loginId);
        return participantRepository.findByMemberIdOrderByCreatedAtDesc(member.getId(), pageable)
                .map(participant -> {
                    Post post = participant.getPost();
                    boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
                    long likeCount = postLikeRepository.countByPostId(post.getId());
                    return PostResponse.of(post, true, isLiked, likeCount);
                });
    }

    @Transactional
    public boolean toggleLike(Long postId, String loginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        Member member = findActiveMember(loginId);

        return postLikeRepository.findByPostAndMember(post, member)
                .map(like -> {
                    postLikeRepository.delete(like);
                    return false;
                })
                .orElseGet(() -> {
                    postLikeRepository.save(new PostLike(post, member));
                    return true;
                });
    }

    @Transactional
    public void closePost(Long postId, String loginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        if (!post.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("게시글 작성자만 마감할 수 있습니다.");
        }
        post.closeManual();
    }

    // ── private 헬퍼 ─────────────────────────────────────────────

    private Member findActiveMember(String loginId) {
        return memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));
    }

    private Post findActivePost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        if (post.isDeleted()) throw new IllegalArgumentException("삭제된 게시글입니다.");
        return post;
    }

    private PostResponse toPostResponse(Post post, Member member) {
        boolean isApplied = participantRepository.existsByPostAndMember(post, member);
        boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
        long likeCount = postLikeRepository.countByPostId(post.getId());
        return PostResponse.of(post, isApplied, isLiked, likeCount);
    }
}