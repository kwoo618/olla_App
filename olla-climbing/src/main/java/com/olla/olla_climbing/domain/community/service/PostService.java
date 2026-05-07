package com.olla.olla_climbing.domain.community.service;

import com.olla.olla_climbing.domain.community.dto.request.PostCreateRequest;
import com.olla.olla_climbing.domain.community.dto.response.ParticipantDto;
import com.olla.olla_climbing.domain.community.dto.response.PostResponse;
import com.olla.olla_climbing.domain.community.dto.request.PostUpdateRequest;
import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
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

        return PostResponse.of(post, true);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getPostList(Pageable pageable, String loginId) {
        Member currentMember = memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));

        return postRepository.findByIsDeletedFalseOrderByCreatedAtDesc(pageable)
                .map(post -> {
                    // 목록의 각 게시글마다 내가 참여했는지 확인
                    boolean isApplied = participantRepository.existsByPostAndMember(post, currentMember);
                    return PostResponse.of(post, isApplied);
                });
    }

    @Transactional(readOnly = true)
    public PostResponse getPostDetail(Long postId, String currentLoginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        if (post.isDeleted()) {
            throw new IllegalArgumentException("삭제된 게시글입니다.");
        }

        // 현재 로그인한 유저
        Member currentMember = memberRepository.findByLoginIdAndIsDeletedFalse(currentLoginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));

        // 로그인한 유저가 이 게시글에 '참여 신청'을 했는지 여부 확인
        boolean isApplied = participantRepository.existsByPostAndMember(post, currentMember);

        // 새롭게 만든 PostResponse의 of 팩토리 메서드 사용
        return PostResponse.of(post, isApplied);
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

        // 💡 [수정] 작성자 본인의 수정이므로 isApplied = true
        return PostResponse.of(post, true);
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
}