"use client";

import React, { useState, useRef } from "react";
import QRCode from "qrcode";

export default function QrClient() {
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef(null);
  const decodeCanvasRef = useRef(null);
  const [uploadedSrc, setUploadedSrc] = useState("");
  const [decodedPayload, setDecodedPayload] = useState(null);
  const [decodingError, setDecodingError] = useState("");

  const generate = async () => {
    setError("");
    if (!link.trim()) {
      setError("Link is required");
      return;
    }

    try {
      const payload = text ? `${link}\n\n${text}` : link;
      const opts = { margin: 1, color: { dark: "#111827", light: "#ffffff" } };
      const url = await QRCode.toDataURL(payload, opts);
      setDataUrl(url);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        await QRCode.toCanvas(canvas, payload, { width: 360, margin: 1 });
      }
    } catch (e) {
      console.error(e);
      setError("Failed to generate QR code");
    }
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const linkEl = document.createElement("a");
    linkEl.href = canvas.toDataURL("image/png");
    linkEl.download = "qrcode.png";
    linkEl.click();
  };

  const handleFile = async (file) => {
    setDecodingError("");
    setDecodedPayload(null);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedSrc(url);

    try {
      await decodeImage(url);
    } catch (e) {
      console.error(e);
      setDecodingError("Failed to decode image");
    }
  };

  const decodeImage = async (src) => {
    setDecodingError("");
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        const canvas = decodeCanvasRef.current;
        if (!canvas) {
          setDecodingError("No canvas available for decoding");
          reject(new Error("No canvas"));
          return;
        }
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          try {
            const detector = new BarcodeDetector({ formats: ["qr_code"] });
            const results = await detector.detect(canvas);
            if (results && results.length > 0) {
              const raw = results[0].rawValue;
              handleDecodedRaw(raw);
              resolve(raw);
              return;
            }
          } catch (e) {
            console.warn("BarcodeDetector failed, falling back to jsQR", e);
          }
        }

        try {
          const jsQR = (await import('jsqr')).default;
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedRaw(code.data);
            resolve(code.data);
            return;
          } else {
            setDecodingError("No QR code found in image");
            reject(new Error("No QR code found"));
            return;
          }
        } catch (e) {
          console.error(e);
          setDecodingError("Decoder not available. Install 'jsqr' (npm i jsqr) for fallback decoding in browsers without BarcodeDetector.");
          reject(e);
          return;
        }
      };
      img.onerror = (e) => {
        setDecodingError("Failed to load image for decoding");
        reject(e);
      };
      img.src = src;
    });
  };

  const handleDecodedRaw = (raw) => {
    const parts = raw.split(/\n\n/);
    const decodedLink = parts[0] || "";
    const decodedText = parts.slice(1).join('\n\n') || "";
    setDecodedPayload({ link: decodedLink, text: decodedText });
  };

  const applyDecoded = () => {
    if (!decodedPayload) return;
    setLink(decodedPayload.link);
    setText(decodedPayload.text);
    setDataUrl("");
  };

  return (
    <div className="min-h-screen bg-white flex items-center">
      <div className="container mx-auto p-6">
        <div className="bg-white rounded-lg overflow-hidden flex flex-col md:flex-row gap-2">
          <div className="md:w-1/2 p-10 bg-white">
            <h2 className="text-2xl font-semibold text-gray-800">Create QR Code</h2>
            <p className="text-sm text-gray-500 mt-2">Enter a link (required) and optional text to include.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Upload QR image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="mt-1"
                />
                {uploadedSrc && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={uploadedSrc} alt="uploaded" className="w-20 h-20 object-cover rounded" />
                    <div className="flex flex-col">
                      <div className="text-sm text-gray-600">Uploaded image</div>
                      <div className="text-sm text-gray-500">{decodingError || (decodedPayload ? 'Decoded' : 'Not decoded')}</div>
                    </div>
                  </div>
                )}
                {decodedPayload && (
                  <div className="mt-2">
                    <div className="text-sm font-medium">Decoded:</div>
                    <div className="text-sm text-gray-700 break-words">{decodedPayload.link}</div>
                    {decodedPayload.text && <div className="text-sm text-gray-500 mt-1">{decodedPayload.text}</div>}
                    <div className="mt-2">
                      <button onClick={applyDecoded} className="bg-blue-600 text-white px-3 py-1 rounded">Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Link (required)</label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full px-4 py-3 border rounded bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                  type="text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Text (optional)</label>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-4 py-3 border rounded bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional message or label"
                  type="text"
                />
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="flex gap-3">
                <button
                  onClick={generate}
                  className="bg-blue-600 text-white px-4 py-3 rounded shadow"
                >
                  Generate QR
                </button>
                <button
                  onClick={() => { setLink(""); setText(""); setDataUrl(""); setError(""); }}
                  className="bg-gray-100 text-gray-700 px-4 py-3 rounded"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px bg-gray-200 self-stretch" />

          <div className="md:w-1/2 p-10 bg-white flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                {dataUrl ? (
                  <img src={dataUrl} alt="QR code" width={220} height={220} />
                ) : (
                  <div className="w-[220px] h-[220px] bg-gray-50 flex items-center justify-center text-gray-400">
                    QR Preview
                  </div>
                )}
              </div>

              <div className="mt-6 text-center flex gap-3">
                <button
                  onClick={download}
                  className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  disabled={!dataUrl}
                >
                  Download PNG
                </button>
                <a
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  href={dataUrl || "#"}
                  download="qrcode.png"
                >
                  Download (link)
                </a>
              </div>

              <canvas ref={canvasRef} className="hidden" />
              <canvas ref={decodeCanvasRef} className="hidden" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
