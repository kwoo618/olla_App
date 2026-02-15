package com.olla.olla_climbing.domain.member.dto.response;

import com.olla.olla_climbing.domain.member.Member;
import lombok.Builder;
import lombok.Getter;

// 회원 정보 응답 DTO
// DTO는 Entity와 달리, 클라이언트에게 필요한 정보만 담아서 전달하는 객체
// Builder 패턴? 생성자 대신 빌더 패턴을 사용하여 객체를 생성할 수 있도록 하는 Lombok 어노테이션
@Getter
@Builder
public class MemberResponse {
    private Long id;
    private String loginId;
    private String name;
    private String email;
    private String phone;

    // MemberDetail 정보
    private Integer age;
    private Double height;
    private Double weight;
    private Double armSpan;
    private Double footSize;

    public static MemberResponse from(Member member) {
        return MemberResponse.builder()
                .id(member.getId())
                .loginId(member.getLoginId())
                .name(member.getName())
                .email(member.getEmail())
                .phone(member.getPhone())
                // memberDetail이 null일 수 있으므로 null 체크 후 값 할당
                .age(member.getMemberDetail() != null ? member.getMemberDetail().getAge() : null)
                .height(member.getMemberDetail() != null ? member.getMemberDetail().getHeight() : null)
                .weight(member.getMemberDetail() != null ? member.getMemberDetail().getWeight() : null)
                .armSpan(member.getMemberDetail() != null ? member.getMemberDetail().getArmSpan() : null)
                .footSize(member.getMemberDetail() != null ? member.getMemberDetail().getFootSize() : null)
                .build();
    }
}