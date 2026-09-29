# Development Environment: JAVA_HOME, ANDROID_HOME and PATH

This file explains **why** Papaya HatidGo needs these settings, what each one does, and how they connect when the Android app is built. It also records the problems hit during setup and how they were fixed.

---

## 1. The big picture: how the app becomes an Android app

Papaya HatidGo is written in **TypeScript/Angular** (web code), but it has to run as a **native Android app**. Several tools cooperate to make that happen:

```text
 Your code (Angular + Ionic, TypeScript)
        │  npm run build            ← Node.js
        ▼
 www/  (compiled HTML, CSS, JavaScript)
        │  npx cap sync android     ← Capacitor
        ▼
 android/  (a real Android Studio project that wraps www/)
        │  Gradle build             ← needs JAVA (JDK)  + ANDROID SDK
        ▼
 app-debug.apk  (the installable Android app)
        │  install + run            ← adb
        ▼
 Emulator / your Android phone
```

The last three arrows are native Android territory. The Android build tools can't build anything until they know:

1. **Where Java is.** That's what `JAVA_HOME` tells them.
2. **Where the Android SDK is.** That's what `ANDROID_HOME` tells them.
3. **Where the command-line tools are, so you can type their names.** That's what `PATH` is for.

---

## 2. Environment variables in one paragraph

An **environment variable** is a named setting that Windows gives every program when it starts. Think of it as a note on the fridge that every program reads when it wakes up: "Java is in this folder; the Android SDK is in that folder." Programs such as Gradle and Capacitor read these notes instead of guessing or searching your whole disk.

There are two levels of variable:

| Level | Applies to | Changed through |
|---|---|---|
| **User** | Only your Windows account | "Edit the environment variables for your account" |
| **System** | Every account on the PC (needs admin) | "Edit the system environment variables" |

If the same name exists at both levels, the **User** value wins, except for `PATH`, which is the two lists **joined together** (System first, then User).

---

## 3. JAVA_HOME

**What it is:** the folder where the **JDK** (Java Development Kit) is installed.

```text
JAVA_HOME = C:\Program Files\Java\jdk-21.0.12
```

**Why the app needs Java:** Android apps are built with **Gradle**, and Gradle is itself a Java program. Capacitor's Android code is also written in Java and Kotlin and has to be compiled. Without a JDK, the `android/` project cannot be built into an APK.

**Who reads it:**
- **Gradle** (`android/gradlew`), to know which Java runs the build.
- **Capacitor CLI** (`npx cap run android`), which starts Gradle for you.
- **Android Studio**, when "Gradle JDK" is set to `JAVA_HOME`.

**Why exactly JDK 21:**

| JDK | Result | Reason |
|---|---|---|
| 17 | ❌ Too old | Capacitor 8 compiles its Android code as **Java 21** (`sourceCompatibility JavaVersion.VERSION_21`). Error: `invalid source release: 21`. |
| **21** | ✅ Correct | Matches Capacitor 8. It's also an LTS (long-term support) version. |
| 25 (bundled with Android Studio) | ❌ Too new | Capacitor 8's template uses **Gradle 8.14.3**, which runs on Java up to 24. Error: `Unsupported class file major version`. |

**Lesson:** "newer" isn't always better. Every tool in the chain has a supported version range, and the JDK has to fit inside all of those ranges at once.

**Android Studio note:** Android Studio ships with its own JDK (currently 25) and uses it by default. So in each project, set:
**File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK = JAVA_HOME (21).**

---

## 4. ANDROID_HOME

**What it is:** the folder where the **Android SDK** (Software Development Kit) is installed. Android Studio installs it here by default:

```text
ANDROID_HOME = C:\Users\ron28\AppData\Local\Android\Sdk
```

**What's inside that folder:**

| Subfolder | Contains | Used for |
|---|---|---|
| `platforms/android-36` | The Android API libraries for one Android version | Compiling the app against that Android version (`compileSdkVersion = 36` in Capacitor 8) |
| `build-tools/` | Tools that package and sign the APK | Creating `app-debug.apk` |
| `platform-tools/` | **adb** and other device tools | Talking to the emulator or phone |
| `emulator/` | The Android emulator | Running a virtual phone |
| `licenses/` | Accepted SDK licenses | Gradle refuses to build without them |

**Who reads it:** Gradle and the Capacitor CLI, to find the SDK. Android Studio also writes it into `android/local.properties` as `sdk.dir`.

**Important:** `ANDROID_HOME` must point to the **`Sdk` folder itself**, not a subfolder. One of the setup problems below was exactly this mistake.

---

## 5. PATH and adb

**What PATH is:** a **list of folders** where Windows looks when you type a command. When you type `adb`, Windows searches each folder in `PATH`, in order, for `adb.exe`. If none of them has it, you get:

```text
adb : The term 'adb' is not recognized as the name of a cmdlet...
```

The file existed, but Windows had no instructions to look in that folder.

**What adb is:** the **Android Debug Bridge**, the command-line link between your PC and an Android device (emulator or phone). Useful commands:

| Command | Does |
|---|---|
| `adb devices` | Lists connected phones and emulators. The first check when a phone "isn't detected". |
| `adb install app-debug.apk` | Installs an APK manually |
| `adb logcat` | Shows the phone's live logs, useful for debugging crashes and GPS or permission errors |
| `adb reverse tcp:8000 tcp:8000` | Lets a USB-connected phone reach the Laravel server on your PC (used in Phase 5) |

PATH entries added for this project:

```text
%JAVA_HOME%\bin                                     → java, javac
C:\Users\ron28\AppData\Local\Android\Sdk\platform-tools → adb
```

Android Studio finds adb on its own. Having it on PATH is for **you**, so you can run these commands in the terminal.

---

## 6. Problems hit during setup, and the fixes

| # | Symptom | Cause (layer: Windows environment) | Fix |
|---|---|---|---|
| 1 | Installed JDK 17 | Capacitor 8 needs Java 21 | Installed JDK 21 and set `JAVA_HOME` to it |
| 2 | `echo $env:ANDROID_HOME` showed `…\Sdk\platform-tools` | An older **System** variable pointed one folder too deep, and the terminal still held the old value | Corrected the System variable to `…\Android\Sdk` |
| 3 | `adb` not recognized after running `setx` | `setx` saves variables for **new** programs only; the open terminal keeps its old copy | Restart VS Code, or reload PATH in the current session (below) |
| 4 | `adb` still not recognized | `platform-tools` was never added to PATH | Appended it to the User PATH |

**Reloading PATH in the current terminal without restarting:**

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

**Why not `setx PATH ...`?** `setx` cuts values off at 1024 characters, which can silently destroy a long PATH. The `[Environment]::SetEnvironmentVariable` method has no such limit.

---

## 7. Quick health check

Run this in a new terminal whenever the Android build acts strangely:

```powershell
java -version            # expect: 21.x
echo $env:JAVA_HOME      # expect: C:\Program Files\Java\jdk-21...
echo $env:ANDROID_HOME   # expect: C:\Users\ron28\AppData\Local\Android\Sdk
adb version              # expect: Android Debug Bridge version 1.0.41
adb devices              # expect: your phone/emulator listed as "device"
```

If one of these is wrong, fix it **before** debugging your code. Many "the app won't build" errors are really environment errors.
