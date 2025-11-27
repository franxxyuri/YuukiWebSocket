// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}


tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

// Windows-Android Connect Android客户端项目信息
project.description = "Windows-Android Connect Android客户端 - 提供文件传输、屏幕投屏、远程控制等功能"