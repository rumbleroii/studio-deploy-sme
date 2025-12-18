# Survey Data Architecture

This document defines how survey data is stored, accessed, and managed in both development and production environments.

---

## 🎯 Purpose

Define the data storage patterns for surveys, covering:
- Development approach (TypeScript files)
- Production approach (Database)
- Single source of truth pattern
- Data flow between authoring and hosted views
- Migration strategies

---

## 📦 Two Approaches

### Approach 1: TypeScript Files (Development/Simple)

**Best for:**
- ✅ Development and testing
- ✅ Single-survey applications
- ✅ Static surveys that don't change often
- ✅ Version-controlled survey content

### Approach 2: Database (Production/Scalable)

**Best for:**
- ✅ Multiple surveys
- ✅ Runtime survey creation/editing
- ✅ Survey versioning
- ✅ User-generated surveys
- ✅ Draft/published workflows

---

## 🔧 Approach 1: TypeScript Files

### Directory Structure

```
survey-app/
├── data/
│   ├── sample-survey.ts          # Survey data
│   ├── customer-feedback.ts      # Another survey (if needed)
│   └── index.ts                  # Export all surveys
├── types/
│   └── survey.ts                 # TypeScript types
└── app/
    ├── page.tsx                  # Authoring view (imports survey)
    └── s/[surveyId]/
        └── page.tsx              # Hosted view (imports survey)
```

### Implementation

**Step 1: Create Survey Data File**

```typescript
// data/sample-survey.ts
import { Survey } from '../types/survey';

export const sampleSurvey: Survey = {
  id: 'sample-business-wireless-2025',
  metadata: {
    title: 'Sample Business Wireless Add-On Services Study',
    description: 'Understanding preferences for business wireless add-on services',
    objectives: [
      'Evaluate interest in new add-on service offerings',
      'Understand pricing sensitivity for bundled services',
      'Identify key drivers and barriers to adoption'
    ],
    audience: {
      description: 'Business decision makers with company wireless plans',
      sampleSize: 500,
      quotas: [
        'Verizon customers: 250',
        'Non-Verizon customers: 250'
      ]
    },
    version: 1
  },
  sections: [
    {
      id: 'screener',
      title: 'Screener',
      description: 'Qualification questions',
      questions: [
        {
          id: 'S1',
          type: 'single_choice',
          text: 'Are you involved in making decisions about your company\'s wireless service provider?',
          required: true,
          options: [
            { id: 1, label: 'Yes, I am the primary decision maker', value: 'primary' },
            { id: 2, label: 'Yes, I am involved in the decision', value: 'involved' },
            { id: 3, label: 'No, I am not involved', value: 'not_involved' }
          ],
          logic: [
            {
              action: 'terminate',
              when: { operator: 'eq', left: 'S1', right: 'not_involved' },
              destination: 'TERMINATE'
            }
          ]
        }
        // ... more questions
      ]
    }
    // ... more sections
  ]
};
```

**Step 2: Use in Authoring View**

```typescript
// app/page.tsx (Authoring/Design View)
import { sampleSurvey } from '../data/sample-survey';
import { SurveySection } from '../components/SurveySection';

export default function HomePage() {
  const survey = sampleSurvey; // Direct import
  
  return (
    <div>
      <h1>{survey.metadata.title}</h1>
      
      {survey.sections.map(section => (
        <SurveySection key={section.id} section={section} />
      ))}
    </div>
  );
}
```

**Step 3: Use in Hosted Survey**

```typescript
// app/s/[surveyId]/page.tsx (Hosted Survey)
import { sampleSurvey } from '../../../data/sample-survey';
import { WelcomeScreen } from '../../../components/WelcomeScreen';

export default function SurveyWelcomePage() {
  const survey = sampleSurvey; // Same direct import
  
  return <WelcomeScreen survey={survey} />;
}
```

### Single Source of Truth Pattern

**Key Principle:** One file updates both views automatically

```
data/sample-survey.ts (SINGLE SOURCE)
        ↓                    ↓
Authoring View          Hosted Survey
(Design Mode)           (Respondent Experience)
    ↓                        ↓
Both show same      Both use same
questions,          questions,
metadata,           logic,
and logic           and flow
```

