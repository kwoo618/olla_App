package com.olla.olla_climbing.domain.community.repository;

import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
import com.olla.olla_climbing.domain.member.entity.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostParticipantRepository extends JpaRepository<PostParticipant, Long> {

    boolean existsByPostAndMember(Post post, Member member);

    Optional<PostParticipant> findByPostAndMember(Post post, Member member);

    List<PostParticipant> findByPost(Post post);

    Page<PostParticipant> findByMemberIdOrderByCreatedAtDesc(Long memberId, Pageable pageable);

    // [추가] N+1 해결: 현재 회원의 참여 목록을 한 번에 조회
    @Query("SELECT pp FROM PostParticipant pp WHERE pp.member = :member AND pp.post.id IN :postIds")
    List<PostParticipant> findByMemberAndPostIdIn(@Param("member") Member member, @Param("postIds") List<Long> postIds);
}