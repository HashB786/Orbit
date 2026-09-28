import React, { useEffect, useState } from 'react';

// Crisp SVG QR code; the encoder library is loaded only when a QR code is shown
const QRCode = ({ value, size = 160, className = '' }) => {
    const [path, setPath] = useState(null);

    useEffect(() => {
        let cancelled = false;
        import('qrcode-generator').then(({ default: qrcode }) => {
            if (cancelled) return;
            const qr = qrcode(0, 'M');
            qr.addData(value);
            qr.make();
            const count = qr.getModuleCount();
            let d = '';
            for (let r = 0; r < count; r++) {
                for (let c = 0; c < count; c++) {
                    if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
                }
            }
            setPath({ d, total: count + 4 });
        }).catch(() => setPath(null));
        return () => {
            cancelled = true;
        };
    }, [value]);

    return (
        <div className={className} style={{ width: size, height: size }}>
            {path ? (
                <svg viewBox={`0 0 ${path.total} ${path.total}`} width={size} height={size} role="img" aria-label={`QR code for ${value}`} shapeRendering="crispEdges">
                    <rect width={path.total} height={path.total} fill="#ffffff" />
                    <path d={path.d} fill="#0f172a" />
                </svg>
            ) : (
                <div className="w-full h-full rounded-lg bg-white/10 animate-pulse" />
            )}
        </div>
    );
};

export default QRCode;
