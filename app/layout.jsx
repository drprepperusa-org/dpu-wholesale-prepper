import './globals.css';

export const metadata = {
  title: 'DR Prepper \u2013 Wholesale Portal',
  description: 'DR Prepper Wholesale B2B Ordering Portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
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
                viewport.setAttribute('content', 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
              }
              document.body.style.zoom = 1;
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
          })();
        `}} />
      </body>
    </html>
  );
}
