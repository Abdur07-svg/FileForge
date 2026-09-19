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
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\r", "").replace("\n", " ");
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
}