# Forms Utils

Hjelpefunksjoner for Forms-modulen.

## Planlagte funksjoner

### 1. `form-validator.ts`
Validering av skjemadata basert på felttyper og regler.

```typescript
export function validateField(field: FormField, value: any): ValidationResult;
export function validateForm(fields: FormField[], values: Record<string, any>): ValidationResult;
```

### 2. `recurrence.ts`
RRULE-parsing for gjentakende skjemaer.

```typescript
export function parseRecurrenceRule(rule: string): RRule;
export function getNextOccurrence(rule: string): Date;
export function generateOccurrences(rule: string, count: number): Date[];
```

### 3. `pdf-export.ts`
PDF-generering av utfylte skjemaer med signatur.

```typescript
export async function generateFormPDF(submission: FormSubmission): Promise<Buffer>;
export async function generateFormPDFUrl(submissionId: string): Promise<string>;
```

### 4. `conditional-logic.ts`
Evaluering av betinget logikk (vis felt X hvis felt Y = "Ja").

```typescript
export function evaluateCondition(condition: ConditionalRule, values: Record<string, any>): boolean;
export function getVisibleFields(fields: FormField[], values: Record<string, any>): FormField[];
```

---

Implementeres når Forms-modulen bygges.

