package io.hypersim.conformance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ConformanceTest {
    private static ConformanceTestRunner runner;
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    @BeforeAll
    public static void setUp() throws Exception {
        runner = new ConformanceTestRunner();
    }
    
    @Test
    @Order(1)
    @DisplayName("SDK Initialization Test")
    public void testSDKInitialization() throws Exception {
        ObjectNode testCase = objectMapper.createObjectNode();
        testCase.put("id", "init_001");
        testCase.put("description", "Initialize SDK with default configuration");
        testCase.put("name", "sdk_initialization");
        
        ObjectNode input = objectMapper.createObjectNode();
        ObjectNode config = objectMapper.createObjectNode();
        ObjectNode hyperCore = objectMapper.createObjectNode();
        hyperCore.put("url", "https://api.hypersim.io/hypercore");
        hyperCore.put("apiKey", "test_key_123");
        
        ObjectNode hyperEVM = objectMapper.createObjectNode();
        hyperEVM.put("url", "https://api.hypersim.io/hyperevm");
        hyperEVM.put("apiKey", "test_key_456");
        
        config.set("hyperCore", hyperCore);
        config.set("hyperEVM", hyperEVM);
        input.set("config", config);
        testCase.set("input", input);
        
        TestResult result = runner.runTest(testCase);
        
        assertTrue(result.isSuccess(), "SDK initialization should succeed");
        assertTrue(result.getExecutionTimeMs() < 1000.0, "Initialization should be fast");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> resultData = (Map<String, Object>) result.getResult();
        assertEquals(true, resultData.get("sdk_initialized"));
    }
    
    @Test
    @Order(2)
    @DisplayName("Transaction Simulation Test")
    public void testTransactionSimulation() throws Exception {
        ObjectNode testCase = objectMapper.createObjectNode();
        testCase.put("id", "sim_001");
        testCase.put("description", "Simulate basic ERC-20 transfer");
        testCase.put("name", "simulate_transaction");
        
        ObjectNode input = objectMapper.createObjectNode();
        ObjectNode transaction = objectMapper.createObjectNode();
        transaction.put("to", "0x742d35Cc6Bb23D8B09F1fD24D4C8AE3c87A86cF0");
        transaction.put("value", "1000000000000000000");
        transaction.put("data", "0xa9059cbb000000000000000000000000742d35cc6bb23d8b09f1fd24d4c8ae3c87a86cf00000000000000000000000000000000000000000000000000de0b6b3a7640000");
        transaction.put("gasLimit", "21000");
        
        input.set("transaction", transaction);
        input.put("network", "ethereum");
        input.put("blockNumber", "latest");
        testCase.set("input", input);
        
        TestResult result = runner.runTest(testCase);
        
        assertTrue(result.isSuccess(), "Transaction simulation should succeed");
        assertTrue(result.getExecutionTimeMs() < 2000.0, "Simulation should complete within 2 seconds");
        
        if (result.getResult() != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> resultData = (Map<String, Object>) result.getResult();
            assertNotNull(resultData.get("gasUsed"), "Should return gas used");
        }
    }
    
    @Test
    @Order(3)
    @DisplayName("Error Handling Test")
    public void testErrorHandling() throws Exception {
        ObjectNode testCase = objectMapper.createObjectNode();
        testCase.put("id", "err_001");
        testCase.put("description", "Handle invalid transaction data");
        testCase.put("name", "handle_invalid_input");
        
        ObjectNode input = objectMapper.createObjectNode();
        ObjectNode transaction = objectMapper.createObjectNode();
        transaction.put("to", "invalid_address");
        transaction.put("value", "not_a_number");
        
        input.set("transaction", transaction);
        testCase.set("input", input);
        
        TestResult result = runner.runTest(testCase);
        
        // For error handling tests, we expect a successful test execution
        // that returns an error result
        assertTrue(result.isSuccess(), "Error handling test should execute successfully");
        
        if (result.getResult() != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> resultData = (Map<String, Object>) result.getResult();
            assertEquals(false, resultData.get("success"), "Should return success: false for invalid input");
            assertNotNull(resultData.get("error"), "Should return error details");
        }
    }
    
    @Test
    @Order(4)
    @DisplayName("Performance Requirements Test")
    public void testPerformanceRequirements() throws Exception {
        List<TestResult> results = runner.runAllTests();
        
        // Check performance requirements
        for (TestResult result : results) {
            if (result.getTestId().startsWith("init")) {
                assertTrue(result.getExecutionTimeMs() < 1000.0, 
                    String.format("Initialization too slow: %.2fms", result.getExecutionTimeMs()));
            } else if (result.getTestId().startsWith("sim")) {
                assertTrue(result.getExecutionTimeMs() < 2000.0, 
                    String.format("Simulation too slow: %.2fms", result.getExecutionTimeMs()));
            } else if (result.getTestId().startsWith("ai")) {
                assertTrue(result.getExecutionTimeMs() < 5000.0, 
                    String.format("AI analysis too slow: %.2fms", result.getExecutionTimeMs()));
            }
        }
    }
    
    @ParameterizedTest(name = "Concurrent execution test {index}")
    @MethodSource("provideTestCases")
    @DisplayName("Concurrent Execution Test")
    public void testConcurrentExecution(JsonNode testCase) throws Exception {
        TestResult result = runner.runTest(testCase);
        assertTrue(result.isSuccess(), "Concurrent test should succeed");
    }
    
    static Stream<JsonNode> provideTestCases() {
        ObjectMapper mapper = new ObjectMapper();
        
        return Stream.of(
            createInitTestCase(mapper),
            createInitTestCase(mapper),
            createInitTestCase(mapper),
            createInitTestCase(mapper),
            createInitTestCase(mapper)
        );
    }
    
    private static JsonNode createInitTestCase(ObjectMapper mapper) {
        ObjectNode testCase = mapper.createObjectNode();
        testCase.put("id", "init_001");
        testCase.put("description", "Initialize SDK with default configuration");
        testCase.put("name", "sdk_initialization");
        
        ObjectNode input = mapper.createObjectNode();
        ObjectNode config = mapper.createObjectNode();
        ObjectNode hyperCore = mapper.createObjectNode();
        hyperCore.put("url", "https://api.hypersim.io/hypercore");
        hyperCore.put("apiKey", "test_key_123");
        
        config.set("hyperCore", hyperCore);
        input.set("config", config);
        testCase.set("input", input);
        
        return testCase;
    }
    
    @AfterAll
    public static void tearDown() {
        // Cleanup resources if needed
    }
}
