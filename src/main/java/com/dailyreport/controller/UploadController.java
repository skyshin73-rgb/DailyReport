package com.dailyreport.controller;

import com.dailyreport.service.BulkUploadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class UploadController {

    @Autowired
    private BulkUploadService bulkUploadService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadReports(@RequestParam("files") MultipartFile[] files) {
        Map<String, Object> result = bulkUploadService.processTextFiles(files);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }
}
