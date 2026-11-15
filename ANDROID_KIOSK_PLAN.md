# Android Workshop Attendance & Advance Kiosk — Implementation Plan

This implementation guide and technical specification is designed for an **Android Studio Agent** (or Android developer) to build, test, and package the standalone Android Kiosk application for a workshop tablet (targeting **Android 6.0 Marshmallow, API 23+**).

---

## 1. System Overview & Objectives

The Android Kiosk app runs on a mounted workshop tablet. It provides workers and supervisors a tactile, high-contrast, fast interface to:
1. View all active workshop staff in a clear grid.
2. Clock **IN** and **OUT** with a single tap, displaying instantaneous punch confirmation.
3. Record cash advances (**Advance**) with preset buttons and custom amounts.
4. Auto-refresh and stay in sync with the ERP backend without requiring worker logins or API tokens.

### Target Environment
- **Device**: Android Tablet (e.g., 7" to 10" screen) mounted at workshop entrance.
- **OS Target**: Android 6.0 (API level 23, Marshmallow) up to Android 14 (API 34).
- **Orientation**: Fixed Landscape.
- **Kiosk Features**: Screen always on (`FLAG_KEEP_SCREEN_ON`), Immersive Sticky fullscreen mode, PIN-protected settings dialog for configuring the backend server URL.

---

## 2. Backend API Reference

Base URL is configurable in the app settings (e.g., `http://192.168.1.100:3000` or production `https://galaxyerp.vercel.app`).

### Endpoint 1: Fetch Active Staff & Current Punch State
- **URL**: `GET /api/kiosk/staff`
- **Headers**: `Accept: application/json` (No authentication required)
- **Response**: `200 OK`
```json
[
  {
    "id": "29",
    "name": "Bhavesh",
    "clockedIn": true,
    "since": "09:15 AM"
  },
  {
    "id": "14",
    "name": "Ramesh",
    "clockedIn": false,
    "since": null
  }
]
```
> **Note**: `since` contains the formatted punch-in time in IST (e.g. `"09:15 AM"`) when `clockedIn: true`, or `null` when `clockedIn: false`. The list is pre-sorted alphabetically.

---

### Endpoint 2: Record Punch (IN / OUT)
- **URL**: `POST /api/kiosk/punch`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "staffId": "29",
  "action": "IN"
}
```
*(Or `"action": "OUT"`)*
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Punched IN successfully at 09:15 AM",
  "staff": [
    {
      "id": "29",
      "name": "Bhavesh",
      "clockedIn": true,
      "since": "09:15 AM"
    }
  ]
}
```
> **Tip**: The `200 OK` response directly includes the updated `staff` array. The app can immediately update the UI state with `response.staff` without sending a second `GET /api/kiosk/staff` request!

- **Response `400 Bad Request`**:
```json
{ "error": "Already clocked in" }
```
*(or `{ "error": "Not clocked in" }`)*

---

### Endpoint 3: Record Cash Advance
- **URL**: `POST /api/kiosk/advance`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "staffId": "29",
  "amount": 500
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Advance recorded"
}
```
- **Response `400 Bad Request`**:
```json
{ "error": "Amount must be greater than 0" }
```

---

## 3. Technology Stack & Dependencies

For maximum compatibility with Android 6.0 (API 23) and high UI responsiveness:
- **Language**: Kotlin 1.9+
- **Architecture**: MVVM (Model - View - ViewModel) + Android Architecture Components
- **UI Framework**: XML Views + ViewBinding + RecyclerView + Material Components (reliable, lightweight on older hardware)
- **Networking**: Retrofit 2 + OkHttp 4 + Gson Converter
- **Coroutines & Lifecycle**: Kotlin Coroutines + `androidx.lifecycle:lifecycle-viewmodel-ktx`
- **Audio Feedback**: Android `SoundPool` for punch beep / success chimes

### Recommended `app/build.gradle` Configuration
```groovy
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.galaxy.kiosk'
    compileSdk 34

    defaultConfig {
        applicationId "com.galaxy.kiosk"
        minSdk 23
        targetSdk 34
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        viewBinding true
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    // AndroidX & Material
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'

    // ViewModel & Lifecycle
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.7.0'

    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

    // Retrofit & OkHttp
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'
}
```

---

## 4. Network Security & Android 6.0 Configuration

In `app/src/main/AndroidManifest.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Workshop Kiosk"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.WorkshopKiosk"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="sensorLandscape"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:windowSoftInputMode="adjustPan">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

