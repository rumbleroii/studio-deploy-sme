# API Implementation Guide

The survey app now supports two modes controlled by the `NEXT_PUBLIC_DEPLOYMENT` environment variable.

---

## Environment Flag

```bash
# Development/Preview Mode (default)
NEXT_PUBLIC_DEPLOYMENT=development

# Production Mode
NEXT_PUBLIC_DEPLOYMENT=production
```

---

## Modes Comparison

| Feature | Development Mode | Production Mode |
|---------|-----------------|----------------|
| **Route** | `/survey` | `/survey` |
| **Root `/` Access** | ✅ Accessible (authoring view) | ❌ Redirects to `/survey` |
| **Question URL Jumping** | ✅ Allowed (testing) | ❌ Blocked (validates access) |
| **Back Button** | ✅ Visible | ✅ Visible |
| **API Submission** | ❌ No | ✅ Yes |
| **RespondentId** | ❌ Not tracked | ✅ Tracked |
| **Database** | ❌ No | ✅ Yes |

**Note:**
- Back button is always visible in both modes.
- API submission only happens in production mode when `NEXT_PUBLIC_DEPLOYMENT=production`.
- Development mode allows local testing without database requirements.
- **Security (Root Access):** In production mode, the root `/` endpoint (questionnaire authoring view) is not accessible and automatically redirects to `/survey` to prevent respondents from seeing the survey design.
- **Security (Question Access):** In production mode, users cannot jump to arbitrary questions by manipulating the URL query parameter (e.g., changing `?q=Q1` to `?q=Q5`). Only previously visited questions or the valid next question based on survey logic are accessible. Invalid attempts redirect to the last visited question.


---

## Database Setup (Required for Production Mode)

### Prerequisites

For production mode to work, you need:
1. **MongoDB** installed and running (local or MongoDB Atlas)
2. **MONGODB_URI** environment variable configured
3. **Prisma client** generated

### Quick Setup

**1. Install MongoDB (Local Development):**
```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Linux
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**2. Configure Environment Variable:**

Add to `.env.local`:
```bash
# Local MongoDB
MONGODB_URI="mongodb://localhost:27017/survey-studio"

# OR MongoDB Atlas (cloud)
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/survey-studio"

# Production mode settings
NEXT_PUBLIC_DEPLOYMENT=production
NODE_ENV=production
```

**3. Generate Prisma Client:**
```bash
cd agent-worker/src/survey-app
npx prisma generate
```

**4. Verify Connection (Optional):**
```bash
npx prisma db push
```

### Troubleshooting

**Error: "Can't reach database server"**
- Check MongoDB is running: `brew services list | grep mongodb`
- Verify `MONGODB_URI` in `.env.local`
- For Atlas: check IP whitelist and credentials

**Error: "PrismaClient is unable to run"**
```bash
npx prisma generate
npx prisma db push
```

**Error: "Environment variable not found: MONGODB_URI"**
- Ensure `.env.local` exists in `agent-worker/src/survey-app/`
- Add `MONGODB_URI` to the file
- Restart dev server

**Submit endpoint failing:**
- Check `MONGODB_URI` is set correctly
- Run `npx prisma generate` to regenerate Prisma client
- Verify MongoDB is running and accessible
- Check browser console and server logs for specific error messages

### Database Schema

The app uses a single collection: `survey_responses`

**SurveyResponse Model:**
- `id` - MongoDB ObjectId
- `surveyId` - Survey identifier
- `projectId` - Project identifier
- `respondentId` - Unique respondent ID
- `responses` - JSON array of answers
- `status` - incomplete | complete | terminated
- `metadata` - Optional metadata (timestamps, device info)
- `submittedAt` - First submission timestamp
- `updatedAt` - Last update timestamp

### View Stored Data

**Prisma Studio (Recommended):**
```bash
npx prisma studio
# Opens at http://localhost:5555
```

**MongoDB Compass:**
- Download from mongodb.com/products/compass
- Connect to `mongodb://localhost:27017`
- Browse `survey-studio` → `survey_responses`

**mongosh CLI:**
```bash
mongosh mongodb://localhost:27017/survey-studio
db.survey_responses.find().pretty()
```

### Complete Documentation

See `DATABASE-SETUP.md` for detailed setup instructions.

---

## Files Changed

### 1. **app/page.tsx** (Updated)
- Redirects to `/survey` in production mode
- Prevents access to questionnaire authoring view for respondents
- Uses `NEXT_PUBLIC_DEPLOYMENT` environment variable to determine mode

### 2. **lib/api.ts** (New)
Consolidated all API functions:
- `submitResponses()` - Submit to `/api/submit`
- `checkHealth()` - Check `/api/health`
- `getRespondentId()`, `setRespondentId()`, `clearRespondentId()` - localStorage management
- `buildSubmitPayload()` - Helper to construct payloads
- `isProduction` - Environment flag check

### 3. **app/survey/page.tsx** (Updated)
- Clears `respondentId` on survey start (only when `isProduction === true`)

### 4. **app/survey/question/page.tsx** (Updated)
- Back button always visible (in both development and production modes)
- **Submits responses to API after each question (only when `isProduction === true`)**
- Shows "Submitting..." state during API call
- **Validates question access in production mode** - prevents URL manipulation to jump to arbitrary questions
- Only allows access to previously visited questions or the valid next question based on survey logic
- Redirects to last visited question if invalid access is attempted

