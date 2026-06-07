package com.olla.olla_climbing.domain.community.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.olla.olla_climbing.domain.community.entity.Post;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PostResponse {
    private Long id;
    private Long writerId;
    private String writerName;
    private String profileImageUrl;
    private String title;
    private String content;
    private String gymPlace;
    private LocalDateTime meetDateTime;
    private int maxMember;
    private int memberCount;
    private LocalDateTime createdAt;
    private int viewCount;
    private long likeCount;

    // Lombok @Builder + boolean is 필드 조합 시 JSON 키가 is 없이 직렬화되는 버그 방지
    @JsonProperty("isDifferentGym")
    private boolean isDifferentGym;

    @JsonProperty("isApplied")
    private boolean isApplied;

    @JsonProperty("isLiked")
    private boolean isLiked;

    @JsonProperty("isClosed")
    private boolean isClosed;

    public static PostResponse of(Post post, boolean isApplied, boolean isLiked, long likeCount) {
        return PostResponse.builder()
                .id(post.getId())
                .writerId(post.getMember().getId())
                .writerName(post.getMember().getName())
                .profileImageUrl(post.getMember().getProfileImageUrl())
                .title(post.getTitle())
                .content(post.getContent())
                .isDifferentGym(post.isDifferentGym())
                .gymPlace(post.getGymPlace())
                .meetDateTime(post.getMeetDateTime())
                .maxMember(post.getMaxMember())
                .memberCount(post.getMemberCount())
                .createdAt(post.getCreatedAt())
                .viewCount(post.getViewCount())
                .likeCount(likeCount)
                .isApplied(isApplied)
                .isLiked(isLiked)
                .isClosed(post.isClosed())
                .build();
    }
}