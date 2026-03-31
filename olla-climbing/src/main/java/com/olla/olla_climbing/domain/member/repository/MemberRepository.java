package com.olla.olla_climbing.domain.member.repository;

import com.olla.olla_climbing.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// Member 엔티티를 관리하는 JPA 리포지토리 인터페이스
// JpaRepository를 상속받으면 기본적인 CRUD 메서드가 자동으로 제공됨 (save, findById, findAll, delete 등)
public interface MemberRepository extends JpaRepository<Member, Long> {

    // 로그인 아이디로 회원을 찾는 메서드
    // SQL: select * from member where login_id = ?
    Optional<Member> findByLoginId(String loginId);

    // 관리자용: 이름으로 회원 검색 (부분 일치, 페이징 지원)
    // 페이징? Pageable 인터페이스를 사용하여 페이지 번호, 페이지 크기, 정렬 등을 지정할 수 있음
    // SQL: select * from member where name like '%?%' limit ?, ?
    Page<Member> findByNameContaining(String name, Pageable pageable);
}
