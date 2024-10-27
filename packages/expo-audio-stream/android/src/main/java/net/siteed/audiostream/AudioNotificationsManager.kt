package net.siteed.audiostream

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import java.lang.ref.WeakReference
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

class AudioNotificationManager private constructor(context: Context) {
    private val contextRef = WeakReference(context.applicationContext)
    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private val mainHandler = Handler(Looper.getMainLooper())
    private val isUpdating = AtomicBoolean(false)
    private val isPaused = AtomicBoolean(false)

    private lateinit var notificationBuilder: NotificationCompat.Builder
    private lateinit var remoteViews: RemoteViews
    private lateinit var recordingConfig: RecordingConfig
    private var recordingStartTime: Long = 0
    private var pausedDuration: Long = 0
    private var lastPauseTime: Long = 0
    private var lastWaveformUpdate: Long = 0
    private val waveformRenderer = WaveformRenderer()

    companion object {
        private const val WAVEFORM_UPDATE_INTERVAL = 100L
        private const val UPDATE_INTERVAL = 1000L

        @Volatile
        private var instance: AudioNotificationManager? = null

        fun getInstance(context: Context): AudioNotificationManager {
            return instance ?: synchronized(this) {
                instance ?: AudioNotificationManager(context).also { instance = it }
            }
        }
    }

    fun initialize(config: RecordingConfig) {
        recordingConfig = config
        createNotificationChannel()
        initializeNotification()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                recordingConfig.notification.channelId,
                recordingConfig.notification.channelName,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = recordingConfig.notification.channelDescription
                enableLights(true)
                lightColor = Color.parseColor(recordingConfig.notification.lightColor)
                enableVibration(true)
                setShowBadge(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun initializeNotification() {
        val context = contextRef.get() ?: return
        try {
            remoteViews = RemoteViews(context.packageName, R.layout.notification_recording)
            remoteViews.apply {
                setTextViewText(R.id.notification_title, recordingConfig.notification.title)
                setTextViewText(R.id.notification_text, recordingConfig.notification.text)
                setTextViewText(R.id.notification_duration, formatDuration(0))
                setViewVisibility(
                    R.id.notification_waveform,
                    if (recordingConfig.showWaveformInNotification &&
                        recordingConfig.notification.waveform != null) View.VISIBLE else View.GONE
                )
            }

            buildNotification(context)
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Failed to initialize notification", e)
        }
    }

    private fun buildNotification(context: Context) {
        val iconResId = recordingConfig.notification.icon?.let {
            getResourceIdByName(it)
        } ?: R.drawable.ic_microphone

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            context.packageManager.getLaunchIntentForPackage(context.packageName),
            PendingIntent.FLAG_IMMUTABLE
        )

        notificationBuilder = NotificationCompat.Builder(context, recordingConfig.notification.channelId)
            .setSmallIcon(iconResId)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setCustomContentView(remoteViews)
            .setCustomBigContentView(remoteViews)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())

        addNotificationActions(context)
    }

