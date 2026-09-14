package com.fileforge.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * JavaScript Bridge for FileForge Android Application.
 * Connects web file processing with native Android Downloads, Storage Access Framework,
 * Share Sheet, and File Viewer Intents.
 */
public class FileForgeBridge {

    private final Activity activity;
    private final Handler mainHandler;

    public FileForgeBridge(Activity activity) {
        this.activity = activity;
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    /**
     * Decode base64 data URL or pure base64 string to raw byte array
     */
    private byte[] decodeBase64(String base64Data) {
        if (base64Data == null || base64Data.isEmpty()) return new byte[0];
        String pureBase64 = base64Data;
        int commaIndex = base64Data.indexOf(',');
        if (commaIndex >= 0) {
            pureBase64 = base64Data.substring(commaIndex + 1);
        }
        return Base64.decode(pureBase64.trim(), Base64.DEFAULT);
    }

    /**
     * Clean filename to prevent invalid characters or directory traversal
     */
    private String cleanFilename(String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return "fileforge_" + System.currentTimeMillis();
        }
        String clean = filename.replaceAll("[/\\\\?%*:|\"<>]", "_").trim();
        return clean.isEmpty() ? "fileforge_" + System.currentTimeMillis() : clean;
    }

    /**
     * Save generated file to the public Downloads folder using MediaStore (API 29+) or legacy file system
     */
    @JavascriptInterface
    public void saveFile(final String base64Data, final String filename, final String mimeType) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    byte[] bytes = decodeBase64(base64Data);
                    if (bytes.length == 0) {
                        postToast("Error: Generated file data is empty");
                        return;
                    }

                    final String safeName = cleanFilename(filename);
                    final String safeMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/octet-stream";
                    boolean success = false;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentResolver resolver = activity.getContentResolver();
                        ContentValues contentValues = new ContentValues();
                        contentValues.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                        contentValues.put(MediaStore.Downloads.MIME_TYPE, safeMime);
                        contentValues.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                        contentValues.put(MediaStore.Downloads.IS_PENDING, 1);

                        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                        if (uri != null) {
                            try (OutputStream os = resolver.openOutputStream(uri)) {
                                if (os != null) {
                                    os.write(bytes);
                                    os.flush();
                                    contentValues.clear();
                                    contentValues.put(MediaStore.Downloads.IS_PENDING, 0);
                                    resolver.update(uri, contentValues, null, null);
                                    success = true;
                                }
                            }
                        }
                    } else {
                        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        if (!downloadsDir.exists()) downloadsDir.mkdirs();
                        File destFile = new File(downloadsDir, safeName);
                        try (FileOutputStream fos = new FileOutputStream(destFile)) {
                            fos.write(bytes);
                            fos.flush();
                            success = true;
                            MediaScannerConnection.scanFile(activity, new String[]{destFile.getAbsolutePath()}, new String[]{safeMime}, null);
                        }
                    }

                    if (success) {
                        postToast("Saved to Downloads: " + safeName);
                    } else {
                        postToast("Failed to save file: " + safeName);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    postToast("Download error: " + e.getMessage());
                }
            }
        }).start();
    }

    /**
     * Open Android Native Share Sheet for the generated file
     */
    @JavascriptInterface
    public void shareFile(final String base64Data, final String filename, final String mimeType) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    byte[] bytes = decodeBase64(base64Data);
                    if (bytes.length == 0) {
                        postToast("Error: Cannot share empty file");
                        return;
                    }

                    final String safeName = cleanFilename(filename);
                    final String safeMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/octet-stream";

                    File cacheDir = new File(activity.getCacheDir(), "shared");
                    if (!cacheDir.exists()) cacheDir.mkdirs();

                    File file = new File(cacheDir, safeName);
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        fos.write(bytes);
                        fos.flush();
                    }

                    final Uri contentUri = GenericFileProvider.getUriForFile(activity, file);

                    mainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                                shareIntent.setType(safeMime);
                                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                                Intent chooser = Intent.createChooser(shareIntent, "Share " + safeName);
                                activity.startActivity(chooser);
                            } catch (Exception e) {
                                postToast("No app available to share this file");
                            }
                        }
                    });

                } catch (Exception e) {
                    e.printStackTrace();
                    postToast("Share error: " + e.getMessage());
                }
            }
        }).start();
    }

    /**
     * Open the generated file in a compatible installed Android viewer app
     */
    @JavascriptInterface
    public void openFile(final String base64Data, final String filename, final String mimeType) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    byte[] bytes = decodeBase64(base64Data);
                    if (bytes.length == 0) {
                        postToast("Error: Cannot open empty file");
                        return;
                    }

                    final String safeName = cleanFilename(filename);
                    final String safeMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/octet-stream";

                    File cacheDir = new File(activity.getCacheDir(), "shared");
                    if (!cacheDir.exists()) cacheDir.mkdirs();

                    File file = new File(cacheDir, safeName);
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        fos.write(bytes);
                        fos.flush();
                    }

                    final Uri contentUri = GenericFileProvider.getUriForFile(activity, file);

                    mainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                                viewIntent.setDataAndType(contentUri, safeMime);
                                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                activity.startActivity(viewIntent);
                            } catch (Exception e) {
                                postToast("No compatible app found to open this file");
                            }
                        }
                    });

                } catch (Exception e) {
                    e.printStackTrace();
                    postToast("Open file error: " + e.getMessage());
                }
            }
        }).start();
    }

    /**
     * Show a native toast message from web JavaScript
     */
    @JavascriptInterface
    public void showToast(String message) {
        postToast(message);
    }

    private void postToast(final String message) {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(activity, message, Toast.LENGTH_SHORT).show();
            }
        });
    }
}
