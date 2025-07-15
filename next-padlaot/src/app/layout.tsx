import { AuthProvider } from '@/contexts/AuthContext';
import { AdminProvider } from '@/contexts/AdminContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Assistant } from 'next/font/google';
import './globals.css';
import MUILocalizationProvider from '@/components/MUILocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ThemeRegistry from '@/components/ThemeRegistry';

const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'פדלאות',
  description: 'מערכת ניהול משחקי פדלאות',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" className={assistant.className}>
      <body>
        <ThemeRegistry>
          <MUILocalizationProvider>
            <AuthProvider>
              <AdminProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </AdminProvider>
            </AuthProvider>
          </MUILocalizationProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
