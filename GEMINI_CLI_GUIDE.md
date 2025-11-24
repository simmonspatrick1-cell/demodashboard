# Gemini CLI Usage Guide

## Installation Options

### Option 1: Use npx (No Installation Required)
Run directly without installing:
```bash
npx @google/gemini-cli
```

### Option 2: Install Locally (Recommended)
Install in your project:
```bash
npm install --save-dev @google/gemini-cli
```

Then use via npx:
```bash
npx gemini
```

### Option 3: Install Globally (Requires sudo)
```bash
sudo npm install -g @google/gemini-cli
```

---

## Authentication

### First Time Setup
1. Run `gemini` (or `npx gemini`)
2. You'll be prompted to sign in with your Google account
3. This provides access to Gemini 2.5 Pro with:
   - 60 requests per minute
   - 1,000 requests per day

### Using API Key (Advanced)
For higher limits or automation:
```bash
export GEMINI_API_KEY="YOUR_API_KEY"
```

Get your API key from: https://aistudio.google.com/apikey

---

## Basic Usage

### Interactive Mode
```bash
gemini "Your question or prompt here"
```

Examples:
```bash
gemini "Explain machine learning"
gemini "Write a Python function to sort a list"
gemini "What's the difference between React and Vue?"
```

### Non-Interactive (Headless) Mode
Pipe input to Gemini CLI:
```bash
echo "What is fine-tuning?" | gemini
```

Or with file input:
```bash
cat myfile.txt | gemini "Summarize this"
```

---

## Common Use Cases

### Code Generation
```bash
gemini "Create a React component for a login form"
```

### Code Review
```bash
gemini "Review this code: $(cat myfile.js)"
```

### Documentation
```bash
gemini "Explain how this function works: $(cat utils.js)"
```

### Terminal Assistance
```bash
gemini "How do I find all files modified in the last week?"
```

---

## Features

- **File System Operations**: Read, write, and manipulate files
- **Shell Commands**: Execute terminal commands
- **Web Fetching**: Retrieve information from the web
- **Customization**: Themes, settings, and extensions

---

## Tips

1. **Use quotes** for prompts with spaces
2. **Pipe files** for longer content analysis
3. **Combine with other tools**: `gemini "..." | grep "pattern"`
4. **Save output**: `gemini "..." > output.txt`

---

## Troubleshooting

### Permission Errors
- Use `npx` instead of global install
- Or install locally: `npm install --save-dev @google/gemini-cli`

### Authentication Issues
- Make sure you're signed in with Google
- Check API key if using environment variable
- Verify API key is set: `echo $GEMINI_API_KEY`

### Rate Limits
- Free tier: 60 requests/minute, 1,000/day
- For higher limits, use API key from Google AI Studio

---

## Resources

- Official Docs: https://gemini-cli.xyz
- GitHub: https://github.com/google/gemini-cli
- Google AI Studio: https://aistudio.google.com

