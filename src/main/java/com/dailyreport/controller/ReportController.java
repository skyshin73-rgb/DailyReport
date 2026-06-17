package com.dailyreport.controller;

import com.dailyreport.model.Report;
import com.dailyreport.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping
    public ResponseEntity<List<Report>> getAllReports() {
        return ResponseEntity.ok(reportService.getAllReports());
    }

    @GetMapping("/date/{reportDate}")
    public ResponseEntity<List<Report>> getReportsByDate(@PathVariable String reportDate) {
        return ResponseEntity.ok(reportService.getReportsByDate(reportDate));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Report>> searchReports(
            @RequestParam String keyword,
            @RequestParam(required = false) String reportDate) {
        if (reportDate != null && !reportDate.isEmpty()) {
            return ResponseEntity.ok(reportService.searchReportsByDateAndKeyword(reportDate, keyword));
        } else {
            return ResponseEntity.ok(reportService.searchReports(keyword));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Report> getReportById(@PathVariable Long id) {
        Report report = reportService.getReportById(id);
        if (report != null) {
            return ResponseEntity.ok(report);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createReport(@RequestBody Map<String, String> request) {
        try {
            String title = request.getOrDefault("title", "Untitled");
            String content = request.getOrDefault("content", "");
            String reportDate = request.getOrDefault("reportDate", 
                    java.time.LocalDate.now().toString());

            Report report = reportService.createReport(title, content, reportDate);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Report created successfully");
            response.put("data", report);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateReport(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            String title = request.getOrDefault("title", "");
            String content = request.getOrDefault("content", "");

            Report report = reportService.updateReport(id, title, content);
            if (report != null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Report updated successfully");
                response.put("data", report);
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteReport(@PathVariable Long id) {
        try {
            reportService.deleteReport(id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Report deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

}
