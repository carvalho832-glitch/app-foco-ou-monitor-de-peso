package com.evoluafit.app.watch

import androidx.health.services.client.PassiveListenerService
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType

class PassiveHealthService : PassiveListenerService() {

    override fun onNewDataPointsReceived(dataPoints: DataPointContainer) {
        var changed = false

        val dailySteps = dataPoints.getData(DataType.STEPS_DAILY).lastOrNull()?.value
        if (dailySteps != null) {
            WearDataSender.saveSteps(this, dailySteps)
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