Create `app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allows cleartext HTTP communication on local workshop LAN (e.g. 192.168.x.x) -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

---

## 5. Architecture & Implementation Steps

```
com.galaxy.kiosk/
├── data/
│   ├── model/
│   │   ├── StaffMember.kt
│   │   ├── PunchRequest.kt
│   │   ├── PunchResponse.kt
│   │   ├── AdvanceRequest.kt
│   │   └── ApiResponse.kt
│   ├── api/
│   │   ├── KioskApiService.kt
│   │   └── ApiClient.kt
│   └── repository/
│       └── KioskRepository.kt
├── ui/
│   ├── adapter/
│   │   └── StaffGridAdapter.kt
│   ├── dialog/
│   │   ├── AdvanceDialog.kt
│   │   ├── SettingsDialog.kt
│   │   └── ConfirmPunchDialog.kt
│   ├── viewmodel/
│   │   ├── KioskViewModel.kt
│   │   └── KioskUiState.kt
│   └── MainActivity.kt
└── util/
    ├── SoundManager.kt
    └── PreferenceManager.kt
```

### Step 1: Data Models (`data/model/`)

```kotlin
// StaffMember.kt
package com.galaxy.kiosk.data.model

import com.google.gson.annotations.SerializedName

data class StaffMember(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("clockedIn") val clockedIn: Boolean,
    @SerializedName("since") val since: String?
)

// PunchRequest.kt
data class PunchRequest(
    @SerializedName("staffId") val staffId: String,
    @SerializedName("action") val action: String // "IN" or "OUT"
)

// PunchResponse.kt
data class PunchResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("staff") val staff: List<StaffMember>?
)

// AdvanceRequest.kt
data class AdvanceRequest(
    @SerializedName("staffId") val staffId: String,
    @SerializedName("amount") val amount: Double
)

// GenericApiResponse.kt
data class GenericApiResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String?
)
```

---

### Step 2: Retrofit API Interface & Client

```kotlin
// KioskApiService.kt
package com.galaxy.kiosk.data.api

import com.galaxy.kiosk.data.model.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface KioskApiService {

    @GET("/api/kiosk/staff")
    suspend fun getStaff(): Response<List<StaffMember>>

    @POST("/api/kiosk/punch")
    suspend fun recordPunch(@Body request: PunchRequest): Response<PunchResponse>

    @POST("/api/kiosk/advance")
    suspend fun recordAdvance(@Body request: AdvanceRequest): Response<GenericApiResponse>
}
```

```kotlin
// ApiClient.kt
package com.galaxy.kiosk.data.api