**What this means:**
- ✅ Add a question → appears in both views
- ✅ Update logic → evaluates in both views
- ✅ Change text → updates everywhere
- ✅ No sync issues
- ✅ Type-safe with TypeScript

### Benefits

**Development Speed:**
- No database setup required
- Instant hot-reload in dev mode
- Easy to test and iterate

**Type Safety:**
- TypeScript validates structure
- Autocomplete in IDE
- Compile-time error checking
- Prevents invalid surveys

**Version Control:**
- Git tracks all changes
- Easy rollback
- Diff changes clearly
- Code review surveys

**Simplicity:**
- No API calls needed
- No database queries
- Direct imports
- Zero latency

### Limitations

**Not suitable for:**
- ❌ Multiple different surveys
- ❌ User-generated surveys
- ❌ Runtime survey editing
- ❌ Survey versioning (without code deploy)
- ❌ A/B testing surveys
- ❌ Survey analytics dashboard

**Requires:**
- Code deployment to update surveys
- Developer to modify TypeScript
- Rebuild/redeploy for changes

### When to Use

**Perfect for:**
- Development and testing
- Proof of concepts
- Single-survey applications
- Internal company surveys
- Fixed research studies
- Demos and prototypes

---

## 🗄️ Approach 2: Database Storage

### Architecture

```
Database (PostgreSQL/MongoDB)
    ↓
Surveys Table/Collection
    ↓
getSurvey(surveyId) function
    ↓
Both Views fetch data
```

### Implementation

**Step 1: Database Schema**

```typescript
// Prisma schema example
model Survey {
  id          String    @id @default(cuid())
  title       String
  description String?
  metadata    Json
  sections    Section[]
  questions   Question[]
  published   Boolean   @default(false)
  version     Int       @default(1)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Question {
  id          String   @id
  surveyId    String
  survey      Survey   @relation(fields: [surveyId], references: [id])
  type        String
  text        String
  required    Boolean  @default(false)
  options     Json?
  logic       Json?
  order       Int
}
```

**Step 2: Data Access Layer**

```typescript
// lib/surveys.ts
import { prisma } from './prisma';

export async function getSurvey(surveyId: string): Promise<Survey | null> {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      sections: {
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });
  
  if (!survey) return null;
  
  // Transform database format to Survey type
  return transformToSurvey(survey);
}

export async function getAllSurveys(): Promise<Survey[]> {
  const surveys = await prisma.survey.findMany({
    where: { published: true }
  });
  
  return surveys.map(transformToSurvey);
}

export async function createSurvey(data: CreateSurveyInput): Promise<Survey> {
  const survey = await prisma.survey.create({
    data: {
      ...data,
      version: 1
    }
  });
  
  return transformToSurvey(survey);
}

export async function updateSurvey(
  surveyId: string,
  data: UpdateSurveyInput
): Promise<Survey> {
  const survey = await prisma.survey.update({
    where: { id: surveyId },
    data
  });
  
  return transformToSurvey(survey);
}
```

**Step 3: Use in Components**

```typescript
// app/page.tsx (Authoring View)
import { getSurvey } from '../lib/surveys';

export default async function HomePage() {
  const survey = await getSurvey('verizon-2025');
  
  if (!survey) {
    return <div>Survey not found</div>;
  }
  
  return (
    <div>
      <h1>{survey.metadata.title}</h1>
      {/* Render survey */}
    </div>
  );
}
```

```typescript
// app/s/[surveyId]/page.tsx (Hosted Survey)
import { getSurvey } from '../../../lib/surveys';
import { notFound } from 'next/navigation';

export default async function SurveyWelcomePage({
  params
}: {
  params: { surveyId: string }
}) {
  const survey = await getSurvey(params.surveyId);
  
  if (!survey || !survey.published) {
    notFound();
  }
  
  return <WelcomeScreen survey={survey} />;
}
```

### Benefits

**Scalability:**
- Handle thousands of surveys
- Multiple users creating surveys
- Concurrent respondents
- Large-scale deployments

**Flexibility:**
- Create surveys at runtime
- Update without code deployment
- Survey versioning
- Draft/published workflows
- A/B testing

**Features:**
- Admin UI for survey creation
- Survey templates
- Response analytics
- Export/import surveys
- Survey duplication

### Limitations

**Complexity:**
- Requires database setup
- More code to maintain
- Migration scripts needed
- Backup/restore procedures

