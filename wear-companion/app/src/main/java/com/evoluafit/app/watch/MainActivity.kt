package com.evoluafit.app.watch

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
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

class MainActivity : Activity(), SensorEventListener {

    companion object {
        private const val REQUEST_PERMISSIONS = 4701
        private const val UI_REFRESH_MS = 2000L
    }

    private lateinit var statusView: TextView
    private lateinit var stepsView: TextView
    private lateinit var stepsSourceView: TextView
    private lateinit var heartView: TextView
    private lateinit var lastSyncView: TextView

    private val healthClient by lazy { HealthServices.getClient(this) }
    private val measureClient by lazy { healthClient.measureClient }
    private val passiveClient by lazy { healthClient.passiveMonitoringClient }

    private val sensorManager by lazy {
        getSystemService(SENSOR_SERVICE) as SensorManager
    }

    private var heartRegistered = false
    private var stepCounterRegistered = false
    private var lastHardwareSteps: Long? = null
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
                    "Sensor cardíaco disponível"
                } else {
                    "Sensor cardíaco atualizado"
                }
            }
        }

        override fun onDataReceived(data: DataPointContainer) {
            val latest = data.getData(DataType.HEART_RATE_BPM).lastOrNull()?.value ?: return
            WearDataSender.saveHeart(this@MainActivity, latest)
            runOnUiThread {
                heartView.text = "FC: " + latest.toInt() + " bpm"
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
        stepsSourceView = findViewById(R.id.stepsSource)
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
        stopHardwareStepCounter()
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
        registerHardwareStepCounter()
        refreshCachedUi()
    }

    private fun registerPassiveBackgroundSync() {
        val capabilityFuture = passiveClient.getCapabilitiesAsync()
        capabilityFuture.addListener({
            try {
                val capabilities = capabilityFuture.get()
                val supported = capabilities.supportedDataTypesPassiveMonitoring
                val requested = mutableSetOf<DeltaDataType<*, *>>()

                if (DataType.STEPS_DAILY in supported) requested.add(DataType.STEPS_DAILY)
                if (DataType.STEPS in supported) requested.add(DataType.STEPS)
                if (DataType.HEART_RATE_BPM in supported) requested.add(DataType.HEART_RATE_BPM)

                if (requested.isEmpty()) {
                    runOnUiThread {
                        statusView.text = "Health Services sem dados passivos; usando sensor direto"
                    }
                    return@addListener
                }

                val config = PassiveListenerConfig(
                    dataTypes = requested,
                    shouldUserActivityInfoBeRequested = false,
                    dailyGoals = setOf(),
                    healthEventTypes = setOf()
                )

                val registerFuture = passiveClient.setPassiveListenerServiceAsync(
                    PassiveHealthService::class.java,
                    config
                )

                registerFuture.addListener({
                    runOnUiThread {
                        try {
                            registerFuture.get()
                            val stepMode = when {
                                DataType.STEPS_DAILY in supported -> "passos diários"
                                DataType.STEPS in supported -> "passos acumulados"
                                else -> "sensor direto"
                            }
                            statusView.text = "Auto sync ativa • " + stepMode
                        } catch (_: Throwable) {
                            statusView.text = "Health Services indisponível; usando sensor direto"
                        }
                    }
                }, ContextCompat.getMainExecutor(this))
            } catch (_: Throwable) {
                runOnUiThread {
                    statusView.text = "Usando contador físico de passos"
                }
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun registerHeartRate() {
        if (heartRegistered) return
        measureClient.registerMeasureCallback(DataType.HEART_RATE_BPM, heartCallback)
        heartRegistered = true
    }

    private fun registerHardwareStepCounter() {
        if (stepCounterRegistered) return
        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (sensor == null) {
            stepsSourceView.text = "Contador físico de passos não disponível"
            return
        }
        stepCounterRegistered = sensorManager.registerListener(
            this,
            sensor,
            SensorManager.SENSOR_DELAY_NORMAL
        )
    }

    private fun stopForegroundHeartRate() {
        if (!heartRegistered) return
        try {
            measureClient.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, heartCallback)
        } catch (_: Throwable) {
        }
        heartRegistered = false
    }

    private fun stopHardwareStepCounter() {
        if (!stepCounterRegistered) return
        sensorManager.unregisterListener(this)
        stepCounterRegistered = false
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type != Sensor.TYPE_STEP_COUNTER || event.values.isEmpty()) return

        val raw = event.values[0].toLong()
        WearDataSender.updateFromHardwareCounter(this, raw)

        val current = WearDataSender.readSteps(this)
        if (current != null && current != lastHardwareSteps) {
            lastHardwareSteps = current
            refreshCachedUi()
            WearDataSender.send(this)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    private fun refreshCachedUi() {
        val steps = WearDataSender.readSteps(this)
        val source = WearDataSender.readStepsSource(this)
        val heart = WearDataSender.readHeart(this)
        val lastSync = WearDataSender.readLastSync(this)

        stepsView.text = if (steps == null) "Passos: aguardando" else "Passos: " + steps
        stepsSourceView.text = when (source) {
            "health_services_daily" -> "Fonte: Health Services • total diário"
            "health_services_delta" -> "Fonte: Health Services • acumulando"
            "hardware_counter" -> "Fonte: contador físico • desde ativação"
            else -> "Fonte: aguardando primeira leitura"
        }

        heartView.text = if (heart == null) "FC: --" else "FC: " + heart.toInt() + " bpm"

        lastSyncView.text = if (lastSync == null || lastSync <= 0L) {
            "Ainda não sincronizado automaticamente"
        } else {
            val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(lastSync))
            "Última sincronização: " + time
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