import android.content.Context
import com.galaxy.kiosk.util.PreferenceManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private var service: KioskApiService? = null
    private var currentBaseUrl: String? = null

    fun getService(context: Context): KioskApiService {
        val baseUrl = PreferenceManager.getBaseUrl(context)
        if (service == null || currentBaseUrl != baseUrl) {
            currentBaseUrl = baseUrl
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            val okHttp = OkHttpClient.Builder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(8, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .build()

            service = Retrofit.Builder()
                .baseUrl(if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/")
                .client(okHttp)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(KioskApiService::class.java)
        }
        return service!!
    }

    fun resetService() {
        service = null
    }
}
```

---

### Step 3: ViewModel & State Management

```kotlin
// KioskViewModel.kt
package com.galaxy.kiosk.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.galaxy.kiosk.data.api.ApiClient
import com.galaxy.kiosk.data.model.AdvanceRequest
import com.galaxy.kiosk.data.model.PunchRequest
import com.galaxy.kiosk.data.model.StaffMember
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed class UiEvent {
    data class ShowSuccess(val message: String) : UiEvent()
    data class ShowError(val error: String) : UiEvent()
}

class KioskViewModel(application: Application) : AndroidViewModel(application) {

    private val _staffList = MutableLiveData<List<StaffMember>>(emptyList())
    val staffList: LiveData<List<StaffMember>> = _staffList

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _uiEvent = MutableLiveData<UiEvent?>()
    val uiEvent: LiveData<UiEvent?> = _uiEvent

    fun clearUiEvent() {
        _uiEvent.value = null
    }

    fun loadStaff() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val api = ApiClient.getService(getApplication())
                val res = withContext(Dispatchers.IO) { api.getStaff() }
                if (res.isSuccessful && res.body() != null) {
                    _staffList.value = res.body()
                } else {
                    _uiEvent.value = UiEvent.ShowError("Failed to fetch staff: HTTP ${res.code()}")
                }
            } catch (e: Exception) {
                _uiEvent.value = UiEvent.ShowError("Network error: ${e.localizedMessage}")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun performPunch(staffId: String, action: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val api = ApiClient.getService(getApplication())
                val res = withContext(Dispatchers.IO) {
                    api.recordPunch(PunchRequest(staffId, action))
                }
                if (res.isSuccessful && res.body() != null) {
                    val body = res.body()!!
                    _uiEvent.value = UiEvent.ShowSuccess(body.message)
                    // If backend returned the updated staff list, update state immediately!
                    if (!body.staff.isNullOrEmpty()) {
                        _staffList.value = body.staff
                    } else {
                        loadStaff()
                    }
                } else {
                    val errJson = res.errorBody()?.string()
                    val errMsg = try {
                        Gson().fromJson(errJson, JsonObject::class.java).get("error").asString
                    } catch (e: Exception) {
                        "Punch failed (HTTP ${res.code()})"
                    }
                    _uiEvent.value = UiEvent.ShowError(errMsg)
                }
            } catch (e: Exception) {
                _uiEvent.value = UiEvent.ShowError("Punch error: ${e.localizedMessage}")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun recordAdvance(staffId: String, amount: Double) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val api = ApiClient.getService(getApplication())
                val res = withContext(Dispatchers.IO) {
                    api.recordAdvance(AdvanceRequest(staffId, amount))
                }
                if (res.isSuccessful) {
                    _uiEvent.value = UiEvent.ShowSuccess("Advance of ₹${amount.toInt()} recorded!")
                } else {
                    val errJson = res.errorBody()?.string()
                    val errMsg = try {
                        Gson().fromJson(errJson, JsonObject::class.java).get("error").asString
                    } catch (e: Exception) {
                        "Advance failed (HTTP ${res.code()})"
                    }
                    _uiEvent.value = UiEvent.ShowError(errMsg)
                }
            } catch (e: Exception) {
                _uiEvent.value = UiEvent.ShowError("Network error: ${e.localizedMessage}")
            } finally {
                _isLoading.value = false
            }
        }
    }
}
```

---

## 6. User Interface Design for Workshop Tablets

### UI Layout Principles
1. **Large Touch Targets**: Minimum 48dp height; buttons should be 56dp+ height for workshop use.
2. **High Visual Contrast**: Dark theme background (`#121212`) or clean industrial theme with emerald green (`#10B981`) for Clocked In and amber/crimson for Clocked Out.
3. **Card Grid**: Use a 3-column or 4-column `GridLayoutManager` depending on screen size.

### Card Layout (`item_staff_kiosk.xml`)
Each card displays:
- **Worker Name** (Bold, 20sp)
- **Status Indicator**:
  - `Clocked In`: Green indicator dot/badge + `🕒 Since 09:15 AM`
  - `Not In`: Gray indicator dot/badge + `Not Clocked In`
