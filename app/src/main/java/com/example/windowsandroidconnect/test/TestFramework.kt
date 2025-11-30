package com.example.windowsandroidconnect.test

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * 标准化自测框架
 * 提供统一的测试管理、Mock层支持、覆盖率数据收集和报告生成
 */
class TestFramework private constructor() {
    private val testCases = mutableListOf<TestCase>()
    private val testResults = ConcurrentHashMap<String, TestResult>()
    private val mockServices = ConcurrentHashMap<String, MockService>()
    private val testCounter = AtomicInteger(0)
    private var testSessionId = UUID.randomUUID().toString()
    private var isRunning = false
    
    companion object {
        private const val TAG = "TestFramework"
        @Volatile
        private var instance: TestFramework? = null
        
        fun getInstance(): TestFramework {
            if (instance == null) {
                synchronized(this) {
                    if (instance == null) {
                        instance = TestFramework()
                    }
                }
            }
            return instance!!
        }
    }
    
    /**
     * 测试用例数据类
     */
    data class TestCase(
        val id: String,
        val name: String,
        val type: TestType,
        val description: String = "",
        val testFunction: suspend () -> Boolean,
        val setup: (() -> Unit)? = null,
        val teardown: (() -> Unit)? = null,
        val priority: Priority = Priority.MEDIUM
    )
    
    /**
     * 测试类型枚举
     */
    enum class TestType {
        UNIT,           // 单元测试
        INTEGRATION,    // 集成测试
        API,            // API测试
        WEBSOCKET,      // WebSocket测试
        DISCOVERY,      // 设备发现测试
        SYSTEM,         // 系统测试
        PERFORMANCE     // 性能测试
    }
    
    /**
     * 测试优先级枚举
     */
    enum class Priority {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }
    
    /**
     * 测试结果数据类
     */
    data class TestResult(
        val testId: String,
        val testName: String,
        val testType: TestType,
        val status: Status,
        val startTime: Long,
        val endTime: Long,
        val duration: Long,
        val errorMessage: String? = null,
        val coverageData: CoverageData? = null
    ) {
        enum class Status {
            PASSED,
            FAILED,
            SKIPPED,
            RUNNING
        }
    }
    
    /**
     * 覆盖率数据类
     */
    data class CoverageData(
        val coveredLines: Int,
        val totalLines: Int,
        val coverageRate: Double,
        val coveredMethods: Int,
        val totalMethods: Int,
        val methodCoverageRate: Double
    )
    
    /**
     * Mock服务接口
     */
    interface MockService {
        fun start()
        fun stop()
        fun isRunning(): Boolean
        fun getServiceName(): String
    }
    
    /**
     * 注册测试用例
     */
    fun registerTestCase(
        name: String,
        type: TestType,
        description: String = "",
        setup: (() -> Unit)? = null,
        teardown: (() -> Unit)? = null,
        priority: Priority = Priority.MEDIUM,
        testFunction: suspend () -> Boolean
    ): String {
        val testId = "test-${testCounter.incrementAndGet()}"
        val testCase = TestCase(
            id = testId,
            name = name,
            type = type,
            description = description,
            setup = setup,
            teardown = teardown,
            priority = priority,
            testFunction = testFunction
        )
        testCases.add(testCase)
        Log.d(TAG, "已注册测试用例: $name (ID: $testId)")
        return testId
    }
    
    /**
     * 注册Mock服务
     */
    fun registerMockService(mockService: MockService) {
        mockServices[mockService.getServiceName()] = mockService
        Log.d(TAG, "已注册Mock服务: ${mockService.getServiceName()}")
    }
    
    /**
     * 运行所有测试用例
     */
    suspend fun runAllTests(): TestReport {
        return runTests(testCases)
    }
    
    /**
     * 运行指定类型的测试用例
     */
    suspend fun runTestsByType(type: TestType): TestReport {
        val filteredTests = testCases.filter { it.type == type }
        return runTests(filteredTests)
    }
    
    /**
     * 运行指定优先级的测试用例
     */
    suspend fun runTestsByPriority(priority: Priority): TestReport {
        val filteredTests = testCases.filter { it.priority >= priority }
        return runTests(filteredTests)
    }
    
    /**
     * 运行指定的测试用例
     */
    suspend fun runTests(testCases: List<TestCase>): TestReport {
        if (isRunning) {
            Log.w(TAG, "测试框架已在运行中")
            return generateReport()
        }
        
        isRunning = true
        testSessionId = UUID.randomUUID().toString()
        testResults.clear()
        
        Log.d(TAG, "开始运行测试，共 ${testCases.size} 个测试用例")
        Log.d(TAG, "测试会话ID: $testSessionId")
        
        // 启动所有Mock服务
        startAllMockServices()
        
        // 按优先级排序测试用例
        val sortedTests = testCases.sortedByDescending { it.priority }
        
        // 运行测试用例
        for (testCase in sortedTests) {
            runTestCase(testCase)
        }
        
        // 停止所有Mock服务
        stopAllMockServices()
        
        isRunning = false
        
        // 生成测试报告
        val report = generateReport()
        Log.d(TAG, "测试运行完成，生成报告: ${report.summary}")
        
        return report
    }
    
