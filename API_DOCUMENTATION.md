# Galaxy ERP — Kiosk & Staff API Developer Documentation

Comprehensive developer reference for connecting Android tablets, mobile apps, and external systems to Galaxy ERP.

---

## 1. Architecture & Base URL

The API is served over standard HTTPS (or HTTP in local network development):

| Environment | Base URL |
| :--- | :--- |
| **Production (Vercel)** | `https://galaxyerp.vercel.app/` |
| **Local WiFi / Dev** | `http://<YOUR_COMPUTER_LOCAL_IP>:3000/` *(e.g. `http://192.168.1.50:3000/`)* |

> [!NOTE]
> All kiosk endpoints are public (no Bearer token required) so Android tablets on the factory floor can communicate without requiring user sign-in sessions.

### Real-Time Live Data & Caching Policy
- **100% Live Supabase Queries**: All `GET` endpoints emit `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, completely bypassing edge CDN and browser caching. Responses reflect live database records immediately.
- **Single-Flight Request Coalescing**: To protect Supabase connection pools during concurrent spikes (e.g. automated load testing or simultaneous tablet polling), concurrent requests within a 1,000 ms window coalesce into a single live database query (`activeSyncPromise`), ensuring sub-second response times without socket starvation.
- **Fault-Tolerant Fallback**: In the event of Supabase network downtime or external outages exceeding 3,500 ms, the system gracefully falls back to local disk JSON backups (`backups/latest/`) to maintain 100% uptime on the workshop floor.

---

## 2. API Endpoints Reference

### Summary Table

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/kiosk/staff` | List staff with real-time clock-in/out status (active first A-Z, inactive second A-Z). |
| `GET` | `/api/kiosk/staff/{id}` | Get a single staff member's profile & live clock state. |
| `POST` | `/api/kiosk/staff` | Create a new staff member (name, role, salary, phone, status). |
| `PUT` | `/api/kiosk/staff/{id}` | Update an existing staff member (role, salary, status, etc.). |
| `POST` | `/api/kiosk/punch` | Record Clock IN / OUT with automatic hours & status computation. |
| `POST` | `/api/kiosk/advance` | Record a cash advance with manager name (`Jaspreet`, `Harjeet`, etc.). |
| `POST` | `/api/kiosk/health` | Report kiosk heartbeat, battery level, charging state & device status. |
| `GET` | `/api/kiosk/health` | Read live device health, online/offline status, battery & last seen timestamp. |

> [!IMPORTANT]
> **Staff Deletion Policy**: Staff members **cannot be deleted via the API**. Attempting to send a `DELETE` request returns `403 Forbidden`. Employee deletions must be performed directly by administrators within the web dashboard. To deactivate an employee via API, update their status to `"On Leave"` or `"Terminated"` using `PUT /api/kiosk/staff/{id}`.

---

### Endpoint 1: `GET /api/kiosk/staff` — List Staff Members

Retrieves staff members along with their real-time clock-in/out status for today (Asia/Kolkata timezone).

- **Method**: `GET`
- **URL**: `/api/kiosk/staff`
- **Query Parameters**:
  - `all` *(optional, boolean)*:
    - Omitted / `false`: Returns only **active** workers (excludes `On Leave` and `Terminated`). Use this for the tablet clock-in screen.
    - `true` / `1`: Returns **all** workers irrespective of status. Use this for management or employee rosters.
  - `id` *(optional, string)*: Filter to a single staff member.
- **Headers**:
  ```http
  Accept: application/json
  ```
- **Sorting Rule**:
  - **Tier 1**: All active staff (`Available`), sorted alphabetically by name (A–Z).
  - **Tier 2**: All inactive staff (`On Leave` and `Terminated`), sorted alphabetically by name (A–Z).

