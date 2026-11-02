import { Flag } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { useMe } from '@/features/auth/useMe';
import { ReportDialog, type ReportTarget } from '@/features/threads/ReportDialog';

/** "Report" for signed-in users; opens the report dialog for any target. */
export function ReportButton({
  targetType,
  targetId,
  compact = false,
  icon = <Flag size={15} />,
  label,
}: {
  targetType: ReportTarget;
  targetId: string;
  compact?: boolean;
  icon?: ReactNode;
  label?: string;
}) {
  const { t } = useI18n();
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  if (!me) return null;
  const text = label ?? t('common.report');
  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="text-subtle hover:text-danger rounded p-0.5"
          aria-label={text}
          title={text}
        >
          {icon}
        </button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {icon} {text}
        </Button>
      )}
      <ReportDialog
        target={open ? { type: targetType, id: targetId } : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
