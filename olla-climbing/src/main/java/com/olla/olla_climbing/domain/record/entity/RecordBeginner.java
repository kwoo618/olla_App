package com.olla.olla_climbing.domain.record.entity;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.record.enums.AttemptType;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "record_beginner")
public class RecordBeginner extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 회원이 탈퇴하면 기록도 지울지, 기록은 남길지에 따라 옵션이 다르지만 보통 앱에서는 Cascade를 주거나 남겨둡니다.
    // 여기서는 회원을 지우면 기록도 지워지도록 외래키를 강하게 잡습니다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)    // Enum을 DB에 저장할 때 숫자가 아니라 문자("WHITE")로 저장해라
    @Column(nullable = false)
    private Difficulty difficulty; // 난이도 (WHITE, YELLOW 등)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttemptType attemptType; // 도전 유형 (ONE_WAY, ROUND_TRIP)

    @Column(nullable = false)
    private boolean isSuccess; // 성공(완등) 여부

    // 성공했으면 null, 실패했을 때만 도달한 홀드 번호가 들어갑니다.
    @Column(nullable = true)
    private Integer maxHoldNo;

    @Column(nullable = false)
    private LocalDate recordDate; // 기록 측정 날짜 (생성일 createdAt과는 다름, 과거 기록을 입력할 수도 있으므로)

    @Builder
    public RecordBeginner(Member member, Difficulty difficulty, AttemptType attemptType,
                          boolean isSuccess, Integer maxHoldNo, LocalDate recordDate) {
        this.member = member;
        this.difficulty = difficulty;
        this.attemptType = attemptType;
        this.isSuccess = isSuccess;
        this.recordDate = recordDate;

        // 팩트 체크: 성공했다고 체크해놓고 실수로 실패 홀드 번호를 같이 보내는 오류 방지 로직
        if (isSuccess) {
            this.maxHoldNo = null; // 성공이면 무조건 홀드 번호는 비움
        } else {
            this.maxHoldNo = maxHoldNo; // 실패면 홀드 번호 기록
        }
    }
}