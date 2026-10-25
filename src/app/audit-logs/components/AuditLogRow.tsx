import React, { useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuditLogItem } from "../types";
import {
  getTransitionInfo,
  getSimpleExplanation,
  getItemCleanName,
} from "../utils/audit-helpers";
import { CategoryIcon } from "./CategoryIcon";

export interface AuditLogRowProps {
  item: AuditLogItem;
  onSelect: (item: AuditLogItem) => void;
}

export const AuditLogRow = React.memo(function AuditLogRow({
  item,
  onSelect,
}: AuditLogRowProps) {
  const date = useMemo(() => new Date(item.timestamp), [item.timestamp]);
  const trans = useMemo(() => getTransitionInfo(item), [item]);
  const explanation = useMemo(() => getSimpleExplanation(item), [item]);
  const itemInfo = useMemo(() => getItemCleanName(item), [item]);
  const relativeTime = useMemo(
    () => formatDistanceToNow(date, { addSuffix: true }),
    [date]
  );
  const exactTime = useMemo(() => format(date, "HH:mm:ss"), [date]);

  return (
    <tr
      onClick={() => onSelect(item)}
      className="hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30 last:border-b-0"
    >
      {/* 1. Affected Item */}
      <td className="py-3 px-4 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground border border-border">
            <CategoryIcon category={item.category} className="size-3.5" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className="font-bold text-foreground text-xs leading-tight truncate"
              title={itemInfo.name}
            >
              {itemInfo.name}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[9px] uppercase tracking-wider py-0 px-1 font-bold rounded-xs bg-muted/80 text-muted-foreground border-border shrink-0"
              >
                {itemInfo.type}
              </Badge>
              {itemInfo.slug && (
                <span className="font-mono text-[10px] text-muted-foreground truncate">
                  /{itemInfo.slug.replace(/^\//, "")}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 2. What Changed (Before ➔ After State Transition Chip) */}
      <td className="py-3 px-4 align-middle whitespace-nowrap">
        {trans.pillText ? (
          <Badge
            variant="outline"
            className="text-[11px] font-bold py-1 px-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
          >
            {trans.pillText}
          </Badge>
        ) : (
          <div className="inline-flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-muted/60 border border-border">
            <span
              className={`text-[11px] font-semibold ${
                trans.from.toLowerCase() === "published" ||
                trans.from.toLowerCase() === "active"
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : trans.from.toLowerCase() === "trash" ||
                    trans.from.toLowerCase() === "trashed"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {trans.from}
            </span>
            <ArrowRight className="size-3 text-muted-foreground shrink-0" />
            <span
              className={`text-[11px] font-bold ${
                trans.to.toLowerCase() === "published" ||
                trans.to.toLowerCase() === "active"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : trans.to.toLowerCase() === "trash" ||
                    trans.to.toLowerCase() === "trashed"
                  ? "text-amber-600 dark:text-amber-400"
                  : trans.to.toLowerCase() === "deleted"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground"
              }`}
            >
              {trans.to}
            </span>
          </div>
        )}
      </td>

      {/* 3. Simple Activity Explanation (Clean & Short) */}
      <td className="py-3 px-4 align-middle">
        <p
          className="font-medium text-foreground text-xs leading-relaxed truncate"
          title={explanation}
        >
          {explanation}
        </p>
      </td>

      {/* 4. Changed By (Actor) */}
      <td className="py-3 px-4 align-middle whitespace-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="size-7 border border-border shrink-0">
            {item.actor?.avatar && (
              <AvatarImage src={item.actor.avatar} alt={item.actor.name} />
            )}
            <AvatarFallback className="text-[10px] font-bold">
              {item.actor?.name ? item.actor.name.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground text-xs truncate">
              {item.actor?.name || "System Actor"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {item.actor?.email || "internal@system"}
            </span>
          </div>
        </div>
      </td>

      {/* 5. When */}
      <td className="py-3 px-4 align-middle whitespace-nowrap text-right text-muted-foreground text-[11px]">
        <div className="flex flex-col items-end">
          <span className="font-medium text-foreground">{relativeTime}</span>
          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
            <Clock className="size-2.5" />
            {exactTime}
          </span>
        </div>
      </td>
    </tr>
  );
});
