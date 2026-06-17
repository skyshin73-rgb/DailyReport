package com.dailyreport.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class BulkUploadService {

    @Autowired
    private ReportService reportService;

    private static final Pattern ISO_DATE_PATTERN = Pattern.compile("\\b(20\\d{2})[-./](0[1-9]|1[0-2])[-./](0[1-9]|[12]\\d|3[01])\\b");
    private static final Pattern SHORT_DATE_PATTERN = Pattern.compile("\\b(\\d{2})(0[1-9]|1[0-2])([0-2]\\d|3[01])\\b");

    public Map<String, Object> processTextFiles(MultipartFile[] files) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, String>> details = new ArrayList<>();
        int processedCount = 0;
        int skippedCount = 0;

        if (files == null || files.length == 0) {
            result.put("success", false);
            result.put("error", "업로드할 파일이 없습니다.");
            return result;
        }

        for (MultipartFile file : files) {
            Map<String, String> fileResult = new HashMap<>();
            fileResult.put("fileName", file.getOriginalFilename());

            try {
                if (file.isEmpty()) {
                    fileResult.put("status", "empty");
                    fileResult.put("message", "파일이 비어 있습니다.");
                    skippedCount++;
                    details.add(fileResult);
                    continue;
                }

                String content = readTextFile(file);
                String reportDate = extractDateFromText(content, file.getOriginalFilename());
                String title = deriveTitle(content, file.getOriginalFilename());

                if (reportDate == null) {
                    fileResult.put("status", "skipped");
                    fileResult.put("message", "날짜를 추출할 수 없어 건너뛰었습니다.");
                    skippedCount++;
                    details.add(fileResult);
                    continue;
                }

                reportService.createReport(title, content, reportDate);
                fileResult.put("status", "saved");
                fileResult.put("reportDate", reportDate);
                fileResult.put("title", title);
                processedCount++;
                details.add(fileResult);
            } catch (Exception e) {
                fileResult.put("status", "error");
                fileResult.put("message", e.getMessage());
                skippedCount++;
                details.add(fileResult);
            }
        }

        result.put("success", true);
        result.put("processedCount", processedCount);
        result.put("skippedCount", skippedCount);
        result.put("details", details);
        return result;
    }

    private String readTextFile(MultipartFile file) throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append("\n");
            }
            return builder.toString().trim();
        }
    }

    private String extractDateFromText(String content, String filename) {
        String normalized = content.replaceAll("\\r\\n", "\\n");

        Matcher isoMatcher = ISO_DATE_PATTERN.matcher(normalized);
        if (isoMatcher.find()) {
            return normalizeIsoDate(isoMatcher.group(1), isoMatcher.group(2), isoMatcher.group(3));
        }

        Matcher shortMatcher = SHORT_DATE_PATTERN.matcher(normalized);
        if (shortMatcher.find()) {
            return normalizeShortDate(shortMatcher.group(1), shortMatcher.group(2), shortMatcher.group(3));
        }

        if (filename != null) {
            Matcher filenameIso = ISO_DATE_PATTERN.matcher(filename);
            if (filenameIso.find()) {
                return normalizeIsoDate(filenameIso.group(1), filenameIso.group(2), filenameIso.group(3));
            }
            Matcher filenameShort = SHORT_DATE_PATTERN.matcher(filename);
            if (filenameShort.find()) {
                return normalizeShortDate(filenameShort.group(1), filenameShort.group(2), filenameShort.group(3));
            }
        }

        return null;
    }

    private String normalizeIsoDate(String year, String month, String day) {
        return String.format("%s-%s-%s", year, month, day);
    }

    private String normalizeShortDate(String year, String month, String day) {
        int numericYear = Integer.parseInt(year);
        String fullYear = numericYear < 50 ? "20" + String.format("%02d", numericYear) : "19" + String.format("%02d", numericYear);
        return String.format("%s-%s-%s", fullYear, month, day);
    }

    private String deriveTitle(String content, String filename) {
        if (content == null || content.isEmpty()) {
            return filename != null ? filename : "과거 일지";
        }

        String[] lines = content.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                return trimmed.length() <= 100 ? trimmed : trimmed.substring(0, 100) + "...";
            }
        }

        return filename != null ? filename : "과거 일지";
    }

}
