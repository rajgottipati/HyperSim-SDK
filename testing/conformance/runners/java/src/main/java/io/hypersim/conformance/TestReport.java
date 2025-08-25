package io.hypersim.conformance;

import java.util.List;

public class TestReport {
    private TestSummary summary;
    private List<TestResult> detailedResults;
    private PerformanceMetrics performanceMetrics;
    
    private TestReport() {}
    
    public static Builder builder() {
        return new Builder();
    }
    
    // Getters
    public TestSummary getSummary() { return summary; }
    public List<TestResult> getDetailedResults() { return detailedResults; }
    public PerformanceMetrics getPerformanceMetrics() { return performanceMetrics; }
    
    public static class Builder {
        private final TestReport report = new TestReport();
        
        public Builder summary(TestSummary summary) {
            report.summary = summary;
            return this;
        }
        
        public Builder detailedResults(List<TestResult> detailedResults) {
            report.detailedResults = detailedResults;
            return this;
        }
        
        public Builder performanceMetrics(PerformanceMetrics performanceMetrics) {
            report.performanceMetrics = performanceMetrics;
            return this;
        }
        
        public TestReport build() {
            return report;
        }
    }
}

class TestSummary {
    private String language;
    private int totalTests;
    private int passed;
    private int failed;
    private double successRate;
    private double averageExecutionTimeMs;
    private double totalMemoryUsageMB;
    private long timestamp;
    
    private TestSummary() {}
    
    public static Builder builder() {
        return new Builder();
    }
    
    // Getters
    public String getLanguage() { return language; }
    public int getTotalTests() { return totalTests; }
    public int getPassed() { return passed; }
    public int getFailed() { return failed; }
    public double getSuccessRate() { return successRate; }
    public double getAverageExecutionTimeMs() { return averageExecutionTimeMs; }
    public double getTotalMemoryUsageMB() { return totalMemoryUsageMB; }
    public long getTimestamp() { return timestamp; }
    
    public static class Builder {
        private final TestSummary summary = new TestSummary();
        
        public Builder language(String language) {
            summary.language = language;
            return this;
        }
        
        public Builder totalTests(int totalTests) {
            summary.totalTests = totalTests;
            return this;
        }
        
        public Builder passed(int passed) {
            summary.passed = passed;
            return this;
        }
        
        public Builder failed(int failed) {
            summary.failed = failed;
            return this;
        }
        
        public Builder successRate(double successRate) {
            summary.successRate = successRate;
            return this;
        }
        
        public Builder averageExecutionTimeMs(double averageExecutionTimeMs) {
            summary.averageExecutionTimeMs = averageExecutionTimeMs;
            return this;
        }
        
        public Builder totalMemoryUsageMB(double totalMemoryUsageMB) {
            summary.totalMemoryUsageMB = totalMemoryUsageMB;
            return this;
        }
        
        public Builder timestamp(long timestamp) {
            summary.timestamp = timestamp;
            return this;
        }
        
        public TestSummary build() {
            return summary;
        }
    }
}

class PerformanceMetrics {
    private java.util.List<java.util.Map<String, Object>> executionTimes;
    private java.util.List<java.util.Map<String, Object>> memoryUsage;
    
    private PerformanceMetrics() {}
    
    public static Builder builder() {
        return new Builder();
    }
    
    // Getters
    public java.util.List<java.util.Map<String, Object>> getExecutionTimes() { return executionTimes; }
    public java.util.List<java.util.Map<String, Object>> getMemoryUsage() { return memoryUsage; }
    
    public static class Builder {
        private final PerformanceMetrics metrics = new PerformanceMetrics();
        
        public Builder executionTimes(java.util.List<java.util.Map<String, Object>> executionTimes) {
            metrics.executionTimes = executionTimes;
            return this;
        }
        
        public Builder memoryUsage(java.util.List<java.util.Map<String, Object>> memoryUsage) {
            metrics.memoryUsage = memoryUsage;
            return this;
        }
        
        public PerformanceMetrics build() {
            return metrics;
        }
    }
}
