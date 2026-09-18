import os
import sys
import subprocess
import shutil
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ANDROID_HOME = os.environ.get('ANDROID_HOME', os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Android', 'Sdk'))
BUILD_TOOLS_DIR = os.path.join(ANDROID_HOME, 'build-tools', '34.0.0')
PLATFORM_JAR = os.path.join(ANDROID_HOME, 'platforms', 'android-34', 'android.jar')

AAPT2 = os.path.join(BUILD_TOOLS_DIR, 'aapt2.exe')
D8 = os.path.join(BUILD_TOOLS_DIR, 'd8.bat')
ZIPALIGN = os.path.join(BUILD_TOOLS_DIR, 'zipalign.exe')
APKSIGNER = os.path.join(BUILD_TOOLS_DIR, 'apksigner.bat')

MOBILE_DIR = os.path.join(BASE_DIR, 'mobile')
ANDROID_DIR = os.path.join(BASE_DIR, 'android-mobile')
APP_DIR = os.path.join(ANDROID_DIR, 'app')
SRC_MAIN = os.path.join(APP_DIR, 'src', 'main')
RES_DIR = os.path.join(SRC_MAIN, 'res')
ASSETS_DIR = os.path.join(SRC_MAIN, 'assets')
MANIFEST = os.path.join(SRC_MAIN, 'AndroidManifest.xml')
JAVA_SRC = os.path.join(SRC_MAIN, 'java')

BUILD_DIR = os.path.join(APP_DIR, 'build')
INTERMEDIATES = os.path.join(BUILD_DIR, 'intermediates')
COMPILED_RES = os.path.join(INTERMEDIATES, 'compiled_res')
GEN_DIR = os.path.join(INTERMEDIATES, 'gen')
CLASSES_DIR = os.path.join(INTERMEDIATES, 'classes')
DEX_DIR = os.path.join(INTERMEDIATES, 'dex')
OUTPUT_DIR = os.path.join(BASE_DIR, 'dist')

RELEASE_KEYSTORE = os.path.join(ANDROID_DIR, 'fileforge_mobile_release.keystore')
KEYSTORE_PASS = 'fileforge2026'
KEY_ALIAS = 'fileforge_mobile'

def run_cmd(cmd, cwd=BASE_DIR):
    if isinstance(cmd, list):
        print(f"\n[RUN] {' '.join(str(x) for x in cmd)}")
        res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    else:
        print(f"\n[RUN] {cmd}")
        res = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[ERROR] Command failed with code {res.returncode}")
        print(f"Stdout:\n{res.stdout}")
        print(f"Stderr:\n{res.stderr}")
        sys.exit(res.returncode)
    else:
        if res.stdout.strip():
            print(res.stdout.strip())
    return res

def setup_android_source_files():
    os.makedirs(os.path.join(JAVA_SRC, 'com', 'fileforge', 'mobile'), exist_ok=True)
    os.makedirs(os.path.join(RES_DIR, 'values'), exist_ok=True)
    os.makedirs(os.path.join(RES_DIR, 'layout'), exist_ok=True)
    os.makedirs(os.path.join(RES_DIR, 'xml'), exist_ok=True)
    os.makedirs(os.path.join(RES_DIR, 'drawable'), exist_ok=True)

    # 1. AndroidManifest.xml
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.fileforge.mobile">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@drawable/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.FileForge"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name=".GenericFileProvider"
            android:authorities="com.fileforge.mobile.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>''')

    # 2. strings.xml
    with open(os.path.join(RES_DIR, 'values', 'strings.xml'), 'w', encoding='utf-8') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">FileForge</string>
</resources>''')

    # 3. colors.xml
    with open(os.path.join(RES_DIR, 'values', 'colors.xml'), 'w', encoding='utf-8') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">#6366F1</color>
    <color name="background">#090D16</color>
</resources>''')

    # 4. styles.xml
    with open(os.path.join(RES_DIR, 'values', 'styles.xml'), 'w', encoding='utf-8') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.FileForge" parent="android:Theme.Material.NoActionBar">
        <item name="android:statusBarColor">#090D16</item>
        <item name="android:navigationBarColor">#090D16</item>
        <item name="android:windowBackground">#090D16</item>
    </style>
</resources>''')

    # 5. xml/file_paths.xml
    with open(os.path.join(RES_DIR, 'xml', 'file_paths.xml'), 'w', encoding='utf-8') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="." />
    <external-files-path name="external_app_files" path="." />
    <files-path name="files" path="." />
</paths>''')

    # 6. layout/activity_main.xml
    with open(os.path.join(RES_DIR, 'layout', 'activity_main.xml'), 'w', encoding='utf-8') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#090D16">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />
