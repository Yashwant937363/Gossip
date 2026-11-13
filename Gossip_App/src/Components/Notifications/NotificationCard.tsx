import React from "react";
import { motion } from "motion/react";
import {
  CheckCircleFill,
  XCircleFill,
  ExclamationTriangleFill,
  InfoCircleFill,
  X,
} from "react-bootstrap-icons";
import { useDispatch } from "react-redux";
import {
  NotificationItem,
  removeNotification,
} from "../../store/slices/NotificationSlice";
import { AppDispatch } from "../../store/store";

interface NotificationCardProps {
  notification: NotificationItem;
}

export default function NotificationCard({ notification }: NotificationCardProps) {
  const dispatch = useDispatch<AppDispatch>();

  const config = {
    success: {
      Icon: CheckCircleFill,
      iconColor: "text-emerald-400",
      badgeColor: "bg-emerald-500/15 border-emerald-500/30",
      accentBorder: "border-l-emerald-500",
    },
    error: {
      Icon: XCircleFill,
      iconColor: "text-rose-400",
      badgeColor: "bg-rose-500/15 border-rose-500/30",
      accentBorder: "border-l-rose-500",
    },
    warning: {
      Icon: ExclamationTriangleFill,
      iconColor: "text-amber-400",
      badgeColor: "bg-amber-500/15 border-amber-500/30",
      accentBorder: "border-l-amber-400",
    },
    info: {
      Icon: InfoCircleFill,
      iconColor: "text-sky-400",
      badgeColor: "bg-sky-500/15 border-sky-500/30",
      accentBorder: "border-l-sky-400",
    },
  }[notification.type];

  const { Icon, iconColor, badgeColor, accentBorder } = config;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`relative flex items-start gap-3 p-3.5 rounded-2xl bg-bg10/95 backdrop-blur-xl border border-bg20 shadow-2xl border-l-4 ${accentBorder} text-textColor select-none`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeColor}`}
      >
        <Icon className={`${iconColor} text-base`} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        {notification.title && (
          <h4 className="text-sm font-semibold text-oppositeThemeMode truncate leading-snug">
            {notification.title}
          </h4>
        )}
        <p className="text-xs text-textColor opacity-90 leading-relaxed break-words mt-0.5">
          {notification.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => dispatch(removeNotification(notification.id))}
        className="text-textColor opacity-50 hover:opacity-100 hover:text-oppositeThemeMode transition-opacity p-1 -mr-1 -mt-1 cursor-pointer focus:outline-none"
        aria-label="Dismiss notification"
      >
        <X className="text-lg" />
      </button>
    </motion.div>
  );
}
