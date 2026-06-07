package com.olla.olla_climbing.domain.community.service;

import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
import com.olla.olla_climbing.domain.community.repository.PostParticipantRepository;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostParticipantService {

    private final PostParticipantRepository participantRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;

    @Transactional
    public void joinPost(Long postId, String loginId) {
        // 비관적 락: 동시 참여 요청 시 인원 초과 방지
        Post post = postRepository.findByIdWithPessimisticLock(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        Member member = findActiveMember(loginId);

        if (post.isDeleted()) {
            throw new IllegalArgumentException("삭제된 게시글에는 참여할 수 없습니다.");
        }
        if (post.getMember().getId().equals(member.getId())) {
            throw new IllegalArgumentException("작성자는 이미 참여된 상태입니다.");
        }
        if (participantRepository.existsByPostAndMember(post, member)) {
            throw new IllegalArgumentException("이미 참여한 모집글입니다.");
        }

        post.addParticipant();
        participantRepository.save(PostParticipant.builder().post(post).member(member).build());

        notificationService.sendParticipantNotification(
                post.getMember().getId(), member.getName(), post.getTitle(), post.getId(), true);
    }

    @Transactional
    public void cancelJoin(Long postId, String loginId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        Member member = findActiveMember(loginId);

        if (post.getMember().getId().equals(member.getId())) {
            throw new IllegalArgumentException("작성자는 참여를 취소할 수 없습니다. 취소를 원할 경우 글을 삭제해주세요.");
        }

        PostParticipant participant = participantRepository.findByPostAndMember(post, member)
                .orElseThrow(() -> new IllegalArgumentException("해당 모집글에 참여한 내역이 없습니다."));

        post.removeParticipant();
        participantRepository.delete(participant);

        notificationService.sendParticipantNotification(
                post.getMember().getId(), member.getName(), post.getTitle(), post.getId(), false);
    }

    // ── private 헬퍼 ─────────────────────────────────────────────

    private Member findActiveMember(String loginId) {
        return memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
    }
}