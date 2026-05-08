package com.olla.olla_climbing.domain.member.repository;

import com.olla.olla_climbing.domain.member.entity.Member;
import org.springframework.data.jpa.repository.EntityGraph;
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

    // 마이페이지 내 정보 조회용 (쿼리 1방에 다 가져옴)
    @EntityGraph(attributePaths = {"memberDetail", "memberPrivacy", "notificationSetting"})
    Optional<Member> findWithDetailsByLoginId(String loginId);

    // 관리자용: 이름으로 회원 검색 (부분 일치, 페이징 지원)
    // 페이징? Pageable 인터페이스를 사용하여 페이지 번호, 페이지 크기, 정렬 등을 지정할 수 있음
    // SQL: select * from member where name like '%?%' limit ?, ?
    Page<Member> findByNameContaining(String name, Pageable pageable);

    // 전화번호로 회원 찾기 (O2O 병합용)
    Optional<Member> findByPhone(String phone);

    // 삭제되지 않은 회원 중 전화번호로 조회 (중복 가입 방지 및 아이디 찾기용)
    Optional<Member> findByPhoneAndIsDeletedFalse(String phone);

    // 로그인 아이디와 이메일로 회원 찾기 (비밀번호 찾기용)
    Optional<Member> findByLoginIdAndEmail(String loginId, String email);

    // 로그인 아이디로 삭제되지 않은 회원 찾기
    Optional<Member> findByLoginIdAndIsDeletedFalse(String loginId);
}
