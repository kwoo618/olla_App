package com.olla.olla_climbing.domain.admin.dto.response;

import com.olla.olla_climbing.domain.admin.entity.Notice;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NoticeResponse {
    private Long id;
    private String authorName; // 작성자 이름
    private String title;
    private String content;
    private String imageUrl;
    private boolean isImportant;
    private LocalDateTime createdAt;

    public static NoticeResponse from(Notice notice) {
        return NoticeResponse.builder()
                .id(notice.getId())
                .authorName(notice.getMember().getName())
                .title(notice.getTitle())
                .content(notice.getContent())
                .imageUrl(notice.getImageUrl())
                .isImportant(notice.isImportant())
                .createdAt(notice.getCreatedAt())
                .build();
    }
}