    private fun addNotificationActions(context: Context) {
        // Create pause action
        val pauseIntent = Intent(context, RecordingActionReceiver::class.java).apply {
            action = RecordingActionReceiver.ACTION_PAUSE_RECORDING
        }
        val pausePendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            pauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Create resume action
        val resumeIntent = Intent(context, RecordingActionReceiver::class.java).apply {
            action = RecordingActionReceiver.ACTION_RESUME_RECORDING
        }
        val resumePendingIntent = PendingIntent.getBroadcast(
            context,
            1,
            resumeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Add pause or resume action based on current state
        if (isPaused.get()) {
            notificationBuilder.addAction(
                R.drawable.ic_play,
                "Resume",
                resumePendingIntent
            )
        } else {
            notificationBuilder.addAction(
                R.drawable.ic_pause,
                "Pause",
                pausePendingIntent
            )
        }

        // Add configured custom actions
        recordingConfig.notification.actions.forEach { action ->
            val intent = Intent(context, RecordingActionReceiver::class.java).apply {
                this.action = action.intentAction
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                action.intentAction.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val actionIconResId = action.icon?.let { getResourceIdByName(it) }
                ?: R.drawable.ic_default_action_icon
            notificationBuilder.addAction(actionIconResId, action.title, pendingIntent)
        }
    }

    private fun updateNotificationActions() {
        val context = contextRef.get() ?: return
        try {
            // Clear existing actions
            notificationBuilder.clearActions()
            // Add updated actions
            addNotificationActions(context)

            // Update the notification
            val updatedNotification = notificationBuilder
                .setCustomContentView(remoteViews)
                .setCustomBigContentView(remoteViews)
                .build()

            notificationManager.notify(recordingConfig.notification.notificationId, updatedNotification)
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Failed to update notification actions", e)
        }
    }

    fun startUpdates(startTime: Long) {
        recordingStartTime = startTime
        pausedDuration = 0
        isPaused.set(false)
        updateNotificationActions() // Update actions when starting
        if (!isUpdating.getAndSet(true)) {
            scheduleUpdate()
        }
    }

    private fun scheduleUpdate() {
        mainHandler.postDelayed({
            if (isUpdating.get() && !isPaused.get()) {
                updateNotification()
                scheduleUpdate()
            }
        }, UPDATE_INTERVAL)
    }

    fun updateNotification(audioData: FloatArray? = null) {
        try {
            val currentTime = System.currentTimeMillis()
            val recordingDuration = if (isPaused.get()) {
                lastPauseTime - recordingStartTime - pausedDuration
            } else {
                currentTime - recordingStartTime - pausedDuration
            }

            remoteViews.apply {
                setTextViewText(R.id.notification_title, recordingConfig.notification.title)
                setTextViewText(R.id.notification_text, recordingConfig.notification.text)
                setTextViewText(R.id.notification_duration, formatDuration(recordingDuration))

                if (recordingConfig.showWaveformInNotification &&
                    audioData != null &&
                    audioData.isNotEmpty() &&
                    SystemClock.elapsedRealtime() - lastWaveformUpdate >= WAVEFORM_UPDATE_INTERVAL
                ) {
                    setViewVisibility(R.id.notification_waveform, View.VISIBLE)
                    setImageViewBitmap(
                        R.id.notification_waveform,
                        waveformRenderer.generateWaveform(audioData, recordingConfig.notification.waveform)
                    )
                    lastWaveformUpdate = SystemClock.elapsedRealtime()
                }
            }

            val notification = notificationBuilder
                .setCustomContentView(remoteViews)
                .setCustomBigContentView(remoteViews)
                .build()

            notificationManager.notify(recordingConfig.notification.notificationId, notification)

        } catch (e: Exception) {
            Log.e(Constants.TAG, "Error updating notification", e)
        }
    }

    fun getNotification(): Notification = notificationBuilder.build()

    fun pauseUpdates() {
        isPaused.set(true)
        lastPauseTime = System.currentTimeMillis()
        updateNotificationActions() // Update actions when pausing
    }

    fun resumeUpdates() {
        pausedDuration += System.currentTimeMillis() - lastPauseTime
        isPaused.set(false)
        updateNotificationActions() // Update actions when resuming
        scheduleUpdate()
    }

    fun stopUpdates() {
        isUpdating.set(false)
        mainHandler.removeCallbacksAndMessages(null)
        notificationManager.cancel(recordingConfig.notification.notificationId)
        cleanup()
    }

    private fun cleanup() {
        recordingStartTime = 0
        pausedDuration = 0
        lastPauseTime = 0
        lastWaveformUpdate = 0
        isPaused.set(false)
        isUpdating.set(false)
    }

    private fun getResourceIdByName(resourceName: String): Int {
        val context = contextRef.get() ?: return R.drawable.ic_default_action_icon
        return context.resources.getIdentifier(resourceName, "drawable", context.packageName)
            .takeIf { it != 0 } ?: R.drawable.ic_default_action_icon
    }

    private fun formatDuration(durationMs: Long): String {
        val totalSeconds = durationMs / 1000
        val minutes = totalSeconds / 60
        val seconds = totalSeconds % 60
        return String.format(Locale.US, "%02d:%02d", minutes, seconds)
    }
}