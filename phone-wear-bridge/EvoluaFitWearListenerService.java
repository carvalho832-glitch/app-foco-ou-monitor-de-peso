package com.evoluafit.app;

import android.util.Log;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.WearableListenerService;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

public class EvoluaFitWearListenerService extends WearableListenerService {
    private static final String TAG = "EvoluaFitWear";
    private static final String PATH = "/evoluafit/health";

    @Override
    public void onDataChanged(DataEventBuffer dataEvents) {
        for (DataEvent event : dataEvents) {
            if (event.getType() != DataEvent.TYPE_CHANGED) continue;
            if (!PATH.equals(event.getDataItem().getUri().getPath())) continue;

            try {
                DataMap map = DataMapItem.fromDataItem(event.getDataItem()).getDataMap();
                JSONObject json = new JSONObject();
                json.put("receivedAt", System.currentTimeMillis());
                json.put("source", map.getString("source", "galaxy_watch"));

                if (map.containsKey("steps")) {
                    json.put("steps", map.getLong("steps"));
                }
                if (map.containsKey("heartRate")) {
                    json.put("heartRate", map.getDouble("heartRate"));
                }
                if (map.containsKey("timestamp")) {
                    json.put("watchTimestamp", map.getLong("timestamp"));
                }

                File dir = new File(getFilesDir(), "wear");
                if (!dir.exists() && !dir.mkdirs()) {
                    Log.w(TAG, "Não foi possível criar diretório wear");
                }

                File target = new File(dir, "latest.json");
                try (FileOutputStream out = new FileOutputStream(target, false)) {
                    out.write(json.toString().getBytes(StandardCharsets.UTF_8));
                    out.flush();
                }

                Log.i(TAG, "Dados do Galaxy Watch salvos: " + json);
            } catch (Exception e) {
                Log.e(TAG, "Falha ao salvar dados do Galaxy Watch", e);
            }
        }
    }
}
