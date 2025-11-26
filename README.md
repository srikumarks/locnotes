# LocNotes - Location-Based Notes App

A client-side web application for taking and recalling location-specific notes with rich text editing, scheduling capabilities, and data portability.

## Features

- **Location-aware notes** - Notes automatically appear when you're within 10 meters of where they were created
- **Location nicknames** - Give locations friendly names like "Home", "Office", or "Coffee Shop"
- **Hashtags** - Tag notes with `#hashtag-name` for easy organization and filtering
- **Location-based hashtags** - Attach hashtags to locations to auto-display all related notes
- **Scheduled notes** - Attach notes to specific dates and times (5-minute resolution)
- **Note linking** - Reference other notes using `#123` syntax
- **Full-text search** - Search across all notes with hashtag autocomplete
- **Rich text editing** - Format your notes with bold, italic, lists, links, and more
- **Export/Import** - Backup and restore your entire database as JSON
- **No backend required** - Everything runs in your browser with IndexedDB storage

---

## Getting Started

### Installation

1. Download or clone the repository
2. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
3. Grant location permission when prompted

**Important:** The app requires geolocation permissions to function properly. Make sure to allow location access when your browser prompts you.

---

## How to Use

### 1. Understanding Location Permissions

When you first open LocNotes, your browser will ask for permission to access your location. This is essential for the app to work because:
- Notes are tied to geographic coordinates
- The app shows you notes relevant to your current location
- Location accuracy is typically within 10 meters

**Tip:** For best results, enable "High Accuracy" location mode on your device.

---

### 2. Creating a Note

#### Basic Note Creation

1. Click the **"New Note"** button at the top of the page
2. Write your note content using the rich text editor
3. Click **"Save Note"**

By default, notes are attached to your current location.

#### Rich Text Editing

The Quill editor provides formatting options:
- **Bold**, *italic*, underline, strikethrough
- Headers (H1, H2, H3)
- Bullet lists and numbered lists
- Block quotes and code blocks
- Links
- Use the toolbar at the top of the editor

---

### 3. Location-Based Notes

#### Attaching Notes to Your Current Location

When creating a note, **"Attach to current location"** is checked by default. This means:
- The note is saved with your current GPS coordinates
- The note will appear whenever you're within 10 meters of this location
- You can optionally give this location a nickname

#### Adding Location Nicknames

Location nicknames help you organize and identify places:

1. When creating a note, check **"Attach to current location"**
2. Enter a nickname in the **"Location Nickname"** field (e.g., "Home", "Office", "Gym")
3. Save the note

**Important notes about nicknames:**
- Nicknames must be unique
- If you use the same nickname at the same location, it will reuse that location
- Notes will show their location nickname for easy identification
- You can create multiple notes at the same location with the same nickname

#### Viewing Location-Based Notes

- Notes automatically appear when you're at their location (within 10m radius)
- The location info panel shows your current coordinates and any matching location nickname
- Notes are sorted by creation date (newest first)

---

### 4. Scheduled Notes (Temporal Notes)

Scheduled notes appear at specific dates and times, like calendar reminders.

#### Creating a Scheduled Note

1. Click **"New Note"**
2. Check **"Schedule for specific date/time"**
3. Select the date and time using the date/time picker
4. Write your note content
5. Click **"Save Note"**

**Note:** You can combine location and scheduling - a note can be both location-based AND scheduled.

#### How Scheduled Notes Work

- **5-minute time windows:** Notes appear during the 5-minute window containing their scheduled time
  - Example: A note scheduled for 2:07 PM will appear from 2:05 PM to 2:09 PM
- **Sticky display:** Scheduled notes appear at the top of the page in a highlighted box
- **Auto-refresh:** The app checks every minute for newly active scheduled notes

#### Dismissing Scheduled Notes

When a scheduled note appears:
1. Click the **"Dismiss"** button on the sticky note
2. The note disappears from view for the current 5-minute window
3. The note is NOT deleted - it's just hidden from the current display
4. If you reload the page in a different 5-minute window with the same scheduled time, it won't appear again

**Important:** Dismissal is temporary and non-destructive. The note still exists in your database.

---

### 5. Hashtags and Tagging

LocNotes supports hashtags for organizing and categorizing your notes. Hashtags are automatically extracted and made clickable.

#### Using Hashtags in Notes