    /**
     * 运行单个测试用例
     */
    private suspend fun runTestCase(testCase: TestCase) {
        Log.d(TAG, "开始运行测试用例: ${testCase.name} (${testCase.type})")
        
        // 创建测试结果
        val result = TestResult(
            testId = testCase.id,
            testName = testCase.name,
            testType = testCase.type,
            status = TestResult.Status.RUNNING,
            startTime = System.currentTimeMillis(),
            endTime = System.currentTimeMillis(),
            duration = 0
        )
        testResults[testCase.id] = result
        
        // 执行测试用例
        val startTime = System.currentTimeMillis()
        var status = TestResult.Status.PASSED
        var errorMessage: String? = null
        
        try {
            // 执行setup
            testCase.setup?.invoke()
            
            // 执行测试函数
            val testPassed = testCase.testFunction()
            if (!testPassed) {
                status = TestResult.Status.FAILED
                errorMessage = "测试函数返回false"
            }
        } catch (e: Exception) {
            status = TestResult.Status.FAILED
            errorMessage = e.message ?: "测试执行过程中发生未知错误"
            Log.e(TAG, "测试用例 ${testCase.name} 执行失败", e)
        } finally {
            // 执行teardown
            try {
                testCase.teardown?.invoke()
            } catch (e: Exception) {
                Log.e(TAG, "测试用例 ${testCase.name} 的teardown执行失败", e)
            }
        }
        
        val endTime = System.currentTimeMillis()
        val duration = endTime - startTime
        
        // 更新测试结果
        val finalResult = result.copy(
            status = status,
            endTime = endTime,
            duration = duration,
            errorMessage = errorMessage
        )
        testResults[testCase.id] = finalResult
        
        Log.d(TAG, "测试用例 ${testCase.name} 执行完成，状态: $status, 耗时: $duration ms")
    }
    
    /**
     * 启动所有Mock服务
     */
    private fun startAllMockServices() {
        Log.d(TAG, "启动所有Mock服务")
        for (mockService in mockServices.values) {
            try {
                mockService.start()
                Log.d(TAG, "Mock服务 ${mockService.getServiceName()} 已启动")
            } catch (e: Exception) {
                Log.e(TAG, "启动Mock服务 ${mockService.getServiceName()} 失败", e)
            }
        }
    }
    
    /**
     * 停止所有Mock服务
     */
    private fun stopAllMockServices() {
        Log.d(TAG, "停止所有Mock服务")
        for (mockService in mockServices.values) {
            try {
                mockService.stop()
                Log.d(TAG, "Mock服务 ${mockService.getServiceName()} 已停止")
            } catch (e: Exception) {
                Log.e(TAG, "停止Mock服务 ${mockService.getServiceName()} 失败", e)
            }
        }
    }
    
    /**
     * 生成测试报告
     */
    fun generateReport(): TestReport {
        return TestReport.generate(testSessionId, testResults.values.toList())
    }
    
    /**
     * 获取测试框架状态
     */
    fun isRunning(): Boolean {
        return isRunning
    }
    
    /**
     * 重置测试框架
     */
    fun reset() {
        if (isRunning) {
            Log.w(TAG, "测试框架正在运行中，无法重置")
            return
        }
        
        testCases.clear()
        testResults.clear()
        mockServices.clear()
        testCounter.set(0)
        testSessionId = UUID.randomUUID().toString()
        Log.d(TAG, "测试框架已重置")
    }
    
