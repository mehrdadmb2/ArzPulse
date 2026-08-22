// site/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ArzPulse - قیمت‌های لحظه‌ای نوبیتکس',
  description: 'مشاهده قیمت لحظه‌ای بیت‌کوین، اتریوم، تتر، نات‌کوین و طلا از نوبیتکس',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