### 5. **app/survey/complete/page.tsx** (Updated)
- Clears `respondentId` on mount (only when `isProduction === true`)

### 6. **app/survey/terminate/page.tsx** (Updated)
- Clears `respondentId` on mount (only when `isProduction === true`)

### 7. **app/api/submit/route.ts** (New)
- POST endpoint to save responses
- Validates required fields
- Generates `respondentId` on first submission
- Returns `respondentId` for subsequent calls

### 8. **app/api/health/route.ts** (New)
- GET endpoint for health checks
- Returns survey status and metadata

---

## API Endpoints

### POST /api/submit

**Request:**
```typescript
{
  surveyId: string;
  projectId: string;
  respondentId?: string;    // Optional on first call
  responses: ResponseSchema[];
  status: 'incomplete' | 'complete' | 'terminated';
  currentQuestionId?: string;
  visitedQuestions: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  respondentId: string;
  status: 'incomplete' | 'complete' | 'terminated';
}
```

### GET /api/health

**Response:**
```typescript
{
  status: 'healthy' | 'unhealthy';
  surveyId: string;
  timestamp: string;
  version: number;
}
```

---

## Data Flow

### Development Mode (NEXT_PUBLIC_DEPLOYMENT=development)

```
User visits /survey
  ↓
Navigate to first question
  ↓
User answers questions
  ↓
Validate responses
  ↓
Navigate between questions (with back button)
  ↓
NO API CALLS - responses stored in context only
  ↓
Show completion page
```

### Production Mode (NEXT_PUBLIC_DEPLOYMENT=production)

#### 1. Survey Start
```
User visits /survey
  ↓
clearRespondentId() called
  ↓
Navigate to first question
```

#### 2. Each Question
```
User answers question
  ↓
Validate response
  ↓
Submit to /api/submit
  ↓
Receive respondentId (first time)
  ↓
Save to localStorage
  ↓
Navigate to next question (no back button)
```

#### 3. Survey Complete/Terminate
```
Submit final response with status
  ↓
clearRespondentId()
  ↓
Show completion page
```

---

## Environment Variables

Create `.env.local` file:

```bash
# Enable production mode
NEXT_PUBLIC_DEPLOYMENT=production

# Survey configuration
NEXT_PUBLIC_SURVEY_ID=your-survey-id
NEXT_PUBLIC_PROJECT_ID=your-project-id

# Database (for API routes)
MONGODB_URI=mongodb://localhost:27017/survey-app

# Server port
PORT=3001
```

---

## Testing

### Test Development Mode (default)
```bash
# Start dev server (development mode by default)
PORT=3001 npm run dev

# Visit survey
open http://localhost:3001/survey

# Should see:
# ✅ Back button visible
# ❌ NO API calls (development mode)
# ❌ NO RespondentId in localStorage
```

### Test Production Mode
```bash
# Create .env.local with production flag
echo "NEXT_PUBLIC_DEPLOYMENT=production" > .env.local
echo "NEXT_PUBLIC_SURVEY_ID=test-survey" >> .env.local
echo "NEXT_PUBLIC_PROJECT_ID=test-project" >> .env.local

# Start dev server
PORT=3001 npm run dev

# Visit survey
open http://localhost:3001/survey

# Should see:
# ✅ Back button visible
# ✅ API calls after each question
# ✅ RespondentId in localStorage
```

### Test API Endpoints
```bash
# Test submit endpoint
curl -X POST http://localhost:3001/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "surveyId": "test",
    "projectId": "test",
    "responses": [],
    "status": "incomplete",
    "visitedQuestions": []
  }'

# Test health endpoint
curl http://localhost:3001/api/health
```

---

## Next Steps (TODO)

1. ✅ Environment flag implementation
2. ✅ API routes created
3. ✅ UI updates based on flag
4. ✅ LocalStorage management
5. ⏳ **MongoDB integration** - Add actual database connection in `/api/submit`
6. ⏳ **Dynamic surveyId/projectId** - Get from URL params instead of env vars
7. ⏳ **Error handling** - Add retry logic and better error messages
8. ⏳ **Analytics** - Track survey completion rates
9. ⏳ **Testing** - Add unit tests for API endpoints

---

## MongoDB Integration (Next)

Update `/app/api/submit/route.ts`:

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);

export async function POST(request: NextRequest) {
  // ... existing validation ...

  // Connect to MongoDB
  await client.connect();
  const db = client.db('survey-app');

  // Save or update response
  const result = await db.collection('responses').updateOne(
    { respondentId, surveyId: body.surveyId },
    {
      $set: {
        projectId: body.projectId,
        responses: body.responses,
        status: body.status,
        currentQuestionId: body.currentQuestionId,
        visitedQuestions: body.visitedQuestions,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  // ... return response ...
}
```

---

## Studio App Integration

From the main studio app, ping the deployed survey:

```typescript
// Check if survey is live
const healthResponse = await fetch('https://survey-url.com/api/health');
const health = await healthResponse.json();

if (health.status === 'healthy') {
  console.log('Survey is live and ready');
  // Show "Survey Active" status in UI
} else {
  console.error('Survey is down');
  // Show "Survey Inactive" status in UI
}
```
