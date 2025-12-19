# Performance Optimization Specification

This document defines the performance optimization requirements for the survey application to ensure fast loading times, especially when loaded in iframes.

**Reference**: Works with all survey generation and hosted survey implementations

---

## 🎯 Performance Goals

### Target Metrics (Web Vitals)
- **LCP (Largest Contentful Paint)**: < 2.5 seconds
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8 seconds
- **TTI (Time to Interactive)**: < 3.5 seconds

### Iframe Loading Requirements
- Initial render: < 1 second
- Interactive state: < 2 seconds
- Smooth navigation between pages
- No layout shifts during loading

---

## 🚀 Implemented Optimizations

### 1. Next.js Configuration Optimizations

**File**: `app/next.config.js`

**Required Settings**:

```javascript
const nextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  swcMinify: true, // Use SWC for faster minification
  compress: true,  // Enable gzip compression

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },

  // Experimental features
  experimental: {
    optimizeCss: true, // CSS optimization
    optimizePackageImports: ['lucide-react'], // Optimize icon imports
  },

  // Production optimization
  productionBrowserSourceMaps: false,

  // Webpack code splitting
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              name: 'vendor',
              test: /node_modules/,
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
}
```

**Why**:
- SWC minification is faster than Terser
- Code splitting reduces initial bundle size
- Compression reduces file transfer sizes
- Image optimization serves modern formats

---

### 2. Code Splitting & Lazy Loading

**Implementation Pattern**:

```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyComponent = lazy(() =>
  import('./HeavyComponent').then(mod => ({ default: mod.HeavyComponent }))
);

// Loading fallback
const Loader = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
    {/* ... skeleton UI ... */}
  </div>
);

// Usage with Suspense
function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**Required Lazy Loads**:

1. **Authoring View** (`app/app/page.tsx`):
   - ✅ `SurveySection` component
   - Reason: Large component with nested question renderers

2. **Question View** (`app/app/s/preview/question/page.tsx`):
   - ✅ `QuestionRenderer` component
   - Reason: Handles all question types with complex logic

**Why**:
- Reduces initial JavaScript bundle size
- Components load on-demand
- Faster Time to Interactive (TTI)
- Better perceived performance with loading states

---

### 3. Route-Based Loading States

**Files Created**:
- `app/app/loading.tsx` - Main page loading state
- `app/app/s/preview/loading.tsx` - Survey welcome loading state
- `app/app/s/preview/question/loading.tsx` - Question page loading state

**Pattern**:

```typescript
// app/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Skeleton UI that matches page structure */}
    </div>
  );
}
```

**Requirements**:
- Must match the structure of the actual page
- Use Tailwind's `animate-pulse` for loading effect
- Include all major layout elements
- Avoid layout shift when content loads

**Why**:
- Next.js automatically shows loading.tsx during navigation
- Provides instant feedback to users
- Reduces perceived loading time
- Prevents blank screen flash

---

### 4. Component Optimization Patterns

#### A. Memoization

**Use `useMemo` for expensive computations**:

```typescript
const allQuestions = useMemo(() => {
  const map = new Map<string, Question>();
  survey.sections.forEach(section => {
    section.questions.forEach(q => map.set(q.id, q));
  });
  return map;
}, [survey]);
```

**When to use**:
- Heavy data transformations
- Filtering/mapping large arrays
- Creating lookup maps
- Complex calculations

#### B. Callback Optimization

**Use `useCallback` for event handlers**:

```typescript
const handleResponseChange = useCallback((questionId: string, value: any) => {
  setResponses(prev => ({
    ...prev,
    [questionId]: value
  }));
}, []);
```

**When to use**:
- Callbacks passed to child components
- Event handlers with dependencies
- Functions passed to memoized components

#### C. Component Memoization

**Use `React.memo` for expensive renders**:

```typescript
export const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* ... */}</div>;
});
```

**When to use**:
- Components that render frequently
- Components with complex rendering logic
- List items in large lists

---

### 5. Bundle Size Optimization

#### A. Dynamic Imports

**Load features on-demand**:

```typescript
// Instead of:
import { hugeLibrary } from 'huge-library';

// Use:
const loadHugeLibrary = async () => {
  const { hugeLibrary } = await import('huge-library');
  return hugeLibrary;
};
```

#### B. Tree Shaking

**Import only what you need**:

```typescript
// ❌ Bad - imports entire library
import _ from 'lodash';

// ✅ Good - imports only specific function
import { debounce } from 'lodash-es';
```

#### C. Package Optimization

**Next.js config for package imports**:

```javascript
experimental: {
  optimizePackageImports: ['lucide-react', 'date-fns'],
}
```

---

### 6. CSS Optimization

#### A. Tailwind Purging

**Ensure unused classes are removed** (automatic in production):

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
}
```

#### B. Critical CSS

**Inline critical styles**:

```javascript
// next.config.js
experimental: {
  optimizeCss: true, // Extracts and inlines critical CSS
}
```

---

### 7. Data Loading Optimization

#### A. Avoid Unnecessary Re-renders

