package com.example.windowsandroidconnect.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.windowsandroidconnect.QuickTestActivity

/**
 * 通过广播拉起 QuickTestActivity 的调试入口
 * 使用方式（adb 示例）：
 * adb shell am broadcast -a com.example.windowsandroidconnect.ACTION_OPEN_QUICK_TEST
 */
class QuickTestLaunchReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_OPEN_QUICK_TEST) {
            Log.d(TAG, "收到调试广播，启动 QuickTestActivity")
            val activityIntent = Intent(context, QuickTestActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(activityIntent)
        }
    }

    companion object {
        const val ACTION_OPEN_QUICK_TEST = "com.example.windowsandroidconnect.ACTION_OPEN_QUICK_TEST"
        private const val TAG = "QuickTestLaunchReceiver"
    }
}
