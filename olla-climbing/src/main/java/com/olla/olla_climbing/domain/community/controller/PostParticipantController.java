package com.olla.olla_climbing.domain.community.controller;

import com.olla.olla_climbing.domain.community.service.PostParticipantService;
import com.olla.olla_climbing.domain.member.entity.Member;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/posts/{postId}/participants")
@RequiredArgsConstructor
public class PostParticipantController {

    private final PostParticipantService participantService;

    @PostMapping
    @Operation(summary = "모집글 참여하기", description = "특정 운동 모집글에 참여 신청을 합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> joinPost(@PathVariable("postId") Long postId, @AuthenticationPrincipal Member member) {

        // PathVariable: URL 경로에서 postId를 추출하여 Long 타입으로 받습니다.
        // AuthenticationPrincipal: Spring Security에서 인증된 사용자의 정보를 Member 객체로 주입받습니다.

        if (member == null) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }

        participantService.joinPost(postId, member.getLoginId());
        return ResponseEntity.ok("모집글 참여가 완료되었습니다.");
    }

    @DeleteMapping
    @Operation(summary = "모집글 참여 취소", description = "참여했던 운동 모집글에서 나갑니다.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<String> cancelJoin(
            @PathVariable("postId") Long postId,
            @AuthenticationPrincipal Member member) {

        if (member == null) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }

        participantService.cancelJoin(postId, member.getLoginId());
        return ResponseEntity.ok("참여가 취소되었습니다.");
    }
}