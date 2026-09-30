package com.evoluafit.app.watch

import android.content.Context
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DeltaDataType
import androidx.health.services.client.data.PassiveListenerConfig
import java.util.concurrent.TimeUnit

object PassiveRegistration {

    data class Result(val success: Boolean, val label: String)

    fun registerBlocking(context: Context): Result {
        return try {
            val client = HealthServices.getClient(context).passiveMonitoringClient
            val capabilities = client.getCapabilitiesAsync().get(30, TimeUnit.SECONDS)
            val supported = capabilities.supportedDataTypesPassiveMonitoring

            val requested = mutableSetOf<DeltaDataType<*, *>>()
            if (DataType.STEPS_DAILY in supported) requested.add(DataType.STEPS_DAILY)
            if (DataType.STEPS in supported) requested.add(DataType.STEPS)
            if (DataType.HEART_RATE_BPM in supported) requested.add(DataType.HEART_RATE_BPM)

            if (requested.isEmpty()) {
                return Result(false, "Health Services sem dados passivos")
            }

            if (DataType.STEPS in supported) {
                WearDataSender.beginHealthDeltaSession(context)
            }

            val config = PassiveListenerConfig(
                dataTypes = requested,
                shouldUserActivityInfoBeRequested = false,
                dailyGoals = setOf(),
                healthEventTypes = setOf()
            )

            client.setPassiveListenerServiceAsync(
                PassiveHealthService::class.java,
                config
            ).get(30, TimeUnit.SECONDS)

            val label = when {
                DataType.STEPS_DAILY in supported -> "Health Services diário + fallback físico"
                DataType.STEPS in supported -> "Health Services acumulado + fallback físico"
                else -> "contador físico"
            }

            Result(true, label)
        } catch (t: Throwable) {
            Result(false, t.javaClass.simpleName.ifBlank { "falha de registro" })
        }
    }
}
