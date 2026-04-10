import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'DR Prepper – Wholesale Portal',
  description: 'DR Prepper Wholesale B2B Ordering Portal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DR Prepper',
  },
};

export const viewport = {
  themeColor: '#6366f1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var viewport = document.querySelector('meta[name="viewport"]');
            function resetZoom() {
              if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1');
              }
              window.scrollTo(0, 0);
            }
            window.addEventListener('orientationchange', function() {
              setTimeout(resetZoom, 100);
              setTimeout(resetZoom, 300);
            });
            window.addEventListener('resize', function() {
              if (window.visualViewport && window.visualViewport.scale !== 1) {
                resetZoom();
              }
            });
            // Register service worker for PWA
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            }
          })();
        `}} />
      </body>
    </html>
  );
}
