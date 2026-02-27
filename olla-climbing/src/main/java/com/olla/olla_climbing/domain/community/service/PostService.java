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
    public PostResponse createPost(String loginId, PostCreateRequest request) {
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

        Post savedPost = postRepository.save(post);
        return PostResponse.from(savedPost); // from 메서드 사용
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getPostList(Pageable pageable) {
        Page<Post> posts = postRepository.findByIsDeletedFalseOrderByCreatedAtDesc(pageable);
        return posts.map(PostResponse::from); // from 메서드 사용
    }

    @Transactional(readOnly = true)
    public PostResponse getPostDetail(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        if (post.isDeleted()) {
            throw new IllegalArgumentException("삭제된 게시글입니다.");
        }

        // DB에서 해당 게시글의 모든 참여 내역 조회
        List<PostParticipant> participants = participantRepository.findByPost(post);

        // 엔티티를 DTO로 변환
        List<ParticipantDto> participantDtos = participants.stream()
                .map(p -> ParticipantDto.from(p.getMember()))
                .collect(Collectors.toList());

        // 작성자 본인을 명단 맨 앞에 추가
        participantDtos.add(0, ParticipantDto.from(post.getMember()));

        // of 메서드를 사용하여 참여자 리스트와 함께 반환
        return PostResponse.of(post, participantDtos);
    }
    @Transactional
    public PostResponse updatePost(Long postId, String loginId, PostUpdateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        if (post.isDeleted()) {
            throw new IllegalArgumentException("삭제된 게시글은 수정할 수 없습니다.");
        }

        // 작성자 본인인지 검증
        if (!post.getMember().getLoginId().equals(loginId)) {
            throw new IllegalArgumentException("게시글 작성자만 수정할 수 있습니다.");
        }

        // 인원을 현재 참여자 수보다 적게 줄이려는 경우 방어
        if (request.getMaxMember() < post.getMemberCount()) {
            throw new IllegalArgumentException("현재 참여 인원보다 모집 인원을 적게 설정할 수 없습니다.");
        }

        // 엔티티 값 변경 -> 트랜잭션 종료 시 Dirty Checking으로 UPDATE 쿼리 자동 발생
        post.updatePost(
                request.getTitle(), request.getContent(), request.getIsDifferentGym(),
                request.getGymPlace(), request.getMeetDateTime(), request.getMaxMember()
        );

        return PostResponse.from(post);
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