package com.evoluafit.app.watch

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

object WearDataSender {
    const val PATH = "/evoluafit/health"
    private const val PREFS = "evoluafit_watch"
    private const val KEY_STEPS = "steps"
    private const val KEY_STEPS_SOURCE = "steps_source"
    private const val KEY_STEPS_DATE = "steps_date"
    private const val KEY_HEART = "heart"
    private const val KEY_LAST_SYNC = "last_sync"
    private const val KEY_SENSOR_BASE = "sensor_base"
    private const val KEY_SENSOR_OFFSET = "sensor_offset"
    private const val KEY_SENSOR_DATE = "sensor_date"

    private fun today(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

    fun saveDailySteps(context: Context, steps: Long) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_STEPS, steps.coerceAtLeast(0L))
            .putString(KEY_STEPS_SOURCE, "health_services_daily")
            .putString(KEY_STEPS_DATE, today())
            .apply()
    }

    fun addStepDelta(context: Context, delta: Long) {
        if (delta <= 0L) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val date = today()
        val storedDate = prefs.getString(KEY_STEPS_DATE, null)
        val source = prefs.getString(KEY_STEPS_SOURCE, null)

        // A daily total is authoritative when the device actually provides it.
        if (storedDate == date && source == "health_services_daily") return

        val current = if (storedDate == date) prefs.getLong(KEY_STEPS, 0L) else 0L
        prefs.edit()
            .putLong(KEY_STEPS, current + delta)
            .putString(KEY_STEPS_SOURCE, "health_services_delta")
            .putString(KEY_STEPS_DATE, date)
            .apply()
    }

    fun updateFromHardwareCounter(context: Context, rawCounter: Long) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val date = today()
        val storedDate = prefs.getString(KEY_SENSOR_DATE, null)
        val existingSource = prefs.getString(KEY_STEPS_SOURCE, null)

        // Do not override a true daily value delivered by Health Services.
        if (existingSource == "health_services_daily" && prefs.getString(KEY_STEPS_DATE, null) == date) {
            return
        }

        var base = prefs.getLong(KEY_SENSOR_BASE, -1L)
        var offset = prefs.getLong(KEY_SENSOR_OFFSET, 0L)

        if (storedDate != date || base < 0L || rawCounter < base) {
            val knownToday = if (prefs.getString(KEY_STEPS_DATE, null) == date) {
                prefs.getLong(KEY_STEPS, 0L)
            } else {
                0L
            }
            base = rawCounter
            offset = knownToday
            prefs.edit()
                .putLong(KEY_SENSOR_BASE, base)
                .putLong(KEY_SENSOR_OFFSET, offset)
                .putString(KEY_SENSOR_DATE, date)
                .apply()
        }

        val directSteps = (offset + (rawCounter - base)).coerceAtLeast(0L)
        prefs.edit()
            .putLong(KEY_STEPS, directSteps)
            .putString(KEY_STEPS_SOURCE, "hardware_counter")
            .putString(KEY_STEPS_DATE, date)
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

    fun readStepsSource(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_STEPS_SOURCE, null)

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
            readStepsSource(context)?.let { dataMap.putString("stepsSource", it) }
            readHeart(context)?.let { dataMap.putDouble("heartRate", it) }
            dataMap.putLong("timestamp", timestamp)
            dataMap.putString("source", "galaxy_watch_v2_1")
            dataMap.putInt("protocolVersion", 21)
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
