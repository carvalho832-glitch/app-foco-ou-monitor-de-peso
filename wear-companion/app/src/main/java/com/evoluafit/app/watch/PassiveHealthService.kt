package com.evoluafit.app.watch

import android.os.SystemClock
import androidx.health.services.client.PassiveListenerService
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import java.time.Instant

class PassiveHealthService : PassiveListenerService() {

    override fun onNewDataPointsReceived(dataPoints: DataPointContainer) {
        var changed = false
        val bootInstant = Instant.ofEpochMilli(
            System.currentTimeMillis() - SystemClock.elapsedRealtime()
        )

        dataPoints.getData(DataType.STEPS_DAILY)
            .sortedBy { it.getEndInstant(bootInstant) }
            .forEach { point ->
                WearDataSender.saveDailySteps(
                    this,
                    point.value,
                    point.getEndInstant(bootInstant).toEpochMilli()
                )
                changed = true
            }

        dataPoints.getData(DataType.STEPS)
            .sortedBy { it.getEndInstant(bootInstant) }
            .forEach { point ->
                WearDataSender.addStepDelta(
                    this,
                    point.value,
                    point.getEndInstant(bootInstant).toEpochMilli()
                )
                changed = true
            }

        val heartRate = dataPoints.getData(DataType.HEART_RATE_BPM).lastOrNull()?.value
        if (heartRate != null) {
            WearDataSender.saveHeart(this, heartRate)
            changed = true
        }

        if (changed) {
            WearDataSender.send(this)
        }
    }
}
