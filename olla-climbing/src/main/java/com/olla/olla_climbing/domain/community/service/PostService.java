package com.olla.olla_climbing.domain.community.service;

import com.olla.olla_climbing.domain.community.dto.request.PostCreateRequest;
import com.olla.olla_climbing.domain.community.dto.response.ParticipantDto;
import com.olla.olla_climbing.domain.community.dto.response.PostResponse;
import com.olla.olla_climbing.domain.community.dto.request.PostUpdateRequest;
import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostLike;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
import com.olla.olla_climbing.domain.community.repository.PostLikeRepository;
import com.olla.olla_climbing.domain.community.repository.PostParticipantRepository;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final PostParticipantRepository participantRepository;
    private final PostLikeRepository postLikeRepository;

    @Transactional
    public PostResponse createPost(PostCreateRequest request, String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

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
        // 방장 자동 참여
        participantRepository.save(new PostParticipant(post, member));

        // 방금 만든 글이므로 isLiked = false, likeCount = 0L 로 고정
        return PostResponse.of(post, true, false, 0L);
    }

    @Transactional
    public PostResponse updatePost(Long postId, String loginId, PostUpdateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        if (post.isDeleted()) throw new IllegalArgumentException("삭제된 게시글은 수정할 수 없습니다.");
        if (!post.getMember().getLoginId().equals(loginId)) throw new IllegalArgumentException("게시글 작성자만 수정할 수 있습니다.");
        if (request.getMaxMember() < post.getMemberCount()) throw new IllegalArgumentException("현재 참여 인원보다 모집 인원을 적게 설정할 수 없습니다.");

        post.updatePost(request.getTitle(), request.getContent(), request.getIsDifferentGym(),
                request.getGymPlace(), request.getMeetDateTime(), request.getMaxMember());

        Member member = post.getMember();
        boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
        long likeCount = postLikeRepository.countByPostId(post.getId());

        // 작성자 본인의 수정이므로 isApplied = true
        return PostResponse.of(post, true, isLiked, likeCount);
    }

    @Transactional
    public PostResponse getPostDetail(Long postId, String loginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        if (post.isDeleted()) throw new IllegalArgumentException("삭제된 게시글입니다.");

        // 1. 조회수 증가
        post.increaseViewCount();

        // 2. 로그인 유저 정보 및 상태 확인
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));

        boolean isApplied = participantRepository.existsByPostAndMember(post, member);
        boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
        long likeCount = postLikeRepository.countByPostId(postId);

        // 3. 통합 DTO 반환
        return PostResponse.of(post, isApplied, isLiked, likeCount);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getPostList(Pageable pageable, String loginId) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));

        return postRepository.findByIsDeletedFalseOrderByCreatedAtDesc(pageable)
                .map(post -> {
                    boolean isApplied = participantRepository.existsByPostAndMember(post, member);
                    boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
                    long likeCount = postLikeRepository.countByPostId(post.getId());
                    return PostResponse.of(post, isApplied, isLiked, likeCount);
                });
    }

    @Transactional
    public void deletePost(Long postId, String loginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        if (!post.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("게시글 작성자만 삭제할 수 있습니다.");
        }

        // DB에서 실제로 지우지 않고 상태만 변경 (Soft Delete)
        post.markAsDeleted();
    }

    // [Epic 19] 키워드 검색 (제목 또는 내용)
    @Transactional(readOnly = true)
    public Page<PostResponse> searchPosts(String keyword, Pageable pageable, String loginId) {
        Member currentMember = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));

        return postRepository.findByTitleContainingOrContentContainingAndIsDeletedFalseOrderByCreatedAtDesc(
                        keyword, keyword, pageable)
                .map(post -> {
                    boolean isApplied = participantRepository.existsByPostAndMember(post, currentMember);
                    boolean isLiked = postLikeRepository.existsByPostAndMember(post, currentMember);
                    long likeCount = postLikeRepository.countByPostId(post.getId());
                    return PostResponse.of(post, isApplied, isLiked, likeCount);
                });
    }

    // [Epic 19] 내가 작성한 게시글 목록 조회
    @Transactional(readOnly = true)
    public Page<PostResponse> getMyPosts(String loginId, Pageable pageable) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));

        return postRepository.findByMemberIdAndIsDeletedFalseOrderByCreatedAtDesc(member.getId(), pageable)
                .map(post -> {
                    boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
                    long likeCount = postLikeRepository.countByPostId(post.getId());
                    return PostResponse.of(post, true, isLiked, likeCount); // 내가 쓴 글은 무조건 참여 중
                });
    }

    // [Epic 19] 내가 참여 신청한 게시글 목록 조회
    @Transactional(readOnly = true)
    public Page<PostResponse> getMyAppliedPosts(String loginId, Pageable pageable) {
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));

        return participantRepository.findByMemberIdOrderByCreatedAtDesc(member.getId(), pageable)
                .map(participant -> {
                    Post post = participant.getPost();
                    boolean isLiked = postLikeRepository.existsByPostAndMember(post, member);
                    long likeCount = postLikeRepository.countByPostId(post.getId());
                    return PostResponse.of(post, true, isLiked, likeCount); // 참여 내역이 있으므로 무조건 true
                });
    }

    @Transactional
    public void increaseViewCount(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        post.increaseViewCount();
    }

    @Transactional
    public boolean toggleLike(Long postId, String loginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));

        return postLikeRepository.findByPostAndMember(post, member)
                .map(like -> {
                    postLikeRepository.delete(like);
                    return false; // 좋아요 취소됨
                })
                .orElseGet(() -> {
                    postLikeRepository.save(new PostLike(post, member));
                    return true; // 좋아요 완료됨
                });
    }
}