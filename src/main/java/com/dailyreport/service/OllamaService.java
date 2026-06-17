package com.dailyreport.service;

import com.dailyreport.model.OllamaRequest;
import com.dailyreport.model.OllamaResponse;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

@Service
public class OllamaService {

    @Value("${ollama.api.url:http://localhost:11434}")
    private String ollamaApiUrl;

    @Value("${ollama.api.model:llama2}")
    private String defaultModel;

    private final Gson gson = new Gson();

    /**
     * Ollama API 상태 확인 (로컬 Ollama 서버 실행 여부 확인)
     */
    public boolean isOllamaAvailable() {
        try {
            String url = ollamaApiUrl + "/api/tags";
            HttpPost request = new HttpPost(url);
            request.setHeader("Content-Type", "application/json");

            try (CloseableHttpClient client = HttpClients.createDefault()) {
                var response = client.execute(request);
                return response.getCode() == 200;
            }
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 동기적 AI 생성 요청
     */
    public String generateSummary(String prompt) {
        try {
            return generateSummaryWithModel(prompt, defaultModel);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 지정된 모델로 생성
     */
    public String generateSummaryWithModel(String prompt, String model) {
        try {
            String url = ollamaApiUrl + "/api/generate";

            OllamaRequest ollamaRequest = OllamaRequest.builder()
                    .model(model)
                    .prompt(prompt)
                    .stream(false)
                    .temperature(0)
                    .topK(40)
                    .topP(0.9)
                    .build();

            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader("Content-Type", "application/json");
            httpPost.setEntity(new StringEntity(gson.toJson(ollamaRequest), StandardCharsets.UTF_8));

            try (CloseableHttpClient client = HttpClients.createDefault()) {
                var httpResponse = client.execute(httpPost);

                if (httpResponse.getCode() == 200 && httpResponse.getEntity() != null) {
                    String responseBody = new String(
                            httpResponse.getEntity().getContent().readAllBytes(),
                            StandardCharsets.UTF_8
                    );

                    try {
                        JsonObject jsonResponse = JsonParser.parseString(responseBody).getAsJsonObject();
                        return jsonResponse.has("response") ? 
                               jsonResponse.get("response").getAsString() : "No response";
                    } catch (Exception e) {
                        return responseBody;
                    }
                } else {
                    return "Error: HTTP " + httpResponse.getCode();
                }
            }
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 비동기적 AI 생성 요청
     */
    public CompletableFuture<String> generateSummaryAsync(String prompt) {
        return CompletableFuture.supplyAsync(() -> generateSummary(prompt));
    }

    /**
     * Ollama 설정 업데이트
     */
    public void setOllamaApiUrl(String url) {
        this.ollamaApiUrl = url;
    }

    /**
     * 기본 모델 설정 업데이트
     */
    public void setDefaultModel(String model) {
        this.defaultModel = model;
    }

    /**
     * 현재 설정된 API URL 반환
     */
    public String getOllamaApiUrl() {
        return ollamaApiUrl;
    }

    /**
     * 현재 기본 모델 반환
     */
    public String getDefaultModel() {
        return defaultModel;
    }

}