#### Response Headers
```http
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

#### Response (`200 OK`)
```json
[
  {
    "id": "41",
    "name": "Aditya",
    "role": "Helper",
    "salary": 400,
    "phone": "",
    "status": "Available",
    "clockedIn": true,
    "since": "09:08 AM"
  },
  {
    "id": "43",
    "name": "Imran",
    "role": "Welder",
    "salary": 800,
    "phone": "",
    "status": "Available",
    "clockedIn": true,
    "since": "09:08 AM"
  },
  {
    "id": "45",
    "name": "Mustafa",
    "role": "Welder",
    "salary": 800,
    "phone": "",
    "status": "Available",
    "clockedIn": true,
    "since": "09:08 AM"
  },
  {
    "id": "51",
    "name": "Rohit (New)",
    "role": "Helper",
    "salary": 350,
    "phone": "",
    "status": "Available",
    "clockedIn": true,
    "since": "09:08 AM"
  },
  {
    "id": "52",
    "name": "Test",
    "role": "Helper",
    "salary": 0,
    "phone": "",
    "status": "Available",
    "clockedIn": false,
    "since": null
  },
  {
    "id": "42",
    "name": "Ramesh",
    "role": "Welder",
    "salary": 800,
    "phone": "9876543212",
    "status": "On Leave",
    "clockedIn": false,
    "since": null
  }
]
```

---

### Endpoint 2: `GET /api/kiosk/staff/{id}` — Get Single Staff Member

- **Method**: `GET`
- **URL**: `/api/kiosk/staff/{id}`
- **Headers**: `Accept: application/json`

#### Response (`200 OK`)
```json
{
  "id": "47",
  "name": "Test",
  "role": "Helper",
  "salary": 800,
  "phone": "9876543210",
  "status": "Available",
  "clockedIn": false,
  "since": null
}
```

#### Error Response (`404 Not Found`)
```json
{
  "error": "Staff member not found"
}
```

---

### Endpoint 3: `POST /api/kiosk/staff` — Create New Staff Member

Adds a new employee to the database and syncs to local JSON backups.

- **Method**: `POST`
- **URL**: `/api/kiosk/staff`
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body**:
  ```json
  {
    "name": "Gurpreet Singh",
    "role": "Welder",
    "salary": 850,
    "phone": "9876543210",
    "status": "Available"
  }
  ```

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | — | Employee's full name. Cannot be empty. |
| `role` | `string` | No | `"Helper"` | Employee role (e.g. `"Welder"`, `"Helper"`, etc.). |
| `salary` | `number` | No | `0` | Daily wage in ₹. Must be `>= 0`. |
| `phone` | `string` | No | `""` | Contact phone number. |
| `status` | `string` | No | `"Available"` | `"Available"` or `"On Leave"`. |

#### Response (`201 Created`)
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "staff": {
    "id": "49",
    "name": "Gurpreet Singh",
    "role": "Welder",
    "salary": 850,
    "phone": "9876543210",
    "status": "Available",
    "clockedIn": false,
    "since": null
  }
}
```

---

### Endpoint 4: `PUT /api/kiosk/staff/{id}` — Update Staff Details

Updates any combination of an employee's role, salary, phone, name, or employment status.

