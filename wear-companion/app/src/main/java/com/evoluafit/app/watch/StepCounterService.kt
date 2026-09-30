package com.evoluafit.app.watch

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.IBinder
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

class StepCounterService : Service(), SensorEventListener {

    companion object {
        private const val CHANNEL_ID = "evoluafit_steps"
        private const val NOTIFICATION_ID = 2202

        fun start(context: Context) {
            if (ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACTIVITY_RECOGNITION
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                return
            }

            ContextCompat.startForegroundService(
                context,
                Intent(context, StepCounterService::class.java)
            )
        }
    }

    private lateinit var sensorManager: SensorManager
    private var registered = false
    private var lastRawInSession: Long? = null

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        createNotificationChannel()

        val notification = Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_directions)
            .setContentTitle("EvoluaFit")
            .setContentText("Contando passos do dia")
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()

        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        MidnightScheduler.scheduleNext(this)
        registerStepCounter()
        return START_STICKY
    }

    private fun registerStepCounter() {
        if (registered) return
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACTIVITY_RECOGNITION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            stopSelf()
            return
        }

        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (sensor == null) {
            stopSelf()
            return
        }

        // maxReportLatencyUs = 0 asks for immediate delivery instead of batching around midnight.
        registered = sensorManager.registerListener(
            this,
            sensor,
            SensorManager.SENSOR_DELAY_NORMAL,
            0
        )
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type != Sensor.TYPE_STEP_COUNTER || event.values.isEmpty()) return

        val raw = event.values[0].toLong()
        val previous = lastRawInSession

        val changed = WearDataSender.updateFromHardwareCounter(
            this,
            raw,
            System.currentTimeMillis(),
            previous
        )

        lastRawInSession = raw

        if (changed) {
            WearDataSender.send(this)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    override fun onDestroy() {
        if (registered) {
            sensorManager.unregisterListener(this)
            registered = false
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Passos do EvoluaFit",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Mantém o contador diário de passos ativo no relógio."
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)
    }
}
