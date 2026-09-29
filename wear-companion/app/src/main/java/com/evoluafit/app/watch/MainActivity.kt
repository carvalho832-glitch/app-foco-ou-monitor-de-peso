package com.evoluafit.app.watch

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.health.services.client.HealthServices
import androidx.health.services.client.MeasureCallback
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DataTypeAvailability
import androidx.health.services.client.data.DeltaDataType
import androidx.health.services.client.data.PassiveListenerConfig
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {

    companion object {
        private const val REQUEST_PERMISSIONS = 4701
        private const val UI_REFRESH_MS = 2000L
    }

    private lateinit var statusView: TextView
    private lateinit var stepsView: TextView
    private lateinit var heartView: TextView
    private lateinit var lastSyncView: TextView

    private val healthClient by lazy { HealthServices.getClient(this) }
    private val measureClient by lazy { healthClient.measureClient }
    private val passiveClient by lazy { healthClient.passiveMonitoringClient }

    private var heartRegistered = false
    private val handler = Handler(Looper.getMainLooper())

    private val uiRefresh = object : Runnable {
        override fun run() {
            refreshCachedUi()
            handler.postDelayed(this, UI_REFRESH_MS)
        }
    }

    private val heartCallback = object : MeasureCallback {
        override fun onAvailabilityChanged(
            dataType: DeltaDataType<*, *>,
            availability: Availability
        ) {
            runOnUiThread {
                statusView.text = if (availability is DataTypeAvailability) {
                    "Sensor cardíaco: $availability"
                } else {
                    "Sensor cardíaco atualizado"
                }
            }
        }

        override fun onDataReceived(data: DataPointContainer) {
            val latest = data.getData(DataType.HEART_RATE_BPM).lastOrNull()?.value ?: return
            WearDataSender.saveHeart(this@MainActivity, latest)
            runOnUiThread {
                heartView.text = "FC: ${latest.toInt()} bpm"
                statusView.text = "Sincronização automática ativa"
            }
            WearDataSender.send(this@MainActivity)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusView = findViewById(R.id.status)
        stepsView = findViewById(R.id.steps)
        heartView = findViewById(R.id.heart)
        lastSyncView = findViewById(R.id.lastSync)

        findViewById<Button>(R.id.permissionButton).setOnClickListener {
            ensurePermissionsAndStart()
        }

        findViewById<Button>(R.id.syncButton).setOnClickListener {
            refreshCachedUi()
            statusView.text = "Sincronizando agora..."
            WearDataSender.send(this) { ok ->
                runOnUiThread {
                    statusView.text = if (ok) {
                        "Sincronizado com EvoluaFit ✓"
                    } else {
                        "Aguardando conexão com o celular"
                    }
                    refreshCachedUi()
                }
            }
        }

        refreshCachedUi()
        ensurePermissionsAndStart()
    }

    override fun onResume() {
        super.onResume()
        handler.removeCallbacks(uiRefresh)
        handler.post(uiRefresh)
        if (hasPermissions()) startSensors()
    }

    override fun onPause() {
        stopForegroundHeartRate()
        handler.removeCallbacks(uiRefresh)
        super.onPause()
    }

    private fun hasPermissions(): Boolean {
        val activityOk = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACTIVITY_RECOGNITION
        ) == PackageManager.PERMISSION_GRANTED

        val bodyOk = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.BODY_SENSORS
        ) == PackageManager.PERMISSION_GRANTED

        return activityOk && bodyOk
    }

    private fun ensurePermissionsAndStart() {
        if (hasPermissions()) {
            startSensors()
            return
        }

        ActivityCompat.requestPermissions(
            this,
            arrayOf(
                Manifest.permission.ACTIVITY_RECOGNITION,
                Manifest.permission.BODY_SENSORS
            ),
            REQUEST_PERMISSIONS
        )
    }

    private fun startSensors() {
        registerPassiveBackgroundSync()
        registerHeartRate()
        refreshCachedUi()
    }

    private fun registerPassiveBackgroundSync() {
        val config = PassiveListenerConfig(
            dataTypes = setOf(DataType.STEPS_DAILY, DataType.HEART_RATE_BPM),
            shouldUserActivityInfoBeRequested = false,
            dailyGoals = setOf(),
            healthEventTypes = setOf()
        )

        val future = passiveClient.setPassiveListenerServiceAsync(
            PassiveHealthService::class.java,
            config
        )

        future.addListener({
            runOnUiThread {
                try {
                    future.get()
                    statusView.text = "Sincronização automática ativa"
                } catch (_: Throwable) {
                    statusView.text = "Não foi possível ativar a sincronização automática"
                }
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun registerHeartRate() {
        if (heartRegistered) return
        measureClient.registerMeasureCallback(DataType.HEART_RATE_BPM, heartCallback)
        heartRegistered = true
    }

    private fun stopForegroundHeartRate() {
        if (!heartRegistered) return
        try {
            measureClient.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, heartCallback)
        } catch (_: Throwable) {
        }
        heartRegistered = false
    }

    private fun refreshCachedUi() {
        val steps = WearDataSender.readSteps(this)
        val heart = WearDataSender.readHeart(this)
        val lastSync = WearDataSender.readLastSync(this)

        stepsView.text = if (steps == null) "Passos: aguardando" else "Passos: $steps"
        heartView.text = if (heart == null) "FC: --" else "FC: ${heart.toInt()} bpm"

        lastSyncView.text = if (lastSync == null || lastSync <= 0L) {
            "Ainda não sincronizado automaticamente"
        } else {
            val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(lastSync))
            "Última sincronização: $time"
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            if (hasPermissions()) {
                startSensors()
            } else {
                statusView.text = "Permita atividade física e sensores para continuar."
            }
        }
    }
}
