package com.olla.olla_climbing.domain.community.dto.response;

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
    private String title;
    private String content;
    private boolean isDifferentGym;
    private String gymPlace;
    private LocalDateTime meetDateTime;
    private int maxMember;
    private int memberCount;
    private LocalDateTime createdAt;

    private int viewCount;    // 조회수
    private long likeCount;   // 좋아요 총 개수
    private boolean isApplied; // 내가 참여 신청했는지 여부
    private boolean isLiked;   // 내가 좋아요 눌렀는지 여부

    public static PostResponse of(Post post, boolean isApplied, boolean isLiked, long likeCount) {
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
                .createdAt(post.getCreatedAt())
                .viewCount(post.getViewCount())
                .likeCount(likeCount)
                .isApplied(isApplied)
                .isLiked(isLiked)
                .build();
    }
}