1. Simply type `#` followed by alphanumeric characters and hyphens in your note
2. Valid hashtags: `#work`, `#meeting-notes`, `#project-alpha`, `#todo2024`
3. Invalid hashtags: Purely numeric like `#123` (these are note references)

**Examples:**
```
Meeting with team about #project-alpha tomorrow
Remember to review #quarterly-report and #budget-2024
Personal thoughts on #productivity and #time-management
```

#### How Hashtags Work

- **Auto-extraction:** Hashtags are automatically detected when you save a note
- **Clickable:** All hashtags in displayed notes are clickable links
- **Case-insensitive:** `#Work` and `#work` are treated as the same hashtag
- **Stored separately:** Hashtags are indexed for fast searching

#### Clicking on Hashtags

When you click a hashtag anywhere in the app:
1. A modal opens showing all notes with that hashtag
2. Notes are sorted by creation date (newest first)
3. You can click note references or other hashtags within the filtered view

#### Attaching Hashtags to Locations

You can attach hashtags to locations to create powerful automatic filtering:

1. Click **"Manage Locations"**
2. Find the location you want to tag
3. Click **"Manage Tags"** button
4. Enter a hashtag (without the `#` symbol) and click **"Add Tag"**
5. The tag is now attached to that location

**What happens:**
- When you're at that location, ALL notes with that hashtag appear automatically
- This is in addition to notes directly attached to the location
- You can attach multiple hashtags to one location

**Example use case:**
- Attach `#work` hashtag to your office location
- All notes tagged with `#work` appear when you're at the office
- Even notes created elsewhere will show up at your office if they have `#work`

#### Removing Hashtags from Locations

1. Open **"Manage Locations"**
2. Click **"Manage Tags"** for the location
3. Click the **×** next to any hashtag to remove it

---

### 6. Search Functionality

LocNotes includes a powerful search feature with hashtag autocomplete.

#### Using the Search Box

The search box appears at the top of the app, below the action buttons.

**Full-text search:**
1. Type any text in the search box
2. Search includes:
   - Note content (the actual text)
   - Location nicknames
   - Hashtags
3. Results appear automatically (300ms debounce)
4. Search is case-insensitive

**Example searches:**
- `meeting` - finds all notes containing "meeting"
- `office` - finds notes with "office" in content or location nickname
- `budget` - finds notes mentioning budget or tagged with #budget

#### Hashtag Search with Autocomplete

Searching for hashtags provides intelligent autocomplete:

1. Type `#` in the search box
2. Continue typing the hashtag name
3. A dropdown appears with matching hashtags
4. Click any suggestion to search for that hashtag

**Example:**
- Type `#pro`
- See suggestions: `#project-alpha`, `#productivity`, `#project-beta`
- Click `#project-alpha` to see all matching notes

#### Search Results

- Results show a count: "Search results for 'query' (X found)"
- Notes are sorted by creation date (newest first)
- Sticky/scheduled notes are hidden during search
- Clear the search box to return to location-based view

#### Clearing Search

To return to the normal location-based view:
1. Clear the search box completely, or
2. Delete all text from the search box

The app will automatically refresh and show location-relevant notes.

---

### 7. Note References and Linking

You can reference other notes by their ID number using the `#` symbol.

**Important:** Note references use purely numeric IDs like `#123`, while hashtags contain letters.

#### How It Works

1. Every note has a permanent ID number (shown as `#1`, `#2`, etc.)
2. In any note, type `#` followed by a note ID (e.g., `#5`, `#42`)
3. When the note is displayed, `#5` automatically becomes a clickable link
4. Clicking the link opens that note in a modal popup

#### Example Usage

```
Today's meeting notes are in #42
See #15 for the original project requirements
Update: This issue is related to #7 and #23
```

Each of these references becomes clickable, allowing you to quickly navigate between related notes.

---

### 8. Managing Locations

#### Viewing Saved Locations

1. Click **"Manage Locations"** button
2. See a list of all saved locations with:
   - Location nickname
   - GPS coordinates
   - Attached hashtags (if any)
   - Creation date

#### Managing Location Hashtags

Each location entry has a **"Manage Tags"** button:
1. Click it to expand the hashtag management interface
2. View currently attached hashtags
3. Add new hashtags by typing and clicking "Add Tag"
4. Remove hashtags by clicking the × next to them

