package com.olla.olla_climbing.domain.community.service;

import com.olla.olla_climbing.domain.community.dto.request.PostCreateRequest;
import com.olla.olla_climbing.domain.community.dto.response.ParticipantDto;
import com.olla.olla_climbing.domain.community.dto.response.PostResponse;
import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
import com.olla.olla_climbing.domain.community.repository.PostParticipantRepository;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.Member;
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
}