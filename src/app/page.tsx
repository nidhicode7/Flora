"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { GoogleGenerativeAI } from "@google/generative-ai";

type PlantInfo = {
  name: string;
  scientificName: string;
  family: string;
  origin: string;
  characteristics: string;
  uses: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      handleImageSelection(selectedFile);
    }
  };

  const handleImageSelection = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const startCamera = async () => {
    setShowCamera(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing the camera", err);
      }
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "captured_image.jpg", {
              type: "image/jpeg",
            });
            handleImageSelection(file);
            setShowCamera(false);
            stopCameraStream();
          }
        }, "image/jpeg");
      }
    }
  };

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const identifyPlant = async () => {
    if (!file) return;

    setLoading(true);

    const genAI = new GoogleGenerativeAI(
      process.env.NEXT_PUBLIC_GEMINI_API_KEY!
    );

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;

        const promptContent = `
          Identify this plant and provide the following information:
          1. Common name
          2. Scientific name
          3. Family
          4. Origin
          5. Key characteristics (in brief)
          6. Common uses

          Provide the information in a JSON format with the following keys:
          {
            "name": "",
            "scientificName": "",
            "family": "",
            "origin": "",
            "characteristics": "",
            "uses": ""
          }
        `;

        const result = await model.generateContent([
          promptContent,
          {
            inlineData: {
              mimeType: file.type,
              data: base64Image.split(",")[1],
            },
          },
        ]);

        const responseText = result.response.text();

        // Clean up the response text
        const cleanedResponse = responseText
          .replace(/```json\n?|\n?```/g, "")
          .trim();

        // Parse the cleaned response into a structured format
        try {
          const parsedInfo: PlantInfo = JSON.parse(cleanedResponse);
          setPlantInfo(parsedInfo);
        } catch (parseError) {
          console.error("Error parsing plant info:", parseError);
          setPlantInfo(null);
        }

        setLoading(false);
      };
    } catch (error) {
      console.error("Error identifying plant:", error);
      setPlantInfo(null);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-extrabold text-white drop-shadow-lg tracking-tight">
            🌿 Plant Identifier AI
          </h1>
          <p className="text-xl text-white/90 font-light">
            Discover the secrets of nature with our advanced plant recognition technology
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-emerald-300/30">
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center mb-8">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="relative group">
                  <label
                    className="block text-emerald-800 text-lg font-semibold mb-3 group-hover:text-emerald-600 transition-colors"
                    htmlFor="plant-image"
                  >
                    📸 Upload a Plant Image
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="plant-image"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="plant-image"
                      className="w-full flex items-center justify-center px-6 py-4 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300"
                    >
                      <span className="text-emerald-600">Choose a file or drag & drop</span>
                    </label>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-gray-500">or</span>
                </div>
                <button
                  onClick={startCamera}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-lg hover:shadow-blue-500/30"
                >
                  📷 Open Camera
                </button>
              </div>

              {showCamera && (
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="relative rounded-xl overflow-hidden shadow-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={captureImage}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 shadow-lg hover:shadow-emerald-500/30"
                  >
                    📸 Capture Image
                  </button>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            {preview && (
              <div className="mt-8 space-y-6">
                <div className="relative w-full max-w-2xl mx-auto h-96 rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    style={{ objectFit: "contain" }}
                    className="transition-all duration-300"
                  />
                </div>
                <div className="text-center">
                  <button
                    onClick={identifyPlant}
                    disabled={loading}
                    className={`
                      px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02]
                      ${loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-emerald-500/30'
                      }
                    `}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Identifying Plant...
                      </span>
                    ) : (
                      '🔍 Identify Plant'
                    )}
                  </button>
                </div>
              </div>
            )}

            {plantInfo && (
              <div className="mt-12 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-2xl shadow-inner">
                <h2 className="text-3xl font-bold mb-8 text-emerald-800 text-center">
                  🌱 Plant Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="font-bold text-lg text-emerald-700 mb-2">Common Name</h3>
                    <p className="text-gray-700">{plantInfo.name}</p>
                  </div>
                  <div className="bg-white/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="font-bold text-lg text-emerald-700 mb-2">Scientific Name</h3>
                    <p className="text-gray-700 italic">{plantInfo.scientificName}</p>
                  </div>
                  <div className="bg-white/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="font-bold text-lg text-emerald-700 mb-2">Family</h3>
                    <p className="text-gray-700">{plantInfo.family}</p>
                  </div>
                  <div className="bg-white/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="font-bold text-lg text-emerald-700 mb-2">Origin</h3>
                    <p className="text-gray-700">{plantInfo.origin}</p>
                  </div>
                  <div className="md:col-span-2 bg-white/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="font-bold text-lg text-emerald-700 mb-2">Characteristics</h3>
                    <p className="text-gray-700">{plantInfo.characteristics}</p>
                  </div>
                  <div className="md:col-span-2 bg-white/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="font-bold text-lg text-emerald-700 mb-2">Uses</h3>
                    <p className="text-gray-700">{plantInfo.uses}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
