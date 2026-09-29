package com.evoluafit.app.watch

import android.content.Context
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

object WearDataSender {
    const val PATH = "/evoluafit/health"
    private const val PREFS = "evoluafit_watch"
    private const val KEY_STEPS = "steps"
    private const val KEY_HEART = "heart"
    private const val KEY_LAST_SYNC = "last_sync"

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

    fun readLastSync(context: Context): Long? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return if (prefs.contains(KEY_LAST_SYNC)) prefs.getLong(KEY_LAST_SYNC, 0L) else null
    }

    private fun markSynced(context: Context, timestamp: Long) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_SYNC, timestamp)
            .apply()
    }

    fun send(context: Context, onComplete: ((Boolean) -> Unit)? = null) {
        val timestamp = System.currentTimeMillis()
        val request = PutDataMapRequest.create(PATH).run {
            readSteps(context)?.let { dataMap.putLong("steps", it) }
            readHeart(context)?.let { dataMap.putDouble("heartRate", it) }
            dataMap.putLong("timestamp", timestamp)
            dataMap.putString("source", "galaxy_watch_v2")
            dataMap.putInt("protocolVersion", 2)
            asPutDataRequest().setUrgent()
        }

        Wearable.getDataClient(context)
            .putDataItem(request)
            .addOnSuccessListener {
                markSynced(context, timestamp)
                onComplete?.invoke(true)
            }
            .addOnFailureListener {
                onComplete?.invoke(false)
            }
    }
}