    /**
     * 测试报告类
     */
    data class TestReport(
        val sessionId: String,
        val timestamp: Long,
        val totalTests: Int,
        val passedTests: Int,
        val failedTests: Int,
        val skippedTests: Int,
        val totalDuration: Long,
        val testResults: List<TestResult>,
        val summary: String
    ) {
        companion object {
            fun generate(sessionId: String, testResults: List<TestResult>): TestReport {
                val totalTests = testResults.size
                val passedTests = testResults.count { it.status == TestResult.Status.PASSED }
                val failedTests = testResults.count { it.status == TestResult.Status.FAILED }
                val skippedTests = testResults.count { it.status == TestResult.Status.SKIPPED }
                val totalDuration = testResults.sumOf { it.duration }
                
                val summary = "测试报告: 共 $totalTests 个测试用例，通过 $passedTests 个，失败 $failedTests 个，跳过 $skippedTests 个，总耗时 $totalDuration ms"
                
                return TestReport(
                    sessionId = sessionId,
                    timestamp = System.currentTimeMillis(),
                    totalTests = totalTests,
                    passedTests = passedTests,
                    failedTests = failedTests,
                    skippedTests = skippedTests,
                    totalDuration = totalDuration,
                    testResults = testResults,
                    summary = summary
                )
            }
        }
        
        /**
         * 生成HTML格式的测试报告
         */
        fun toHtml(): String {
            val sb = StringBuilder()
            sb.append("<!DOCTYPE html>")
            sb.append("<html>")
            sb.append("<head>")
            sb.append("<title>测试报告</title>")
            sb.append("<style>")
            sb.append("body { font-family: Arial, sans-serif; margin: 20px; }")
            sb.append(".header { background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 20px; }")
            sb.append(".summary { display: flex; gap: 20px; margin-bottom: 20px; }")
            sb.append(".summary-item { background-color: #e0e0e0; padding: 10px; border-radius: 5px; flex: 1; }")
            sb.append(".test-results { margin-top: 20px; }")
            sb.append(".test-item { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; }")
            sb.append(".test-item.passed { background-color: #d4edda; }")
            sb.append(".test-item.failed { background-color: #f8d7da; }")
            sb.append(".test-item.skipped { background-color: #e2e3e5; }")
            sb.append(".test-header { font-weight: bold; display: flex; justify-content: space-between; }")
            sb.append(".test-details { margin-top: 5px; font-size: 14px; }")
            sb.append("</style>")
            sb.append("</head>")
            sb.append("<body>")
            sb.append("<div class='header'>")
            sb.append("<h1>Windows-Android Connect 测试报告</h1>")
            sb.append("<p>会话ID: $sessionId</p>")
            sb.append("<p>生成时间: ${Date(timestamp).toString()}</p>")
            sb.append("</div>")
            sb.append("<div class='summary'>")
            sb.append("<div class='summary-item'><strong>总测试数:</strong> $totalTests</div>")
            sb.append("<div class='summary-item'><strong>通过:</strong> $passedTests</div>")
            sb.append("<div class='summary-item'><strong>失败:</strong> $failedTests</div>")
            sb.append("<div class='summary-item'><strong>跳过:</strong> $skippedTests</div>")
            sb.append("<div class='summary-item'><strong>总耗时:</strong> ${totalDuration}ms</div>")
            sb.append("</div>")
            sb.append("<div class='test-results'>")
            sb.append("<h2>测试结果详情</h2>")
            for (result in testResults) {
                val statusClass = when (result.status) {
                    TestResult.Status.PASSED -> "passed"
                    TestResult.Status.FAILED -> "failed"
                    TestResult.Status.SKIPPED -> "skipped"
                    else -> ""
                }
                sb.append("<div class='test-item $statusClass'>")
                sb.append("<div class='test-header'>")
                sb.append("<span>${result.testName}</span>")
                sb.append("<span>${result.status}</span>")
                sb.append("</div>")
                sb.append("<div class='test-details'>")
                sb.append("<p>测试类型: ${result.testType}</p>")
                sb.append("<p>耗时: ${result.duration}ms</p>")
                if (result.errorMessage != null) {
                    sb.append("<p>错误信息: ${result.errorMessage}</p>")
                }
                sb.append("</div>")
                sb.append("</div>")
            }
            sb.append("</div>")
            sb.append("</body>")
            sb.append("</html>")
            return sb.toString()
        }
        
        /**
         * 生成JSON格式的测试报告
         */
        fun toJson(): String {
            val sb = StringBuilder()
            sb.append("{")
            sb.append("\"sessionId\":\"$sessionId\",")
            sb.append("\"timestamp\":$timestamp,")
            sb.append("\"totalTests\":$totalTests,")
            sb.append("\"passedTests\":$passedTests,")
            sb.append("\"failedTests\":$failedTests,")
            sb.append("\"skippedTests\":$skippedTests,")
            sb.append("\"totalDuration\":$totalDuration,")
            sb.append("\"testResults\":[")
            for ((index, result) in testResults.withIndex()) {
                if (index > 0) sb.append(",")
                sb.append("{")
                sb.append("\"testId\":\"${result.testId}\",")
                sb.append("\"testName\":\"${result.testName}\",")
                sb.append("\"testType\":\"${result.testType}\",")
                sb.append("\"status\":\"${result.status}\",")
                sb.append("\"startTime\":${result.startTime},")
                sb.append("\"endTime\":${result.endTime},")
                sb.append("\"duration\":${result.duration},")
                if (result.errorMessage != null) {
                    sb.append("\"errorMessage\":\"${result.errorMessage}\",")
                }
                sb.append("\"coverageData\":")
                if (result.coverageData != null) {
                    sb.append("{")
                    sb.append("\"coveredLines\":${result.coverageData.coveredLines},")
                    sb.append("\"totalLines\":${result.coverageData.totalLines},")
                    sb.append("\"coverageRate\":${result.coverageData.coverageRate},")
                    sb.append("\"coveredMethods\":${result.coverageData.coveredMethods},")
                    sb.append("\"totalMethods\":${result.coverageData.totalMethods},")
                    sb.append("\"methodCoverageRate\":${result.coverageData.methodCoverageRate}")
                    sb.append("}")
                } else {
                    sb.append("null")
                }
                sb.append("}")
            }
            sb.append("]")
            sb.append("}")
            return sb.toString()
        }
    }
}