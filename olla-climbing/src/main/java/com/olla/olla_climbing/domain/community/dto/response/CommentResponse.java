package com.olla.olla_climbing.domain.community.dto.response;

import com.olla.olla_climbing.domain.community.entity.Comment;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class CommentResponse {
    private Long id;
    private String content;
    private Long writerId;
    private String writerName;
    private String profileImageUrl;
    private LocalDateTime createdAt;
    private List<CommentResponse> children; // 대댓글 리스트

    public static CommentResponse from(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.isDeleted() ? "삭제된 댓글입니다." : comment.getContent())
                .writerId(comment.getMember().getId())
                .writerName(comment.getMember().getName())
                .profileImageUrl(comment.getMember().getProfileImageUrl())
                .createdAt(comment.getCreatedAt())
                .children(comment.getChildren().stream()
                        .map(CommentResponse::from)
                        .collect(Collectors.toList()))
                .build();
    }
}