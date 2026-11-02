import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/ui/Modal';

/** Longer than the modal's 30ms initial-focus delay. */
const settle = () => new Promise((r) => setTimeout(r, 60));

/** A form whose state lives next to the modal, with an inline `onClose` (new on every render). */
function FormInModal({ onClose }: { onClose: (form: { a: string; b: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ a: '', b: '' });
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      <Modal
        open={open}
        onClose={() => {
          onClose(form);
          setOpen(false);
        }}
        title="Form"
      >
        <input
          aria-label="first"
          value={form.a}
          onChange={(e) => setForm({ ...form, a: e.target.value })}
        />
        <input
          aria-label="second"
          value={form.b}
          onChange={(e) => setForm({ ...form, b: e.target.value })}
        />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('keeps the cursor in the field being typed in', async () => {
    const user = userEvent.setup();
    render(<FormInModal onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await waitFor(() => expect(screen.getByLabelText('first')).toHaveFocus());

    const second = screen.getByLabelText('second');
    await user.click(second);
    await user.type(second, 'hello');
    await settle();

    expect(second).toHaveFocus();
    expect(second).toHaveValue('hello');
    expect(screen.getByLabelText('first')).toHaveValue('');
  });

  it('calls the latest onClose on Escape and gives focus back to the opener', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<FormInModal onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'open' });
    await user.click(opener);
    await waitFor(() => expect(screen.getByLabelText('first')).toHaveFocus());

    await user.type(screen.getByLabelText('first'), 'abc');
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith({ a: 'abc', b: '' });
    expect(opener).toHaveFocus();
  });
});
