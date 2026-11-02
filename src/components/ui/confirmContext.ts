import { createContext, useContext } from 'react';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  /** Destructive action: red confirm button. Defaults to true. */
  danger?: boolean;
}

export const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

/** Our own confirm dialog (never the browser's): `if (await confirm({ title })) …`. */
export const useConfirm = () => useContext(ConfirmCtx);