</FrameLayout>''')

    # 7. GenericFileProvider.java
    with open(os.path.join(JAVA_SRC, 'com', 'fileforge', 'mobile', 'GenericFileProvider.java'), 'w', encoding='utf-8') as f:
        f.write('''package com.fileforge.mobile;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;

public class GenericFileProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) { return null; }
    @Override public String getType(Uri uri) { return "application/octet-stream"; }
    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}''')

    # 8. MainActivity.java
    with open(os.path.join(JAVA_SRC, 'com', 'fileforge', 'mobile', 'MainActivity.java'), 'w', encoding='utf-8') as f:
        f.write('''package com.fileforge.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private final static int FILECHOOSER_RESULTCODE = 101;
    private long backPressedTime = 0;

    public class AndroidBridge {
        @JavascriptInterface
        public void closeApp() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && url.startsWith("file:///android_asset/")) {
                    return false;
                }
                if (url != null && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:"))) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {}
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILECHOOSER_RESULTCODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    } else if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            // Evaluate in-app back navigation handler
            webView.evaluateJavascript("window.MobileApp && window.MobileApp.handleAndroidBack ? window.MobileApp.handleAndroidBack() : false;", new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if ("true".equals(value)) {
                        // Handled by web app
                        return;
                    }

                    // Fallback to double press back to exit
                    if (backPressedTime + 2000 > System.currentTimeMillis()) {
                        finish();
                    } else {
                        Toast.makeText(MainActivity.this, "Press back again to exit FileForge", Toast.LENGTH_SHORT).show();
                        backPressedTime = System.currentTimeMillis();
                    }
                }
            });
            return;
        }

        super.onBackPressed();
    }
}''')

    # Copy logo as drawable ic_launcher
    logo_src = os.path.join(MOBILE_DIR, 'assets', 'icons', 'favicon-32x32.png')
    if os.path.exists(logo_src):
        shutil.copy2(logo_src, os.path.join(RES_DIR, 'drawable', 'ic_launcher.png'))

def sync_mobile_assets():
    if os.path.exists(ASSETS_DIR):
        shutil.rmtree(ASSETS_DIR, ignore_errors=True)
    os.makedirs(ASSETS_DIR, exist_ok=True)

    # Copy mobile files into Android assets
    shutil.copy2(os.path.join(MOBILE_DIR, 'index.html'), os.path.join(ASSETS_DIR, 'index.html'))
    shutil.copy2(os.path.join(MOBILE_DIR, 'style.css'), os.path.join(ASSETS_DIR, 'style.css'))
    shutil.copytree(os.path.join(MOBILE_DIR, 'js'), os.path.join(ASSETS_DIR, 'js'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(MOBILE_DIR, 'assets'), os.path.join(ASSETS_DIR, 'assets'), dirs_exist_ok=True)
    shutil.copytree(os.path.join(MOBILE_DIR, 'vendor'), os.path.join(ASSETS_DIR, 'vendor'), dirs_exist_ok=True)
    print(f"Synced /mobile/ web files to Android assets: {ASSETS_DIR}")

def build_mobile_apk():
    print("==================================================")
    print("   FILEFORGE MOBILE RELEASE APK BUILD")
    print("==================================================")

    # 1. Setup Android wrapper files
    setup_android_source_files()

    # 2. Sync mobile assets
    sync_mobile_assets()

    # 3. Clean and prepare build dirs
    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR, ignore_errors=True)
    os.makedirs(COMPILED_RES, exist_ok=True)
    os.makedirs(GEN_DIR, exist_ok=True)
    os.makedirs(CLASSES_DIR, exist_ok=True)
    os.makedirs(DEX_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 4. Compile Android resources
    print("\nStep 1: Compiling resources with aapt2...")
    for root, dirs, files in os.walk(RES_DIR):
        for f in files:
            full_path = os.path.join(root, f)
            cmd = [AAPT2, 'compile', full_path, '-o', COMPILED_RES]
            run_cmd(cmd)

    flat_files = [os.path.join(COMPILED_RES, f) for f in os.listdir(COMPILED_RES) if f.endswith('.flat')]

    # 5. Link resources and generate R.java
    print("\nStep 2: Linking resources with aapt2 (minSdk 21, targetSdk 34)...")
    proto_apk = os.path.join(INTERMEDIATES, 'linked_res.apk')
    link_cmd = [
        AAPT2, 'link',
        '-I', PLATFORM_JAR,
        '--manifest', MANIFEST,
        '--min-sdk-version', '21',
        '--target-sdk-version', '34',
        '--version-code', '1',
        '--version-name', '1.0.0',
        '--java', GEN_DIR,
        '-o', proto_apk,
        '--auto-add-overlay'
    ] + flat_files
    run_cmd(link_cmd)

    # 6. Compile Java source files
    print("\nStep 3: Compiling Java sources with javac...")
    java_files = []
    for root, dirs, files in os.walk(JAVA_SRC):
        for f in files:
            if f.endswith('.java'):
                java_files.append(os.path.join(root, f))
    for root, dirs, files in os.walk(GEN_DIR):
        for f in files:
            if f.endswith('.java'):
                java_files.append(os.path.join(root, f))

    javac_cmd = [
        'javac',
        '-cp', PLATFORM_JAR,
        '-d', CLASSES_DIR
    ] + java_files
    run_cmd(javac_cmd)

    # 7. Convert Java bytecode to Dalvik bytecode (.dex) with d8
    print("\nStep 4: Dexing compiled classes with d8...")
    class_files = []
    for root, dirs, files in os.walk(CLASSES_DIR):
        for f in files:
            if f.endswith('.class'):
                class_files.append(os.path.join(root, f))

    d8_cmd = [
        D8,
        '--min-api', '21',
        '--lib', PLATFORM_JAR,
        '--output', DEX_DIR
    ] + class_files
    run_cmd(d8_cmd)

    # 8. Package initial unaligned APK
    print("\nStep 5: Packaging classes.dex and mobile web assets into APK...")
    unaligned_apk = os.path.join(INTERMEDIATES, 'unaligned.apk')
    shutil.copy2(proto_apk, unaligned_apk)

    classes_dex = os.path.join(DEX_DIR, 'classes.dex')
    with zipfile.ZipFile(unaligned_apk, 'a', compression=zipfile.ZIP_DEFLATED) as apk_zip:
        apk_zip.write(classes_dex, 'classes.dex')
        for root, dirs, files in os.walk(ASSETS_DIR):
            for f in files:
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, ASSETS_DIR)
                apk_zip.write(file_path, f"assets/{rel_path.replace(os.sep, '/')}")

    # 9. Align APK with zipalign (4-byte alignment)
    print("\nStep 6: Aligning APK with zipalign...")
    aligned_apk = os.path.join(INTERMEDIATES, 'aligned.apk')
    zipalign_cmd = [
        ZIPALIGN,
        '-p', '-f', '4',
        unaligned_apk,
        aligned_apk
    ]
    run_cmd(zipalign_cmd)

    # 10. Generate persistent production release keystore if not present
    if not os.path.exists(RELEASE_KEYSTORE):
        print("\nGenerating Production Release keystore...")
        keytool_cmd = [
            'keytool', '-genkeypair',
            '-keystore', RELEASE_KEYSTORE,
            '-storepass', KEYSTORE_PASS,
            '-keypass', KEYSTORE_PASS,
            '-alias', KEY_ALIAS,
            '-dname', 'CN=FileForge Mobile,OU=Mobile,O=FileForge,C=US',
            '-validity', '10000',
            '-keyalg', 'RSA',
            '-keysize', '2048'
        ]
        run_cmd(keytool_cmd)

    # 11. Sign APK with apksigner (v1, v2, v3 schemes)
    print("\nStep 7: Signing Release APK with apksigner...")
    final_apk = os.path.join(OUTPUT_DIR, 'FileForge-Mobile.apk')

    apksigner_cmd = [
        APKSIGNER, 'sign',
        '--ks', RELEASE_KEYSTORE,
        '--ks-pass', f'pass:{KEYSTORE_PASS}',
        '--ks-key-alias', KEY_ALIAS,
        '--key-pass', f'pass:{KEYSTORE_PASS}',
        '--v1-signing-enabled', 'true',
        '--v2-signing-enabled', 'true',
        '--v3-signing-enabled', 'true',
        '--out', final_apk,
        aligned_apk
    ]
    run_cmd(apksigner_cmd)

    # 12. Verify APK signature
    print("\nStep 8: Verifying APK signature...")
    verify_cmd = [APKSIGNER, 'verify', '--verbose', final_apk]
    run_cmd(verify_cmd)

    # 13. Inspect APK badging
    print("\nStep 9: Inspecting APK badging & compatibility metadata...")
    badging_cmd = [AAPT2, 'dump', 'badging', final_apk]
    run_cmd(badging_cmd)

    size_mb = os.path.getsize(final_apk) / (1024 * 1024)

    print("\n==================================================")
    print("   FILEFORGE MOBILE RELEASE APK READY!")
    print("==================================================")
    print(f"Final APK Output:    {final_apk}")
    print(f"File Size:           {size_mb:.2f} MB")
    print(f"Package ID:          com.fileforge.mobile")
    print(f"minSdkVersion:       21 (Android 5.0+)")
    print(f"targetSdkVersion:    34 (Android 14+)")
    print(f"versionName:         1.0.0 (versionCode 1)")
    print(f"Signing:             Release Keystore (v1 + v2 + v3 Schemes)")
    print("==================================================")

if __name__ == '__main__':
    build_mobile_apk()
