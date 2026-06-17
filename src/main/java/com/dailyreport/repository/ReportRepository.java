package com.dailyreport.repository;

import com.dailyreport.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByReportDateOrderByCreatedAtDesc(String reportDate);

    List<Report> findByReportDateBetweenOrderByCreatedAtDesc(String startDate, String endDate);

    @Query("SELECT r FROM Report r WHERE " +
           "LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(r.content) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY r.createdAt DESC")
    List<Report> searchByKeyword(@Param("keyword") String keyword);

    @Query("SELECT r FROM Report r WHERE " +
           "r.reportDate = :reportDate AND " +
           "(LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(r.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY r.createdAt DESC")
    List<Report> searchByDateAndKeyword(@Param("reportDate") String reportDate, 
                                       @Param("keyword") String keyword);

    List<Report> findAllByOrderByCreatedAtDesc();

}
