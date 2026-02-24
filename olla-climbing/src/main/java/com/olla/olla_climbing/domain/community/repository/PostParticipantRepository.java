package com.olla.olla_climbing.domain.community.repository;

import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
import com.olla.olla_climbing.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

// PostParticipantRepository는 게시글 참여자(PostParticipant) 엔티티에 대한 데이터 액세스 레이어를 담당하는 인터페이스
// JpaRepository를 상속하여 기본적인 CRUD 기능을 제공하며, 추가적으로 참여 중복 체크와 참여 취소를 위한 메서드를 정의
public interface PostParticipantRepository extends JpaRepository<PostParticipant, Long> {

    // 이미 참여한 회원인지 중복 체크를 위한 메서드
    boolean existsByPostAndMember(Post post, Member member);

    // 참여 취소를 위해 특정 회원의 참여 기록을 찾는 메서드
    Optional<PostParticipant> findByPostAndMember(Post post, Member member);

   // 특정 게시글에 참여한 모든 참여자 목록을 조회하는 메서드
    List<PostParticipant> findByPost(Post post);
}