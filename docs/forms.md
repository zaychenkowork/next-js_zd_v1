# Forms

## One schema, validated twice

A zod schema in [`src/schemas/`](../src/schemas/) is the single definition. Three
consumers read it without redefining anything:

1. **react-hook-form**, through `standardSchemaResolver`, for instant feedback in
   the browser;
2. **next-safe-action**, through `.inputSchema()`, on the server — because a
   client-side check is a courtesy, not a control;
3. the **request body** type, inferred with `z.infer`.

`standardSchemaResolver` and not `zodResolver`: zod 4 implements
[Standard Schema v1](https://standardschema.dev/), which is the interface both
react-hook-form and next-safe-action now speak. One less adapter in the graph, and
next-safe-action needs no zod adapter at all (it accepts any Standard Schema
implementation).

## Validation messages are i18n keys

```ts
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(60, 'validation.maxLength'),
  email: z.string().trim().pipe(z.email('validation.email')),
});
```

The schema is shared between server and client and cannot know the user's locale.
So it emits keys. [`ControlledTextField`](../src/components/ui/TextField/ControlledTextField.tsx)
translates them at render (same exception as `ToastList` — see
[ui-kit.md](./ui-kit.md)). Labels and other copy still go through `t()` at the form.

The `as never` wart lives inside `ControlledTextField`: keys arrive as plain strings
at runtime, so the compile-time key union cannot be applied.

## The standard form

[`ProfileForm`](../src/features/profile/ProfileForm/ProfileForm.tsx) is the shape to
copy:

```tsx
const { form, action, handleSubmitWithAction } = useHookFormAction(
  updateProfileAction,
  standardSchemaResolver(updateProfileSchema),
  {
    formProps: { defaultValues: {/* from server-rendered props */} },
    actionProps: {
      onSuccess: () =>
        showToast({ titleKey: 'profile.updated', type: 'success' }),
      onError: ({ error }) => reportActionError(error),
    },
  },
);
```

`useHookFormAction` wires three things together, and the third is the one people
hand-roll badly: `validationErrors` coming back from the action are mapped onto the
matching react-hook-form fields. A server-only rule ("this email is already taken")
lands under the right input instead of in a toast.

`defaultValues` come from the server-rendered profile, so the form is populated on
first paint rather than after an effect.

## The three hooks from the adapter

`@next-safe-action/adapter-react-hook-form` exports more than the obvious one:

| Hook                           | When                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `useHookFormAction`            | The default. Wire fields with `ControlledTextField`.                                           |
| `useHookFormActionErrorMapper` | You are building the form yourself (`useForm` + `Controller`) and only want the error mapping. |
| `useHookFormOptimisticAction`  | The form should show its new value before the server confirms.                                 |

The package also ships AI-agent skills: `npx skills add next-safe-action/skills`
installs nine of them, including `safe-action-testing` and
`safe-action-tanstack-query`.

## Controlled by default

```tsx
// Default — schema keys translate inside the field
<ControlledTextField control={form.control} name="email" label={t('…')} />

// Uncontrolled — only when you need DOM-held value and will wire errors yourself
<TextField {...form.register('email')} error={…} />
```

[`ControlledTextField`](../src/components/ui/TextField/ControlledTextField.tsx)
subscribes to the field and re-renders on every change. That is the cost of getting
errors (and live values) without form-level glue. Reach for `register` when a field
must stay uncontrolled for performance or for a non-React consumer.

## Base UI's Field, with validation handed over

[`TextField`](../src/components/ui/TextField/TextField.tsx) is built from Base UI's
`Field` parts, but its own validation engine is switched off:

```tsx
<Field.Root invalid={Boolean(error)} name={name}>
  <Field.Label>{label}</Field.Label>
  <Field.Control {...controlProps} />
  <Field.Error match={Boolean(error)}>{error}</Field.Error>
</Field.Root>
```

`invalid` and `match` are the props Base UI documents as _"useful when the field
state is controlled by an external library"_. Two validation engines fighting over
one input is a class of bug worth designing out.

`TextField` still takes an already-translated `error` string — it stays
provider-free for Storybook and unit tests. `ControlledTextField` is the layer that
turns a schema key into that string.

`ref` is a plain prop: React 19 forwards it to function components without
`forwardRef`, which is what makes `{...register('email')}` work unchanged.

## Progressive enhancement

The forms here are JavaScript-driven (`onSubmit={handleSubmitWithAction}`). If you
need a form that works before hydration, pass the action to the `action` prop
instead:

```tsx
<form action={someAction}>
```

Then every field arrives as a string from `FormData`, so the schema needs
`z.coerce.*`. Note the cost: `z.coerce.number()` makes the schema's _input_ type
`unknown`, which propagates into `useOptimisticAction`'s `updateFn` and loses type
safety exactly where an off-by-one is easy to write. The cart schemas use plain
`z.number()` for that reason and are documented as such — switch them only if you
wire a bare `<form action>`.

## Multi-step flows

Do not build OTP or passkey ceremonies on Server Actions. Next dispatches actions
one at a time per client and gives them no `AbortSignal`, so a challenge that has to
round-trip serialises or hangs. Use Route Handlers — see
[mutations.md](./mutations.md) and [auth.md](./auth.md).

Base UI has an **OTP Field** component if you need the input itself.
