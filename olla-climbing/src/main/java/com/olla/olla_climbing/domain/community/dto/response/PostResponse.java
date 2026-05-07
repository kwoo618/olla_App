package com.olla.olla_climbing.domain.community.dto.response;

import com.olla.olla_climbing.domain.community.entity.Post;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class PostResponse {
    private Long id;
    private Long writerId;
    private String writerName;
    private String title;
    private String content;
    private boolean isDifferentGym;
    private String gymPlace;
    private LocalDateTime meetDateTime;
    private int maxMember;
    private int memberCount;
    private boolean isApplied;
    private LocalDateTime createdAt;

    private List<ParticipantDto> participants;

    // 상세 조회 시 참여자 정보까지 포함하여 반환
    public static PostResponse of(Post post, boolean isApplied) {
        return PostResponse.builder()
                .id(post.getId())
                .writerId(post.getMember().getId())
                .writerName(post.getMember().getName())
                .title(post.getTitle())
                .content(post.getContent())
                .isDifferentGym(post.isDifferentGym())
                .gymPlace(post.getGymPlace())
                .meetDateTime(post.getMeetDateTime())
                .maxMember(post.getMaxMember())
                .memberCount(post.getMemberCount())
                .isApplied(isApplied)
                .createdAt(post.getCreatedAt())
                .build();
    }
}