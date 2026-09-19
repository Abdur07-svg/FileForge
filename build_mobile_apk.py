import os
import sys
import subprocess
import shutil
import zipfile
from PIL import Image, ImageDraw

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

RELEASE_KEYSTORE = os.environ.get('FILEFORGE_KEYSTORE_PATH', os.path.join(ANDROID_DIR, '.keystore', 'fileforge_mobile_release.keystore'))
KEYSTORE_PASS = os.environ.get('FILEFORGE_KEYSTORE_PASS', 'fileforge2026')
KEY_ALIAS = os.environ.get('FILEFORGE_KEY_ALIAS', 'fileforge_mobile')

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

def generate_crisp_icons():
    """Generates ultra high-definition, anti-aliased Android launcher icons"""
    scale = 2
    master_size = 512 * scale
    W, H = master_size, master_size

    def create_master_icon(is_round=False):
        # 1. Vibrant Background Gradient
        grad = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for y in range(H):
            for x in range(W):
                t = (x + y) / (W + H)
                if t < 0.5:
                    p = t / 0.5
                    r = int(99 + p * (139 - 99))
                    g = int(102 + p * (92 - 102))
                    b = int(241 + p * (246 - 241))
                else:
                    p = (t - 0.5) / 0.5
                    r = int(139 + p * (236 - 139))
                    g = int(92 + p * (72 - 92))
                    b = int(246 + p * (153 - 246))
                grad.putpixel((x, y), (r, g, b, 255))

        mask = Image.new('L', (W, H), 0)
        draw_mask = ImageDraw.Draw(mask)
        margin = int(W * (3.5 / 48))
        if is_round:
            draw_mask.ellipse([margin, margin, W - margin, H - margin], fill=255)
        else:
            rx = int(W * (12 / 48))
            draw_mask.rounded_rectangle([margin, margin, W - margin, H - margin], radius=rx, fill=255)

        bg = Image.composite(grad, Image.new('RGBA', (W, H), (0,0,0,0)), mask)

        def pt(x, y):
            return (int(x * W / 48), int(y * H / 48))

        # Document / File Sheet
        doc_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        doc_draw = ImageDraw.Draw(doc_layer)
        doc_points = [
            pt(16, 12), pt(27, 12), pt(34, 19), pt(34, 34),
            pt(32, 36), pt(16, 36), pt(14, 34), pt(14, 14)
        ]
        doc_draw.polygon(doc_points, fill=(255, 255, 255, 250))

        # Corner fold detail
        fold_back = [pt(27, 12), pt(34, 19), pt(28, 19), pt(27, 18)]
        doc_draw.polygon(fold_back, fill=(203, 213, 225, 255))

        # Lightning / Forge Bolt
        bolt_points = [
            pt(25, 20.5), pt(18.5, 28), pt(24, 28), pt(23, 33.5),
            pt(29.5, 26), pt(24, 26), pt(25, 20.5)
        ]
        bolt_mask = Image.new('L', (W, H), 0)
        b_draw = ImageDraw.Draw(bolt_mask)
        b_draw.polygon(bolt_points, fill=255)

        flame_grad = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for y in range(int(12 * H / 48), int(36 * H / 48)):
            p = (y - (12 * H / 48)) / (24 * H / 48)
            p = max(0.0, min(1.0, p))
            r = int(245 + p * (239 - 245))
            g = int(158 + p * (68 - 158))
            b = int(11 + p * (68 - 11))
            for x in range(W):
                flame_grad.putpixel((x, y), (r, g, b, 255))

        bolt_img = Image.composite(flame_grad, Image.new('RGBA', (W, H), (0,0,0,0)), bolt_mask)

        final = Image.alpha_composite(bg, doc_layer)
        final = Image.alpha_composite(final, bolt_img)
        return final

    sq_master = create_master_icon(is_round=False)
    rd_master = create_master_icon(is_round=True)

    # Save to all Android density buckets
    density_map = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }

    for folder, size in density_map.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        sq_img = sq_master.resize((size, size), Image.Resampling.LANCZOS)
        rd_img = rd_master.resize((size, size), Image.Resampling.LANCZOS)
        sq_img.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
        rd_img.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')

    # Also save to drawable and assets
    drawable_path = os.path.join(RES_DIR, 'drawable')
    os.makedirs(drawable_path, exist_ok=True)
    icon_512 = sq_master.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512_rd = rd_master.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(os.path.join(drawable_path, 'ic_launcher.png'), 'PNG')
    icon_512_rd.save(os.path.join(drawable_path, 'ic_launcher_round.png'), 'PNG')

    # Save to project assets
    for target_dir in [os.path.join(BASE_DIR, 'assets', 'icons'), os.path.join(MOBILE_DIR, 'assets', 'icons')]:
        os.makedirs(target_dir, exist_ok=True)
        icon_512.save(os.path.join(target_dir, 'icon-512x512.png'), 'PNG')
        sq_master.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(target_dir, 'icon-192x192.png'), 'PNG')
        sq_master.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(target_dir, 'apple-touch-icon.png'), 'PNG')

    print("Ultra high-definition launcher icons generated for all densities!")

