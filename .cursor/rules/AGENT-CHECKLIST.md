# Agent Pre-Implementation Checklist

**⚠️ This checklist is MANDATORY before writing any code ⚠️**

## Phase 0: Read Rules Documentation (ALWAYS)

**Read these files EVERY TIME before implementation:**

- [ ] I have read `@AGENTS.md` — Core application guidelines and quick reference
- [ ] I have read `@CONVENTIONS.mdc` — Coding standards (naming, functions, patterns)

**Read these files INTELLIGENTLY based on task:**

| If working on...                          | Read this file                |
| ----------------------------------------- | ----------------------------- |
| New feature (components, hooks, stores)   | `@FEATURE_TEMPLATE.md`        |
| Forms, validation, user input             | `@FORMS.md`                   |
| Convex functions, schema, queries         | `@convex_rules.mdc`           |
| Project organization, file structure      | `@STRUCTURE_SUMMARY.md`       |
| Unsure where files should go              | `@STRUCTURE_SUMMARY.md`       |

## Phase 1: Understanding (VERIFY)

## Phase 2: Pattern Research (STUDY EXISTING CODE)

- [ ] I found 2-3 similar files in the codebase
- [ ] I analyzed their function declaration style
- [ ] I noted they DON'T use useCallback/useMemo/useEffect unnecessarily
- [ ] I will match their simplicity and style

## Phase 3: Proposal (BEFORE IMPLEMENTATION)

- [ ] I will propose my approach with code samples
- [ ] I will wait for explicit approval
- [ ] I will NOT write code until approved

## Phase 4: Implementation Standards

### Function Style (CRITICAL)
```typescript
// ✅ CORRECT - Regular function
function handleClick() {
  // ...
}

// ❌ WRONG - Arrow function with useCallback
const handleClick = useCallback(() => {
  // ...
}, [deps]);
```

### Event Handlers
```typescript
// ✅ CORRECT - Regular function defined inside component
export default function MyScreen() {
  async function handleSubmit() {
    // ...
  }
  
  return <Button onPress={handleSubmit} />
}

// ❌ WRONG - useCallback optimization
export default function MyScreen() {
  const handleSubmit = useCallback(async () => {
    // ...
  }, []);
  
  return <Button onPress={handleSubmit} />
}
```

### Avoid Premature Optimization
- NO useCallback unless specifically requested
- NO useMemo unless specifically requested
- NO useEffect unless absolutely necessary (data fetching should use Convex hooks)

## Phase 5: Verification (BEFORE SUBMITTING)

**Code Standards:**
- [ ] All functions use regular function syntax (checked against `@CONVENTIONS.mdc`)
- [ ] No unnecessary useCallback/useMemo/useEffect (per `@AGENTS.md` guidelines)
- [ ] Code matches existing patterns in similar files
- [ ] Code is simple and readable (not over-engineered)

**Task-Specific Verification:**
- [ ] If feature: Followed `@FEATURE_TEMPLATE.md` structure (hooks/, components/, types/, stores/)
- [ ] If form: Applied `@FORMS.md` patterns (React Hook Form + Zod)
- [ ] If Convex: Used validators and patterns from `@convex_rules.mdc`
- [ ] If new files: Placed in correct location per `@STRUCTURE_SUMMARY.md`

## Red Flags (If you see these, STOP)

🚩 Using `useCallback` for event handlers  
🚩 Using `useEffect` without checking if Convex hooks can do it  
🚩 Arrow functions for components or named handlers  
🚩 Code that's more complex than similar existing code  
🚩 Not checking existing patterns before implementing  
🚩 Creating new structure without checking `@STRUCTURE_SUMMARY.md`  
🚩 Writing Convex functions without validators (violates `@convex_rules.mdc`)  
🚩 Building a feature without checking `@FEATURE_TEMPLATE.md`  

---

## Intelligence Guidelines: When to Read What

**Be smart about documentation:**

### ALWAYS Read (Every Task):
- `@AGENTS.md` — 2 minutes, covers 80% of decisions
- `@CONVENTIONS.mdc` — Sections 2 (Functions) and 8 (Components) minimum

### Read When Relevant:
- **Creating a new feature?** → `@FEATURE_TEMPLATE.md` (shows exact folder structure)
- **Adding a form?** → `@FORMS.md` (React Hook Form patterns)
- **Writing Convex code?** → `@convex_rules.mdc` (validator rules, function syntax)
- **Not sure where file goes?** → `@STRUCTURE_SUMMARY.md` (file organization decisions)
- **Organizing a feature's exports?** → `@CONVENTIONS.mdc` Section 6 (Feature Index Export Patterns)

### Don't Waste Time:
- Don't read `@FORMS.md` if you're just styling a button
- Don't read `@FEATURE_TEMPLATE.md` if you're fixing a typo
- Don't read `@STRUCTURE_SUMMARY.md` if working in existing feature

**Ask yourself: "Which rules files are RELEVANT to my current task?"**

Then read those BEFORE implementing.

---

**Remember: The goal is to write code that looks like it belongs in this codebase, not to show off React optimization skills.**