- **Method**: `PUT` (or `PATCH`)
- **URL**: `/api/kiosk/staff/{id}` *(or `/api/kiosk/staff` with `{ "id": "49", ... }` in body)*
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body** *(provide only fields you wish to update)*:
  ```json
  {
    "role": "Senior Welder",
    "salary": 950,
    "status": "On Leave"
  }
  ```

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Updated employee name. |
| `role` | `string` | Updated role (`"Welder"`, `"Helper"`, etc.). |
| `salary` | `number` | Updated daily wage in ₹ (`>= 0`). |
| `phone` | `string` | Updated phone number. |
| `status` | `string` | `"Available"`, `"On Leave"`, or `"Terminated"`. Passing `"Terminated"` automatically appends today's date (`Terminated:YYYY-MM-DD`). |

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Staff member updated successfully",
  "staff": {
    "id": "49",
    "name": "Gurpreet Singh",
    "role": "Senior Welder",
    "salary": 950,
    "phone": "9876543210",
    "status": "On Leave"
  }
}
```

---

### Endpoint 5: `POST /api/kiosk/punch` — Clock IN / Clock OUT

Records a clock punch for today. The backend automatically calculates total accumulated hours and attendance status, updating both `staff_punches` and `staff_attendance` tables in Supabase.

- **Method**: `POST`
- **URL**: `/api/kiosk/punch`
- **Request Body**:
  ```json
  {
    "staffId": "47",
    "action": "IN"
  }
  ```

#### Automatic Status Calculation Rules
Whenever a punch or time edit occurs, the attendance status is automatically determined from elapsed daily working hours:
- **Still Clocked In**: Automatically marked as `Present`.
- **`< 4 hours`**: `Absent`
- **`4 – 6 hours`**: `Half-Day`
- **`6 – 10 hours`**: `Present`
- **`> 10 hours`**: `Overtime`

#### Two-Way Synchronization
- Clocking **IN** saves `punch_in` timestamp and resets `punch_out = null`.
- Clocking **OUT** saves `punch_out` timestamp, preserves earliest `punch_in`, and auto-calculates total hours and final status.
- Manual time edits made via the web dashboard immediately re-sync `staff_punches` and trigger the same automatic status calculation.

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Punched IN successfully at 09:15 AM",
  "staff": [ ...entire updated staff list... ]
}
```
*When clocking OUT:*
```json
{
  "success": true,
  "message": "Punched OUT successfully (Total: 8.5 hrs, Status: Present)",
  "staff": [ ... ]
}
```

#### Error Handling (`400 Bad Request`)
- `"Already clocked in"` — Staff is already punched IN.
- `"Not clocked in"` — Cannot punch OUT when staff is clocked OUT.
- `"Staff member is not active (Status: ...)"` — Staff is marked On Leave or Terminated.

---

### Endpoint 6: `POST /api/kiosk/advance` — Record Cash Advance

