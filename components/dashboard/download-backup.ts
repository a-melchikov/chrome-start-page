import type { DashboardBackupDownload } from '../../storage/dashboard-backup';

export function downloadBackup({
  fileName,
  contents,
}: DashboardBackupDownload) {
  const objectUrl = URL.createObjectURL(
    new Blob([contents], { type: 'application/json' }),
  );
  const link = document.createElement('a');

  link.download = fileName;
  link.href = objectUrl;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
