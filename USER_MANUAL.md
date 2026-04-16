# TGS Commercial Database & Analytics — User Manual

## 1. Introduction
The **TGS Commercial Database** is a high-precision financial intelligence platform designed to track portfolio profitability, streamline field data entry, and maintain data integrity across hundreds of community service records.

---

## 2. Core Modules & Features

### 📊 Portfolio Analytics
The command center for your business performance.
- **Net Profit & Efficiency**: Tracks your real-time earnings vs. expenditure.
- **Yield Leaderboard**: Automatically ranks every community by their profit margin. Communities in the red are flagged for pricing renegotiation.
- **Operational Burn**: Visualizes the combined "overhead" of your labor and materials over any selected time period.
- **Usage**: Use the **Month Selection** dropdown to filter specific windows or view "All Time" history.

### 📋 Record Service (Field Log)
The primary entry point for daily operations.
- **Intelligent Search**: Find communities by name or original management company.
- **Labor Tracking**: Enter clock time and crew size; the system auto-calculates man-hours and labor cost based on your global baseline.
- **Material Consumption**: Search the Material Catalog to add items. Counts (Bags/Units) are automatically converted into dollar-value expenditures.
- **Duplicate Prevention**: The system flags entries if a log already exists for that community on the same day.

### 🏢 Community Portfolio
Your master list of client properties.
- **Snapshots**: View the "Financial Pulse" of individual communities, including their contract vs. actual cost breakdown.
- **Audit History**: Every service ever performed is tracked with its specific labor and material costs at the time.
- **Merge Tools**: If a community changes names or was entered twice (e.g., "Amihan" vs "Amihan HOA"), use the **Selection** tool to merge them. Historical data is preserved as "Zones" or "Areas" under the primary record.

### 🧪 Materials & Labor
Manage your cost baseline.
- **Material Catalog**: Update your internal buying prices here. Note: Changes only affect *future* logs or un-snapshotted historical data unless a manual re-sync is performed.
- **Labor Rate**: Set your global hourly labor rate (default: $32.50) to keep financial projections accurate.

### 📑 Reports
- **Data Export**: Generate CSV/Excel friendly exports of your entire service history.
- **Filtering**: Slice data by date range, community, or company to prepare for client billing or internal audits.

---

## 3. Access Levels & Security
The system uses **Role-Based Access Control (RBAC)**. Permissions are tied to your login email; there are no manual "toggles" required.

| Feature | Admin (Full Access) | Executive (Read Only) |
| :--- | :---: | :---: |
| View Analytics & Reports | ✅ | ✅ |
| Record Service Logs | ✅ | ❌ |
| Edit Pricing/Materials | ✅ | ❌ |
| Merge Communities/Crews | ✅ | ❌ |
| Manage Team Access | ✅ | ❌ |

---

## 4. Best Practices for Data Integrity
1. **Capitalization**: Use standard Title Case for community names.
2. **Standard Units**: Always ensure your Material Catalog uses uppercase units (e.g., BAG, GAL) for consistent reporting.
3. **Daily Logging**: Record logs on the day of service whenever possible to ensure the "Last Synced" timestamp accurately reflects your field progress.
4. **The "Merge First" Rule**: Before adding a "new" community, search by the company name to see if it already exists under a slightly different spelling.

---

## 5. Technical Maintenance
- **Sync Status**: The sidebar shows the "Freshness" of your data. The app caches data locally for speed but syncs with the Supabase cloud every 30 minutes (or on every manual "Refresh").
- **Offline Mode**: You can view analytics and the portfolio even without internet; however, **Saving Logs** requires an active connection to verify the session.
