package com.olla.olla_climbing.domain.member.repository;

import com.olla.olla_climbing.domain.member.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    // 로그인 아이디로 회원을 찾는 메서드
    // SQL: select * from member where login_id = ?
    Optional<Member> findByLoginId(String loginId);
}
