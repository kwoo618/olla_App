package com.olla.olla_climbing.domain.community.repository;

import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostLike;
import com.olla.olla_climbing.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    boolean existsByPostAndMember(Post post, Member member);

    long countByPostId(Long postId);

    // toggleLike용
    java.util.Optional<PostLike> findByPostAndMember(Post post, Member member);

    @Query("SELECT pl FROM PostLike pl WHERE pl.member = :member AND pl.post.id IN :postIds")
    List<PostLike> findByMemberAndPostIdIn(@Param("member") Member member, @Param("postIds") List<Long> postIds);
}