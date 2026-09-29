package com.evoluafit.app.watch

import android.content.Context
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

object WearDataSender {
    const val PATH = "/evoluafit/health"
    private const val PREFS = "evoluafit_watch"
    private const val KEY_STEPS = "steps"
    private const val KEY_HEART = "heart"

    fun saveSteps(context: Context, steps: Long) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_STEPS, steps)
            .apply()
    }

    fun saveHeart(context: Context, heart: Double) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_HEART, java.lang.Double.doubleToRawLongBits(heart))
            .apply()
    }

    fun readSteps(context: Context): Long? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return if (prefs.contains(KEY_STEPS)) prefs.getLong(KEY_STEPS, 0L) else null
    }

    fun readHeart(context: Context): Double? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return if (prefs.contains(KEY_HEART)) {
            java.lang.Double.longBitsToDouble(prefs.getLong(KEY_HEART, 0L))
        } else null
    }

    fun send(context: Context, onComplete: ((Boolean) -> Unit)? = null) {
        val request = PutDataMapRequest.create(PATH).run {
            readSteps(context)?.let { dataMap.putLong("steps", it) }
            readHeart(context)?.let { dataMap.putDouble("heartRate", it) }
            dataMap.putLong("timestamp", System.currentTimeMillis())
            dataMap.putString("source", "galaxy_watch")
            asPutDataRequest().setUrgent()
        }

        Wearable.getDataClient(context)
            .putDataItem(request)
            .addOnSuccessListener { onComplete?.invoke(true) }
            .addOnFailureListener { onComplete?.invoke(false) }
    }
}
