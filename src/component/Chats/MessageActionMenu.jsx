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
  canDelete,
  onDelete,
}) {
  const runAction = (fn, type=null) => fn?.(message, type);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-gray-700 bg-white/70 hover:bg-white"
          aria-label="Message actions"
        >
          ⋮
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="z-50 min-w-[124px] p-1">
        <DropdownMenuItem className="rounded px-2.5 py-1.5 text-xs" onSelect={() => runAction(onReply)}>
          Reply
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded px-2.5 py-1.5 text-xs" onSelect={() => runAction(onForward)}>
          Forward
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem className="rounded px-2.5 py-1.5 text-xs" onSelect={() => runAction(onEdit)}>
            Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="rounded px-2.5 py-1.5 text-xs" onSelect={() => runAction(onDelete, "me")}>
          Delete for me
        </DropdownMenuItem>
        {canDelete && (
          <DropdownMenuItem className="rounded px-2.5 py-1.5 text-xs" onSelect={() => runAction(onDelete, "everyone")}>
            Delete for everyone
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
