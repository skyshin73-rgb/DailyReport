package com.dailyreport.controller;

import com.dailyreport.service.OllamaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/ollama")
@CrossOrigin(origins = "*")
public class OllamaController {

    @Autowired
    private OllamaService ollamaService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getOllamaStatus() {
        Map<String, Object> response = new HashMap<>();
        boolean available = ollamaService.isOllamaAvailable();
        response.put("available", available);
        response.put("apiUrl", ollamaService.getOllamaApiUrl());
        response.put("model", ollamaService.getDefaultModel());
        response.put("status", available ? "Connected" : "Disconnected");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> generateSummary(
            @RequestBody Map<String, String> request) {
        try {
            String prompt = request.getOrDefault("prompt", "");
            String model = request.getOrDefault("model", ollamaService.getDefaultModel());

            return ollamaService.generateSummaryAsync(prompt)
                    .thenApply(result -> {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        response.put("result", result);
                        response.put("model", model);
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

    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> updateOllamaConfig(
            @RequestBody Map<String, String> request) {
        try {
            String apiUrl = request.get("apiUrl");
            String model = request.get("model");

            if (apiUrl != null && !apiUrl.isEmpty()) {
                ollamaService.setOllamaApiUrl(apiUrl);
            }

            if (model != null && !model.isEmpty()) {
                ollamaService.setDefaultModel(model);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Configuration updated");
            response.put("apiUrl", ollamaService.getOllamaApiUrl());
            response.put("model", ollamaService.getDefaultModel());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

}
