'use client';

import { Toast } from '@base-ui/react/toast';

/**
 * A standalone toast manager created outside React, so imperative,
 * non-component code (the global MutationCache callbacks, `reportError`) can
 * raise a toast without a hook.
 *
 * `'use client'` is required: the manager is instantiated at module scope, so
 * this file must never be evaluated as part of a Server Component graph.
 *
 * It is handed to `<Toast.Provider toastManager={toastManager}>` in
 * src/app/providers.tsx — without that wiring nothing is rendered.
 */
export const toastManager = Toast.createToastManager();
