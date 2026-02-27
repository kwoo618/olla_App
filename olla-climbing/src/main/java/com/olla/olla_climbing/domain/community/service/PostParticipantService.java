package com.olla.olla_climbing.domain.community.service;

import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
import com.olla.olla_climbing.domain.community.repository.PostParticipantRepository;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostParticipantService {

    private final PostParticipantRepository participantRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public void joinPost(Long postId, String loginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 방어 로직 1: 삭제된 게시글인지 확인
        if (post.isDeleted()) {
            throw new IllegalArgumentException("삭제된 게시글에는 참여할 수 없습니다.");
        }

        // 방어 로직 2: 작성자 본인인지 확인
        if (post.getMember().getId().equals(member.getId())) {
            throw new IllegalArgumentException("작성자는 이미 참여된 상태입니다.");
        }

        // 방어 로직 3: 이미 참여한 상태인지 확인
        if (participantRepository.existsByPostAndMember(post, member)) {
            throw new IllegalArgumentException("이미 참여한 모집글입니다.");
        }

        // 인원 추가 (엔티티 내부에 구현된 비즈니스 로직 호출, 초과 시 여기서 에러 발생)
        post.addParticipant();

        // 중간 테이블에 참여 내역 저장
        participantRepository.save(new PostParticipant(post, member));
    }

    @Transactional
    public void cancelJoin(Long postId, String loginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 방어 로직 1: 작성자 본인인지 확인
        if (post.getMember().getId().equals(member.getId())) {
            throw new IllegalArgumentException("작성자는 참여를 취소할 수 없습니다. 취소를 원할 경우 글을 삭제해주세요.");
        }

        // 방어 로직 2: 실제 참여 내역이 있는지 확인
        PostParticipant participant = participantRepository.findByPostAndMember(post, member)
                .orElseThrow(() -> new IllegalArgumentException("해당 모집글에 참여한 내역이 없습니다."));

        // 인원 감소
        post.removeParticipant();

        // 중간 테이블에서 데이터 삭제
        participantRepository.delete(participant);
    }
}