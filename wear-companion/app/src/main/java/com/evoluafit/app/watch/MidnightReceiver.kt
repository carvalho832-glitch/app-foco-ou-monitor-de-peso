package com.evoluafit.app.watch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MidnightReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (WearDataSender.rollHardwareToToday(context)) {
            WearDataSender.send(context)
        }
        MidnightScheduler.scheduleNext(context)
    }
}
