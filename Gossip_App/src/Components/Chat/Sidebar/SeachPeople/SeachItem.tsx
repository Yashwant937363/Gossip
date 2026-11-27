import React, { useState } from "react";
import { Check2, PersonAdd, PersonFill } from "react-bootstrap-icons";
import { useSelector } from "react-redux";
import { sendChatRequest } from "../../../../socket";
import { RootState } from "../../../../store/store";
import { notify } from "../../../../utils/notify";

interface SeachItemProps {
  uid: string;
  username: string;
  profile?: string;
}

export default function SeachItem({ profile, username, uid }: SeachItemProps) {
  const fromuid = useSelector((state: RootState) => state.user.uid);
  const friends = useSelector((state: RootState) => state.chat.friends);
  const isAlreadyFriend = friends.some((f) => f?.uid === uid);

  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handlePersonAdd = () => {
    if (isLoading || isSent || isAlreadyFriend) return;

    setIsLoading(true);
    sendChatRequest(fromuid, uid)
      .then((message) => {
        setIsSent(true);
        notify.success("Request Sent", message || "Chat request sent");
      })
      .catch((error) => {
        console.error("Error sending request:", error);
        notify.error(
          "Request Failed",
          error.message || "Failed to send request",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg15/80 border border-bg20 shadow-sm hover:border-themeColor/40 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-bg20 flex-shrink-0 flex items-center justify-center">
          {profile ? (
            <img
              src={profile}
              alt={username}
              className="w-full h-full object-cover"
            />
          ) : (
            <PersonFill className="text-xl text-textColor opacity-70" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-sm truncate">{username}</h4>
          <span className="text-[11px] opacity-60 font-mono">ID: {uid}</span>
        </div>
      </div>

      {isAlreadyFriend || isSent ? (
        <button
          type="button"
          disabled
          className="p-2 rounded-xl bg-emerald-600/90 text-white shadow-sm cursor-default ml-2 transition-all flex items-center justify-center"
          title={isAlreadyFriend ? "Already Friends" : "Request Sent"}
        >
          <Check2 className="text-base font-bold stroke-[1]" />
        </button>
      ) : (
        <button
          type="button"
          disabled={isLoading}
          onClick={handlePersonAdd}
          className={`p-2 rounded-xl ml-2 transition-all shadow-sm flex items-center justify-center ${
            isLoading
              ? "bg-themeColor/60 text-themeMode cursor-not-allowed opacity-75"
              : "bg-themeColor text-themeMode hover:scale-105 active:scale-95 cursor-pointer"
          }`}
          title="Send Chat Request"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-themeMode border-t-transparent rounded-full animate-spin" />
          ) : (
            <PersonAdd className="text-base" />
          )}
        </button>
      )}
    </div>
  );
}
