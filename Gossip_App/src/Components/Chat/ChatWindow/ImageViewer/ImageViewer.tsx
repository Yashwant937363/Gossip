import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronCompactUp, Stars, X } from "react-bootstrap-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import ImageAnalysis from "./ImageAnalysis";
import { ImageAnalysisResult } from "@gossip/shared";
import { apiAnalyzeImage } from "../../../../api/client";

export default function ImageViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = (location.state as { message?: string }) || {};
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [description, setDescription] = useState<ImageAnalysisResult | null>(
    null,
  );
  const [isPending, setPending] = useState(false);

  const closeImage = () => {
    navigate(-1);
  };

  const getDescription = async () => {
    if (!message) return;
    setPending(true);
    try {
      const response = await apiAnalyzeImage({ url: message });
      setDescription(response);
    } catch (err) {
      console.error("Image analysis failed:", err);
    } finally {
      setPending(false);
    }
  };

  const handleOpenDescription = () => {
    const nextState = !isDrawerOpen;
    setDrawerOpen(nextState);
    if (nextState && !description && !isPending) {
      getDescription();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between items-center overflow-hidden">
      {/* Top bar with Close button */}
      <div className="w-full flex justify-between items-center p-4 z-30 shrink-0">
        <button
          type="button"
          onClick={closeImage}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all cursor-pointer shadow-lg active:scale-95"
        >
          <X className="text-xl" />
          <span>Close</span>
        </button>
      </div>

      {/* Main Image View - min-h-0 ensures it resizes smoothly without bounce */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4 overflow-hidden">
        {message ? (
          <img
            src={message}
            alt="Expanded view"
            className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl select-none"
          />
        ) : (
          <span className="text-white opacity-60">No image loaded</span>
        )}
      </div>

      {/* AI Description Drawer */}
      <div className="w-full max-w-xl z-30 flex flex-col items-center shrink-0">
        <button
          type="button"
          onClick={handleOpenDescription}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-t-2xl bg-bg10 border border-b-0 border-bg20 text-textColor hover:bg-bg15 transition-all cursor-pointer shadow-xl font-medium text-xs"
          title="Toggle AI Image Analysis"
        >
          <Stars className="text-themeColor text-sm" />
          <span>AI Analysis</span>
          <motion.div
            animate={{ rotate: isDrawerOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronCompactUp className="text-lg" />
          </motion.div>
        </button>

        <motion.div
          initial={false}
          animate={{
            height: isDrawerOpen ? "auto" : 0,
            opacity: isDrawerOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="w-full bg-bg10/95 backdrop-blur-md border-t border-bg20 overflow-hidden rounded-t-2xl shadow-2xl"
        >
          <div className="p-4 max-h-[45vh] overflow-y-auto">
            {description ? (
              <ImageAnalysis description={description} />
            ) : isPending ? (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-2 text-textColor opacity-70">
                <div className="w-6 h-6 border-2 border-themeColor border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">
                  Analyzing image with AI Vision model...
                </span>
              </div>
            ) : (
              <div className="py-4 text-center text-xs opacity-60">
                Click to generate AI image analysis
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
