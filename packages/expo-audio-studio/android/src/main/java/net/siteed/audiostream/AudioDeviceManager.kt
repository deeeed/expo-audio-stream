package net.siteed.audiostream

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import expo.modules.kotlin.Promise
import net.siteed.audiostream.LogUtils

/**
 * Interface for handling audio device disconnection events
 */
interface AudioDeviceManagerDelegate {
    fun onDeviceDisconnected(deviceId: String)
}

/**
 * Manages audio device detection, selection and capabilities for Android
 */
class AudioDeviceManager(private val context: Context) {
    
    companion object {
        private const val TAG = "AudioDeviceManager"
        private const val CLASS_NAME = "AudioDeviceManager" // Add class name constant for logging
        
        // Device type constants - standardized across platforms
        const val DEVICE_TYPE_BUILTIN_MIC = "builtin_mic"
        const val DEVICE_TYPE_BLUETOOTH = "bluetooth"
        const val DEVICE_TYPE_USB = "usb"
        const val DEVICE_TYPE_WIRED_HEADSET = "wired_headset"
        const val DEVICE_TYPE_WIRED_HEADPHONES = "wired_headphones"
        const val DEVICE_TYPE_SPEAKER = "speaker"
        const val DEVICE_TYPE_UNKNOWN = "unknown"
        
        // Common sample rates most devices support
        private val COMMON_SAMPLE_RATES = listOf(8000, 11025, 16000, 22050, 32000, 44100, 48000)
        
        // Common channel configurations most devices support
        private val COMMON_CHANNEL_COUNTS = listOf(1, 2)
    }
    
    // Delegate for handling device disconnection
    var delegate: AudioDeviceManagerDelegate? = null
    
    // Audio manager for accessing device information
    private val audioManager: AudioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    
    // Last selected device ID for tracking changes
    private var lastSelectedDeviceId: String? = null
    
    // BroadcastReceiver for device connection/disconnection
    private var deviceReceiver: BroadcastReceiver? = null
    
    init {
        // Start monitoring device changes
        startMonitoringDeviceChanges()
    }
    
