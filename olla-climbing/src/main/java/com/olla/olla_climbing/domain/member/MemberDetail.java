package com.olla.olla_climbing.domain.member;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// 회원의 상세 정보 엔티티: 나중에 입력하는 정보들을 담는 테이블
// ERD에서는 MemberDetail 테이블로 표현, Member와 1:1 관계, PK는 memberId(FK)
// (access = AccessLevel.PROTECTED): JPA가 객체를 만들 때 기본 생성자(public MemberDetail() {})를 사용해야 하는데, 아무나 이 생성자를 쓰지 못하게 protected로 막음. 대신에 MemberDetail(Member member) 생성자를 만들어서 Member 객체를 받아서 연결할 수 있게 함.
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberDetail {

    @Id
    private Long memberId; // PK이자 FK

    // @MapsId: MemberDetail의 PK인 memberId가 Member의 PK와 같다는 뜻, 즉 MemberDetail의 PK를 Member의 PK로 사용하겠다는 의미. 이렇게 하면 MemberDetail을 저장할 때 Member 객체를 먼저 저장해야 하고, 그 Member 객체의 ID가 MemberDetail의 memberId로 자동으로 들어감.
    @MapsId
    @OneToOne(fetch = FetchType.LAZY)   // Member 파일에서 mappedBy = "member"로 양방향 매핑 설정했으므로, 여기서는 그냥 @OneToOne만 써주면 됨
    @JoinColumn(name = "member_id") // DB 컬럼 이름 명시, ERD에서는 member_id로 표현
    private Member member;

    // "나중 입력"이므로 Null이 들어갈 수 있는 Wrapper Class 사용
    // Wrapper Class: int -> Integer, double -> Double 등, Null 허용
    private Integer age;

    private Double height;

    private Double weight;

    private Double armSpan;

    private Double footSize;

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