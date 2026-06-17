package com.dailyreport.model;

public class OllamaRequest {

    private String model;
    private String prompt;
    private boolean stream;
    private Integer temperature;
    private Integer topK;
    private Double topP;

    // Constructors
    public OllamaRequest() {
    }

    public OllamaRequest(String model, String prompt) {
        this.model = model;
        this.prompt = prompt;
        this.stream = false;
    }

    public OllamaRequest(String model, String prompt, boolean stream, Integer temperature, Integer topK, Double topP) {
        this.model = model;
        this.prompt = prompt;
        this.stream = stream;
        this.temperature = temperature;
        this.topK = topK;
        this.topP = topP;
    }

    // Builder pattern
    public static OllamaRequestBuilder builder() {
        return new OllamaRequestBuilder();
    }

    public static class OllamaRequestBuilder {
        private String model;
        private String prompt;
        private boolean stream;
        private Integer temperature;
        private Integer topK;
        private Double topP;

        public OllamaRequestBuilder model(String model) {
            this.model = model;
            return this;
        }

        public OllamaRequestBuilder prompt(String prompt) {
            this.prompt = prompt;
            return this;
        }

        public OllamaRequestBuilder stream(boolean stream) {
            this.stream = stream;
            return this;
        }

        public OllamaRequestBuilder temperature(Integer temperature) {
            this.temperature = temperature;
            return this;
        }

        public OllamaRequestBuilder topK(Integer topK) {
            this.topK = topK;
            return this;
        }

        public OllamaRequestBuilder topP(Double topP) {
            this.topP = topP;
            return this;
        }

        public OllamaRequest build() {
            OllamaRequest request = new OllamaRequest();
            request.model = this.model;
            request.prompt = this.prompt;
            request.stream = this.stream;
            request.temperature = this.temperature;
            request.topK = this.topK;
            request.topP = this.topP;
            return request;
        }
    }

    // Getters and Setters
    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPrompt() {
        return prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public boolean isStream() {
        return stream;
    }

    public void setStream(boolean stream) {
        this.stream = stream;
    }

    public Integer getTemperature() {
        return temperature;
    }

    public void setTemperature(Integer temperature) {
        this.temperature = temperature;
    }

    public Integer getTopK() {
        return topK;
    }

    public void setTopK(Integer topK) {
        this.topK = topK;
    }

    public Double getTopP() {
        return topP;
    }

    public void setTopP(Double topP) {
        this.topP = topP;
    }

    public String toJson() {
        StringBuilder json = new StringBuilder();
        json.append("{");
        json.append("\"model\": \"").append(model).append("\", ");
        json.append("\"prompt\": \"").append(escapeJson(prompt)).append("\", ");
        json.append("\"stream\": ").append(stream);
        if (temperature != null) {
            json.append(", \"temperature\": ").append(temperature);
        }
        if (topK != null) {
            json.append(", \"top_k\": ").append(topK);
        }
        if (topP != null) {
            json.append(", \"top_p\": ").append(topP);
        }
        json.append("}");
        return json.toString();
    }

    private static String escapeJson(String str) {
        if (str == null) {
            return "";
        }
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }

}

