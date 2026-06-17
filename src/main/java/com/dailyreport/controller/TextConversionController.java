package com.dailyreport.controller;

import com.dailyreport.service.TextConversionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/convert")
@CrossOrigin(origins = "*")
public class TextConversionController {

    @Autowired
    private TextConversionService textConversionService;

    /**
     * 텍스트를 비즈니스 일지 형식으로 정제
     */
    @PostMapping("/business-format")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> convertToBusinessFormat(
            @RequestBody Map<String, String> request) {
        try {
            String rawText = request.getOrDefault("text", "");

            if (rawText.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "입력 텍스트가 비어있습니다");
                return CompletableFuture.completedFuture(ResponseEntity.badRequest().body(response));
            }

            return textConversionService.convertToBusinessFormatAsync(rawText)
                    .thenApply(convertedText -> {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        response.put("originalText", rawText);
                        response.put("convertedText", convertedText);
                        return ResponseEntity.ok(response);
                    })
                    .exceptionally(ex -> {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", false);
                        response.put("error", ex.getMessage());
                        return ResponseEntity.badRequest().body(response);
                    });
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return CompletableFuture.completedFuture(ResponseEntity.badRequest().body(response));
        }
    }

    /**
     * 빠른 간단한 정제
     */
    @PostMapping("/simple")
    public ResponseEntity<Map<String, Object>> convertSimple(
            @RequestBody Map<String, String> request) {
        try {
            String rawText = request.getOrDefault("text", "");

            if (rawText.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "입력 텍스트가 비어있습니다");
                return ResponseEntity.badRequest().body(response);
            }

            String convertedText = textConversionService.convertSimple(rawText);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("convertedText", convertedText);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 마크다운 형식으로 정제
     */
    @PostMapping("/markdown")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> convertToMarkdown(
            @RequestBody Map<String, String> request) {
        try {
            String rawText = request.getOrDefault("text", "");

            if (rawText.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "입력 텍스트가 비어있습니다");
                return CompletableFuture.completedFuture(ResponseEntity.badRequest().body(response));
            }

            return textConversionService.convertToBusinessFormatAsync(rawText)
                    .thenApply(convertedText -> {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        response.put("convertedText", convertedText);
                        return ResponseEntity.ok(response);
                    })
                    .exceptionally(ex -> {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", false);
                        response.put("error", ex.getMessage());
                        return ResponseEntity.badRequest().body(response);
                    });
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return CompletableFuture.completedFuture(ResponseEntity.badRequest().body(response));
        }
    }

}
