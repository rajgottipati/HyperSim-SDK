package io.hypersim.sdk.plugins;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark plugin methods as hooks.
 * 
 * Hook methods are automatically registered with the plugin
 * system and called at appropriate lifecycle events.
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 * @since 1.0.0
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Hook {
    
    /**
     * The name of the hook event.
     * 
     * Common hook names include:
     * - "before-simulation"
     * - "after-simulation"
     * - "before-ai-analysis"
     * - "after-ai-analysis"
     * - "on-error"
     * - "on-connect"
     * - "on-disconnect"
     * 
     * @return the hook event name
     */
    String value();
}
