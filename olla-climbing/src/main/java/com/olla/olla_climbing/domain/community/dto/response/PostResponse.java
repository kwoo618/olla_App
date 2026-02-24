package com.olla.olla_climbing.domain.community.dto.response;

import com.olla.olla_climbing.domain.community.entity.Post;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PostResponse {
    private Long id;
    private String writerName; // 작성자 닉네임/이름
    private String title;
    private String content;
    private boolean isDifferentGym;
    private String gymPlace;
    private LocalDateTime meetDateTime;
    private int maxMember;
    private int memberCount;
    private LocalDateTime createdAt;

    public static PostResponse from(Post post) {
        return PostResponse.builder()
                .id(post.getId())
                .writerName(post.getMember().getName())
                .title(post.getTitle())
                .content(post.getContent())
                .isDifferentGym(post.isDifferentGym())
                .gymPlace(post.getGymPlace())
                .meetDateTime(post.getMeetDateTime())
                .maxMember(post.getMaxMember())
                .memberCount(post.getMemberCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}