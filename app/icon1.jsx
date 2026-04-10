import { ImageResponse } from 'next/og';

export const dynamic = 'force-dynamic';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 300,
          background: '#6366f1',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          letterSpacing: '-0.05em',
        }}
      >
        DR
      </div>
    ),
    { ...size }
  );
}
