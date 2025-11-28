package com.example.utils;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import timber.log.Timber;

import java.util.Arrays;

/**
 * 现代化日志工具类 - 基于 Timber 封装
 * 提供不同环境的日志策略、自定义格式和分类功能
 */
public class LogUtils {

    private static boolean isInitialized = false;
    
    // 日志分类枚举
    public enum LogCategory {
        NETWORK("[NETWORK] "),      // 网络请求相关
        DATABASE("[DATABASE] "),    // 数据库操作
        UI("[UI] "),               // 界面操作
        BUSINESS("[BUSINESS] "),    // 业务逻辑
        SECURITY("[SECURITY] "),    // 安全相关
        PERFORMANCE("[PERFORMANCE] "), // 性能监控
        DEFAULT("[DEFAULT] ");      // 默认分类
        
        private final String prefix;
        
        LogCategory(String prefix) {
            this.prefix = prefix;
        }
        
        public String getPrefix() {
            return prefix;
        }
    }

    /**
     * 初始化日志工具类
     * 应在 Application 的 onCreate 方法中调用
     */
    public static void init() {
        if (!isInitialized) {
            if (isDebugBuild()) {
                // Debug 版本：输出完整日志信息
                Timber.plant(new DebugTree());
            } else {
                // Release 版本：只记录重要信息，或完全不记录
                Timber.plant(new ReleaseTree());
            }
            isInitialized = true;
        }
    }

    /**
     * 获取当前构建是否为调试版本
     */
    private static boolean isDebugBuild() {
        // 这里需要根据您的项目配置来判断
        // 通常可以通过 BuildConfig.DEBUG 来判断
        try {
            Class<?> buildConfigClass = Class.forName("com.example.windowsandroidconnect.BuildConfig");
            return buildConfigClass.getField("DEBUG").getBoolean(null);
        } catch (Exception e) {
            // 如果无法获取 BuildConfig，则默认为 debug 模式
            return true;
        }
    }

    /**
     * 自定义 DebugTree，添加更多日志信息
     */
    private static class DebugTree extends Timber.DebugTree {
        @Override
        protected void log(int priority, String tag, @NonNull String message, Throwable t) {
            // 添加线程信息和方法调用栈
            String fullTag = createFullTag(tag);
            String formattedMessage = formatMessage(message);
            
            super.log(priority, fullTag, formattedMessage, t);
        }

        @Override
        protected String createStackElementTag(@NonNull StackTraceElement element) {
            // 自定义标签格式：[ClassName.methodName:lineNumber]
            return String.format("[%s.%s():%d]", 
                element.getClassName(),
                element.getMethodName(),
                element.getLineNumber()
            );
        }

        /**
         * 添加线程信息到日志，支持分类
         */
        private String formatMessage(String message) {
            return String.format("[Thread: %s] %s", 
                Thread.currentThread().getName(), 
                message
            );
        }

        /**
         * 创建完整的标签
         */
        private String createFullTag(String tag) {
            if (tag == null) {
                StackTraceElement[] stackTrace = new Throwable().getStackTrace();
                if (stackTrace.length > 6) {
                    return super.createStackElementTag(stackTrace[6]);
                } else if (stackTrace.length > 0){
                    return super.createStackElementTag(stackTrace[stackTrace.length - 1]);
                } else {
                    return "LogUtils";
                }
            }
            return tag;
        }
    }

    /**
     * 自定义 ReleaseTree，用于生产环境
     * 可选择性记录日志或完全不记录
     */
    private static class ReleaseTree extends Timber.Tree {
        private static final int MAX_LOG_LENGTH = 4000;

        @Override
        protected boolean isLoggable(String tag, int priority) {
            // 在发布版本中，只记录 Error、Assert 级别的日志
            return priority >= Log.ERROR;
        }

        @Override
        protected void log(int priority, String tag, @NonNull String message, Throwable t) {
            if (!isLoggable(tag, priority)) {
                return;
            }

            // 对于发布版本，可以在这里添加日志上报功能
            // 例如发送错误日志到服务器
            if (priority >= Log.ERROR) {
                reportError(tag, message, t);
            }

            // 如果仍需要输出到控制台（仅限错误），可以取消下面注释
            // logChunk(priority, tag, message);
        }

        /**
         * 分割长日志消息
         */
        private void logChunk(int priority, String tag, String msg) {
            if (msg.length() <= MAX_LOG_LENGTH) {
                Log.println(priority, tag, msg);
                return;
            }

            for (int i = 0; i < msg.length(); i += MAX_LOG_LENGTH) {
                int end = Math.min(msg.length(), i + MAX_LOG_LENGTH);
                Log.println(priority, tag, msg.substring(i, end));
            }
        }

        /**
         * 错误上报功能（示例）
         */
        private void reportError(String tag, String message, Throwable throwable) {
            // 这里可以集成您的错误上报服务，如 Firebase Crashlytics、Sentry 等
            // 示例：Crashlytics.logException(new Exception(tag + ": " + message, throwable));
            System.out.println("Error reported: " + tag + " - " + message);
            if (throwable != null) {
                throwable.printStackTrace();
            }
        }
    }

    // ==================== 便捷的日志方法 ====================

