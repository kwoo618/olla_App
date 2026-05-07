package com.olla.olla_climbing.domain.community.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CommentRequest {
    private String content;
    private Long parentId; // 대댓글일 경우 부모 ID, 일반 댓글이면 null
}