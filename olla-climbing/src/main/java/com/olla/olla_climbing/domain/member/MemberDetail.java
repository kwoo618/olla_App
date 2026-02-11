package com.olla.olla_climbing.domain.member;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "member_detail") // ERD 테이블명 준수
public class MemberDetail {

    @Id
    private Long memberId; // PK이자 FK

    @MapsId // Member의 PK를 내 PK로 사용
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    // "나중 입력"이므로 Null이 들어갈 수 있는 Wrapper Class 사용
    private Integer age;

    private Double height;

    private Double weight;

    @Column(name = "arm_span")
    private Double armSpan;

    @Column(name = "foot_size")
    private Double footSize;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 생성자: 처음엔 정보가 없으니 Member만 연결하고 나머지는 Null
    public MemberDetail(Member member) {
        this.member = member;
    }

    // 나중에 정보를 업데이트할 때 쓸 메서드 (Setter 대신 사용)
    public void update(Integer age, Double height, Double weight, Double armSpan, Double footSize) {
        this.age = age;
        this.height = height;
        this.weight = weight;
        this.armSpan = armSpan;
        this.footSize = footSize;
        this.updatedAt = LocalDateTime.now();
    }
}