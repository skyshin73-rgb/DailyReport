package com.dailyreport.service;

import com.dailyreport.model.Report;
import com.dailyreport.repository.ReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ReportService {

    @Autowired
    private ReportRepository reportRepository;

    public Report createReport(String title, String content, String reportDate) {
        Report report = new Report();
        report.setTitle(title);
        report.setContent(content);
        report.setReportDate(reportDate);
        report.setAiProcessed(false);
        return reportRepository.save(report);
    }

    public Report updateReport(Long id, String title, String content) {
        Optional<Report> reportOpt = reportRepository.findById(id);
        if (reportOpt.isPresent()) {
            Report report = reportOpt.get();
            report.setTitle(title);
            report.setContent(content);
            return reportRepository.save(report);
        }
        return null;
    }

    public void deleteReport(Long id) {
        reportRepository.deleteById(id);
    }

    public Report getReportById(Long id) {
        return reportRepository.findById(id).orElse(null);
    }

    public List<Report> getReportsByDate(String reportDate) {
        return reportRepository.findByReportDateOrderByCreatedAtDesc(reportDate);
    }

    public List<Report> getReportsByDateRange(String startDate, String endDate) {
        return reportRepository.findByReportDateBetweenOrderByCreatedAtDesc(startDate, endDate);
    }

    public List<Report> searchReports(String keyword) {
        return reportRepository.searchByKeyword(keyword);
    }

    public List<Report> searchReportsByDateAndKeyword(String reportDate, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return reportRepository.findByReportDateOrderByCreatedAtDesc(reportDate);
        }
        return reportRepository.searchByDateAndKeyword(reportDate, keyword);
    }

    public List<Report> getAllReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc();
    }

    public void updateAiSummary(Long id, String summary) {
        Optional<Report> reportOpt = reportRepository.findById(id);
        if (reportOpt.isPresent()) {
            Report report = reportOpt.get();
            report.setAiSummary(summary);
            report.setAiProcessed(true);
            reportRepository.save(report);
        }
    }

}
