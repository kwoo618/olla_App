package com.olla.olla_climbing.domain.community.service;

import com.olla.olla_climbing.domain.community.dto.request.CommentRequest;
import com.olla.olla_climbing.domain.community.dto.response.CommentResponse;
import com.olla.olla_climbing.domain.community.entity.Comment;
import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.repository.CommentRepository;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.enums.Role;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;

    @Transactional
    public void createComment(Long postId, String loginId, CommentRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));
        Member member = findActiveMember(loginId);

        Comment parent = null;
        if (request.getParentId() != null) {
            parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new IllegalArgumentException("부모 댓글이 존재하지 않습니다."));
            if (!parent.getPost().getId().equals(postId)) {
                throw new IllegalArgumentException("게시글 정보가 일치하지 않는 대댓글입니다.");
            }
        }

        Comment comment = Comment.builder()
                .content(request.getContent())
                .post(post)
                .member(member)
                .parent(parent)
                .build();

        commentRepository.save(comment);
        notificationService.sendCommentNotification(post.getMember(), member, post);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(Long postId, Pageable pageable) {
        return commentRepository.findByPostIdAndParentIsNull(postId, pageable)
                .map(CommentResponse::from);
    }

    @Transactional
    public void deleteComment(Long commentId, String loginId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다."));
        Member currentMember = findActiveMember(loginId);

        if (!comment.getMember().getLoginId().equals(loginId) && currentMember.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("자신의 댓글 또는 관리자만 삭제할 수 있습니다.");
        }

        comment.markAsDeleted();
    }

    // ── private 헬퍼 ─────────────────────────────────────────────

    private Member findActiveMember(String loginId) {
        return memberRepository.findByLoginIdAndIsDeletedFalse(loginId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보가 없습니다."));
    }
}