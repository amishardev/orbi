
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ReactionEmoji } from '@/lib/types';

const EMOJIS: ReactionEmoji[] = ['👍', '❤️', '😂', '💀', '🔥', '😍', '🗿'];

interface ReactionPickerProps {
  children: React.ReactNode;
  onSelect: (emoji: ReactionEmoji) => void;
}

export function ReactionPicker({ children, onSelect }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  let timer: NodeJS.Timeout;

  const handleMouseEnter = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
        setIsOpen(true);
    }, 300)
  };

  const handleMouseLeave = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleEmojiSelect = (emoji: ReactionEmoji) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="transition-transform duration-200 ease-out group-hover:scale-110">
        {children}
      </div>

      <div
        className={cn(
          "absolute bottom-full mb-2 flex items-center justify-center gap-2 rounded-full bg-card border shadow-lg p-2 transition-all duration-200 ease-out",
          "origin-bottom",
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-75 translate-y-2 pointer-events-none"
        )}
      >
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiSelect(emoji)}
            className="text-3xl transition-transform duration-150 ease-out hover:scale-125 focus:outline-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
