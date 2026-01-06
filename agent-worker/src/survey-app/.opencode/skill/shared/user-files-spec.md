# User Files Specification

## Overview

All user-uploaded files are stored in the `user_files/` directory within the working directory. This is the primary location for any files the user uploads or references.

## Directory Structure

```
working_directory/
└── user_files/
    ├── inputs/
    │   └── research_objective.txt    # Research context
    └── [uploaded files]              # User's uploaded documents
```

## When to Search User Files

**ALWAYS search `user_files/` when the user:**

- Mentions "questionnaire", "qnr", "question", or "survey"
- References "uploaded file", "my file", "the file", "the document"
- Asks about "the data", "my data", "the input"
- Says "I uploaded", "I provided", "I shared"
- Mentions any document type: Word, PDF, Excel, text, etc.
- Asks to "read", "parse", "analyze", or "look at" a file

## How to Search User Files

### Step 1: List all files in user_files/

```bash
ls -la user_files/
```

### Step 2: Search for specific content

```bash
# Search for keywords in all files
grep -r "keyword" user_files/

# Find files by extension (include .md files!)
find user_files/ -name "*.docx" -o -name "*.pdf" -o -name "*.txt" -o -name "*.md"
```

### Step 3: Read the relevant file

```bash
# For text files
cat user_files/filename.txt

# For Word documents, use the file content directly
```

## File Type Handling

**IMPORTANT: Check for .md files FIRST - questionnaires are often converted to markdown!**

| File Type | Extensions  | How to Read                   | Priority |
| --------- | ----------- | ----------------------------- | -------- |
| Markdown  | .md         | Direct read with Read tool    | HIGH     |
| Text      | .txt        | Direct read with Read tool    | HIGH     |
| Word      | .doc, .docx | Read tool (content extracted) | MEDIUM   |
| PDF       | .pdf        | Read tool (content extracted) | MEDIUM   |
| Excel     | .xls, .xlsx | Read tool (content extracted) | LOW      |
| JSON      | .json       | Direct read with Read tool    | LOW      |
| CSV       | .csv        | Direct read with Read tool    | LOW      |

## Keyword Triggers

When user mentions these keywords, ALWAYS check `user_files/`:

### Questionnaire Keywords

- "questionnaire", "qnr", "QNR"
- "question", "questions"
- "survey", "survey questions"
- "form", "form fields"

### File Reference Keywords

- "uploaded", "upload"
- "my file", "the file", "this file"
- "document", "doc", "the doc"
- "spreadsheet", "excel"
- "pdf", "word"

### Action Keywords

- "parse", "read", "analyze"
- "look at", "check", "review"
- "use", "based on", "from"

## Examples

### Example 1: User mentions questionnaire

**User:** "Can you parse my questionnaire?"

**Action:**

1. List `user_files/` to find questionnaire files
2. Look for .md, .docx, .pdf, .txt files (prioritize .md)
3. Read the most relevant file
4. Parse and process the content

### Example 2: User references uploaded file

**User:** "Use the file I uploaded to create a survey"

**Action:**

1. `ls user_files/` to see all uploaded files
2. Identify the most recent or relevant file
3. Read the file content
4. Process according to request

### Example 3: User asks about questions

**User:** "How many questions are in my QNR?"

**Action:**

1. Search `user_files/` for questionnaire files
2. Read the questionnaire content
3. Count and report the questions

## Best Practices

1. **Always check first:** Before asking user for file location, check `user_files/`
2. **List before reading:** Always `ls user_files/` to see what's available
3. **Search broadly:** Use grep to search across all files if unsure
4. **Report findings:** Tell user what files you found before processing
5. **Handle missing files gracefully:** If no relevant file found, ask user to upload

## Important Notes

- User files persist across chat sessions for the same project
- New uploads appear in `user_files/` automatically
- The `inputs/` subdirectory contains system-generated context files
- Always use relative paths from working_directory: `user_files/filename`
