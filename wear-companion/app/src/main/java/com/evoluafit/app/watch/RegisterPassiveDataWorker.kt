package com.evoluafit.app.watch

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

class RegisterPassiveDataWorker(
    appContext: Context,
    params: WorkerParameters
) : Worker(appContext, params) {

    override fun doWork(): Result {
        val registration = PassiveRegistration.registerBlocking(applicationContext)
        return if (registration.success) Result.success() else Result.retry()
    }
}
