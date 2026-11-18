import React from "react";
import { ImageAnalysisResult } from "@gossip/shared";

interface ImageAnalysisProps {
  description: ImageAnalysisResult;
}

export default function ImageAnalysis({ description }: ImageAnalysisProps) {
  return (
    <div className="flex flex-col gap-3 text-textColor">
      <div>
        <h3 className="text-base font-bold text-themeColor leading-tight">
          {description.title}
        </h3>
        <p className="text-xs sm:text-sm opacity-90 leading-relaxed mt-1">
          {description.description}
        </p>
      </div>

      {description.details && description.details.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-bg20">
          <span className="text-[11px] font-semibold text-themeColor uppercase tracking-wider">
            Key Elements
          </span>
          <div className="flex flex-wrap gap-1.5">
            {description.details.map((detail, index) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-lg bg-bg15 border border-bg20 text-xs opacity-90"
              >
                {detail}
              </span>
            ))}
          </div>
        </div>
      )}

      {description.mood && (
        <div className="pt-2 border-t border-bg20 text-xs opacity-85 flex items-center gap-1.5">
          <span className="font-semibold text-themeColor">Mood:</span>
          <span>{description.mood}</span>
        </div>
      )}
    </div>
  );
}