**Note:** Locations cannot be deleted through the UI (they're referenced by notes), but you can manage them via export/import.

---

### 9. Export and Import

#### Exporting Your Data

1. Click **"Export Data"** button
2. A JSON file is automatically downloaded with filename: `locnotes-export-[timestamp].json`
3. This file contains:
   - All your notes
   - All your locations
   - Export metadata (date, version)

**Use cases for export:**
- Backing up your data
- Transferring data to another browser/device
- Archiving old notes
- Sharing notes with others

#### Importing Data

1. Click **"Import Data"** button
2. Select a previously exported JSON file
3. Confirm the import

**Warning:** Importing will:
- **Replace all existing data** in your current database
- Clear all current notes and locations
- Load the data from the JSON file

**Best practice:** Export your current data before importing to avoid accidental data loss.

---

## Understanding the Interface

### Location Info Panel

Located at the top of the page:
- **Location status:** Shows if location is available and any matching nickname
- **Coordinates:** Your current latitude, longitude, and GPS accuracy
- Helpful for verifying the app can access your location

### Sticky Notes Section

- Appears when scheduled notes are active
- Notes are highlighted with a colored border
- Each has a "Dismiss" button
- Stays at the top of the page (sticky positioning)

### Notes List

- Shows all relevant notes based on smart proximity sorting
- **Intelligent ordering** - Notes are sorted by location-time proximity:
  1. Notes at current location scheduled for current time (highest priority)
  2. Notes at current location scheduled for neighboring 5-minute windows
  3. Notes at current location without scheduling
  4. Notes nearby (within 50-500m) with time relevance
  5. Notes matching location hashtags
- Each note displays:
  - Note ID (`#123`)
  - Location nickname (if any)
  - Scheduled time (if any)
  - Extracted hashtags
  - Creation timestamp
  - Note content with formatted text and clickable references

### Smart Proximity Sorting

LocNotes uses a sophisticated scoring algorithm to determine note relevance:

**Time Proximity:**
- Exact 5-minute window match: Highest priority (1000 points)
- Within ±10 minutes: Very high (400-500 points)
- Within ±30 minutes: High (250-400 points)
- Within ±60 minutes: Medium (130-250 points)
- Beyond 1 hour: Low priority

**Location Proximity:**
- Within 10m (exact location): Highest priority (1000 points)
- Within 50m: Very high (600-800 points)
- Within 100m: High (400-600 points)
- Within 500m: Medium (150-400 points)
- Beyond 500m: Low priority

**Hashtag Matching:**
- Each matching hashtag: +300 points
- Multiple hashtags multiply the effect

**Combined Score:**
- Time score × 1.5 + Location score × 1.2 + Hashtag score
- Notes with score > 0 are displayed
- Sorted from highest to lowest total score

---

## Understanding Note Display Order

### How Proximity Sorting Works

When you open LocNotes or the app refreshes, it calculates a relevance score for every note based on:

1. **Your current location** (GPS coordinates)
2. **The current time** (with 5-minute precision)
3. **Location hashtags** (tags attached to your current location)

### Example Scenarios

**Scenario 1: At work at 2:30 PM**
- Note A: At office, scheduled for 2:30 PM → Score: ~3700 (shown first)
- Note B: At office, no schedule → Score: ~1200 (shown second)
- Note C: Tagged #work, created at home → Score: ~300 (shown third)
- Note D: At home, no relevant hashtags → Score: 0 (not shown)

**Scenario 2: At home at 9:00 AM with #morning tag on location**
- Note A: At home, scheduled for 9:00 AM, tagged #morning → Score: ~4000 (shown first)
- Note B: At coffee shop (50m away), scheduled for 9:05 AM → Score: ~1450 (shown second)
- Note C: At home, tagged #morning → Score: ~1500 (shown third)
- Note D: At home, no schedule → Score: ~1200 (shown fourth)

**Scenario 3: Scheduled notes in neighboring time windows**
- Current time: 3:00 PM
- Note A: Scheduled for 3:00 PM → Shown in sticky section (exact match)
- Note B: Scheduled for 3:05 PM → Shown in notes list (neighbor, not dismissed)
- Note C: Scheduled for 2:55 PM → Shown if not dismissed (previous window)

### Why This Matters

This smart sorting ensures:
- **Time-sensitive notes appear first** when they're most relevant
- **Location-based context** is maintained throughout the day
- **Nearby notes** become visible as you move around
- **Hashtag organization** creates thematic groupings across locations
- **No manual sorting needed** - the app adapts to your context

---

## Tips and Best Practices

### Location Tips

1. **Indoor accuracy:** GPS accuracy can be poor indoors. The app uses a 10m radius to account for this.
2. **Consistent positions:** Stand in the same spot when creating and viewing notes at a location.
3. **Nickname strategy:** Use consistent, descriptive nicknames for frequently visited places.

### Note Organization

1. **Use hashtags:** Organize notes by topic, project, or category with hashtags
2. **Use references:** Link related notes together using `#ID` syntax
3. **Location hashtags:** Attach relevant hashtags to frequently visited locations
4. **Descriptive nicknames:** Make location nicknames clear and memorable
5. **Scheduled notes:** Use for reminders, recurring tasks, or time-sensitive information
6. **Regular exports:** Back up your data weekly if you rely on it heavily

### Hashtag Strategy

1. **Consistent naming:** Use the same hashtag format across notes (e.g., `#project-name` vs `#projectName`)
2. **Hierarchical tags:** Consider using hyphens for related tags like `#project-alpha`, `#project-beta`
3. **Location tags:** Tag locations with broad categories like `#work`, `#home`, `#travel`
4. **Combine with location:** Use both location attachment AND hashtags for maximum flexibility

### Scheduling Notes

1. **Time windows:** Remember notes appear in 5-minute windows, not exact times
2. **Future notes:** You can schedule notes far in the future
3. **Location + time:** Combine both for "when I'm at work on Monday at 9am" type notes
4. **Dismissal tracking:** Dismissed notes won't reappear in the same time window

---

## Technical Details

### Storage

- **Technology:** IndexedDB (browser database)
- **Capacity:** Typically 50MB+ depending on browser
- **Persistence:** Data persists across browser sessions
- **Privacy:** All data stays on your device; nothing is sent to servers

### Browser Compatibility

- Chrome 24+ ✓
- Firefox 16+ ✓
- Safari 10+ ✓
- Edge 79+ ✓
- Mobile browsers with geolocation support ✓

### Data Structure

**Notes contain:**
- `id` - Permanent, auto-incrementing integer
- `content` - HTML content from Quill editor
- `hashtags` - Array of extracted hashtag strings (lowercase)
- `locationId` - Reference to location (if attached)
- `locationNickname` - Display name for location
- `scheduledTime` - ISO 8601 timestamp (if scheduled)
- `createdAt` - Creation timestamp

**Locations contain:**
- `id` - Auto-incrementing integer
- `nickname` - Unique location name
- `latitude` - GPS coordinate
- `longitude` - GPS coordinate
- `hashtags` - Array of hashtags attached to this location
- `createdAt` - Creation timestamp

### Distance Calculation

The app uses the **Haversine formula** to calculate distances between coordinates:
- Accounts for Earth's curvature
- Accurate for short distances (like the 10m radius used here)
- Distance calculated in meters

---

## Troubleshooting

### Location not working

**Problem:** "Location permission denied or unavailable"

**Solutions:**
1. Check browser location permissions in settings
2. Ensure location services are enabled on your device
3. Try using HTTPS (some browsers require it for geolocation)
4. Check if your device has GPS/location hardware

### Notes not appearing

**Problem:** Notes don't show up at a location

**Possible causes:**
1. **GPS drift:** You might be slightly outside the 10m radius
2. **Location accuracy:** Check the accuracy value in the location info panel
3. **Wrong location:** Verify the coordinates match using "Manage Locations"
4. **Not attached to location:** Check if the note has a location ID

**Solutions:**
- Move around the location slightly
- Recreate the note if GPS was inaccurate when first created
- Export data to check note details

### Scheduled notes not showing

**Problem:** Scheduled note doesn't appear at the right time

**Possible causes:**
1. **Time window:** Note only appears in 5-minute windows
2. **Already dismissed:** You dismissed it in this time window
3. **Wrong timezone:** Check your system time
4. **Page not refreshed:** The app checks every minute, wait up to 60 seconds

**Solutions:**
- Wait for the next 5-minute window
- Check your system clock
- Reload the page

### Import/Export issues

**Problem:** Import fails with error message

**Solutions:**
1. Verify the JSON file is valid (not corrupted)
2. Check it was exported from LocNotes (has correct structure)
3. Try exporting fresh data and comparing file structures
4. Check browser console for specific error messages

---

## Privacy and Security

### What data is collected?

**None.** LocNotes is completely client-side:
- No data is sent to any server
- No analytics or tracking
- No network requests (except loading CDN libraries)

### Where is my data stored?

- **IndexedDB** in your browser's local storage
- Specific to the browser and device you're using
- Not synchronized across devices (unless you manually export/import)

### How secure is my data?

- Data is as secure as your device and browser
- Use device lock screens and browser profiles for protection
- Export files are unencrypted JSON - protect them accordingly
- Use HTTPS when hosting to prevent man-in-the-middle attacks

---

## Keyboard Shortcuts

### Editor Shortcuts (Quill)

- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + U` - Underline
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo

---

## Limitations

1. **No sync:** Data doesn't sync across devices automatically
2. **No cloud backup:** You must manually export to back up
3. **No note deletion:** Notes cannot be deleted via UI (by design)
4. **Browser-specific:** Data is stored per browser; switching browsers requires export/import
5. **Single user:** Designed for personal use, not multi-user scenarios
6. **No note editing:** Notes cannot be edited after creation (by design)

---

## Frequently Asked Questions

### Can I use LocNotes offline?

Yes, once loaded, the app works offline. However:
- You need to load it at least once while online
- GPS may work better with an internet connection (for assisted GPS)

### What happens if I clear my browser data?

**Your notes will be deleted.** IndexedDB is part of browser storage. Always export your data before:
- Clearing browser data
- Uninstalling the browser
- Using "private/incognito" mode (data won't persist)

### Can I edit existing notes?

Not currently. This is by design to maintain note integrity and permanent IDs. Future versions may add edit functionality with revision tracking.

### Can I delete notes?

Not through the UI. This is intentional - notes are meant to be permanent records. You can:
- Export your data
- Manually edit the JSON file to remove notes
- Import the edited data

### How do I move my notes to another device?

1. Export on device A
2. Transfer the JSON file to device B (email, USB, cloud storage, etc.)
3. Open LocNotes on device B
4. Import the JSON file

### Can multiple notes have the same location nickname?

Yes! The nickname is just a label. Multiple notes can share the same location nickname, and they'll all appear when you're at that location.

### What happens if I schedule a note in the past?

The note is saved but won't appear as a sticky note (since the time has passed). It will still be attached to its location if you set one.

### How do hashtags differ from note references?

- **Hashtags:** Contain letters and/or hyphens (e.g., `#work`, `#project-alpha`)
- **Note references:** Purely numeric (e.g., `#123`, `#42`)
- Both use the `#` symbol but serve different purposes
- The app automatically distinguishes between them

### Can I search for partial hashtags?

Yes! The search box supports partial matching:
- Type `#pro` to find `#project`, `#productivity`, `#problem`
- Autocomplete suggestions appear as you type
- Click any suggestion to search for that exact hashtag

### What happens when I attach a hashtag to a location?

When you attach hashtags to a location:
1. All notes with those hashtags appear when you're at that location
2. This works even if the note was created elsewhere
3. Multiple locations can have the same hashtag attached
4. You can attach multiple hashtags to one location

**Example:** If you tag your office with `#work`, all notes tagged `#work` will show up when you're at the office, regardless of where they were created.

---

## Contributing and Feedback

This is an open-source project. Feel free to:
- Report bugs
- Suggest features
- Submit improvements
- Fork and modify for your needs

---

## Version History

**Version 2.0** (Current)
- Smart proximity-based sorting (location + time + hashtags)
- Hashtag support with auto-extraction
- Location-based hashtag filtering
- Full-text search with autocomplete
- Hashtag attachment to locations
- Intelligent note relevance scoring
- Multi-factor note ordering (time, distance, tags)
- Improved note organization and discovery

**Version 1.0**
- Initial release
- Location-based notes (10m radius)
- Location nicknames
- Scheduled notes (5-minute resolution)
- Note references (#ID linking)
- Rich text editing (Quill)
- Export/Import JSON
- Non-destructive dismissal

---

## License

This project is provided as-is for personal and educational use.

---

## Credits

- **PicoCSS** - Minimal CSS framework
- **Quill** - Rich text editor
- **IndexedDB** - Browser database API
- **Geolocation API** - Browser location services

---

**Happy note-taking! 📝📍**
