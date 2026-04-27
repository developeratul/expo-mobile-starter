# Form Patterns

This guide covers our patterns for building forms using React Hook Form and Zod.

---

## Table of Contents

1. [Basic Form](#basic-form)
2. [Validation Schemas](#validation-schemas)
3. [Form with Mutation](#form-with-mutation)
4. [Edit Form with Default Values](#edit-form-with-default-values)
5. [Multi-Step Forms](#multi-step-forms)
6. [Dynamic Fields](#dynamic-fields)
7. [File Uploads](#file-uploads)
8. [Form Error Handling](#form-error-handling)

---

## Basic Form

The standard pattern for a simple form:

```typescript
// features/clients/components/client-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Select, Form, FormField, FormItem, FormLabel, FormMessage } from '@design-system'

// ─────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────

const clientFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending'], {
    required_error: 'Please select a status',
  }),
})

type ClientFormValues = z.infer<typeof clientFormSchema>

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>
  onSubmit: (data: ClientFormValues) => void
  isSubmitting?: boolean
}

function ClientForm({ defaultValues, onSubmit, isSubmitting = false }: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      status: 'active',
      ...defaultValues,
    },
  })

  function handleFormSubmit(data: ClientFormValues) {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <Input placeholder="Enter client name" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <Input type="email" placeholder="client@example.com" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (optional)</FormLabel>
              <Input type="tel" placeholder="+1234567890" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export { ClientForm, type ClientFormValues, clientFormSchema }
```

---

## Validation Schemas

### Common Validation Patterns

```typescript
// lib/zod-schemas.ts
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// REUSABLE SCHEMAS
// ─────────────────────────────────────────────────────────────

export const emailSchema = z.string().email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number');

export const urlSchema = z.string().url('Please enter a valid URL');

export const dateSchema = z.string().datetime('Please enter a valid date');

// ─────────────────────────────────────────────────────────────
// OPTIONAL FIELD PATTERNS
// ─────────────────────────────────────────────────────────────

// Optional string that can be empty
export const optionalString = z.string().optional().or(z.literal(''));

// Optional email
export const optionalEmail = emailSchema.optional().or(z.literal(''));

// ─────────────────────────────────────────────────────────────
// CONDITIONAL VALIDATION
// ─────────────────────────────────────────────────────────────

// Example: Require phone if contactPreference is 'phone'
export const contactSchema = z
  .object({
    contactPreference: z.enum(['email', 'phone']),
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    data => {
      if (data.contactPreference === 'email') {
        return emailSchema.safeParse(data.email).success;
      }
      if (data.contactPreference === 'phone') {
        return phoneSchema.safeParse(data.phone).success;
      }
      return true;
    },
    {
      message: 'Please provide valid contact information for your preferred method',
      path: ['contactPreference'],
    },
  );

// ─────────────────────────────────────────────────────────────
// ASYNC VALIDATION
// ─────────────────────────────────────────────────────────────

// Check if email is unique
export function createUniqueEmailSchema(checkEmail: (email: string) => Promise<boolean>) {
  return emailSchema.refine(
    async email => {
      const isUnique = await checkEmail(email);
      return isUnique;
    },
    { message: 'This email is already registered' },
  );
}
```

### Feature-Specific Schema

```typescript
// features/clients/types/client-schemas.ts
import { z } from 'zod';
import { emailSchema, phoneSchema, optionalString } from '@/lib/zod-schemas';

export const createClientSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  notes: optionalString,
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
```

---

## Form with Mutation

Connect form to API mutation:

```typescript
// features/clients/components/create-client-modal.tsx
import { ClientForm, type ClientFormValues } from './client-form'
import { useCreateClient } from '../api/queries'
import { useClientUIStore } from '../stores/client-store'

function CreateClientModal() {
  const { isCreateModalOpen, closeCreateModal } = useClientUIStore()
  const createClient = useCreateClient()

  function handleSubmit(data: ClientFormValues) {
    createClient.mutate(data, {
      onSuccess: () => {
        closeCreateModal()
        toast.success('Client created successfully')
      },
      onError: (error) => {
        // Error toast handled globally, but you can add form-specific handling
        if (error.code === 'DUPLICATE_EMAIL') {
          // Could set form error here if needed
        }
      },
    })
  }

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={closeCreateModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Client</DialogTitle>
          <DialogDescription>
            Add a new client to your organization.
          </DialogDescription>
        </DialogHeader>

        <ClientForm
          onSubmit={handleSubmit}
          isSubmitting={createClient.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
```

---

## Edit Form with Default Values

Load existing data and update:

```typescript
// features/clients/components/edit-client-form.tsx
function EditClientForm({ clientId }: { clientId: string }) {
  const { data: client, isLoading } = useClient(clientId)
  const updateClient = useUpdateClient(clientId)
  const navigate = useNavigate()

  function handleSubmit(data: ClientFormValues) {
    updateClient.mutate(data, {
      onSuccess: () => {
        toast.success('Client updated successfully')
        navigate(`/clients/${clientId}`)
      },
    })
  }

  if (isLoading) return <FormSkeleton />
  if (!client) return <NotFound />

  return (
    <ClientForm
      defaultValues={{
        name: client.name,
        email: client.email,
        phone: client.phone ?? '',
        status: client.status,
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateClient.isPending}
    />
  )
}
```

### Resetting Form When Data Changes

```typescript
function EditClientForm({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  // Reset form when client data loads/changes
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email,
        phone: client.phone ?? '',
        status: client.status,
      });
    }
  }, [client, form]);

  // ...
}
```

---

## Multi-Step Forms

For complex forms split into steps:

```typescript
// features/onboarding/components/onboarding-form.tsx
import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'

const STEPS = ['personal', 'company', 'preferences'] as const
type Step = typeof STEPS[number]

// Combined schema for all steps
const onboardingSchema = z.object({
  // Step 1: Personal
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: emailSchema,

  // Step 2: Company
  companyName: z.string().min(1),
  companySize: z.enum(['1-10', '11-50', '51-200', '201+']),

  // Step 3: Preferences
  timezone: z.string(),
  language: z.string(),
})

type OnboardingValues = z.infer<typeof onboardingSchema>

function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState<Step>('personal')

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange', // Validate on change for better UX
  })

  const currentStepIndex = STEPS.indexOf(currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === STEPS.length - 1

  async function handleNext() {
    // Validate only current step fields
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)

    if (isValid && !isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1])
    }
  }

  function handleBack() {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1])
    }
  }

  function handleSubmit(data: OnboardingValues) {
    console.log('Final data:', data)
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        {currentStep === 'personal' && <PersonalStep />}
        {currentStep === 'company' && <CompanyStep />}
        {currentStep === 'preferences' && <PreferencesStep />}

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep}
          >
            Back
          </Button>

          {isLastStep ? (
            <Button type="submit">Complete</Button>
          ) : (
            <Button type="button" onClick={handleNext}>Next</Button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}

// Step components use useFormContext
function PersonalStep() {
  const { control } = useFormContext<OnboardingValues>()

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Name</FormLabel>
            <Input {...field} />
            <FormMessage />
          </FormItem>
        )}
      />
      {/* More fields... */}
    </div>
  )
}

function getFieldsForStep(step: Step): (keyof OnboardingValues)[] {
  const stepFields = {
    personal: ['firstName', 'lastName', 'email'],
    company: ['companyName', 'companySize'],
    preferences: ['timezone', 'language'],
  } as const

  return stepFields[step] as (keyof OnboardingValues)[]
}
```

---

## Dynamic Fields

For forms with variable number of fields:

```typescript
// features/invoices/components/invoice-form.tsx
import { useFieldArray, useForm } from 'react-hook-form'

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
})

const invoiceSchema = z.object({
  clientId: z.string().min(1),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item'),
  notes: z.string().optional(),
})

type InvoiceFormValues = z.infer<typeof invoiceSchema>

function InvoiceForm() {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: '',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
      notes: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  })

  function handleAddItem() {
    append({ description: '', quantity: 1, unitPrice: 0 })
  }

  function handleRemoveItem(index: number) {
    if (fields.length > 1) {
      remove(index)
    }
  }

  // Calculate total
  const lineItems = form.watch('lineItems')
  const total = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice),
    0
  )

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Client selector... */}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Line Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
            Add Item
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-4 items-start">
            <FormField
              control={form.control}
              name={`lineItems.${index}.description`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <Input placeholder="Description" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`lineItems.${index}.quantity`}
              render={({ field }) => (
                <FormItem className="w-24">
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`lineItems.${index}.unitPrice`}
              render={({ field }) => (
                <FormItem className="w-32">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveItem(index)}
              disabled={fields.length === 1}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Show array-level error */}
        {form.formState.errors.lineItems?.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.lineItems.root.message}
          </p>
        )}
      </div>

      <div className="text-right text-lg font-semibold">
        Total: ${total.toFixed(2)}
      </div>

      <Button type="submit">Create Invoice</Button>
    </form>
  )
}
```

---

## File Uploads

Handle file inputs in forms:

```typescript
// features/documents/components/document-upload-form.tsx
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

const uploadSchema = z.object({
  title: z.string().min(1),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File must be less than 5MB')
    .refine(
      (file) => ACCEPTED_TYPES.includes(file.type),
      'Only PDF, PNG, and JPEG files are allowed'
    ),
})

type UploadFormValues = z.infer<typeof uploadSchema>

function DocumentUploadForm() {
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
  })

  const [preview, setPreview] = useState<string | null>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue('file', file)

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreview(null)
      }
    }
  }

  async function handleSubmit(data: UploadFormValues) {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('file', data.file)

    await uploadDocument(formData)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Document Title</FormLabel>
            <Input {...field} />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormItem>
        <FormLabel>File</FormLabel>
        <Input
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
        />
        {form.formState.errors.file && (
          <p className="text-sm text-destructive">
            {form.formState.errors.file.message}
          </p>
        )}
      </FormItem>

      {preview && (
        <div className="mt-4">
          <img src={preview} alt="Preview" className="max-w-xs rounded" />
        </div>
      )}

      <Button type="submit">Upload</Button>
    </form>
  )
}
```

---

## Form Error Handling

### Server-Side Errors

```typescript
function ClientForm({ onSubmit }: Props) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
  })

  async function handleSubmit(data: ClientFormValues) {
    try {
      await onSubmit(data)
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle field-specific errors from server
        if (error.fieldErrors) {
          Object.entries(error.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof ClientFormValues, {
              type: 'server',
              message,
            })
          })
        } else {
          // Handle general error
          form.setError('root', {
            type: 'server',
            message: error.message,
          })
        }
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* Show root error at top of form */}
      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertDescription>
            {form.formState.errors.root.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Form fields... */}
    </form>
  )
}
```

### Preventing Double Submission

```typescript
function ClientForm() {
  const form = useForm<ClientFormValues>()
  const { isSubmitting } = form.formState

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Fields... */}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Saving...
          </>
        ) : (
          'Save'
        )}
      </Button>
    </form>
  )
}
```

---

## Best Practices Summary

| Do                                      | Don't                         |
| --------------------------------------- | ----------------------------- |
| Define schema separately from component | Mix schema in component       |
| Use `zodResolver` for validation        | Validate manually             |
| Handle loading state for submit button  | Allow double submission       |
| Show field-level errors                 | Only show form-level errors   |
| Reset form after successful submit      | Leave stale data in form      |
| Use `defaultValues` for edit forms      | Populate form in useEffect    |
| Use `mode: 'onChange'` for multi-step   | Wait until submit to validate |
| Separate form component from modal      | Put all logic in modal        |
