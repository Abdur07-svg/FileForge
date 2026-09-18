package com.fileforge.mobile;

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

        @JavascriptInterface
        public void saveFile(String dataUrlOrBase64, String filename, String mimeType) {
            try {
                if (dataUrlOrBase64 == null || dataUrlOrBase64.isEmpty()) return;
                
                String base64Data = dataUrlOrBase64;
                if (base64Data.contains(",")) {
                    base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
                }
                
                final byte[] fileBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                final String safeFilename = (filename != null && !filename.trim().isEmpty()) 
                    ? filename.replaceAll("[^a-zA-Z0-9._-]", "_") 
                    : "fileforge-file";
                final String safeMime = (mimeType != null && !mimeType.trim().isEmpty()) 
                    ? mimeType 
                    : "application/octet-stream";

                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        boolean saved = false;
                        try {
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                                android.content.ContentValues values = new android.content.ContentValues();
                                values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, safeFilename);
                                values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, safeMime);
                                values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS + "/FileForge");
                                
                                android.net.Uri uri = getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                                if (uri != null) {
                                    java.io.OutputStream out = getContentResolver().openOutputStream(uri);
                                    if (out != null) {
                                        out.write(fileBytes);
                                        out.flush();
                                        out.close();
                                        saved = true;
                                    }
                                }
                            }
                            
                            if (!saved) {
                                java.io.File downloadDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                                java.io.File targetDir = new java.io.File(downloadDir, "FileForge");
                                if (!targetDir.exists()) {
                                    targetDir.mkdirs();
                                }
                                java.io.File destFile = new java.io.File(targetDir, safeFilename);
                                java.io.FileOutputStream fos = new java.io.FileOutputStream(destFile);
                                fos.write(fileBytes);
                                fos.flush();
                                fos.close();
                                
                                android.media.MediaScannerConnection.scanFile(MainActivity.this, 
                                    new String[]{destFile.getAbsolutePath()}, 
                                    new String[]{safeMime}, null);
                                saved = true;
                            }

                            Toast.makeText(MainActivity.this, "Saved to Downloads/FileForge: " + safeFilename, Toast.LENGTH_LONG).show();
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "Save error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    }
                });
            } catch (Exception e) {
                e.printStackTrace();
            }
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
        settings.setAllowUniversalAccessFromFileURLs(false);
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
}