    /**
     * Gets all available audio input devices
     */
    fun getAvailableInputDevices(promise: Promise) {
        LogUtils.d(TAG, "Getting available input devices")
        
        val devices = mutableListOf<Map<String, Any>>()
        val currentInput = getCurrentInputDeviceInternal()
        
        // Device map for smart deduplication
        // We won't deduplicate devices with different capabilities
        // This ensures we preserve devices that represent different recording profiles
        val deviceMap = mutableMapOf<String, MutableList<Map<String, Any>>>()
        
        // Get all audio devices
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            
            for (device in audioDevices) {
                if (device.type == AudioDeviceInfo.TYPE_UNKNOWN) {
                    continue
                }
                
                val deviceId = device.id.toString()
                val isDefault = currentInput?.get("id") == deviceId
                val deviceType = mapDeviceType(device)
                val deviceName = getDeviceName(device)
                
                val capabilities = getDeviceCapabilities(device)
                
                LogUtils.d(TAG, "Raw device found: ${deviceName} (ID: ${deviceId}, type: ${deviceType})")
                
                val deviceInfo = mapOf(
                    "id" to deviceId,
                    "name" to deviceName, 
                    "type" to deviceType,
                    "isDefault" to isDefault,
                    "capabilities" to capabilities,
                    "isAvailable" to true
                )
                
                // Group devices by name for potential deduplication
                val key = deviceName
                if (!deviceMap.containsKey(key)) {
                    deviceMap[key] = mutableListOf()
                }
                deviceMap[key]?.add(deviceInfo)
            }
            
            // Deduplicate while preserving devices with different capabilities
            deviceMap.forEach { (name, deviceList) ->
                if (deviceList.size > 1) {
                    LogUtils.d(TAG, "Found ${deviceList.size} devices with name: $name - checking for duplicates")
                    
                    // First check if we have a default device in this group - it gets priority
                    val defaultDevice = deviceList.find { it["isDefault"] == true }
                    if (defaultDevice != null) {
                        // Always keep the default device
                        LogUtils.d(TAG, "Keeping default device with ID: ${defaultDevice["id"]}")
                        devices.add(defaultDevice)
                        
                        // Now process the others
                        val remainingDevices = deviceList.filter { it["id"] != defaultDevice["id"] }
                        
                        // Create groups based on unique capabilities
                        val capabilityGroups = mutableMapOf<String, MutableList<Map<String, Any>>>()
                        
                        for (device in remainingDevices) {
                            val capabilities = device["capabilities"] as Map<String, Any>
                            val capabilityHash = generateCapabilityHash(capabilities)
                            
                            if (!capabilityGroups.containsKey(capabilityHash)) {
                                capabilityGroups[capabilityHash] = mutableListOf()
                            }
                            capabilityGroups[capabilityHash]?.add(device)
                        }
                        
                        // Now keep one device from each capability group
                        capabilityGroups.forEach { (capHash, devicesWithSameCapabilities) ->
                            val selectedDevice = devicesWithSameCapabilities.first()
                            LogUtils.d(TAG, "Adding device ${selectedDevice["id"]} with unique capabilities: $capHash")
                            devices.add(selectedDevice)
                            
                            // Log if we're dropping duplicate devices
                            if (devicesWithSameCapabilities.size > 1) {
                                val droppedIds = devicesWithSameCapabilities.drop(1).map { it["id"] }
                                LogUtils.d(TAG, "Dropping ${devicesWithSameCapabilities.size - 1} duplicate devices with IDs: $droppedIds")
                            }
                        }
                    } else {
                        // No default device, so just deduplicate by capabilities
                        val capabilityGroups = mutableMapOf<String, MutableList<Map<String, Any>>>()
                        
                        for (device in deviceList) {
                            val capabilities = device["capabilities"] as Map<String, Any>
                            val capabilityHash = generateCapabilityHash(capabilities)
                            
                            if (!capabilityGroups.containsKey(capabilityHash)) {
                                capabilityGroups[capabilityHash] = mutableListOf()
                            }
                            capabilityGroups[capabilityHash]?.add(device)
                        }
                        
                        // Keep one device from each capability group
                        capabilityGroups.forEach { (capHash, devicesWithSameCapabilities) ->
                            val selectedDevice = devicesWithSameCapabilities.first()
                            LogUtils.d(TAG, "Adding device ${selectedDevice["id"]} with unique capabilities: $capHash")
                            devices.add(selectedDevice)
                            
                            // Log if we're dropping duplicate devices
                            if (devicesWithSameCapabilities.size > 1) {
                                val droppedIds = devicesWithSameCapabilities.drop(1).map { it["id"] }
                                LogUtils.d(TAG, "Dropping ${devicesWithSameCapabilities.size - 1} duplicate devices with IDs: $droppedIds")
                            }
                        }
                    }
                } else {
                    // Only one device with this name, just add it
                    devices.add(deviceList.first())
                }
            }
            
        } else {
            // Fallback for older Android versions - add at least the default device
            val isHeadsetConnected = audioManager.isWiredHeadsetOn || isBluetoothHeadsetConnected()
            
            // Add default device (built-in mic)
            devices.add(mapOf(
                "id" to "0", // Default device ID
                "name" to "Built-in Microphone",
                "type" to DEVICE_TYPE_BUILTIN_MIC,
                "isDefault" to !isHeadsetConnected,
                "capabilities" to getDefaultCapabilities(),
                "isAvailable" to true
            ))
            
            // Add headset device if connected
            if (audioManager.isWiredHeadsetOn) {
                devices.add(mapOf(
                    "id" to "1",
                    "name" to "Wired Headset",
                    "type" to DEVICE_TYPE_WIRED_HEADSET,
                    "isDefault" to true,
                    "capabilities" to getDefaultCapabilities(),
                    "isAvailable" to true
                ))
            }
            
            // Add Bluetooth device if connected
            if (isBluetoothHeadsetConnected()) {
                devices.add(mapOf(
                    "id" to "2",
                    "name" to "Bluetooth Headset",
                    "type" to DEVICE_TYPE_BLUETOOTH,
                    "isDefault" to true,
                    "capabilities" to getDefaultCapabilities(),
                    "isAvailable" to true
                ))
            }
        }
        
