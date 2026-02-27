package com.olla.olla_climbing.domain.community.dto.response;

import com.olla.olla_climbing.domain.member.entity.Member;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ParticipantDto {
    private Long memberId;
    private String name; // 닉네임 또는 이름
    // 추후 프로필 이미지 URL 등이 있다면 여기에 추가

    public static ParticipantDto from(Member member) {
        return ParticipantDto.builder()
                .memberId(member.getId())
                .name(member.getName())
                .build();
    }
}