def setup_android_source_files():
    os.makedirs(os.path.join(JAVA_SRC, 'com', 'fileforge', 'mobile'), exist_ok=True)
    os.makedirs(os.path.join(RES_DIR, 'values'), exist_ok=True)
    os.makedirs(os.path.join(RES_DIR, 'layout'), exist_ok=True)
    os.makedirs(os.path.join(RES_DIR, 'xml'), exist_ok=True)
    os.makedirs(os.path.join(RES_DIR, 'drawable'), exist_ok=True)

    # Generate all high-res Android mipmap and drawable icons
    generate_crisp_icons()

    # 1. AndroidManifest.xml
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.fileforge.mobile">

    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.FileForge"
        android:usesCleartextTraffic="false">

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
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private final static int FILECHOOSER_RESULTCODE = 101;
    private final static int CREATE_FILE_REQUEST_CODE = 102;
    private long backPressedTime = 0;

    private byte[] pendingSaveBytes = null;
    private String pendingSaveFilename = null;
    private String pendingSaveMimeType = null;
    private Uri lastSavedUri = null;
    private String lastSavedMimeType = null;

    private String normalizeMimeType(String mime, String filename) {
        if (mime != null) {
            mime = mime.trim().toLowerCase();
            if (mime.contains(";")) {
                mime = mime.substring(0, mime.indexOf(";")).trim();
            }
        }

        if (mime == null || mime.isEmpty() || "application/octet-stream".equals(mime) || "*/*".equals(mime)) {
            String lowerFilename = (filename != null) ? filename.toLowerCase() : "";
            if (lowerFilename.endsWith(".pdf")) return "application/pdf";
            if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) return "image/jpeg";
            if (lowerFilename.endsWith(".png")) return "image/png";
            if (lowerFilename.endsWith(".webp")) return "image/webp";
            if (lowerFilename.endsWith(".svg")) return "image/svg+xml";
            if (lowerFilename.endsWith(".zip")) return "application/zip";
            if (lowerFilename.endsWith(".txt")) return "text/plain";
            if (lowerFilename.endsWith(".csv")) return "text/csv";
            if (lowerFilename.endsWith(".json")) return "application/json";
            if (lowerFilename.endsWith(".html")) return "text/html";
            return "*/*";
        }

        if ("image/jpg".equals(mime)) return "image/jpeg";
        if ("application/x-zip".equals(mime) || "application/x-zip-compressed".equals(mime)) return "application/zip";
        if ("application/x-pdf".equals(mime)) return "application/pdf";

        return mime;
    }

    public class AndroidBridge {
        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @JavascriptInterface
        public boolean isFileForgeApp() {
            return true;
        }

        @JavascriptInterface
        public void closeApp() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }

        @JavascriptInterface
        public void openSavePicker(final String dataUrlOrBase64, final String filename, final String mimeType) {
            saveFile(dataUrlOrBase64, filename, mimeType);
        }

        @JavascriptInterface
        public void saveFile(final String dataUrlOrBase64, final String filename, final String mimeType) {
            if (dataUrlOrBase64 == null || dataUrlOrBase64.isEmpty()) {
                notifySaveError("No file data received.");
                return;
            }

            try {
                String base64Data = dataUrlOrBase64;
                int commaIndex = base64Data.indexOf(",");
                if (commaIndex != -1) {
                    base64Data = base64Data.substring(commaIndex + 1);
                }
                
                final byte[] fileBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                if (fileBytes == null || fileBytes.length == 0) {
                    notifySaveError("Unable to create the file: generated output is 0 bytes.");
                    return;
                }

                final String safeFilename = (filename != null && !filename.trim().isEmpty()) 
                    ? filename.replaceAll("[^a-zA-Z0-9._-]", "_") 
                    : "fileforge-file";
                final String safeMime = normalizeMimeType(mimeType, safeFilename);

                pendingSaveBytes = fileBytes;
                pendingSaveFilename = safeFilename;
                pendingSaveMimeType = safeMime;

                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                            intent.addCategory(Intent.CATEGORY_OPENABLE);
                            intent.setType(safeMime);
                            intent.putExtra(Intent.EXTRA_TITLE, safeFilename);
                            startActivityForResult(intent, CREATE_FILE_REQUEST_CODE);
                        } catch (android.content.ActivityNotFoundException anfe) {
                            try {
                                Intent fallbackIntent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                                fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE);
                                fallbackIntent.setType("*/*");
                                fallbackIntent.putExtra(Intent.EXTRA_TITLE, safeFilename);
                                startActivityForResult(fallbackIntent, CREATE_FILE_REQUEST_CODE);
                            } catch (Exception e2) {
                                pendingSaveBytes = null;
                                notifySaveError("Unable to open Android save location: " + e2.getMessage());
                            }
                        } catch (Exception e) {
                            pendingSaveBytes = null;
                            notifySaveError("Unable to start save picker: " + e.getMessage());
                        }
                    }
                });
            } catch (Exception e) {
                pendingSaveBytes = null;
                notifySaveError("Decoding failed: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public void openFile(final String uriString, final String mimeType) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Uri targetUri = (uriString != null && !uriString.isEmpty()) 
                            ? Uri.parse(uriString) 
                            : lastSavedUri;
                        if (targetUri == null) {
                            Toast.makeText(MainActivity.this, "File location not available", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        String type = (mimeType != null && !mimeType.isEmpty()) ? mimeType : (lastSavedMimeType != null ? lastSavedMimeType : "*/*");
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setDataAndType(targetUri, type);
                        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(Intent.createChooser(intent, "Open with"));
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Cannot open file: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void shareFile(final String uriString, final String mimeType) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Uri targetUri = (uriString != null && !uriString.isEmpty()) 
                            ? Uri.parse(uriString) 
                            : lastSavedUri;
                        if (targetUri == null) {
                            Toast.makeText(MainActivity.this, "File location not available", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        String type = (mimeType != null && !mimeType.isEmpty()) ? mimeType : (lastSavedMimeType != null ? lastSavedMimeType : "*/*");
                        Intent intent = new Intent(Intent.ACTION_SEND);
                        intent.setType(type);
                        intent.putExtra(Intent.EXTRA_STREAM, targetUri);
                        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(Intent.createChooser(intent, "Share file"));
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Cannot share file: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }
    }

    private String escapeJs(String s) {
        if (s == null) return "";
        return s.replace("\\\\", "\\\\\\\\").replace("'", "\\\\'").replace("\\r", "").replace("\\n", " ");
    }

    private void notifySaveSuccess(final String filename, final String mimeType, final String uriString, final long fileSize) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    String js = "window.FileForgeDownloadManager && window.FileForgeDownloadManager.onNativeSaveSuccess('" + escapeJs(filename) + "', '" + escapeJs(mimeType) + "', '" + escapeJs(uriString) + "', " + fileSize + ");";
                    webView.evaluateJavascript(js, null);
                }
            }
        });
    }

    private void notifySaveCancelled() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    String js = "window.FileForgeDownloadManager && window.FileForgeDownloadManager.onNativeSaveCancelled();";
                    webView.evaluateJavascript(js, null);
                }
            }
        });
    }

    private void notifySaveError(final String errorMsg) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    String js = "window.FileForgeDownloadManager && window.FileForgeDownloadManager.onNativeSaveError('" + escapeJs(errorMsg) + "');";
                    webView.evaluateJavascript(js, null);
                }
            }
        });
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
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript("window.FileForgeAndroidApp = true; window.isAndroidAPK = true;", null);
            }

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
        } else if (requestCode == CREATE_FILE_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                final Uri uri = data.getData();
                final byte[] bytes = pendingSaveBytes;
                final String filename = pendingSaveFilename;
                final String mimeType = pendingSaveMimeType;

                if (bytes == null || bytes.length == 0) {
                    notifySaveError("File data buffer is empty or expired.");
                    return;
                }

                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            OutputStream out = getContentResolver().openOutputStream(uri);
                            if (out == null) {
                                notifySaveError("Could not open destination for writing.");
                                return;
                            }
                            out.write(bytes);
                            out.flush();
                            out.close();

                            long writtenSize = bytes.length;
                            try {
                                android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null);
                                if (cursor != null) {
                                    int sizeIndex = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE);
                                    if (sizeIndex != -1 && cursor.moveToFirst()) {
                                        long queriedSize = cursor.getLong(sizeIndex);
                                        if (queriedSize > 0) {
                                            writtenSize = queriedSize;
                                        }
                                    }
                                    cursor.close();
                                }
                            } catch (Exception ignored) {}

                            if (writtenSize <= 0) {
                                notifySaveError("Saved file is empty (0 bytes).");
                                return;
                            }

                            lastSavedUri = uri;
                            lastSavedMimeType = mimeType;
                            pendingSaveBytes = null;

                            notifySaveSuccess(filename, mimeType, uri.toString(), writtenSize);
                        } catch (Exception e) {
                            pendingSaveBytes = null;
                            notifySaveError("Write failed: " + e.getMessage());
                        }
                    }
                }).start();
            } else if (resultCode == Activity.RESULT_CANCELED) {
                pendingSaveBytes = null;
                notifySaveCancelled();
            } else {
                pendingSaveBytes = null;
                notifySaveError("Save cancelled or destination unavailable.");
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
        os.makedirs(os.path.dirname(RELEASE_KEYSTORE), exist_ok=True)
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

    root_apk = os.path.join(BASE_DIR, 'FileForge-Mobile.apk')
    shutil.copy2(final_apk, root_apk)

    print("\n==================================================")
    print("   FILEFORGE MOBILE RELEASE APK READY!")
    print("==================================================")
    print(f"Final APK Output:    {final_apk}")
    print(f"Root APK Mirror:     {root_apk}")
    print(f"File Size:           {size_mb:.2f} MB")
    print(f"Package ID:          com.fileforge.mobile")
    print(f"minSdkVersion:       21 (Android 5.0+)")
    print(f"targetSdkVersion:    34 (Android 14+)")
    print(f"versionName:         1.0.0 (versionCode 1)")
    print(f"Signing:             Release Keystore (v1 + v2 + v3 Schemes)")
    print("==================================================")

if __name__ == '__main__':
    build_mobile_apk()
