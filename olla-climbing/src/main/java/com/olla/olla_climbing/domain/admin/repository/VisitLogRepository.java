package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.VisitLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitLogRepository extends JpaRepository<VisitLog, Long> {
}