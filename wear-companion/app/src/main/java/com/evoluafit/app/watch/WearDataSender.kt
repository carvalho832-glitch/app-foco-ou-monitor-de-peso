package com.evoluafit.app.watch

import android.content.Context
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import java.time.Instant
import java.time.ZoneId

object WearDataSender {
    const val PATH = "/evoluafit/health"

    private const val PREFS = "evoluafit_watch"

    private const val KEY_STEPS = "steps"
    private const val KEY_STEPS_SOURCE = "steps_source"
    private const val KEY_STEPS_DATE = "steps_date"
    private const val KEY_STEPS_PARTIAL = "steps_partial"

    private const val KEY_HEART = "heart"
    private const val KEY_LAST_SYNC = "last_sync"

    private const val KEY_HW_DATE = "v22_hw_date"
    private const val KEY_HW_BASE_RAW = "v22_hw_base_raw"
    private const val KEY_HW_LAST_RAW = "v22_hw_last_raw"
    private const val KEY_HW_OFFSET = "v22_hw_offset"
    private const val KEY_HW_DAILY = "v22_hw_daily"
    private const val KEY_HW_PARTIAL = "v22_hw_partial"

    private const val KEY_HS_DAILY_DATE = "v22_hs_daily_date"
    private const val KEY_HS_DAILY = "v22_hs_daily"

    private const val KEY_HS_DELTA_DATE = "v22_hs_delta_date"
    private const val KEY_HS_DELTA_OFFSET = "v22_hs_delta_offset"
    private const val KEY_HS_DELTA_ACCUM = "v22_hs_delta_accum"
    private const val KEY_HS_DELTA_TOTAL = "v22_hs_delta_total"
    private const val KEY_HS_DELTA_SEEN = "v22_hs_delta_seen"
    private const val KEY_HS_DELTA_PARTIAL = "v22_hs_delta_partial"
    private const val KEY_HS_SESSION_DATE = "v22_hs_session_date"
    private const val KEY_HS_SESSION_START = "v22_hs_session_start"

    // v2.1 keys kept only for one-time migration.
    private const val LEGACY_SENSOR_BASE = "sensor_base"
    private const val LEGACY_SENSOR_OFFSET = "sensor_offset"
    private const val LEGACY_SENSOR_DATE = "sensor_date"

    fun currentDate(epochMillis: Long = System.currentTimeMillis()): String =
        Instant.ofEpochMilli(epochMillis)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
            .toString()

    fun saveDailySteps(
        context: Context,
        steps: Long,
        eventTimeMillis: Long = System.currentTimeMillis()
    ) {
        val date = currentDate(eventTimeMillis)
        if (date != currentDate()) return

        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_HS_DAILY_DATE, date)
            .putLong(KEY_HS_DAILY, steps.coerceAtLeast(0L))
            .commit()

