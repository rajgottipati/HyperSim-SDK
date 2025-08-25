package io.hypersim.conformance;

import java.util.HashMap;
import java.util.Map;

public class TestResult {
    private String testId;
    private String description;
    private boolean success;
    private double executionTimeMs;
    private double memoryUsageMB;
    private Object result;
    private ErrorDetails error;
    private TestMetadata metadata;
    
    private TestResult() {}
    
    public static TestResult success(String testId, String description, double executionTimeMs, 
                                   double memoryUsageMB, Object result) {
        TestResult testResult = new TestResult();
        testResult.testId = testId;
        testResult.description = description;
        testResult.success = true;
        testResult.executionTimeMs = executionTimeMs;
        testResult.memoryUsageMB = memoryUsageMB;
        testResult.result = result;
        testResult.metadata = new TestMetadata("java", System.currentTimeMillis(), "1.0.0");
        return testResult;
    }
    
    public static TestResult failure(String testId, String description, double executionTimeMs, 
                                   double memoryUsageMB, String errorType, String errorMessage) {
        TestResult testResult = new TestResult();
        testResult.testId = testId;
        testResult.description = description;
        testResult.success = false;
        testResult.executionTimeMs = executionTimeMs;
        testResult.memoryUsageMB = memoryUsageMB;
        testResult.error = new ErrorDetails(errorMessage, errorType);
        testResult.metadata = new TestMetadata("java", System.currentTimeMillis(), "1.0.0");
        return testResult;
    }
    
    // Getters
    public String getTestId() { return testId; }
    public String getDescription() { return description; }
    public boolean isSuccess() { return success; }
    public double getExecutionTimeMs() { return executionTimeMs; }
    public double getMemoryUsageMB() { return memoryUsageMB; }
    public Object getResult() { return result; }
    public ErrorDetails getError() { return error; }
    public TestMetadata getMetadata() { return metadata; }
}

class ErrorDetails {
    private String message;
    private String errorType;
    
    public ErrorDetails(String message, String errorType) {
        this.message = message;
        this.errorType = errorType;
    }
    
    public String getMessage() { return message; }
    public String getErrorType() { return errorType; }
}

class TestMetadata {
    private String language;
    private long timestamp;
    private String sdkVersion;
    
    public TestMetadata(String language, long timestamp, String sdkVersion) {
        this.language = language;
        this.timestamp = timestamp;
        this.sdkVersion = sdkVersion;
    }
    
    public String getLanguage() { return language; }
    public long getTimestamp() { return timestamp; }
    public String getSdkVersion() { return sdkVersion; }
}