- **Main Action Button**:
  - If NOT clocked in: Big Green **"PUNCH IN"** button
  - If clocked in: Orange/Amber **"PUNCH OUT"** button
- **Secondary Action Button**:
  - Outlined button: **"₹ ADVANCE"**

### Advance Modal Dialog (`dialog_advance.xml`)
- Worker Name header: `"Cash Advance for [Name]"`
- Quick Preset Chips / Buttons: **₹100**, **₹200**, **₹500**, **₹1000**
- Numeric EditText with standard numpad for custom amounts
- Large **"CONFIRM ADVANCE"** button

---

## 7. Kiosk Tablet Polish & Hardware Integration

1. **Keep Screen On**:
   In `MainActivity.onCreate()`:
   ```kotlin
   window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
   ```

2. **Immersive Fullscreen (Hide Android System Bar & Navigation)**:
   ```kotlin
   override fun onWindowFocusChanged(hasFocus: Boolean) {
       super.onWindowFocusChanged(hasFocus)
       if (hasFocus) {
           window.decorView.systemUiVisibility = (
               View.SYSTEM_UI_FLAG_LAYOUT_STABLE
               or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
               or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
               or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
               or View.SYSTEM_UI_FLAG_FULLSCREEN
               or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
           )
       }
   }
   ```

3. **Audio Feedback**:
   Use `SoundPool` to play audio feedback when workers punch:
   - Success chime on valid punch IN / OUT.
   - Low buzz / error tone when duplicate punch or network error occurs.

4. **Auto-Polling / Background Sync**:
   Set a coroutine timer to call `viewModel.loadStaff()` every **30 seconds** so the tablet display remains in sync even if attendance is edited from the desktop ERP.

5. **Settings Protection (Gear Icon)**:
   Place a small gear icon in the top header. Tapping it prompts for an Admin PIN (e.g. `1234` or custom) to allow changing the Server Base URL or restarting the app.

---

## 8. Step-by-Step Prompt for Android Studio Agent

Copy and paste the prompt below directly into the Android Studio AI Assistant / Agent:

```markdown
You are an expert Android developer building an Attendance Kiosk app for a workshop tablet (Android 6.0 Marshmallow, API level 23+).

Project Requirements:
1. Target minSdk 23, targetSdk 34. Screen orientation locked to Landscape. Screen kept awake (FLAG_KEEP_SCREEN_ON) and sticky immersive fullscreen.
2. Architecture: Kotlin + MVVM + ViewBinding + Coroutines + Retrofit2 + Gson.
3. Backend APIs:
   - GET /api/kiosk/staff: returns [{ "id": "...", "name": "...", "clockedIn": boolean, "since": string|null }]
   - POST /api/kiosk/punch: body { "staffId": "...", "action": "IN" | "OUT" }, returns { "success": true, "message": "...", "staff": [...] }
   - POST /api/kiosk/advance: body { "staffId": "...", "amount": number }, returns { "success": true, "message": "..." }
4. UI:
   - Header with digital live clock (IST/local), server sync indicator, and gear icon for Settings.
   - 3-column RecyclerView grid of staff cards with large touch-friendly buttons for "PUNCH IN" (green) and "PUNCH OUT" (orange), and a "₹ Advance" button.
   - When punch button is pressed, immediately call POST /api/kiosk/punch, play a chime sound, show a success snackbar, and update the staff list from the response payload.
   - When Advance is pressed, display a dialog with preset amounts (₹100, ₹200, ₹500, ₹1000) and custom input, submitting to POST /api/kiosk/advance.
   - Settings dialog (PIN protected) to change the server Base URL saved in SharedPreferences.
5. Create all files including Gradle configs, network_security_config.xml, models, Retrofit service, ViewModel, Adapters, XML layouts, and MainActivity.
```
