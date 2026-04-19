import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MessageActionMenu({
  message,
  canEdit,
  onReply,
  onForward,
  onEdit,
}) {
  const runAction = (fn) => fn?.(message);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="absolute top-1 right-1 text-lg rounded-full w-7 h-7 leading-none hover:bg-black/10 flex items-center justify-center"
          aria-label="Message actions"
        >
          ⋮
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={4} className="min-w-[110px] p-0.5">
        <DropdownMenuItem className="px-2 py-1.5 text-xs" onSelect={() => runAction(onReply)}>
          Reply
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1.5 text-xs" onSelect={() => runAction(onForward)}>
          Forward
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem className="px-2 py-1.5 text-xs" onSelect={() => runAction(onEdit)}>
            Edit
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
