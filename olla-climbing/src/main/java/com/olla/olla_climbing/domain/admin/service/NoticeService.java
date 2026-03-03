package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.request.NoticeCreateRequest;
import com.olla.olla_climbing.domain.admin.dto.request.NoticeUpdateRequest;
import com.olla.olla_climbing.domain.admin.dto.response.NoticeResponse;
import com.olla.olla_climbing.domain.admin.entity.Notice;
import com.olla.olla_climbing.domain.admin.repository.NoticeRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public NoticeResponse createNotice(String loginId, NoticeCreateRequest request) {
        // 커뮤니티 코드와 동일하게 loginId로 회원 조회
        Member admin = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("관리자 정보를 찾을 수 없습니다."));

        Notice notice = Notice.builder()
                .member(admin)
                .title(request.getTitle())
                .content(request.getContent())
                .imageUrl(request.getImageUrl())
                .isImportant(request.isImportant())
                .build();

        noticeRepository.save(notice);
        return NoticeResponse.from(notice);
    }

    @Transactional
    public NoticeResponse updateNotice(Long noticeId, NoticeUpdateRequest request) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공지사항입니다."));

        notice.updateNotice(request.getTitle(), request.getContent(), request.getImageUrl(), request.isImportant());
        return NoticeResponse.from(notice);
    }

    @Transactional
    public void deleteNotice(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공지사항입니다."));

        noticeRepository.delete(notice);
    }
}