import React, { useEffect, useState } from "react";
import SeachItem from "./SeachItem";
import { useSelector } from "react-redux";
import RequestItem from "./RequestItem";
import { findusers } from "../../../../socket/main";
import { apiSearchUsers } from "../../../../api/client";
import { RootState } from "../../../../store/store";
import { motion, AnimatePresence } from "motion/react";

// Variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.25 },
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: { duration: 0.25, ease: "easeInOut" },
      opacity: { duration: 0.2 },
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

export default function SeachPeople() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const requests = useSelector((state: RootState) => state.user.requests);

  const query = search.trim();
  useEffect(() => {
    if (!query) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const restResult = await apiSearchUsers(query);

        if (restResult?.users) {
          setUsers(
            restResult.users.map((u: any) => ({
              uid: u.uid,
              username: u.Username || u.username,
              profile: u.ProfilePicture || u.profile || "",
            })),
          );
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setUsers([]);
      }
    }, 500);

    // Cleanup: cancel previous timer whenever search changes
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="flex flex-col gap-3 p-3 mb-2 bg-bg10 overflow-hidden"
    >
      <input
        type="text"
        placeholder="Search username or UID..."
        className="w-full px-3 py-2 text-xs rounded-xl bg-bg15 border border-bg20 text-textColor focus:outline-none focus:border-themeColor transition-colors"
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Search results */}
      <motion.div
        layout
        className="flex flex-col gap-2 max-h-48 overflow-y-auto"
      >
        <AnimatePresence mode="popLayout">
          {users.length > 0 ? (
            users.map((item) => (
              <motion.div
                key={item.uid}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <SeachItem
                  profile={item.profile || item.ProfilePicture}
                  uid={item.uid}
                  username={item.username || item.Username}
                />
              </motion.div>
            ))
          ) : (
            <motion.span
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="text-xs text-center py-2"
            >
              No users found
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Pending requests */}
      <AnimatePresence>
        {requests.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 pt-2 border-t border-bg15 overflow-hidden"
          >
            <h4 className="text-xs font-bold text-themeColor tracking-wide uppercase">
              Incoming Requests ({requests.length})
            </h4>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {requests.map((item) => (
                  <motion.div
                    key={item.uid}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <RequestItem
                      profile={item.profile}
                      uid={item.uid}
                      username={item.username}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
