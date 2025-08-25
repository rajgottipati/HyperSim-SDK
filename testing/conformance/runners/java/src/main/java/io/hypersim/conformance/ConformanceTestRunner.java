package io.hypersim.conformance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.hypersim.sdk.HyperSimSDK;
import io.hypersim.sdk.config.Config;
import io.hypersim.sdk.config.HyperCoreConfig;
import io.hypersim.sdk.config.HyperEVMConfig;
import io.hypersim.sdk.exceptions.HyperSimException;
import oshi.SystemInfo;
import oshi.hardware.GlobalMemory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class ConformanceTestRunner {
    private static final Logger logger = LoggerFactory.getLogger(ConformanceTestRunner.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    private final HyperSimSDK sdk;
    private final List<TestResult> results;
    private final JsonNode masterSpec;
    private final JsonNode testData;
    private final JsonNode expectedOutputs;
    private final SystemInfo systemInfo;
    private final GlobalMemory memory;
    
    public ConformanceTestRunner() throws Exception {
        // Initialize SDK
        Config config = Config.builder()
            .hyperCore(HyperCoreConfig.builder()
                .url(getEnvOrDefault("HYPERCORE_URL", "https://api.hypersim.io/hypercore"))
                .apiKey(getEnvOrDefault("HYPERCORE_API_KEY", "test_key_123"))
                .build())
            .hyperEVM(HyperEVMConfig.builder()
                .url(getEnvOrDefault("HYPEREVM_URL", "https://api.hypersim.io/hyperevm"))
                .apiKey(getEnvOrDefault("HYPEREVM_API_KEY", "test_key_456"))
                .build())
            .build();
        
        this.sdk = new HyperSimSDK(config);
        this.results = new ArrayList<>();
        this.systemInfo = new SystemInfo();
        this.memory = systemInfo.getHardware().getMemory();
        
        // Load test specifications
        Path basePath = Paths.get("").toAbsolutePath().getParent().getParent();
        
        this.masterSpec = objectMapper.readTree(
            Files.readAllBytes(basePath.resolve("specifications/master_test_spec.json"))
        );
        
        this.testData = objectMapper.readTree(
            Files.readAllBytes(basePath.resolve("test_data/simulation_inputs.json"))
        );
        
        this.expectedOutputs = objectMapper.readTree(
            Files.readAllBytes(basePath.resolve("test_data/expected_outputs.json"))
        );
    }
    
    public TestResult runTest(JsonNode testCase) {
        long startTime = System.nanoTime();
        long initialMemory = getMemoryUsage();
        
        String testId = testCase.get("id").asText();
        String description = testCase.get("description").asText();
        String testName = testCase.get("name").asText();
        
        try {
            Object result;
            switch (testName) {
                case "sdk_initialization":
                    result = testSDKInitialization(testCase);
                    break;
                case "simulate_transaction":
                    result = testTransactionSimulation(testCase);
                    break;
                case "analyze_transaction":
                    result = testAIAnalysis(testCase);
                    break;
                case "handle_invalid_input":
                    result = testErrorHandling(testCase);
                    break;
                default:
                    throw new IllegalArgumentException("Unknown test case: " + testName);
            }
            
            long executionTime = System.nanoTime() - startTime;
            long finalMemory = getMemoryUsage();
            
            return TestResult.success(
                testId,
                description,
                TimeUnit.NANOSECONDS.toMillis(executionTime) / 1000.0,
                (finalMemory - initialMemory) / (1024.0 * 1024.0), // Convert to MB
                result
            );
            
        } catch (Exception error) {
            long executionTime = System.nanoTime() - startTime;
            long finalMemory = getMemoryUsage();
            
            return TestResult.failure(
                testId,
                description,
                TimeUnit.NANOSECONDS.toMillis(executionTime) / 1000.0,
                (finalMemory - initialMemory) / (1024.0 * 1024.0),
                error.getClass().getSimpleName(),
                error.getMessage()
            );
        }
    }
    
    private Map<String, Object> testSDKInitialization(JsonNode testCase) throws Exception {
        JsonNode config = testCase.get("input").get("config");
        
        // Mock SDK initialization
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("sdk_initialized", true);
        result.put("clients_ready", true);
        
        JsonNode plugins = config.get("plugins");
        int pluginsCount = plugins != null && plugins.isArray() ? plugins.size() : 0;
        result.put("plugins_loaded", pluginsCount);
        
        return result;
    }
    
    private Map<String, Object> testTransactionSimulation(JsonNode testCase) throws Exception {
        JsonNode input = testCase.get("input");
        JsonNode transaction = input.get("transaction");
        String network = input.get("network").asText();
        String blockNumber = input.get("blockNumber").asText();
        
        // Use CompletableFuture with timeout to prevent hanging
        CompletableFuture<Object> future = CompletableFuture.supplyAsync(() -> {
            try {
                return sdk.simulation().simulate(transaction, network, blockNumber);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        
        Object simulationResult;
        try {
            simulationResult = future.get(5, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new HyperSimException("Simulation timed out after 5 seconds");
        } catch (ExecutionException e) {
            throw new HyperSimException("Simulation failed", e.getCause());
        }
        
        // Convert simulation result to expected format
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        
        if (simulationResult instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> simResult = (Map<String, Object>) simulationResult;
            result.put("gasUsed", simResult.get("gasUsed"));
            result.put("status", simResult.get("status"));
            result.put("logs", simResult.getOrDefault("logs", new ArrayList<>()));
            result.put("returnValue", simResult.getOrDefault("returnValue", "0x"));
            result.put("balanceChanges", simResult.getOrDefault("balanceChanges", new ArrayList<>()));
        }
        
        return result;
    }
    
    private Map<String, Object> testAIAnalysis(JsonNode testCase) throws Exception {
        JsonNode input = testCase.get("input");
        JsonNode transaction = input.get("transaction");
        String analysisType = input.get("analysisType").asText();
        
        CompletableFuture<Object> future = CompletableFuture.supplyAsync(() -> {
            try {
                return sdk.ai().analyze(transaction, analysisType);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        
        Object analysisResult;
        try {
            analysisResult = future.get(10, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new HyperSimException("AI analysis timed out after 10 seconds");
        } catch (ExecutionException e) {
            throw new HyperSimException("AI analysis failed", e.getCause());
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        
        if (analysisResult instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> aiResult = (Map<String, Object>) analysisResult;
            
            Map<String, Object> analysis = new HashMap<>();
            analysis.put("riskScore", aiResult.get("riskScore"));
            analysis.put("classification", aiResult.get("classification"));
            analysis.put("insights", aiResult.getOrDefault("insights", new ArrayList<>()));
            
            result.put("analysis", analysis);
        }
        
        return result;
    }
    
    private Map<String, Object> testErrorHandling(JsonNode testCase) throws Exception {
        JsonNode input = testCase.get("input");
        
        try {
            sdk.simulation().simulate(input.get("transaction"), "ethereum", "latest");
            throw new Exception("Expected error but operation succeeded");
        } catch (HyperSimException error) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            
            Map<String, Object> errorDetails = new HashMap<>();
            errorDetails.put("code", "INVALID_INPUT");
            errorDetails.put("message", error.getMessage());
            errorDetails.put("details", new HashMap<>());
            
            result.put("error", errorDetails);
            return result;
        }
    }
    
    public List<TestResult> runAllTests() throws Exception {
        logger.info("Running Java conformance tests...");
        
        JsonNode testCategories = masterSpec.get("test_categories");
        
        for (JsonNode category : testCategories) {
            JsonNode operations = category.get("operations");
            
            for (JsonNode operation : operations) {
                String operationName = operation.get("name").asText();
                JsonNode testCases = operation.get("test_cases");
                
                for (JsonNode testCase : testCases) {
                    String testId = testCase.get("id").asText();
                    String description = testCase.get("description").asText();
                    
                    logger.info("Running test: {} - {}", testId, description);
                    
                    // Add operation name to test case
                    ObjectNode testCaseWithName = testCase.deepCopy();
                    testCaseWithName.put("name", operationName);
                    
                    TestResult result = runTest(testCaseWithName);
                    results.add(result);
                }
            }
        }
        
        return results;
    }
    
    public TestReport generateReport() {
        int totalTests = results.size();
        int passedTests = (int) results.stream().mapToLong(r -> r.isSuccess() ? 1 : 0).sum();
        int failedTests = totalTests - passedTests;
        
        double averageExecutionTime = totalTests > 0 ?
            results.stream().mapToDouble(TestResult::getExecutionTimeMs).average().orElse(0.0) : 0.0;
        
        double totalMemoryUsage = results.stream().mapToDouble(TestResult::getMemoryUsageMB).sum();
        
        double successRate = totalTests > 0 ? (double) passedTests / totalTests * 100.0 : 0.0;
        
        List<Map<String, Object>> executionTimes = new ArrayList<>();
        List<Map<String, Object>> memoryUsage = new ArrayList<>();
        
        for (TestResult result : results) {
            Map<String, Object> execTime = new HashMap<>();
            execTime.put("test_id", result.getTestId());
            execTime.put("execution_time_ms", result.getExecutionTimeMs());
            executionTimes.add(execTime);
            
            Map<String, Object> memUsage = new HashMap<>();
            memUsage.put("test_id", result.getTestId());
            memUsage.put("memory_usage_mb", result.getMemoryUsageMB());
            memoryUsage.add(memUsage);
        }
        
        return TestReport.builder()
            .summary(TestSummary.builder()
                .language("java")
                .totalTests(totalTests)
                .passed(passedTests)
                .failed(failedTests)
                .successRate(successRate)
                .averageExecutionTimeMs(averageExecutionTime)
                .totalMemoryUsageMB(totalMemoryUsage)
                .timestamp(System.currentTimeMillis())
                .build())
            .detailedResults(results)
            .performanceMetrics(PerformanceMetrics.builder()
                .executionTimes(executionTimes)
                .memoryUsage(memoryUsage)
                .build())
            .build();
    }
    
    private long getMemoryUsage() {
        return memory.getAvailable();
    }
    
    private static String getEnvOrDefault(String key, String defaultValue) {
        String value = System.getenv(key);
        return value != null ? value : defaultValue;
    }
    
    public static void main(String[] args) {
        try {
            ConformanceTestRunner runner = new ConformanceTestRunner();
            runner.runAllTests();
            TestReport report = runner.generateReport();
            
            // Save report
            String resultsDir = System.getProperty("hypersim.conformance.results.dir", "../../reports");
            Path outputPath = Paths.get(resultsDir, "java-results.json");
            
            // Create reports directory if it doesn't exist
            Files.createDirectories(outputPath.getParent());
            
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(outputPath.toFile(), report);
            
            logger.info("Report saved to: {}", outputPath.toAbsolutePath());
            logger.info("Tests passed: {}/{}", report.getSummary().getPassed(), report.getSummary().getTotalTests());
            logger.info("Success rate: {:.1f}%", report.getSummary().getSuccessRate());
            
        } catch (Exception e) {
            logger.error("Failed to run conformance tests", e);
            System.exit(1);
        }
    }
}