- **Method**: `POST`
- **URL**: `/api/kiosk/advance`
- **Request Body**:
  ```json
  {
    "staffId": "47",
    "amount": 250,
    "notes": "Jaspreet"
  }
  ```
  *(Pass the manager selected via radio button in `notes`: `"Sandeep"`, `"Harjeet"`, `"Jaspreet"`, or `"Jaskaran"`).*

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Advance recorded"
}
```

---

### Endpoint 7: `POST /api/kiosk/health` — Report Kiosk Health & Heartbeat

Sends tablet telemetry including battery percentage, charging state, app version, and timestamp to Supabase (`public.kiosk_health`).

- **Method**: `POST`
- **URL**: `/api/kiosk/health`
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body Parameters**:
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `device_id` | `string` | Optional | Device identifier (e.g. `"tablet-floor-1"`, `"tablet-welding"`). Defaults to `"default"`. |
  | `battery_percentage` | `number` | **Required** | Battery percentage ($0 - 100$). Supports integer `85`, decimal `85.5`, or Android level float `0.85` (auto-scaled to 85). |
  | `is_charging` | `boolean` | Optional | `true` if connected to charger, `false` otherwise. |
  | `charging_state` | `string` | Optional | Detailed state: `"charging"`, `"discharging"`, `"full"`, `"not_charging"`. Defaults based on `is_charging`. |
  | `app_version` | `string` | Optional | Installed kiosk app version (e.g. `"1.0.4"`). |
  | `ip_address` | `string` | Optional | Explicit IP, or automatically detected from HTTP headers. |
  | `metadata` | `object` | Optional | Custom telemetry (e.g. `{"wifi_ssid": "Galaxy_Factory", "storage_free_mb": 4200}`). |

- **Sample Request**:
  ```json
  {
    "device_id": "tablet-main",
    "battery_percentage": 78,
    "is_charging": true,
    "charging_state": "charging",
    "app_version": "1.2.0",
    "metadata": {
      "screen_on": true,
      "wifi_rssi": -55
    }
  }
  ```

#### Response (`200 OK`)
```json
{
  "success": true,
  "db_synced": true,
  "db_error": null,
  "health": {
    "device_id": "tablet-main",
    "battery_percentage": 78,
    "is_charging": true,
    "charging_state": "charging",
    "ip_address": "192.168.1.105",
    "app_version": "1.2.0",
    "metadata": {
      "screen_on": true,
      "wifi_rssi": -55
    },
    "last_seen": "2026-11-23T09:12:00.000Z",
    "updated_at": "2026-11-23T09:12:00.000Z",
    "is_online": true,
    "last_seen_minutes_ago": 0
  }
}
```

---

### Endpoint 8: `GET /api/kiosk/health` — Read Kiosk Device Telemetry

Fetches current battery status, charging state, and online/offline calculation for all registered tablets or a specific device.

- **Method**: `GET`
- **URL**: `/api/kiosk/health`
- **Query Parameters**:
  - `device_id` *(optional, string)*: Filter to a single kiosk device (e.g. `?device_id=tablet-main`).
- **Online Calculation Rule**:
  - `is_online: true` if the device reported a heartbeat within the last **5 minutes** ($\le 300\text{s}$).
  - `is_online: false` if no heartbeat has arrived for $> 5$ minutes.

#### Response (`200 OK`) — Multi-device list:
```json
[
  {
    "id": "18f949c8-d8f9-436f-9988-d45855018619",
    "device_id": "tablet-main",
    "battery_percentage": 78,
    "is_charging": true,
    "charging_state": "charging",
    "ip_address": "192.168.1.105",
    "app_version": "1.2.0",
    "metadata": {
      "screen_on": true
    },
    "last_seen": "2026-11-23T09:12:00.000Z",
    "is_online": true,
    "last_seen_minutes_ago": 1
  }
]
```

---

## 3. Production-Ready Android (Kotlin & Retrofit) Implementation

The code below has been verified against the live API specifications.

### 3.1 Dependencies (`app/build.gradle.kts`)
```kotlin
dependencies {
    // Retrofit & Gson Converter
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")

    // OkHttp & Logging
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Kotlin Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
```

---

### 3.2 Data Transfer Objects (`KioskModels.kt`)
```kotlin
package com.galaxy.kiosk.data

import com.google.gson.annotations.SerializedName

/**
 * Staff member item returned by GET /api/kiosk/staff
 */
data class StaffMember(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("role") val role: String? = null,
    @SerializedName("salary") val salary: Double? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("clockedIn") val clockedIn: Boolean = false,
    @SerializedName("since") val since: String? = null
)

/**
 * Request body for creating new staff member (POST /api/kiosk/staff)
 */
data class CreateStaffRequest(
    @SerializedName("name") val name: String,
    @SerializedName("role") val role: String? = "Helper",
    @SerializedName("salary") val salary: Double? = 0.0,
    @SerializedName("phone") val phone: String? = "",
    @SerializedName("status") val status: String? = "Available"
)

data class CreateStaffResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("staff") val staff: StaffMember?
)

/**
 * Request body for updating staff member (PUT /api/kiosk/staff/{id})
 */
data class UpdateStaffRequest(
    @SerializedName("name") val name: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("salary") val salary: Double? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("status") val status: String? = null
)

data class UpdateStaffResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("staff") val staff: StaffMember?
)

/**
 * Request body for clock IN / OUT punch (POST /api/kiosk/punch)
 */
data class PunchRequest(
    @SerializedName("staffId") val staffId: String,
    @SerializedName("action") val action: String // "IN" or "OUT"
)

data class PunchResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("staff") val staff: List<StaffMember>?
)

/**
 * Request body for recording advance (POST /api/kiosk/advance)
 */
data class AdvanceRequest(
    @SerializedName("staffId") val staffId: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("notes") val notes: String // "Sandeep", "Harjeet", "Jaspreet", "Jaskaran"
)

data class ApiResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("error") val error: String? = null
)

/**
 * Health telemetry request (POST /api/kiosk/health)
 */
