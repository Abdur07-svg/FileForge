import os
import sys
import subprocess
import shutil
import zipfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANDROID_HOME = os.environ.get('ANDROID_HOME', os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Android', 'Sdk'))
BUILD_TOOLS_DIR = os.path.join(ANDROID_HOME, 'build-tools', '34.0.0')
PLATFORM_JAR = os.path.join(ANDROID_HOME, 'platforms', 'android-34', 'android.jar')

AAPT2 = os.path.join(BUILD_TOOLS_DIR, 'aapt2.exe')
D8 = os.path.join(BUILD_TOOLS_DIR, 'd8.bat')
ZIPALIGN = os.path.join(BUILD_TOOLS_DIR, 'zipalign.exe')
APKSIGNER = os.path.join(BUILD_TOOLS_DIR, 'apksigner.bat')

APP_DIR = os.path.join(BASE_DIR, 'android', 'app')
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

RELEASE_KEYSTORE = os.path.join(BASE_DIR, 'android', 'fileforge_release.keystore')
KEYSTORE_PASS = 'fileforge2026'
KEY_ALIAS = 'fileforge'

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

def build_apk():
    print("==================================================")
    print("   FILEFORGE UNIVERSAL RELEASE APK BUILD")
    print("==================================================")

    # 1. Sync assets
    print("\nStep 1: Syncing complete web codebase to Android assets...")
    from sync_assets import sync_assets
    sync_assets()

    # 2. Prepare build directories
    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR, ignore_errors=True)
    os.makedirs(COMPILED_RES, exist_ok=True)
    os.makedirs(GEN_DIR, exist_ok=True)
    os.makedirs(CLASSES_DIR, exist_ok=True)
    os.makedirs(DEX_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 3. Compile Android resources with aapt2
    print("\nStep 2: Compiling resources with aapt2...")
    res_flat_files = []
    for root, dirs, files in os.walk(RES_DIR):
        for f in files:
            full_path = os.path.join(root, f)
            cmd = [AAPT2, 'compile', full_path, '-o', COMPILED_RES]
            run_cmd(cmd)

    flat_files = [os.path.join(COMPILED_RES, f) for f in os.listdir(COMPILED_RES) if f.endswith('.flat')]

    # 4. Link resources with aapt2 with explicit SDK versions (minSdk 21, targetSdk 34)
    print("\nStep 3: Linking resources and generating R.java (minSdk 21, targetSdk 34)...")
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
    ]
    for flat in flat_files:
        link_cmd.extend([flat])
    run_cmd(link_cmd)

    # 5. Compile Java source files
    print("\nStep 4: Compiling Java source files with javac...")
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

    # 6. Convert Java bytecode to Dalvik bytecode (.dex) with d8 (Universal DEX)
    print("\nStep 5: Dexing compiled classes with d8 (Universal DEX)...")
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

    # 7. Package initial unaligned APK
    print("\nStep 6: Packaging classes.dex and web assets into APK...")
    unaligned_apk = os.path.join(INTERMEDIATES, 'unaligned.apk')
    shutil.copy2(proto_apk, unaligned_apk)

    classes_dex = os.path.join(DEX_DIR, 'classes.dex')
    with zipfile.ZipFile(unaligned_apk, 'a', compression=zipfile.ZIP_DEFLATED) as apk_zip:
        apk_zip.write(classes_dex, 'classes.dex')
        
        # Add all assets (HTML, CSS, JS, Vendor, Icons)
        for root, dirs, files in os.walk(ASSETS_DIR):
            for f in files:
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, ASSETS_DIR)
                apk_zip.write(file_path, f"assets/{rel_path.replace(os.sep, '/')}")

    # 8. Align APK with zipalign (4-byte alignment)
    print("\nStep 7: Aligning APK with zipalign (4-byte alignment)...")
    aligned_apk = os.path.join(INTERMEDIATES, 'aligned.apk')
    zipalign_cmd = [
        ZIPALIGN,
        '-p', '-f', '4',
        unaligned_apk,
        aligned_apk
    ]
    run_cmd(zipalign_cmd)

    # 9. Generate persistent production release keystore if not present
    if not os.path.exists(RELEASE_KEYSTORE):
        print("\nGenerating persistent Production Release keystore...")
        keytool_cmd = [
            'keytool', '-genkeypair',
            '-keystore', RELEASE_KEYSTORE,
            '-storepass', KEYSTORE_PASS,
            '-keypass', KEYSTORE_PASS,
            '-alias', KEY_ALIAS,
            '-dname', 'CN=FileForge Release,OU=Mobile,O=FileForge,C=US',
            '-validity', '10000',
            '-keyalg', 'RSA',
            '-keysize', '2048'
        ]
        run_cmd(keytool_cmd)

    # 10. Sign APK with apksigner (v1 + v2 + v3 scheme)
    print("\nStep 8: Signing Production Release APK with apksigner (v1, v2, v3 schemes)...")
    final_apk = os.path.join(OUTPUT_DIR, 'FileForge.apk')
    release_apk_name = os.path.join(OUTPUT_DIR, 'app-release.apk')
    release_gradle_dir = os.path.join(APP_DIR, 'build', 'outputs', 'apk', 'release')
    debug_gradle_dir = os.path.join(APP_DIR, 'build', 'outputs', 'apk', 'debug')
    os.makedirs(release_gradle_dir, exist_ok=True)
    os.makedirs(debug_gradle_dir, exist_ok=True)

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

    # Create copies for standard paths
    shutil.copy2(final_apk, release_apk_name)
    shutil.copy2(final_apk, os.path.join(release_gradle_dir, 'app-release.apk'))
    shutil.copy2(final_apk, os.path.join(debug_gradle_dir, 'app-debug.apk'))

    # 11. Verify APK signature
    print("\nStep 9: Verifying APK signature...")
    verify_cmd = [APKSIGNER, 'verify', '--verbose', final_apk]
    run_cmd(verify_cmd)

    # 12. Inspect APK badging with aapt2 dump badging
    print("\nStep 10: Inspecting APK badging & compatibility metadata...")
    badging_cmd = [AAPT2, 'dump', 'badging', final_apk]
    res_badging = run_cmd(badging_cmd)

    size_mb = os.path.getsize(final_apk) / (1024 * 1024)

    print("\n==================================================")
    print("   FILEFORGE UNIVERSAL RELEASE APK READY! ")
    print("==================================================")
    print(f"Final APK Output:    {final_apk}")
    print(f"Release APK Copy:    {release_apk_name}")
    print(f"Gradle Release Copy: {os.path.join(release_gradle_dir, 'app-release.apk')}")
    print(f"File Size:           {size_mb:.2f} MB")
    print(f"Package ID:          com.fileforge.app")
    print(f"minSdkVersion:       21 (Android 5.0+)")
    print(f"targetSdkVersion:    34 (Android 14+)")
    print(f"versionName:         1.0.0 (versionCode 1)")
    print(f"Architecture:        Universal (arm64-v8a, armeabi-v7a, x86, x86_64)")
    print(f"Signing:             Release Keystore (v1 + v2 + v3 Schemes)")
    print("==================================================")

if __name__ == '__main__':
    build_apk()
