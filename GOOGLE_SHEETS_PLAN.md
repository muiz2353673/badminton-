# Google Sheets Integration Plan

## Quick summary

1. Create a Google Sheet with headers (Timestamp, Full Name, Email, etc.)
2. Add the Apps Script (Extensions → Apps Script) — paste the code below
3. Deploy as Web app (Deploy → New deployment → Web app)
4. Copy the Web app URL and paste it into `index.html` as `GOOGLE_SCRIPT_URL`

---

## Overview

Use Google Sheets to collect registration data from your tournament website. No backend server needed — everything runs through Google Apps Script.

---

## Step 1: Create Your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it e.g. **"North London Tournament – Registrations March 2026"**
3. In **Sheet1**, add these column headers in row 1:

   | A | B | C | D | E | F | G | H |
   |---||---|-------|-------|-------|-------|-------|-------|
   | Timestamp | Full Name | Email | Phone | Age Group | Event | Partner Name | Standard | Notes |

4. (Optional) Freeze row 1: View → Freeze → 1 row
5. (Optional) Format row 1 as bold

---

## Step 2: Create the Apps Script

1. In your Google Sheet: **Extensions → Apps Script**
2. Delete any default code and paste this:

```javascript
var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(CORS_HEADERS);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      new Date(),
      data.fullName || '',
      data.email || '',
      data.phone || '',
      data.ageGroup || '',
      data.category || '',
      data.partner || '',
      data.standard || '',
      data.notes || ''
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(CORS_HEADERS);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(CORS_HEADERS);
  }
}
```

3. Save (Ctrl+S / Cmd+S) and name the project e.g. **"Tournament Form Handler"**

---

## Step 3: Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon next to "Select type" → **Web app**
3. Settings:
   - **Description:** Tournament registration form
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. **Authorize** when prompted (choose your Google account)
6. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/xxxxx/exec`)

---

## Step 4: Update Your Website

1. Open `index.html` and find the line near the top of the `<script>` block:
   ```javascript
   const GOOGLE_SCRIPT_URL = '';  // e.g. 'https://script.google.com/...'
   ```
2. Paste your Web app URL between the quotes:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/xxxxx/exec';
   ```
3. Save the file. The form will now send: fullName, email, phone, ageGroup, category, partner, standard, notes

---

## Step 5: Test

1. Open your website
2. Fill and submit the registration form
3. Refresh your Google Sheet — a new row should appear

---

## Data Flow

```
User fills form → Clicks Submit → JavaScript sends data to your Apps Script URL
                                                    ↓
                                    Apps Script appends row to your Sheet
                                                    ↓
                                    Success message shown to user
```

---

## Tips

- **Backup:** Duplicate the sheet before each tournament
- **View only:** Share the sheet as "View only" with helpers if needed
- **Export:** File → Download → Excel/CSV for offline use
- **Filtering:** Use Data → Create a filter to sort by Age Group, Event, etc.
- **New tournament:** Duplicate the sheet, clear data, update the she etname

---

## Security Note

- The Web app URL allows **anyone** to add rows. There is no authentication.
- For a public registration form this is fine — you want anyone to register.
- To reduce spam, you can add simple checks in the script (e.g. valid email format, required fields).

---

## Future Enhancements (Optional)

1. **Email confirmation** — Script sends a confirmation email to the registrant
2. **Duplicate check** — Script rejects if same email already registered
3. **Capacity limits** — Script checks if an event is full before accepting
4. **Multiple sheets** — One sheet per tournament or per age group