**Performance:**
- Database queries add latency
- Caching needed for scale
- Connection pooling required

### When to Use

**Perfect for:**
- Production applications
- Multiple surveys
- Survey builder applications
- SaaS survey platforms
- Research platforms
- Marketing tools

---

## 🔄 Migration Path

### From TypeScript Files → Database

**Step 1: Extract Survey Data**

```typescript
// scripts/migrate-survey.ts
import { sampleSurvey } from '../data/sample-survey';
import { createSurvey } from '../lib/surveys';

async function migrateSurvey() {
  await createSurvey(sampleSurvey);
  console.log('Survey migrated to database');
}

migrateSurvey();
```

**Step 2: Update Imports**

```typescript
// Before
import { sampleSurvey } from '../data/sample-survey';
const survey = sampleSurvey;

// After
import { getSurvey } from '../lib/surveys';
const survey = await getSurvey('sample-2025');
```

**Step 3: Add Error Handling**

```typescript
const survey = await getSurvey(params.surveyId);

if (!survey) {
  notFound(); // Next.js 404
}

if (!survey.published) {
  return <div>Survey not available</div>;
}
```

### Hybrid Approach

You can use both approaches simultaneously:

```typescript
// lib/surveys.ts
import { sampleSurvey } from '../data/sample-survey';

export async function getSurvey(surveyId: string): Promise<Survey | null> {
  // Try database first
  const dbSurvey = await fetchFromDatabase(surveyId);
  if (dbSurvey) return dbSurvey;

  // Fallback to TypeScript files
  if (surveyId === 'sample-2025') {
    return sampleSurvey;
  }
  
  return null;
}
```

---

## 📊 Comparison

| Feature | TypeScript Files | Database |
|---------|------------------|----------|
| Setup Time | ⚡ Instant | ⏱️ Hours |
| Type Safety | ✅ Full | ⚠️ Partial |
| Hot Reload | ✅ Yes | ❌ No |
| Runtime Updates | ❌ No | ✅ Yes |
| Multiple Surveys | ⚠️ Limited | ✅ Unlimited |
| Version Control | ✅ Git | ⚠️ Migrations |
| User Creation | ❌ No | ✅ Yes |
| Scaling | ⚠️ Limited | ✅ Excellent |
| Complexity | ⚡ Simple | ⚠️ Complex |
| Best For | Dev/Testing | Production |

---

## 🎯 Recommendations

### For Your Current Setup

**You're using TypeScript files** - This is perfect because:
- ✅ Single survey (Verizon)
- ✅ Development/testing phase
- ✅ Need fast iteration
- ✅ Full type safety
- ✅ Version controlled

**Keep using TypeScript files until:**
- You need multiple different surveys
- Non-developers need to create surveys
- You need runtime survey updates
- You're ready for production deployment

### Migration Triggers

**Migrate to database when you need:**
1. More than 3-5 different surveys
2. Survey creation UI for non-developers
3. A/B testing different survey versions
4. Survey analytics dashboard
5. Multi-tenant survey platform
6. Scheduled survey publishing

---

## 💡 Best Practices

### TypeScript Files Approach

**Do:**
- ✅ Use clear naming (survey-name.ts)
- ✅ Export typed objects
- ✅ Validate with TypeScript
- ✅ Keep one survey per file
- ✅ Document changes in git commits

**Don't:**
- ❌ Mix multiple surveys in one file
- ❌ Use `any` types
- ❌ Skip type definitions
- ❌ Forget to export

### Database Approach

**Do:**
- ✅ Version your surveys
- ✅ Cache frequently accessed surveys
- ✅ Validate before saving
- ✅ Handle migration errors
- ✅ Backup regularly

**Don't:**
- ❌ Store logic as strings
- ❌ Skip validation
- ❌ Fetch on every render
- ❌ Forget indexes

---

## 📚 Related Documentation

- **survey-runtime-spec.md** - How surveys are rendered
- **survey-routes-spec.md** - Route structure
- **survey-implementation-guide.md** - Step-by-step setup
- **IMPLEMENTATION-SUMMARY.md** - Complete overview

---

**Version**: 1.0  
**Created**: December 17, 2025  
**Purpose**: Document data storage patterns for surveys  
**Status**: ✅ Complete and ready to use