    /**
     * Verbose 级别日志
     */
    public static void v(String message) {
        Timber.v(message);
    }

    public static void v(String message, Object... args) {
        Timber.v(message, args);
    }

    public static void v(Throwable t, String message, Object... args) {
        Timber.v(t, message, args);
    }

    /**
     * 带分类的 Verbose 级别日志
     */
    public static void v(LogCategory category, String message) {
        Timber.v(addCategoryPrefix(category, message));
    }

    public static void v(LogCategory category, String message, Object... args) {
        Timber.v(addCategoryPrefix(category, message), args);
    }

    public static void v(LogCategory category, Throwable t, String message, Object... args) {
        Timber.v(t, addCategoryPrefix(category, message), args);
    }

    /**
     * Debug 级别日志
     */
    public static void d(String message) {
        Timber.d(message);
    }

    public static void d(String message, Object... args) {
        Timber.d(message, args);
    }

    public static void d(Throwable t, String message, Object... args) {
        Timber.d(t, message, args);
    }

    /**
     * 带分类的 Debug 级别日志
     */
    public static void d(LogCategory category, String message) {
        Timber.d(addCategoryPrefix(category, message));
    }

    public static void d(LogCategory category, String message, Object... args) {
        Timber.d(addCategoryPrefix(category, message), args);
    }

    public static void d(LogCategory category, Throwable t, String message, Object... args) {
        Timber.d(t, addCategoryPrefix(category, message), args);
    }

    /**
     * Info 级别日志
     */
    public static void i(String message) {
        Timber.i(message);
    }

    public static void i(String message, Object... args) {
        Timber.i(message, args);
    }

    public static void i(Throwable t, String message, Object... args) {
        Timber.i(t, message, args);
    }

    /**
     * 带分类的 Info 级别日志
     */
    public static void i(LogCategory category, String message) {
        Timber.i(addCategoryPrefix(category, message));
    }

    public static void i(LogCategory category, String message, Object... args) {
        Timber.i(addCategoryPrefix(category, message), args);
    }

    public static void i(LogCategory category, Throwable t, String message, Object... args) {
        Timber.i(t, addCategoryPrefix(category, message), args);
    }

    /**
     * Warn 级别日志
     */
    public static void w(String message) {
        Timber.w(message);
    }

    public static void w(String message, Object... args) {
        Timber.w(message, args);
    }

    public static void w(Throwable t, String message, Object... args) {
        Timber.w(t, message, args);
    }

    /**
     * 带分类的 Warn 级别日志
     */
    public static void w(LogCategory category, String message) {
        Timber.w(addCategoryPrefix(category, message));
    }

    public static void w(LogCategory category, String message, Object... args) {
        Timber.w(addCategoryPrefix(category, message), args);
    }

    public static void w(LogCategory category, Throwable t, String message, Object... args) {
        Timber.w(t, addCategoryPrefix(category, message), args);
    }

    /**
     * Error 级别日志
     */
    public static void e(String message) {
        Timber.e(message);
    }

    public static void e(String message, Object... args) {
        Timber.e(message, args);
    }

    public static void e(Throwable t, String message, Object... args) {
        Timber.e(t, message, args);
    }

    /**
     * 带分类的 Error 级别日志
     */
    public static void e(LogCategory category, String message) {
        Timber.e(addCategoryPrefix(category, message));
    }

    public static void e(LogCategory category, String message, Object... args) {
        Timber.e(addCategoryPrefix(category, message), args);
    }

    public static void e(LogCategory category, Throwable t, String message, Object... args) {
        Timber.e(t, addCategoryPrefix(category, message), args);
    }

    /**
     * Assert 级别日志
     */
    public static void wtf(String message) {
        Timber.wtf(message);
    }

    public static void wtf(String message, Object... args) {
        Timber.wtf(message, args);
    }

    public static void wtf(Throwable t, String message, Object... args) {
        Timber.wtf(t, message, args);
    }

    /**
     * 带分类的 Assert 级别日志
     */
    public static void wtf(LogCategory category, String message) {
        Timber.wtf(addCategoryPrefix(category, message));
    }

    public static void wtf(LogCategory category, String message, Object... args) {
        Timber.wtf(addCategoryPrefix(category, message), args);
    }

    public static void wtf(LogCategory category, Throwable t, String message, Object... args) {
        Timber.wtf(t, addCategoryPrefix(category, message), args);
    }

    /**
     * JSON 格式日志（如果需要）
     */
    public static void json(@Nullable String json) {
        if (json == null || json.trim().isEmpty()) {
            d("JSON is null or empty");
            return;
        }
        Timber.d(json);
    }

    /**
     * 带分类的 JSON 格式日志
     */
    public static void json(LogCategory category, @Nullable String json) {
        if (json == null || json.trim().isEmpty()) {
            d(category, "JSON is null or empty");
            return;
        }
        Timber.d(addCategoryPrefix(category, json));
    }

    /**
     * 自定义标签的日志方法
     */
    public static void tag(String tag) {
        Timber.tag(tag);
    }

    /**
     * 为消息添加分类前缀
     */
    private static String addCategoryPrefix(LogCategory category, String message) {
        if (category == null) {
            return message;
        }
        return category.getPrefix() + message;
    }
}