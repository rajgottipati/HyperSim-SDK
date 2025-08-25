package io.hypersim.sdk.utils;

import io.hypersim.sdk.types.TransactionRequest;
import io.hypersim.sdk.types.Network;
import io.hypersim.sdk.exceptions.ValidationException;
import org.jetbrains.annotations.NotNull;

import java.math.BigInteger;
import java.util.regex.Pattern;

/**
 * Validation utilities for SDK inputs.
 * 
 * Provides comprehensive validation for transactions, addresses,
 * and other SDK parameters with clear error messages.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
public final class ValidationUtils {
    
    private static final Pattern ADDRESS_PATTERN = Pattern.compile("^0x[0-9a-fA-F]{40}$");
    private static final Pattern HEX_PATTERN = Pattern.compile("^0x[0-9a-fA-F]*$");
    
    private ValidationUtils() {
        // Utility class
    }
    
    /**
     * Validates a transaction request.
     * 
     * @param transaction the transaction to validate
     * @throws ValidationException if validation fails
     */
    public static void validateTransaction(@NotNull TransactionRequest transaction) {
        if (transaction == null) {
            throw new ValidationException("Transaction cannot be null");
        }
        
        // Validate from address
        validateAddress(transaction.from(), "from");
        
        // Validate to address if present
        if (transaction.to() != null) {
            validateAddress(transaction.to(), "to");
        }
        
        // Validate value if present
        if (transaction.value() != null) {
            validatePositiveNumber(transaction.value(), "value");
        }
        
        // Validate data if present
        if (transaction.data() != null) {
            validateHexString(transaction.data(), "data");
        }
        
        // Validate gas parameters
        if (transaction.gasLimit() != null) {
            validatePositiveNumber(transaction.gasLimit(), "gasLimit");
        }
        
        if (transaction.gasPrice() != null) {
            validatePositiveNumber(transaction.gasPrice(), "gasPrice");
        }
        
        if (transaction.maxFeePerGas() != null) {
            validatePositiveNumber(transaction.maxFeePerGas(), "maxFeePerGas");
        }
        
        if (transaction.maxPriorityFeePerGas() != null) {
            validatePositiveNumber(transaction.maxPriorityFeePerGas(), "maxPriorityFeePerGas");
        }
        
        // Validate nonce if present
        if (transaction.nonce() != null && transaction.nonce() < 0) {\n            throw new ValidationException(\"Nonce must be non-negative\", \"nonce\", transaction.nonce());\n        }\n        \n        // Validate transaction type\n        if (transaction.type() != null) {\n            if (transaction.type() < 0 || transaction.type() > 2) {\n                throw new ValidationException(\"Transaction type must be 0, 1, or 2\", \"type\", transaction.type());\n            }\n        }\n    }\n    \n    /**\n     * Validates an Ethereum address.\n     * \n     * @param address the address to validate\n     * @param fieldName the field name for error reporting\n     * @throws ValidationException if validation fails\n     */\n    public static void validateAddress(@NotNull String address, @NotNull String fieldName) {\n        if (address == null) {\n            throw new ValidationException(fieldName + \" address cannot be null\", fieldName, null);\n        }\n        \n        if (!ADDRESS_PATTERN.matcher(address).matches()) {\n            throw new ValidationException(\"Invalid \" + fieldName + \" address format\", fieldName, address);\n        }\n    }\n    \n    /**\n     * Validates a hex string.\n     * \n     * @param hexString the hex string to validate\n     * @param fieldName the field name for error reporting\n     * @throws ValidationException if validation fails\n     */\n    public static void validateHexString(@NotNull String hexString, @NotNull String fieldName) {\n        if (hexString == null) {\n            throw new ValidationException(fieldName + \" cannot be null\", fieldName, null);\n        }\n        \n        if (!HEX_PATTERN.matcher(hexString).matches()) {\n            throw new ValidationException(\"Invalid \" + fieldName + \" hex format\", fieldName, hexString);\n        }\n    }\n    \n    /**\n     * Validates a positive number string.\n     * \n     * @param numberString the number string to validate\n     * @param fieldName the field name for error reporting\n     * @throws ValidationException if validation fails\n     */\n    public static void validatePositiveNumber(@NotNull String numberString, @NotNull String fieldName) {\n        if (numberString == null) {\n            throw new ValidationException(fieldName + \" cannot be null\", fieldName, null);\n        }\n        \n        try {\n            BigInteger value = new BigInteger(numberString);\n            if (value.compareTo(BigInteger.ZERO) < 0) {\n                throw new ValidationException(fieldName + \" must be non-negative\", fieldName, numberString);\n            }\n        } catch (NumberFormatException e) {\n            throw new ValidationException(\"Invalid \" + fieldName + \" number format\", fieldName, numberString);\n        }\n    }\n    \n    /**\n     * Validates a network.\n     * \n     * @param network the network to validate\n     * @throws ValidationException if validation fails\n     */\n    public static void validateNetwork(@NotNull Network network) {\n        if (network == null) {\n            throw new ValidationException(\"Network cannot be null\", \"network\", null);\n        }\n    }\n    \n    /**\n     * Validates an API key.\n     * \n     * @param apiKey the API key to validate\n     * @param keyName the key name for error reporting\n     * @throws ValidationException if validation fails\n     */\n    public static void validateApiKey(@NotNull String apiKey, @NotNull String keyName) {\n        if (apiKey == null || apiKey.trim().isEmpty()) {\n            throw new ValidationException(keyName + \" cannot be null or empty\", keyName, apiKey);\n        }\n        \n        if (apiKey.length() < 10) {\n            throw new ValidationException(keyName + \" appears to be too short\", keyName, \"***\");\n        }\n    }\n}\n