        LogUtils.d(TAG, "Found ${devices.size} input devices after deduplication")
        promise.resolve(devices)
    }
    
    /**
     * Generate a string hash representing device capabilities for comparison
     */
    private fun generateCapabilityHash(capabilities: Map<String, Any>): String {
        val sampleRates = capabilities["sampleRates"]?.toString() ?: ""
        val channelCounts = capabilities["channelCounts"]?.toString() ?: ""
        val bitDepths = capabilities["bitDepths"]?.toString() ?: ""
        val hasEchoCancellation = capabilities["hasEchoCancellation"]?.toString() ?: "false"
        val hasNoiseSuppression = capabilities["hasNoiseSuppression"]?.toString() ?: "false"
        val hasAutomaticGainControl = capabilities["hasAutomaticGainControl"]?.toString() ?: "false"
        
        return "$sampleRates|$channelCounts|$bitDepths|$hasEchoCancellation|$hasNoiseSuppression|$hasAutomaticGainControl"
    }
    
    /**
     * Gets the currently selected input device
     */
    fun getCurrentInputDevice(promise: Promise) {
        val device = getCurrentInputDeviceInternal()
        promise.resolve(device)
    }
    
    /**
     * Gets the default input device (built-in mic usually)
     */
    suspend fun getDefaultInputDevice(): Map<String, Any>? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            // Find built-in microphone which is the typical default
            val defaultDevice = audioDevices.firstOrNull { 
                it.type == AudioDeviceInfo.TYPE_BUILTIN_MIC 
            }
            
            if (defaultDevice != null) {
                val deviceType = mapDeviceType(defaultDevice)
                val deviceName = getDeviceName(defaultDevice)
                
                LogUtils.d(TAG, "Found default device: $deviceName (ID: ${defaultDevice.id}, Type: $deviceType)")
                
                return mapOf(
                    "id" to defaultDevice.id.toString(),
                    "name" to deviceName,
                    "type" to deviceType,
                    "isDefault" to true,
                    "capabilities" to getDeviceCapabilities(defaultDevice),
                    "isAvailable" to true
                )
            }
        }
        
        // Fallback for older Android or if no built-in mic found
        return mapOf(
            "id" to "0",
            "name" to "Built-in Microphone",
            "type" to DEVICE_TYPE_BUILTIN_MIC,
            "isDefault" to true,
            "capabilities" to getDefaultCapabilities(),
            "isAvailable" to true
        )
    }
    
    /**
     * Gets the currently active input device (internal implementation)
     */
    private fun getCurrentInputDeviceInternal(): Map<String, Any>? {
        // On Android, we need to check the current routing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            
            // Determine current input device based on the communication device
            // or audio routing
            // For API level 31+, we can use getCommunicationDevice() directly
            var currentDevice: AudioDeviceInfo? = null
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                currentDevice = audioManager.communicationDevice?.takeIf { 
                    it.type != AudioDeviceInfo.TYPE_BUILTIN_SPEAKER && 
                    it.isSource 
                }
            }
            
            // If no communication device found, check other indicators
            if (currentDevice == null) {
                // Check if we have a Bluetooth SCO device active
                if (audioManager.isBluetoothScoOn) {
                    currentDevice = audioDevices.firstOrNull { 
                        it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
                    }
                }
                
                // Check if wired headset is connected
                if (currentDevice == null && audioManager.isWiredHeadsetOn) {
                    currentDevice = audioDevices.firstOrNull { 
                        it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET
                    }
                }
                
                // Default to built-in mic if nothing else is found
                if (currentDevice == null) {
                    currentDevice = audioDevices.firstOrNull { 
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_MIC
                    }
                }
            }
            
            if (currentDevice != null) {
                val deviceId = currentDevice.id.toString()
                val deviceType = mapDeviceType(currentDevice)
                val deviceName = getDeviceName(currentDevice)
                
                LogUtils.d(TAG, "Current input device: $deviceName (ID: $deviceId, type: $deviceType)")
                
                return mapOf(
                    "id" to deviceId,
                    "name" to deviceName,
                    "type" to deviceType,
                    "isDefault" to (deviceType == DEVICE_TYPE_BUILTIN_MIC),
                    "capabilities" to getDeviceCapabilities(currentDevice),
                    "isAvailable" to true
                )
            }
        } else {
            // For older Android versions, determine based on flags
            if (isBluetoothHeadsetConnected()) {
                return mapOf(
                    "id" to "2",
                    "name" to "Bluetooth Headset",
                    "type" to DEVICE_TYPE_BLUETOOTH,
                    "isDefault" to true,
                    "capabilities" to getDefaultCapabilities(),
                    "isAvailable" to true
                )
            } else if (audioManager.isWiredHeadsetOn) {
                return mapOf(
                    "id" to "1",
                    "name" to "Wired Headset",
                    "type" to DEVICE_TYPE_WIRED_HEADSET,
                    "isDefault" to true,
                    "capabilities" to getDefaultCapabilities(),
                    "isAvailable" to true
                )
            } else {
                // Default to built-in mic
                return mapOf(
                    "id" to "0",
                    "name" to "Built-in Microphone",
                    "type" to DEVICE_TYPE_BUILTIN_MIC,
                    "isDefault" to true,
                    "capabilities" to getDefaultCapabilities(),
                    "isAvailable" to true
                )
            }
        }
        
        return null
    }
    
    /**
     * Selects a specific audio input device for recording
     */
    fun selectInputDevice(deviceId: String, promise: Promise) {
        LogUtils.d(TAG, "Selecting input device with ID: $deviceId")
        
        // Store the selected device ID for tracking
        lastSelectedDeviceId = deviceId
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            val selectedDevice = audioDevices.firstOrNull { it.id.toString() == deviceId }
            
            if (selectedDevice == null) {
                LogUtils.e(TAG, "Device not found with ID $deviceId")
                promise.reject("DEVICE_NOT_FOUND", "The selected audio device is not available", null)
                return
            }
            
            // Handle device selection based on type
            when (selectedDevice.type) {
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> {
                    // For Bluetooth SCO devices, start SCO connection
                    if (!audioManager.isBluetoothScoOn) {
                        audioManager.startBluetoothSco()
                        audioManager.isBluetoothScoOn = true
                    }
                    
                    // On Android S (API 31) and above, we can set communication device directly
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        try {
                            val success = audioManager.setCommunicationDevice(selectedDevice)
                            if (!success) {
                                LogUtils.w(TAG, "Failed to set communication device for Bluetooth SCO")
                            }
                        } catch (e: Exception) {
                            LogUtils.e(TAG, "Error setting communication device: ${e.message}")
                        }
                    }
                }
                
                AudioDeviceInfo.TYPE_WIRED_HEADSET -> {
                    // For wired headsets, just need to ensure SCO is off
                    if (audioManager.isBluetoothScoOn) {
                        audioManager.stopBluetoothSco()
                        audioManager.isBluetoothScoOn = false
                    }
                    
                    // On Android S (API 31) and above, we can set communication device directly
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        try {
                            val success = audioManager.setCommunicationDevice(selectedDevice)
                            if (!success) {
                                LogUtils.w(TAG, "Failed to set communication device for wired headset")
                            }
                        } catch (e: Exception) {
                            LogUtils.e(TAG, "Error setting communication device: ${e.message}")
                        }
                    }
                }
                
                AudioDeviceInfo.TYPE_BUILTIN_MIC -> {
                    // For built-in mic, ensure SCO is off
                    if (audioManager.isBluetoothScoOn) {
                        audioManager.stopBluetoothSco()
                        audioManager.isBluetoothScoOn = false
                    }
                    
                    // On Android S (API 31) and above, we can set communication device directly
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        try {
                            val success = audioManager.setCommunicationDevice(selectedDevice)
                            if (!success) {
                                LogUtils.w(TAG, "Failed to set communication device for built-in mic")
                            }
                        } catch (e: Exception) {
                            LogUtils.e(TAG, "Error setting communication device: ${e.message}")
                        }
                    }
                }
                
                // Handle other device types as needed
                else -> {
                    // For other device types, ensure SCO is off
                    if (audioManager.isBluetoothScoOn) {
                        audioManager.stopBluetoothSco()
                        audioManager.isBluetoothScoOn = false
                    }
                    
                    // On Android S (API 31) and above, we can set communication device directly
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        try {
                            val success = audioManager.setCommunicationDevice(selectedDevice)
                            if (!success) {
                                LogUtils.w(TAG, "Failed to set communication device for device type: ${selectedDevice.type}")
                            }
                        } catch (e: Exception) {
                            LogUtils.e(TAG, "Error setting communication device: ${e.message}")
                        }
                    }
                }
            }
            
            LogUtils.d(TAG, "Successfully selected device: ${getDeviceName(selectedDevice)}")
            promise.resolve(true)
        } else {
            // For older Android versions, handle based on device ID
            when (deviceId) {
                "0" -> { // Built-in mic
                    if (audioManager.isBluetoothScoOn) {
                        audioManager.stopBluetoothSco()
                        audioManager.isBluetoothScoOn = false
                    }
                    LogUtils.d(TAG, "Selected built-in microphone")
                    promise.resolve(true)
                }
                "1" -> { // Wired headset
                    if (audioManager.isWiredHeadsetOn) {
                        if (audioManager.isBluetoothScoOn) {
                            audioManager.stopBluetoothSco()
                            audioManager.isBluetoothScoOn = false
                        }
                        LogUtils.d(TAG, "Selected wired headset")
                        promise.resolve(true)
                    } else {
                        LogUtils.e(TAG, "Wired headset is not connected")
                        promise.reject("DEVICE_NOT_AVAILABLE", "Wired headset is not connected", null)
                    }
                }
                "2" -> { // Bluetooth headset
                    if (isBluetoothHeadsetConnected()) {
                        audioManager.startBluetoothSco()
                        audioManager.isBluetoothScoOn = true
                        LogUtils.d(TAG, "Selected Bluetooth headset")
                        promise.resolve(true)
                    } else {
                        LogUtils.e(TAG, "Bluetooth headset is not connected")
                        promise.reject("DEVICE_NOT_AVAILABLE", "Bluetooth headset is not connected", null)
                    }
                }
                else -> {
                    LogUtils.e(TAG, "Unknown device ID: $deviceId")
                    promise.reject("DEVICE_NOT_FOUND", "The selected audio device is not available", null)
                }
            }
        }
    }
    
    /**
     * Selects a specific audio input device asynchronously (for internal use)
     */
    suspend fun selectDevice(deviceId: String): Boolean {
        LogUtils.d(TAG, "Asynchronously selecting device with ID: $deviceId")
        lastSelectedDeviceId = deviceId
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            val selectedDevice = audioDevices.firstOrNull { it.id.toString() == deviceId }
            
            if (selectedDevice == null) {
                LogUtils.e(TAG, "Device not found with ID $deviceId for async selection")
                return false
            }
            
            // Handle device selection based on type
            when (selectedDevice.type) {
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> {
                    // For Bluetooth SCO devices, start SCO connection
                    if (!audioManager.isBluetoothScoOn) {
                        audioManager.startBluetoothSco()
                        audioManager.isBluetoothScoOn = true
                    }
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        try {
                            return audioManager.setCommunicationDevice(selectedDevice)
                        } catch (e: Exception) {
                            LogUtils.e(TAG, "Error setting communication device: ${e.message}")
                            return false
                        }
                    }
                    return true
                }
                
                else -> {
                    // For other device types
                    if (audioManager.isBluetoothScoOn) {
                        audioManager.stopBluetoothSco()
                        audioManager.isBluetoothScoOn = false
                    }
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        try {
                            return audioManager.setCommunicationDevice(selectedDevice)
                        } catch (e: Exception) {
                            LogUtils.e(TAG, "Error setting communication device: ${e.message}")
                            return false
                        }
                    }
                    return true
                }
            }
        } else {
            // For older Android versions
            when (deviceId) {
                "0" -> { // Built-in mic
                    if (audioManager.isBluetoothScoOn) {
                        audioManager.stopBluetoothSco()
                        audioManager.isBluetoothScoOn = false
                    }
                    return true
                }
                "1" -> { // Wired headset
                    if (audioManager.isWiredHeadsetOn) {
                        if (audioManager.isBluetoothScoOn) {
                            audioManager.stopBluetoothSco()
                            audioManager.isBluetoothScoOn = false
                        }
                        return true
                    }
                    return false
                }
                "2" -> { // Bluetooth headset
                    if (isBluetoothHeadsetConnected()) {
                        audioManager.startBluetoothSco()
                        audioManager.isBluetoothScoOn = true
                        return true
                    }
                    return false
                }
                else -> return false
            }
        }
    }
    
    /**
     * Resets to the default audio input device (usually built-in mic)
     */
    fun resetToDefaultDevice(callback: (Boolean, Exception?) -> Unit) {
        LogUtils.d(TAG, "Resetting to default input device")
        
        try {
            // Stop Bluetooth SCO if active
            if (audioManager.isBluetoothScoOn) {
                audioManager.stopBluetoothSco()
                audioManager.isBluetoothScoOn = false
            }
            
            // For Android S and above, reset communication device
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
                val builtInMic = audioDevices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_MIC }
                
                if (builtInMic != null) {
                    try {
                        val success = audioManager.setCommunicationDevice(builtInMic)
                        if (!success) {
                            LogUtils.w(TAG, "Failed to reset to default device")
                        }
                    } catch (e: Exception) {
                        LogUtils.e(TAG, "Error resetting to default device: ${e.message}")
                        callback(false, e)
                        return
                    }
                }
            }
            
            // Clear last selected device
            lastSelectedDeviceId = null
            
            // Get the device after reset
            val currentDevice = getCurrentInputDeviceInternal()
            if (currentDevice != null) {
                LogUtils.d(TAG, "Reset to default device: ${currentDevice["name"]}")
            } else {
                LogUtils.d(TAG, "No device detected after reset")
            }
            
            callback(true, null)
        } catch (e: Exception) {
            LogUtils.e(TAG, "Failed to reset to default device: ${e.message}")
            callback(false, e)
        }
    }
    
    /**
     * Force refreshes the audio session to update device list
     */
    fun forceRefreshAudioDevices(): Boolean {
        LogUtils.d(TAG, "Forcing refresh of audio devices")
        
        // Not much to do on Android since devices are enumerated on-demand
        // but we can check if SCO is consistent with device state
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
                val hasBluetoothSco = audioDevices.any { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
                
                // If we have a Bluetooth SCO device but SCO isn't started, start it
                if (hasBluetoothSco && !audioManager.isBluetoothScoOn && lastSelectedDeviceId != null) {
                    val device = audioDevices.firstOrNull { it.id.toString() == lastSelectedDeviceId }
                    if (device?.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) {
                        audioManager.startBluetoothSco()
                        audioManager.isBluetoothScoOn = true
                    }
                }
            }
            
            return true
        } catch (e: Exception) {
            LogUtils.e(TAG, "Error refreshing audio devices: ${e.message}")
            return false
        }
    }
    
    /**
     * Maps Android's AudioDeviceInfo type to our standardized device type
     */
    @RequiresApi(Build.VERSION_CODES.M)
    private fun mapDeviceType(device: AudioDeviceInfo): String {
        return when (device.type) {
            AudioDeviceInfo.TYPE_BUILTIN_MIC -> DEVICE_TYPE_BUILTIN_MIC
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> DEVICE_TYPE_BLUETOOTH
            AudioDeviceInfo.TYPE_WIRED_HEADSET -> DEVICE_TYPE_WIRED_HEADSET
            AudioDeviceInfo.TYPE_USB_DEVICE, 
            AudioDeviceInfo.TYPE_USB_ACCESSORY,
            AudioDeviceInfo.TYPE_USB_HEADSET -> DEVICE_TYPE_USB
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> DEVICE_TYPE_WIRED_HEADPHONES
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> DEVICE_TYPE_SPEAKER
            else -> DEVICE_TYPE_UNKNOWN
        }
    }
    
    /**
     * Gets a human-readable name for the device with detailed capability information
     */
    @RequiresApi(Build.VERSION_CODES.M)
    private fun getDeviceName(device: AudioDeviceInfo): String {
        // Get product name if available
        val productName = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            device.productName?.toString()
        } else null
        
        // Get base name
        val baseName = if (productName.isNullOrBlank()) {
            when (device.type) {
                AudioDeviceInfo.TYPE_BUILTIN_MIC -> "Built-in Microphone"
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth Headset"
                AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired Headset"
                AudioDeviceInfo.TYPE_USB_DEVICE -> "USB Audio Device"
                AudioDeviceInfo.TYPE_USB_ACCESSORY -> "USB Audio Accessory"
                AudioDeviceInfo.TYPE_USB_HEADSET -> "USB Headset"
                AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Wired Headphones"
                AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "Built-in Speaker"
                else -> "Audio Device"
            }
        } else {
            productName
        }
        
        // Get capability details for naming
        val maxSampleRate = device.sampleRates?.maxOrNull() ?: 0
        val channelCount = device.channelCounts?.maxOrNull() ?: 1
        
        // Create a descriptive suffix based on detailed capabilities
        val typeDescription = if (device.type == AudioDeviceInfo.TYPE_UNKNOWN) {
            when {
                maxSampleRate >= 44100 && channelCount > 1 -> "External"
                maxSampleRate >= 44100 -> "Line-in"
                else -> "Unknown Type"
            }
        } else {
            when (device.type) {
                AudioDeviceInfo.TYPE_BUILTIN_MIC -> "Internal"
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth"
                AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired"
                AudioDeviceInfo.TYPE_USB_DEVICE, 
                AudioDeviceInfo.TYPE_USB_ACCESSORY,
                AudioDeviceInfo.TYPE_USB_HEADSET -> "USB"
                else -> ""
            }
        }
        
        // Create full capability description
        val capabilityDesc = when {
            // Stereo high sample rate
            maxSampleRate >= 48000 && channelCount >= 2 -> {
                if (device.type == AudioDeviceInfo.TYPE_UNKNOWN) {
                    "HD Audio $typeDescription #${device.id}"
                } else {
                    "HD Audio $typeDescription"
                }
            }
            
            // Stereo
            channelCount > 1 -> {
                if (maxSampleRate >= 44100) {
                    "Stereo $typeDescription ${maxSampleRate/1000}kHz"
                } else {
                    "Stereo $typeDescription"
                }
            }
            
            // High sample rate mono
            maxSampleRate >= 44100 -> "High Quality $typeDescription"
            
            // Basic
            else -> "$typeDescription #${device.id}"
        }
        
        return "$baseName ($capabilityDesc)".trim()
    }
    
    /**
     * Gets just the base device name without capability information
     */
    @RequiresApi(Build.VERSION_CODES.M)
    private fun getBaseDeviceName(device: AudioDeviceInfo): String {
        val productName = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            device.productName?.toString()
        } else null
        
        return if (productName.isNullOrBlank()) {
            when (device.type) {
                AudioDeviceInfo.TYPE_BUILTIN_MIC -> "Built-in Microphone"
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth Headset"
                AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired Headset"
                AudioDeviceInfo.TYPE_USB_DEVICE -> "USB Audio Device"
                AudioDeviceInfo.TYPE_USB_ACCESSORY -> "USB Audio Accessory"
                AudioDeviceInfo.TYPE_USB_HEADSET -> "USB Headset"
                AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Wired Headphones"
                AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "Built-in Speaker"
                else -> "Audio Device"
            }
        } else {
            productName
        }
    }
    
    /**
     * Gets capabilities for an audio input device
     * Enhanced to provide comprehensive capabilities even if not reported by the API
     */
    @RequiresApi(Build.VERSION_CODES.M)
    private fun getDeviceCapabilities(device: AudioDeviceInfo): Map<String, Any> {
        // Get reported sample rates or use common ones if not available
        val reportedSampleRates = device.sampleRates?.toList()
        
        // Use reported sample rates but ensure common ones are included as most devices
        // actually support these even if not explicitly reported
        val sampleRates = if (reportedSampleRates.isNullOrEmpty()) {
            COMMON_SAMPLE_RATES
        } else {
            // Create a set of all sample rates - both reported and common ones
            val combinedRates = reportedSampleRates.toMutableSet()
            
            // For built-in and common devices, add standard rates that are typically supported
            if (device.type == AudioDeviceInfo.TYPE_BUILTIN_MIC || 
                device.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) {
                combinedRates.addAll(COMMON_SAMPLE_RATES)
            }
            
            // Convert back to list and sort
            combinedRates.toList().sorted()
        }
        
        // Get reported channel counts or use common ones
        val reportedChannelCounts = device.channelCounts?.toList()
        
        // Ensure mono and stereo are included as they're widely supported
        val channelCounts = if (reportedChannelCounts.isNullOrEmpty()) {
            COMMON_CHANNEL_COUNTS
        } else {
            val combinedCounts = reportedChannelCounts.toMutableSet()
            
            // Most devices support at least mono recording
            if (device.type == AudioDeviceInfo.TYPE_BUILTIN_MIC || 
                device.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) {
                combinedCounts.addAll(COMMON_CHANNEL_COUNTS)
            }
            
            combinedCounts.toList().sorted()
        }
        
        // Test if common configurations are actually supported
        val verifiedSampleRates = verifyAudioConfigurations(device.id, channelCounts.firstOrNull() ?: 1, sampleRates)
        
        // Android doesn't provide bit depth info, so we use common values
        val bitDepths = listOf(16, 24)
        
        return mapOf(
            "sampleRates" to verifiedSampleRates,
            "channelCounts" to channelCounts,
            "bitDepths" to bitDepths,
            "hasEchoCancellation" to true, // Android generally has AEC
            "hasNoiseSuppression" to true, // Android generally has noise suppression
            "hasAutomaticGainControl" to true // Android generally has AGC
        )
    }
    
    /**
     * Verify which sample rates are actually supported by attempting to create an AudioRecord
     * This helps catch cases where the API reports capabilities incorrectly
     */
    private fun verifyAudioConfigurations(deviceId: Int, channels: Int, sampleRates: List<Int>): List<Int> {
        if (!permissionGranted()) {
            return sampleRates // Can't verify without permission, return as-is
        }
        
        val supportedSampleRates = mutableListOf<Int>()
        val channelConfig = if (channels == 1) AudioFormat.CHANNEL_IN_MONO else AudioFormat.CHANNEL_IN_STEREO
        
        // Always include these standard rates that are almost universally supported
        val standardRates = listOf(16000, 44100, 48000)
        
        LogUtils.d(TAG, "Verifying audio configurations for device ${deviceId} with ${sampleRates.size} sample rates")
        
        for (sampleRate in sampleRates.distinct()) {
            try {
                val minBufferSize = AudioRecord.getMinBufferSize(
                    sampleRate, 
                    channelConfig,
                    AudioFormat.ENCODING_PCM_16BIT
                )
                
                // Skip if invalid buffer size
                if (minBufferSize <= 0) {
                    // But keep standard rates anyway as they usually work
                    if (sampleRate in standardRates) {
                        supportedSampleRates.add(sampleRate)
                        LogUtils.d(TAG, "⚠️ Adding standard rate ${sampleRate}Hz despite test failure")
                    }
                    continue
                }
                
                // Try to create an AudioRecord with this configuration
                var audioRecord: AudioRecord? = null
                try {
                    audioRecord = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        // Use the specific device if on newer Android
                        AudioRecord.Builder()
                            .setAudioSource(MediaRecorder.AudioSource.MIC)
                            .setAudioFormat(
                                AudioFormat.Builder()
                                    .setSampleRate(sampleRate)
                                    .setChannelMask(channelConfig)
                                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                    .build()
                            )
                            .setBufferSizeInBytes(minBufferSize)
                            .build()
                    } else {
                        AudioRecord(
                            MediaRecorder.AudioSource.MIC,
                            sampleRate,
                            channelConfig,
                            AudioFormat.ENCODING_PCM_16BIT,
                            minBufferSize
                        )
                    }
                    
                    if (audioRecord?.state == AudioRecord.STATE_INITIALIZED) {
                        supportedSampleRates.add(sampleRate)
                        LogUtils.d(TAG, "✅ Sample rate ${sampleRate}Hz verified as supported")
                    } else if (sampleRate in standardRates) {
                        // Include standard rates even if initialization failed
                        // as they typically work during actual recording
                        supportedSampleRates.add(sampleRate)
                        LogUtils.d(TAG, "⚠️ Adding standard rate ${sampleRate}Hz despite test failure")
                    }
                } finally {
                    audioRecord?.release()
                }
            } catch (e: Exception) {
                LogUtils.d(TAG, "Sample rate $sampleRate not supported: ${e.message}")
                
                // Include standard rates even if test failed
                if (sampleRate in standardRates) {
                    supportedSampleRates.add(sampleRate)
                    LogUtils.d(TAG, "⚠️ Adding standard rate ${sampleRate}Hz despite test failure")
                }
            }
        }
        
        // Ensure we have at least the standard rates
        if (supportedSampleRates.isEmpty()) {
            supportedSampleRates.addAll(standardRates)
        }
        
        return supportedSampleRates.sorted()
    }
    
    /**
     * Check if recording permission is granted
     */
    private fun permissionGranted(): Boolean {
        return context.checkCallingOrSelfPermission(android.Manifest.permission.RECORD_AUDIO) == 
               android.content.pm.PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * Default capabilities for older Android versions
     */
    private fun getDefaultCapabilities(): Map<String, Any> {
        return mapOf(
            "sampleRates" to COMMON_SAMPLE_RATES,
            "channelCounts" to COMMON_CHANNEL_COUNTS,
            "bitDepths" to listOf(16, 24),
            "hasEchoCancellation" to true,
            "hasNoiseSuppression" to true,
            "hasAutomaticGainControl" to true
        )
    }
    
    /**
     * Checks if a Bluetooth headset is connected
     */
    private fun isBluetoothHeadsetConnected(): Boolean {
        try {
            val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter() ?: return false
            if (!bluetoothAdapter.isEnabled) {
                return false
            }
            
            // For newer Android versions, check communication device directly
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val commsDevice = audioManager.communicationDevice
                if (commsDevice != null && commsDevice.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) {
                    return true
                }
            }
            
            // Check if Bluetooth SCO is enabled (active call)
            if (audioManager.isBluetoothScoOn) {
                return true
            }
            
            // Check legacy API
            val bluetoothProfile = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                bluetoothAdapter.getProfileConnectionState(BluetoothProfile.HEADSET)
            } else {
                @Suppress("DEPRECATION")
                bluetoothAdapter.getProfileConnectionState(BluetoothProfile.HEADSET)
            }
            
            return bluetoothProfile == BluetoothProfile.STATE_CONNECTED
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Error checking Bluetooth headset connection: ${e.message}", e)
            return false
        }
    }
    
    /**
     * Checks if a device is still available
     */
    fun isDeviceAvailable(deviceId: String): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            return audioDevices.any { it.id.toString() == deviceId }
        } else {
            // For older Android versions, check based on device ID
            return when (deviceId) {
                "0" -> true // Built-in mic is always available
                "1" -> audioManager.isWiredHeadsetOn // Wired headset
                "2" -> isBluetoothHeadsetConnected() // Bluetooth headset
                else -> false
            }
        }
    }
    
    /**
     * Starts monitoring device connection/disconnection events
     */
    private fun startMonitoringDeviceChanges() {
        if (deviceReceiver != null) {
            return // Already monitoring
        }
        
        try {
            val filter = IntentFilter()
            filter.addAction(AudioManager.ACTION_HEADSET_PLUG)
            filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED)
            filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED)
            
            deviceReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val action = intent.action
                    LogUtils.d(CLASS_NAME, "Device connectivity changed: $action")
                    
                    // Determine which device was affected
                    var deviceId: String? = null
                    
                    when (action) {
                        AudioManager.ACTION_HEADSET_PLUG -> {
                            val state = intent.getIntExtra("state", 0)
                            if (state == 0) { // Unplugged
                                deviceId = "1" // Standard ID for wired headset in our system
                                LogUtils.d(CLASS_NAME, "Wired headset unplugged")
                            }
                        }
                        BluetoothDevice.ACTION_ACL_DISCONNECTED -> {
                            val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                            } else {
                                @Suppress("DEPRECATION")
                                intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                            }
                            
                            if (device != null) {
                                deviceId = "2" // Standard ID for bluetooth in our system for pre-M
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    // For M and above, we can get the actual device ID
                                    val actualDevice = findBluetoothDevice(device)
                                    if (actualDevice != null) {
                                        deviceId = actualDevice.id.toString()
                                    }
                                }
                                LogUtils.d(CLASS_NAME, "Bluetooth device disconnected: ${device.name}, using ID: $deviceId")
                            }
                        }
                    }
                    
                    // If this is the currently selected device, notify delegate
                    if (deviceId != null && deviceId == lastSelectedDeviceId) {
                        LogUtils.d(CLASS_NAME, "Currently selected device disconnected: $deviceId")
                        delegate?.onDeviceDisconnected(deviceId)
                    }
                    
                    // Force refresh the device list
                    forceRefreshAudioDevices()
                }
            }
            
            context.registerReceiver(deviceReceiver, filter)
            LogUtils.d(CLASS_NAME, "Started monitoring device changes")
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Error starting device monitoring: ${e.message}", e)
        }
    }
    
    /**
     * Finds a BluetoothDevice in the list of audio devices
     */
    @RequiresApi(Build.VERSION_CODES.M)
    private fun findBluetoothDevice(device: BluetoothDevice): AudioDeviceInfo? {
        try {
            val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            val bluetoothDevices = audioDevices.filter { 
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
            }
            
            // First try to match by address
            val foundByAddress = bluetoothDevices.firstOrNull { 
                it.address == device.address 
            }
            
            if (foundByAddress != null) {
                return foundByAddress
            }
            
            // If no match by address, try by name
            val deviceName = device.name
            if (deviceName != null) {
                return bluetoothDevices.firstOrNull { 
                    getDeviceName(it).contains(deviceName, ignoreCase = true)
                }
            }
            
            return null
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Error finding Bluetooth device: ${e.message}", e)
            return null
        }
    }
    
    /**
     * Cleanup resources
     */
    fun cleanup() {
        // Stop monitoring device changes
        stopMonitoringDeviceChanges()
        
        // Stop Bluetooth SCO if active
        if (audioManager.isBluetoothScoOn) {
            audioManager.stopBluetoothSco()
            audioManager.isBluetoothScoOn = false
        }
    }
    
    /**
     * Stops monitoring device connection/disconnection events
     */
    private fun stopMonitoringDeviceChanges() {
        if (deviceReceiver != null) {
            try {
                context.unregisterReceiver(deviceReceiver)
                deviceReceiver = null
                LogUtils.d(CLASS_NAME, "Stopped monitoring device changes")
            } catch (e: Exception) {
                LogUtils.e(CLASS_NAME, "Error stopping device monitoring: ${e.message}", e)
            }
        }
    }
} 