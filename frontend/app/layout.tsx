import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deployments Dashboard',
  description: 'Internal deployment management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              if(localStorage.getItem('theme')==='dark'){
                document.documentElement.classList.add('dark');
              }
            }catch(e){}
          })()
        `}} />
      </head>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