data class KioskHealthRequest(
    @SerializedName("device_id") val deviceId: String = "default",
    @SerializedName("battery_percentage") val batteryPercentage: Double,
    @SerializedName("is_charging") val isCharging: Boolean = false,
    @SerializedName("charging_state") val chargingState: String = "discharging",
    @SerializedName("app_version") val appVersion: String? = null,
    @SerializedName("metadata") val metadata: Map<String, Any>? = null
)

data class KioskDeviceHealth(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("battery_percentage") val batteryPercentage: Double?,
    @SerializedName("is_charging") val isCharging: Boolean,
    @SerializedName("charging_state") val chargingState: String?,
    @SerializedName("ip_address") val ipAddress: String?,
    @SerializedName("app_version") val appVersion: String?,
    @SerializedName("last_seen") val lastSeen: String?,
    @SerializedName("is_online") val isOnline: Boolean,
    @SerializedName("last_seen_minutes_ago") val lastSeenMinutesAgo: Long
)

data class KioskHealthResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("db_synced") val dbSynced: Boolean,
    @SerializedName("health") val health: KioskDeviceHealth?
)
```

---

### 3.3 Retrofit Service Interface (`KioskApiService.kt`)
```kotlin
package com.galaxy.kiosk.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface KioskApiService {

    // 1. Fetch staff list (active only or all)
    @GET("api/kiosk/staff")
    suspend fun getStaff(
        @Query("all") all: Boolean? = null
    ): Response<List<StaffMember>>

    // 2. Fetch single staff member
    @GET("api/kiosk/staff/{id}")
    suspend fun getStaffById(
        @Path("id") id: String
    ): Response<StaffMember>

    // 3. Create a new staff member
    @POST("api/kiosk/staff")
    suspend fun createStaff(
        @Body request: CreateStaffRequest
    ): Response<CreateStaffResponse>

    // 4. Update staff member details
    @PUT("api/kiosk/staff/{id}")
    suspend fun updateStaff(
        @Path("id") id: String,
        @Body request: UpdateStaffRequest
    ): Response<UpdateStaffResponse>

    // 5. Record Clock IN / Clock OUT
    @POST("api/kiosk/punch")
    suspend fun recordPunch(
        @Body request: PunchRequest
    ): Response<PunchResponse>

    // 6. Record cash advance
    @POST("api/kiosk/advance")
    suspend fun recordAdvance(
        @Body request: AdvanceRequest
    ): Response<ApiResponse>

    // 7. Report kiosk battery & health telemetry
    @POST("api/kiosk/health")
    suspend fun sendHealthHeartbeat(
        @Body request: KioskHealthRequest
    ): Response<KioskHealthResponse>

    // 8. Read kiosk health status
    @GET("api/kiosk/health")
    suspend fun getHealthStatus(
        @Query("device_id") deviceId: String? = null
    ): Response<List<KioskDeviceHealth>>
}
```

---

### 3.4 API Client Singleton (`ApiClient.kt`)
```kotlin
package com.galaxy.kiosk.data

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    // Note: Retrofit base URL MUST end with a trailing slash "/"
    private const val BASE_URL = "https://galaxyerp.vercel.app/"

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    val api: KioskApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(KioskApiService::class.java)
    }
}
```

---

### 3.5 Ready-to-Use UI & Business Logic Snippets

#### 1. Fetching Active Staff for the Main Grid
```kotlin
fun loadStaffList() {
    lifecycleScope.launch {
        try {
            val response = ApiClient.api.getStaff() // getStaff(all = true) for all staff
            if (response.isSuccessful) {
                val list = response.body() ?: emptyList()
                staffAdapter.submitList(list)
            } else {
                Toast.makeText(context, "Error loading staff (${response.code()})", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Network error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
```

#### 2. Adding a New Staff Member
```kotlin
fun addNewStaff(name: String, role: String, dailySalary: Double, phone: String) {
    lifecycleScope.launch {
        try {
            val request = CreateStaffRequest(
                name = name,
                role = role,
                salary = dailySalary,
                phone = phone,
                status = "Available"
            )
            val response = ApiClient.api.createStaff(request)
            if (response.isSuccessful && response.body()?.success == true) {
                Toast.makeText(context, "Staff member created!", Toast.LENGTH_SHORT).show()
                loadStaffList() // Refresh roster
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Failed to create staff"
                Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
```

#### 3. Editing Staff Details (Role, Salary, Status)
```kotlin
fun updateStaffDetails(staffId: String, newRole: String, newSalary: Double, newStatus: String) {
    lifecycleScope.launch {
        try {
            val request = UpdateStaffRequest(
                role = newRole,
                salary = newSalary,
                status = newStatus // "Available", "On Leave", or "Terminated"
            )
            val response = ApiClient.api.updateStaff(staffId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                Toast.makeText(context, "Staff details updated!", Toast.LENGTH_SHORT).show()
                loadStaffList()
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Update failed"
                Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
```

#### 4. Punching Clock IN / OUT
```kotlin
fun onPunchClicked(staff: StaffMember) {
    val nextAction = if (staff.clockedIn) "OUT" else "IN"

    lifecycleScope.launch {
        try {
            val response = ApiClient.api.recordPunch(
                PunchRequest(staffId = staff.id, action = nextAction)
            )
            if (response.isSuccessful) {
                val body = response.body()
                Toast.makeText(context, body?.message ?: "Success", Toast.LENGTH_SHORT).show()
                // Update local list directly with returned refreshed list
                body?.staff?.let { staffAdapter.submitList(it) }
            } else {
                val err = response.errorBody()?.string() ?: "Punch failed"
                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Network error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
```

#### 5. Recording Cash Advance with Manager Radio Button
```kotlin
fun recordAdvance(staffId: String, amount: Double, selectedManager: String) {
    // selectedManager is one of: "Sandeep", "Harjeet", "Jaspreet", "Jaskaran"

    lifecycleScope.launch {
        try {
            val response = ApiClient.api.recordAdvance(
                AdvanceRequest(
                    staffId = staffId,
                    amount = amount,
                    notes = selectedManager
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                Toast.makeText(context, "₹$amount advance recorded by $selectedManager", Toast.LENGTH_SHORT).show()
            } else {
                val err = response.errorBody()?.string() ?: "Advance recording failed"
                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
```

#### 6. Reporting Battery & Kiosk Health Heartbeat (Periodic / Background)
```kotlin
fun sendKioskBatteryHealth(context: Context, deviceId: String = "tablet-main") {
    // 1. Read Android BatteryManager intent
    val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
        context.registerReceiver(null, filter)
    }

    val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
    val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
    val batteryPct: Double = if (level >= 0 && scale > 0) (level * 100 / scale.toDouble()) else 100.0

    val status: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
    val isCharging: Boolean = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                              status == BatteryManager.BATTERY_STATUS_FULL

    val chargePlug: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1) ?: -1
    val chargingState = when {
        status == BatteryManager.BATTERY_STATUS_FULL -> "full"
        chargePlug == BatteryManager.BATTERY_PLUGGED_USB -> "usb"
        chargePlug == BatteryManager.BATTERY_PLUGGED_AC -> "ac"
        isCharging -> "charging"
        else -> "discharging"
    }

    // 2. Post telemetry to Galaxy ERP
    lifecycleScope.launch {
        try {
            val response = ApiClient.api.sendHealthHeartbeat(
                KioskHealthRequest(
                    deviceId = deviceId,
                    batteryPercentage = batteryPct,
                    isCharging = isCharging,
                    chargingState = chargingState,
                    appVersion = BuildConfig.VERSION_NAME
                )
            )
            if (response.isSuccessful) {
                Log.d("KioskHealth", "Heartbeat synced: ${response.body()?.health?.batteryPercentage}%")
            }
        } catch (e: Exception) {
            Log.w("KioskHealth", "Telemetry send failed: ${e.message}")
        }
    }
}
```
