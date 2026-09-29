package com.evoluafit.app.watch

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.health.services.client.HealthServices
import androidx.health.services.client.PassiveListenerCallback
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DataTypeAvailability
import androidx.health.services.client.data.DeltaDataType
import androidx.health.services.client.MeasureCallback
import androidx.health.services.client.PassiveListenerConfig

class MainActivity : Activity() {

    companion object {
        private const val REQUEST_PERMISSIONS = 4701
    }

    private lateinit var statusView: TextView
    private lateinit var stepsView: TextView
    private lateinit var heartView: TextView

    private val healthClient by lazy { HealthServices.getClient(this) }
    private val measureClient by lazy { healthClient.measureClient }
    private val passiveClient by lazy { healthClient.passiveMonitoringClient }

    private var passiveRegistered = false
    private var heartRegistered = false

    private val passiveCallback = object : PassiveListenerCallback {
        override fun onNewDataPointsReceived(dataPoints: DataPointContainer) {
            val points = dataPoints.getData(DataType.STEPS_DAILY)
            val latest = points.lastOrNull()?.value
            if (latest != null) {
                WearDataSender.saveSteps(this@MainActivity, latest)
                runOnUiThread {
                    stepsView.text = "Passos: $latest"
                    statusView.text = "Passos recebidos do relógio"
                }
                WearDataSender.send(this@MainActivity)
            }
        }
    }

    private val heartCallback = object : MeasureCallback {
        override fun onAvailabilityChanged(
            dataType: DeltaDataType<*, *>,
            availability: Availability
        ) {
            runOnUiThread {
                statusView.text = if (availability is DataTypeAvailability) {
                    "Sensor cardíaco: ${availability}"
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
                statusView.text = "Relógio conectado ao EvoluaFit"
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

        findViewById<Button>(R.id.permissionButton).setOnClickListener {
            ensurePermissionsAndStart()
        }

        findViewById<Button>(R.id.syncButton).setOnClickListener {
            refreshCachedUi()
            statusView.text = "Enviando ao celular..."
            WearDataSender.send(this) { ok ->
                runOnUiThread {
                    statusView.text = if (ok) {
                        "Dados enviados ao EvoluaFit ✓"
                    } else {
                        "Celular ainda não recebeu. Verifique o pareamento."
                    }
                }
            }
        }

        refreshCachedUi()
        ensurePermissionsAndStart()
    }

    override fun onResume() {
        super.onResume()
        if (hasPermissions()) startSensors()
    }

    override fun onPause() {
        stopForegroundSensors()
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
        registerPassiveSteps()
        registerHeartRate()
        refreshCachedUi()
        statusView.text = "Sensores ativos. Aguardando dados..."
    }

    private fun registerPassiveSteps() {
        if (passiveRegistered) return
        val config = PassiveListenerConfig.builder()
            .setDataTypes(setOf(DataType.STEPS_DAILY))
            .build()

        passiveClient.setPassiveListenerCallback(config, passiveCallback)
        passiveRegistered = true
    }

    private fun registerHeartRate() {
        if (heartRegistered) return
        measureClient.registerMeasureCallback(DataType.HEART_RATE_BPM, heartCallback)
        heartRegistered = true
    }

    private fun stopForegroundSensors() {
        if (heartRegistered) {
            try {
                measureClient.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, heartCallback)
            } catch (_: Throwable) {
            }
            heartRegistered = false
        }

        if (passiveRegistered) {
            try {
                passiveClient.clearPassiveListenerCallbackAsync()
            } catch (_: Throwable) {
            }
            passiveRegistered = false
        }
    }

    private fun refreshCachedUi() {
        val steps = WearDataSender.readSteps(this)
        val heart = WearDataSender.readHeart(this)
        stepsView.text = if (steps == null) "Passos: --" else "Passos: $steps"
        heartView.text = if (heart == null) "FC: --" else "FC: ${heart.toInt()} bpm"
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
                statusView.text = "Permita atividade física e sensores para testar."
            }
        }
    }
}
