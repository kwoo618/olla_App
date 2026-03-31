package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.AdminAlert;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAlertRepository extends JpaRepository<AdminAlert, Long> {
}