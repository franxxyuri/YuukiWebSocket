package com.example.windowsandroidconnect

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

/**
 * 设备列表适配器
 * 用于在RecyclerView中显示发现的设备
 */
class DeviceAdapter(
    private val devices: MutableList<DeviceInfo>,
    private val onItemClick: (DeviceInfo) -> Unit
) : RecyclerView.Adapter<DeviceAdapter.DeviceViewHolder>() {

    /**
     * 更新设备列表
     */
    fun updateDevices(newDevices: List<DeviceInfo>) {
        devices.clear()
        devices.addAll(newDevices)
        notifyDataSetChanged()
    }

    /**
     * 添加设备
     */
    fun addDevice(device: DeviceInfo) {
        // 检查设备是否已存在
        val existingIndex = devices.indexOfFirst { it.deviceId == device.deviceId }
        if (existingIndex >= 0) {
            devices[existingIndex] = device
        } else {
            devices.add(device)
        }
        notifyDataSetChanged()
    }

    /**
     * 移除设备
     */
    fun removeDevice(deviceId: String) {
        val index = devices.indexOfFirst { it.deviceId == deviceId }
        if (index >= 0) {
            devices.removeAt(index)
            notifyItemRemoved(index)
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DeviceViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(android.R.layout.simple_list_item_2, parent, false)
        return DeviceViewHolder(view)
    }

    override fun onBindViewHolder(holder: DeviceViewHolder, position: Int) {
        val device = devices[position]
        holder.bind(device)
    }

    override fun getItemCount(): Int = devices.size

    inner class DeviceViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val titleText: TextView = itemView.findViewById(android.R.id.text1)
        private val subtitleText: TextView = itemView.findViewById(android.R.id.text2)

        fun bind(device: DeviceInfo) {
            titleText.text = device.deviceName
            subtitleText.text = "${device.platform} - ${device.ip}"
            
            itemView.setOnClickListener {
                onItemClick(device)
            }
        }
    }
}