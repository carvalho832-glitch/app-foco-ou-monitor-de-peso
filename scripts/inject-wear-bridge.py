from pathlib import Path
from shutil import copyfile

repo = Path(__file__).resolve().parent.parent
android = repo / "android"
source = repo / "phone-wear-bridge" / "EvoluaFitWearListenerService.java"
target_dir = android / "app" / "src" / "main" / "java" / "com" / "evoluafit" / "app"
target_dir.mkdir(parents=True, exist_ok=True)
copyfile(source, target_dir / "EvoluaFitWearListenerService.java")

gradle = android / "app" / "build.gradle"
g = gradle.read_text()
dep = "implementation 'com.google.android.gms:play-services-wearable:20.0.1'"
if dep not in g:
    g = g.replace("dependencies {", "dependencies {\n    " + dep, 1)
gradle.write_text(g)

manifest = android / "app" / "src" / "main" / "AndroidManifest.xml"
m = manifest.read_text()
if "EvoluaFitWearListenerService" not in m:
    service = """
        <service
            android:name=".EvoluaFitWearListenerService"
            android:exported="true">
            <intent-filter>
                <action android:name="com.google.android.gms.wearable.DATA_CHANGED" />
                <data
                    android:scheme="wear"
                    android:host="*"
                    android:path="/evoluafit/health" />
            </intent-filter>
        </service>
"""
    m = m.replace("</application>", service + "    </application>", 1)
manifest.write_text(m)

print("Galaxy Watch Data Layer bridge injected into handheld Android project")
