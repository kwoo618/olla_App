package com.olla.olla_climbing.domain.community.service;

import com.olla.olla_climbing.domain.community.dto.request.PostCreateRequest;
import com.olla.olla_climbing.domain.community.dto.response.PostResponse;
import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.Member;
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

    // @Transactional: 이 메서드 안의 DB 작업들이 모두 성공해야 커밋되고, 하나라도 실패하면 롤백
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
        return PostResponse.from(savedPost);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getPostList(Pageable pageable) {
        // Pageable 객체가 내부적으로 LIMIT, OFFSET 쿼리를 생성하여 DB에 전달합니다.
        Page<Post> posts = postRepository.findByIsDeletedFalseOrderByCreatedAtDesc(pageable);
        return posts.map(PostResponse::from);
    }

    @Transactional(readOnly = true)
    public PostResponse getPostDetail(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        if (post.isDeleted()) {
            throw new IllegalArgumentException("삭제된 게시글입니다.");
        }

        return PostResponse.from(post);
    }
}