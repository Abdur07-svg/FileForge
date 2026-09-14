package com.fileforge.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.UriMatcher;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Lightweight native ContentProvider for secure file sharing and viewing via Android Intents
 * without external library dependencies.
 */
public class GenericFileProvider extends ContentProvider {

    public static final String AUTHORITY = "com.fileforge.app.fileprovider";
    private static final UriMatcher uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);

    static {
        uriMatcher.addURI(AUTHORITY, "*", 1);
    }

    public static Uri getUriForFile(Context context, File file) {
        return new Uri.Builder()
                .scheme("content")
                .authority(AUTHORITY)
                .path(file.getName())
                .build();
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        Context context = getContext();
        if (context == null) throw new FileNotFoundException("Context is null");

        String filename = uri.getLastPathSegment();
        if (filename == null || filename.contains("..") || filename.contains("/")) {
            throw new FileNotFoundException("Invalid filename");
        }

        File cacheDir = new File(context.getCacheDir(), "shared");
        File file = new File(cacheDir, filename);

        if (!file.exists()) {
            // Also check root cache
            file = new File(context.getCacheDir(), filename);
        }

        if (!file.exists()) {
            throw new FileNotFoundException("File not found: " + filename);
        }

        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        if (projection == null) {
            projection = new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        }

        MatrixCursor cursor = new MatrixCursor(projection, 1);
        Context context = getContext();
        if (context == null) return cursor;

        String filename = uri.getLastPathSegment();
        File file = new File(new File(context.getCacheDir(), "shared"), filename);
        if (!file.exists()) {
            file = new File(context.getCacheDir(), filename);
        }

        MatrixCursor.RowBuilder row = cursor.newRow();
        for (String col : projection) {
            if (OpenableColumns.DISPLAY_NAME.equals(col)) {
                row.add(col, filename);
            } else if (OpenableColumns.SIZE.equals(col)) {
                row.add(col, file.exists() ? file.length() : 0);
            } else {
                row.add(col, null);
            }
        }
        return cursor;
    }

    @Override
    public String getType(Uri uri) {
        String filename = uri.getLastPathSegment();
        if (filename != null) {
            int dot = filename.lastIndexOf('.');
            if (dot >= 0) {
                String ext = filename.substring(dot + 1).toLowerCase();
                String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                if (mime != null) return mime;
            }
        }
        return "application/octet-stream";
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
