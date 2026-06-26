import { useState } from 'react';
import type { ActiveUser } from '@goldensoft/core-schemas';

interface AvatarCardProps {
  user: ActiveUser;
  isSelected: boolean;
  onClick: (user: ActiveUser) => void;
}

export function AvatarCard({ user, isSelected, onClick }: AvatarCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(() => {
    return (user as any).profilePic || "/images/default-avatar.jpg";
  });

  const handleImgError = () => {
    if (imgSrc !== "/images/default-avatar.jpg") {
      setImgSrc("/images/default-avatar.jpg");
    }
  };

  return (
    <button
      type="button"
      onClick={() => onClick(user)}
      className={`
        w-[75%] aspect-square flex flex-col items-center justify-center p-5 rounded-2xl
        cursor-pointer select-none touch-manipulation
        transition-all duration-75 ease-out border text-center
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50
        active:scale-95
        ${isSelected
          ? 'bg-brand-500/5 dark:bg-brand-500/10 border-brand-500 ring-1 ring-brand-500'
          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
        }
      `}
    >
      {/* Profile Picture */}
      <div
        className={`
          w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 transition-colors duration-75
          ${isSelected 
            ? 'border-brand-500 bg-brand-500/10' 
            : 'border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800'
          }
        `}
      >
        <img
          src={imgSrc}
          alt={user.username}
          onError={handleImgError}
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      </div>

      {/* Operator Name */}
      <span
        className={`
          text-sm font-bold truncate mt-3 text-center w-full select-none tracking-wide leading-none
          ${isSelected
            ? 'text-brand-600 dark:text-brand-400 font-extrabold'
            : 'text-slate-700 dark:text-slate-200'
          }
        `}
      >
        {user.username}
      </span>

    </button>
  );
}

