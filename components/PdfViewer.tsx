"use client";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export default function PdfViewer({ url }: { url: string }) {
    const plugin = defaultLayoutPlugin();
    return (
        <div className="h-full w-full">
            <Worker workerUrl="/pdf.worker.min.js">
                <Viewer fileUrl={url} plugins={[plugin]} />
            </Worker>
        </div>
    );
}