        recomputeEffective(context)
    }

    /**
     * Starts a new Health Services STEPS delta session. The current best daily count is used
     * as an offset so a re-registration or watch reboot during the day does not reset the total.
     */
    fun beginHealthDeltaSession(context: Context, startedAtMillis: Long = System.currentTimeMillis()) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val date = currentDate(startedAtMillis)

        val existingDate = prefs.getString(KEY_STEPS_DATE, null)
        val existingSource = prefs.getString(KEY_STEPS_SOURCE, null)
        val existingSteps = if (existingDate == date) prefs.getLong(KEY_STEPS, 0L) else 0L
        val existingPartial = existingDate == date && prefs.getBoolean(KEY_STEPS_PARTIAL, false)

        val hardwareDate = prefs.getString(KEY_HW_DATE, null)
        val hardwareSteps = if (hardwareDate == date) prefs.getLong(KEY_HW_DAILY, 0L) else 0L
        val hardwarePartial = hardwareDate == date && prefs.getBoolean(KEY_HW_PARTIAL, true)

        val seed: Long
        val partial: Boolean
        when {
            existingDate == date && existingSource == "health_services_delta" -> {
                seed = existingSteps
                partial = existingPartial
            }
            hardwareDate == date -> {
                seed = hardwareSteps
                partial = hardwarePartial
            }
            else -> {
                seed = 0L
                // A session that starts mid-day without any seed cannot reconstruct earlier steps.
                partial = true
            }
        }

        prefs.edit()
            .putString(KEY_HS_SESSION_DATE, date)
            .putLong(KEY_HS_SESSION_START, startedAtMillis)
            .putString(KEY_HS_DELTA_DATE, date)
            .putLong(KEY_HS_DELTA_OFFSET, seed)
            .putLong(KEY_HS_DELTA_ACCUM, 0L)
            .putLong(KEY_HS_DELTA_TOTAL, seed)
            .putBoolean(KEY_HS_DELTA_SEEN, false)
            .putBoolean(KEY_HS_DELTA_PARTIAL, partial)
            .commit()

        recomputeEffective(context)
    }

    /**
     * Adds a granular STEPS interval using its real event timestamp. This prevents a batch
     * delivered after midnight from being counted in the wrong day.
     */
    fun addStepDelta(context: Context, delta: Long, eventTimeMillis: Long) {
        if (delta <= 0L) return

        val eventDate = currentDate(eventTimeMillis)
        val today = currentDate()
        if (eventDate != today) return

        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val sessionDate = prefs.getString(KEY_HS_SESSION_DATE, null)
        val sessionStart = prefs.getLong(KEY_HS_SESSION_START, 0L)

        // If a replacement registration was just created, ignore stale batched intervals
        // that ended before that registration.
        if (sessionDate == eventDate && sessionStart > 0L && eventTimeMillis + 1000L < sessionStart) {
            return
        }

        val storedDate = prefs.getString(KEY_HS_DELTA_DATE, null)
        val offset: Long
        val accumulated: Long
        val partial: Boolean

        if (storedDate == eventDate) {
            offset = prefs.getLong(KEY_HS_DELTA_OFFSET, 0L)
            accumulated = prefs.getLong(KEY_HS_DELTA_ACCUM, 0L)
            partial = prefs.getBoolean(KEY_HS_DELTA_PARTIAL, false)
        } else if (sessionDate == eventDate) {
            offset = prefs.getLong(KEY_HS_DELTA_OFFSET, 0L)
            accumulated = 0L
            partial = prefs.getBoolean(KEY_HS_DELTA_PARTIAL, true)
        } else {
            // Registration survived midnight: the new day's delta stream starts at zero.
            offset = 0L
            accumulated = 0L
            partial = false
        }

        val newAccum = accumulated + delta
        prefs.edit()
            .putString(KEY_HS_DELTA_DATE, eventDate)
            .putLong(KEY_HS_DELTA_OFFSET, offset)
            .putLong(KEY_HS_DELTA_ACCUM, newAccum)
            .putLong(KEY_HS_DELTA_TOTAL, offset + newAccum)
            .putBoolean(KEY_HS_DELTA_SEEN, true)
            .putBoolean(KEY_HS_DELTA_PARTIAL, partial)
            .commit()

        recomputeEffective(context)
    }

    /**
     * Updates the low-power TYPE_STEP_COUNTER fallback.
     *
     * The raw sensor is cumulative since boot. A persisted base converts it into a daily total.
     * If raw decreases on the same date, the watch rebooted: the count already accumulated today
     * becomes an offset and the new raw value becomes the new base.
     *
     * If the date changed while the same service instance stayed alive, previousRawInSession is
     * the exact boundary reference. MidnightReceiver normally creates the boundary even earlier.
     */
    fun updateFromHardwareCounter(
        context: Context,
        rawCounter: Long,
        eventTimeMillis: Long = System.currentTimeMillis(),
        previousRawInSession: Long? = null
    ): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val date = currentDate(eventTimeMillis)
        val beforeSteps = readStepsInternal(prefs)
        val beforeSource = prefs.getString(KEY_STEPS_SOURCE, null)

        var hwDate = prefs.getString(KEY_HW_DATE, null)

        if (hwDate == null) {
            val legacyDate = prefs.getString(LEGACY_SENSOR_DATE, null)
            val legacySource = prefs.getString(KEY_STEPS_SOURCE, null)
            val legacyStepsDate = prefs.getString(KEY_STEPS_DATE, null)
            val legacySteps = if (legacyStepsDate == date && legacySource == "hardware_counter") {
                prefs.getLong(KEY_STEPS, 0L)
            } else {
                0L
            }

            // v2.1's counter started at activation time, so the upgrade day is marked partial.
            val migratedOffset = if (legacyDate == date) {
                val legacyBase = prefs.getLong(LEGACY_SENSOR_BASE, rawCounter)
                val legacyOffset = prefs.getLong(LEGACY_SENSOR_OFFSET, legacySteps)
                (legacyOffset + (rawCounter - legacyBase).coerceAtLeast(0L)).coerceAtLeast(legacySteps)
            } else {
                legacySteps
            }

            prefs.edit()
                .putString(KEY_HW_DATE, date)
                .putLong(KEY_HW_BASE_RAW, rawCounter)
                .putLong(KEY_HW_LAST_RAW, rawCounter)
                .putLong(KEY_HW_OFFSET, migratedOffset)
                .putLong(KEY_HW_DAILY, migratedOffset)
                .putBoolean(KEY_HW_PARTIAL, true)
                .commit()
            hwDate = date
        }

        if (hwDate == date) {
            val lastRaw = prefs.getLong(KEY_HW_LAST_RAW, rawCounter)
            var baseRaw = prefs.getLong(KEY_HW_BASE_RAW, rawCounter)
            var offset = prefs.getLong(KEY_HW_OFFSET, 0L)
            var daily = prefs.getLong(KEY_HW_DAILY, 0L)
            val partial = prefs.getBoolean(KEY_HW_PARTIAL, true)

            if (rawCounter < lastRaw || rawCounter < baseRaw) {
                // Counter reset after reboot. Preserve everything counted earlier today.
                offset = daily
                baseRaw = rawCounter
                daily = offset
            } else {
                daily = (offset + rawCounter - baseRaw).coerceAtLeast(0L)
            }

            prefs.edit()
                .putLong(KEY_HW_BASE_RAW, baseRaw)
                .putLong(KEY_HW_LAST_RAW, rawCounter)
                .putLong(KEY_HW_OFFSET, offset)
                .putLong(KEY_HW_DAILY, daily)
                .putBoolean(KEY_HW_PARTIAL, partial)
                .commit()
        } else {
            val persistedLastRaw = prefs.getLong(KEY_HW_LAST_RAW, rawCounter)
            val boundaryRaw = when {
                previousRawInSession != null && rawCounter >= previousRawInSession -> previousRawInSession
                rawCounter >= persistedLastRaw -> persistedLastRaw
                else -> rawCounter
            }

            val canTrustBoundary =
                previousRawInSession != null || prefs.getString(KEY_HW_DATE, null) != null

            prefs.edit()
                .putString(KEY_HW_DATE, date)
                .putLong(KEY_HW_BASE_RAW, boundaryRaw)
                .putLong(KEY_HW_LAST_RAW, rawCounter)
                .putLong(KEY_HW_OFFSET, 0L)
                .putLong(KEY_HW_DAILY, (rawCounter - boundaryRaw).coerceAtLeast(0L))
                .putBoolean(KEY_HW_PARTIAL, !canTrustBoundary)
                .commit()
        }

        recomputeEffective(context)
        val afterSteps = readStepsInternal(prefs)
        val afterSource = prefs.getString(KEY_STEPS_SOURCE, null)
        return beforeSteps != afterSteps || beforeSource != afterSource
    }

    /**
     * Creates the new day's physical-sensor reference from the last raw value seen before
     * midnight. Because TYPE_STEP_COUNTER only changes when a step occurs, this is a valid
     * boundary even if the user is standing still at midnight.
     */
    fun rollHardwareToToday(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val today = currentDate()
        val hwDate = prefs.getString(KEY_HW_DATE, null)
        if (hwDate == today) return false

        val lastRaw = if (prefs.contains(KEY_HW_LAST_RAW)) {
            prefs.getLong(KEY_HW_LAST_RAW, 0L)
        } else {
            return false
        }

        prefs.edit()
            .putString(KEY_HW_DATE, today)
            .putLong(KEY_HW_BASE_RAW, lastRaw)
            .putLong(KEY_HW_LAST_RAW, lastRaw)
            .putLong(KEY_HW_OFFSET, 0L)
            .putLong(KEY_HW_DAILY, 0L)
            .putBoolean(KEY_HW_PARTIAL, false)
            .commit()

        recomputeEffective(context)
        return true
    }

    private fun recomputeEffective(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val today = currentDate()

        val source: String
        val steps: Long
        val partial: Boolean

        when {
            prefs.getString(KEY_HS_DAILY_DATE, null) == today -> {
                source = "health_services_daily"
                steps = prefs.getLong(KEY_HS_DAILY, 0L)
                partial = false
            }
            prefs.getString(KEY_HS_DELTA_DATE, null) == today &&
                prefs.getBoolean(KEY_HS_DELTA_SEEN, false) -> {
                source = "health_services_delta"
                steps = prefs.getLong(KEY_HS_DELTA_TOTAL, 0L)
                partial = prefs.getBoolean(KEY_HS_DELTA_PARTIAL, false)
            }
            prefs.getString(KEY_HW_DATE, null) == today -> {
                source = "hardware_counter"
                steps = prefs.getLong(KEY_HW_DAILY, 0L)
                partial = prefs.getBoolean(KEY_HW_PARTIAL, true)
            }
            else -> {
                source = "none"
                steps = 0L
                partial = false
            }
        }

        prefs.edit()
            .putLong(KEY_STEPS, steps.coerceAtLeast(0L))
            .putString(KEY_STEPS_SOURCE, source)
            .putString(KEY_STEPS_DATE, today)
            .putBoolean(KEY_STEPS_PARTIAL, partial)
            .commit()
    }

    private fun ensureCurrentDay(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getString(KEY_STEPS_DATE, null) != currentDate()) {
            recomputeEffective(context)
        }
    }

    private fun readStepsInternal(prefs: android.content.SharedPreferences): Long? =
        if (prefs.contains(KEY_STEPS)) prefs.getLong(KEY_STEPS, 0L) else null

    fun readSteps(context: Context): Long? {
        ensureCurrentDay(context)
        return readStepsInternal(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE))
    }

    fun readStepsSource(context: Context): String? {
        ensureCurrentDay(context)
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_STEPS_SOURCE, null)
    }

    fun readStepsDate(context: Context): String? {
        ensureCurrentDay(context)
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_STEPS_DATE, null)
    }

    fun readStepsPartial(context: Context): Boolean {
        ensureCurrentDay(context)
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_STEPS_PARTIAL, false)
    }

    fun saveHeart(context: Context, heart: Double) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_HEART, java.lang.Double.doubleToRawLongBits(heart))
            .apply()
    }

    fun readHeart(context: Context): Double? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return if (prefs.contains(KEY_HEART)) {
            java.lang.Double.longBitsToDouble(prefs.getLong(KEY_HEART, 0L))
        } else {
            null
        }
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
            readStepsDate(context)?.let { dataMap.putString("stepsDate", it) }
            dataMap.putBoolean("stepsPartial", readStepsPartial(context))
            readHeart(context)?.let { dataMap.putDouble("heartRate", it) }
            dataMap.putLong("timestamp", timestamp)
            dataMap.putString("source", "galaxy_watch_v2_2")
            dataMap.putInt("protocolVersion", 22)
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
