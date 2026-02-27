package com.olla.olla_climbing.domain.member.repository;

import com.olla.olla_climbing.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// Member 엔티티를 관리하는 JPA 리포지토리 인터페이스
// JpaRepository를 상속받으면 기본적인 CRUD 메서드가 자동으로 제공됨 (save, findById, findAll, delete 등)
public interface MemberRepository extends JpaRepository<Member, Long> {

    // 로그인 아이디로 회원을 찾는 메서드
    // SQL: select * from member where login_id = ?
    Optional<Member> findByLoginId(String loginId);
}
