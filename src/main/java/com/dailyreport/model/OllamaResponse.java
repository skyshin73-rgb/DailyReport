package com.dailyreport.model;

public class OllamaResponse {

    private String model;
    private String response;
    private String createdAt;
    private Boolean done;

    // Constructors
    public OllamaResponse() {
    }

    public OllamaResponse(String model, String response, String createdAt, Boolean done) {
        this.model = model;
        this.response = response;
        this.createdAt = createdAt;
        this.done = done;
    }

    // Getters and Setters
    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getResponse() {
        return response;
    }

    public void setResponse(String response) {
        this.response = response;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public Boolean getDone() {
        return done;
    }

    public void setDone(Boolean done) {
        this.done = done;
    }

}

