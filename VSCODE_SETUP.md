# Opening This Project in VS Code

## Quick Start

### Option 1: Open in VS Code (Fastest)
```bash
# From the outputs folder
code .

# Or from anywhere
code /path/to/outputs
```

### Option 2: Open Specific Files
```bash
# Open just the dashboard
code DemoDashboard.jsx

# Open everything
code .
```

---

## What's Pre-configured

✅ **Editor Settings** (.vscode/settings.json)
- 2-space indentation
- Prettier auto-formatting on save
- TypeScript/React support enabled
- Spell checker for NetSuite terminology

✅ **Recommended Extensions** (.vscode/extensions.json)
When you open this folder, VS Code will suggest:
- Prettier (code formatter)
- ESLint (code quality)
- React Snippets (faster coding)
- GitHub Copilot (AI assist)
- GitLens (git history)

✅ **Debug Configuration** (.vscode/launch.json)
Press F5 to:
- Debug backend-server.js directly
- Use Nodemon for auto-reload
- See logs in integrated terminal

---

## After Opening in VS Code

### Step 1: Install Recommended Extensions
VS Code will show a prompt: "Recommended extensions from workspace"
→ Click "Install All" or install individually

### Step 2: Install Dependencies (Backend)
```bash
# In VS Code Terminal (Ctrl+`)
npm install
```

### Step 3: Start Backend (Optional)
Press **F5** or click "Run → Start Debugging"
→ Backend runs on http://localhost:3001

### Step 4: Open Dashboard in Your React App
In another terminal:
```bash
cd your-react-app
npm start
```

---

## Keyboard Shortcuts (VS Code)

| Shortcut | Action |
|----------|--------|
| Ctrl+` | Toggle terminal |
| Ctrl+Shift+P | Command palette |
| F5 | Start debugging |
| Ctrl+Shift+D | Debug panel |
| Ctrl+J | Toggle panel |
| Ctrl+B | Toggle sidebar |
| Ctrl+Shift+F | Find in files |

---

## File Organization in VS Code

When you open the folder, you'll see:

```
outputs/
├── DemoDashboard.jsx          ← Main component
├── backend-server.js          ← Backend API
├── netsuite-service.js        ← Service layer
├── package.json              ← Dependencies
├── .vscode/                  ← VS Code config
│   ├── settings.json         ← Editor settings
│   ├── extensions.json       ← Recommended extensions
│   └── launch.json          ← Debug config
└── 📚 Documentation files
    ├── START_HERE.md
    ├── QUICK_START.md
    ├── README.md
    └── INTEGRATION_GUIDE.md
```

---

## Useful VS Code Features

### Multi-file Editing
1. Ctrl+Click on file tabs to open in split view
2. Drag tabs between split panes

### Search Across All Files
- Ctrl+Shift+F → Search
- Type your query (e.g., "custentity")
- Results show in sidebar

### Go to Definition
- Ctrl+Click on function/variable
- Or Ctrl+G → enter line number

### Format Document
- Shift+Alt+F → Format entire file
- On save → Auto-formatted with Prettier

### Git Integration
- Ctrl+Shift+G → Open Git panel
- See changes, commit, push

---

## Running Everything in VS Code

### Terminal 1 (Backend)
```bash
# Press Ctrl+` to open terminal
npm install    # First time only
npm start      # Or press F5
# Backend runs on http://localhost:3001
```

### Terminal 2 (Frontend)
```bash
# Ctrl+Shift+` to open new terminal
cd ../your-react-app
npm start
# Frontend runs on http://localhost:3000
```

### Both Running
- Left side: Backend logs
- Right side: Frontend logs
- Open http://localhost:3000 in browser
- Dashboard connects to backend on 3001

---

## Debugging Tips

### Debug Backend Server
1. Press **F5** to start debugging
2. Add breakpoints (click line number)
3. Step through code with debug toolbar
4. View variables in left panel

### Debug Frontend
1. Open http://localhost:3000
2. Press **F12** (browser DevTools)
3. Console tab for errors
4. Network tab to see API calls

### Check API Calls
1. Open backend terminal
2. Look for console.log outputs
3. See exactly what NetSuite returns
4. Verify data structure

---

## Pro Tips

### Tip 1: Open Split View
- Open DemoDashboard.jsx on left
- Open backend-server.js on right
- See frontend + backend side-by-side

### Tip 2: Use Search
- Ctrl+Shift+F → Search "custentity"
- Find all NetSuite field references instantly

### Tip 3: Navigate Quickly
- Ctrl+P → Open file by name
- Type "dash" → jumps to DemoDashboard.jsx
- Type "backend" → jumps to backend-server.js

### Tip 4: Integrated Terminal
- Keep terminal open (Ctrl+`)
- See npm start output in real-time
- Click errors to jump to file/line

### Tip 5: Source Control
- Ctrl+Shift+G → Git panel
- Commit your customizations
- Track your changes

---

## Troubleshooting

### "Extensions not showing up"
→ Reload window: Ctrl+Shift+P → "Reload Window"

### "Terminal not opening"
→ Try Ctrl+Shift+` or View → Terminal

### "Can't find files"
→ Make sure you opened the entire folder, not just a file

### "Debugging not working"
→ Check .vscode/launch.json exists
→ Make sure backend-server.js is in root

---

## Next Steps

1. **Open folder in VS Code**: `code .`
2. **Install recommended extensions** (VS Code will prompt)
3. **Open integrated terminal**: Ctrl+`
4. **Install deps**: `npm install`
5. **Start backend**: `npm start` or press F5
6. **Start frontend**: In another terminal, `npm start`

---

## File Quick Links (Within VS Code)

- Click on any `.md` file to preview documentation
- Right-click → "Open Preview" for markdown
- Click on imports to jump to other files
- Ctrl+Click on component names to see usage

---

You're all set! Everything is configured for optimal development in VS Code. 🚀