**Use context wisely**:

```typescript
// Split context into logical pieces
const SurveyDataContext = createContext(surveyData);
const SurveyActionsContext = createContext(surveyActions);
```

#### B. Efficient State Updates

**Batch state updates**:

```typescript
// ❌ Bad - multiple renders
setResponse(newResponse);
setValidation(newValidation);
setError(newError);

// ✅ Good - single render
setState(prev => ({
  ...prev,
  response: newResponse,
  validation: newValidation,
  error: newError,
}));
```

---

## 📋 Optimization Checklist

### When Creating/Updating Survey Components

- [ ] Lazy load heavy components with `React.lazy()`
- [ ] Wrap lazy components in `<Suspense>` with loading fallback
- [ ] Use `useMemo` for expensive computations
- [ ] Use `useCallback` for event handlers
- [ ] Create loading.tsx for route segments
- [ ] Avoid inline function definitions in JSX
- [ ] Use React.memo for frequently re-rendering components
- [ ] Import only needed functions from libraries
- [ ] Test bundle size with `npm run build`

### When Modifying Next.js Config

- [ ] Keep `swcMinify: true`
- [ ] Keep `compress: true`
- [ ] Maintain webpack splitChunks configuration
- [ ] Add new heavy packages to `optimizePackageImports`
- [ ] Keep `productionBrowserSourceMaps: false`

### When Adding New Dependencies

- [ ] Check bundle size impact: `npm run build`
- [ ] Use dynamic imports for large libraries
- [ ] Prefer tree-shakeable imports
- [ ] Consider lighter alternatives
- [ ] Add to `optimizePackageImports` if applicable

---

## 🔍 Performance Monitoring

### Development Testing

**Measure performance locally**:

```bash
# Build production version
npm run build

# Analyze bundle
npm run build -- --profile

# Serve production build
npm start
```

**Browser DevTools**:
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit for Performance
4. Target: All scores > 90

### Key Metrics to Monitor

1. **Bundle Sizes**:
   - First Load JS: < 200kb
   - Total Size: < 500kb
   - Check after each build

2. **Loading Times** (in iframe):
   - First Paint: < 1s
   - Interactive: < 2s
   - Check with slow 3G throttling

3. **Runtime Performance**:
   - No janky animations
   - Smooth scrolling
   - Fast navigation

---

## 🚫 Common Anti-Patterns to Avoid

### 1. Heavy Computations in Render

```typescript
// ❌ Bad - runs every render
function Component() {
  const data = expensiveOperation(rawData);
  return <div>{data}</div>;
}

// ✅ Good - memoized
function Component() {
  const data = useMemo(() => expensiveOperation(rawData), [rawData]);
  return <div>{data}</div>;
}
```

### 2. Unnecessary Re-renders

```typescript
// ❌ Bad - creates new object every render
<ChildComponent config={{ option: 'value' }} />

// ✅ Good - stable reference
const config = useMemo(() => ({ option: 'value' }), []);
<ChildComponent config={config} />
```

### 3. Importing Entire Libraries

```typescript
// ❌ Bad
import * as _ from 'lodash';

// ✅ Good
import debounce from 'lodash-es/debounce';
```

### 4. Not Using Loading States

```typescript
// ❌ Bad - blank screen during load
const Component = lazy(() => import('./Component'));
<Component />

// ✅ Good - shows loading
<Suspense fallback={<Loader />}>
  <Component />
</Suspense>
```

---

## 🎯 Implementation Guidelines

### For Survey Generation Skill

When generating surveys:
1. Always use lazy loading pattern for SurveySection
2. Include loading.tsx in route directory
3. Wrap heavy components in Suspense
4. Use memoization for data transformations
5. Keep bundle size in mind when adding features

### For Survey Hosted Skill

When updating hosted routes:
1. Lazy load QuestionRenderer
2. Add loading.tsx for all routes
3. Use loading states during navigation
4. Optimize form inputs for performance
5. Test iframe loading speed

### For Both Skills

1. Never remove optimization config from next.config.js
2. Always test build output: `npm run build`
3. Check bundle sizes in build output
4. Verify loading states work correctly
5. Test in slow network conditions

---

## 📚 Related Documentation

- **Next.js Performance**: https://nextjs.org/docs/app/building-your-application/optimizing
- **React Performance**: https://react.dev/reference/react/useMemo
- **Web Vitals**: https://web.dev/vitals/

---

## 🔄 Maintenance

### Regular Checks

**Monthly**:
- Run Lighthouse audit
- Check bundle sizes
- Update dependencies
- Review new Next.js optimizations

**After Major Changes**:
- Run `npm run build`
- Check First Load JS size
- Test iframe loading speed
- Verify no regressions

**Before Deployment**:
- Production build test
- Performance audit
- Bundle analysis
- Loading state verification

---

**Version**: 1.0
**Created**: December 2025
**Purpose**: Define performance optimization standards for survey application
**Status**: ✅ Implemented and enforced

**CRITICAL**: These optimizations are MANDATORY. Do not remove or modify them without documented performance testing and approval.
