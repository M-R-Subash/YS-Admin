import React, { useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowRight, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuditLogItem } from "../types";
import {
  getTransitionInfo,
  getSimpleExplanation,
  getItemCleanName,
} from "../utils/audit-helpers";
import { CategoryIcon } from "./CategoryIcon";

export interface AuditLogMobileCardProps {
  item: AuditLogItem;
  onSelect: (item: AuditLogItem) => void;
}

export const AuditLogMobileCard = React.memo(function AuditLogMobileCard({
  item,
  onSelect,
}: AuditLogMobileCardProps) {
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
    <div
      onClick={() => onSelect(item)}
      className="p-3 bg-card hover:bg-muted/40 border border-border/70 rounded-xl flex flex-col gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
    >
      {/* 1. Header Row: Category Icon + Item Title & Badge on Left, Time on Right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground border border-border">
            <CategoryIcon category={item.category} className="size-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="font-bold text-foreground text-xs leading-tight truncate"
              title={itemInfo.name}
            >
              {itemInfo.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
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

        {/* Time Stamp */}
        <div className="flex flex-col items-end shrink-0 text-right">
          <span className="font-semibold text-foreground text-[11px] whitespace-nowrap">
            {relativeTime}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 whitespace-nowrap">
            <Clock className="size-2.5" />
            {exactTime}
          </span>
        </div>
      </div>

      {/* 2. Transition / Change Chip */}
      <div className="flex items-center gap-2 flex-wrap">
        {trans.pillText ? (
          <Badge
            variant="outline"
            className="text-[11px] font-bold py-0.5 px-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
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
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trans.to}
            </span>
          </div>
        )}
      </div>

      {/* 3. Simple Activity Explanation */}
      {explanation && (
        <p className="font-medium text-foreground text-xs leading-relaxed line-clamp-2">
          {explanation}
        </p>
      )}

      {/* 4. Bottom Footer: Actor Profile & Tap Hint */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs mt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="size-5.5 border border-border shrink-0">
            {item.actor?.avatar && (
              <AvatarImage src={item.actor.avatar} alt={item.actor.name} />
            )}
            <AvatarFallback className="text-[9px] font-bold">
              {item.actor?.name ? item.actor.name.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-foreground text-xs truncate">
              {item.actor?.name || "System Actor"}
            </span>
            {item.actor?.role && (
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                • {item.actor.role}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-medium text-primary shrink-0">
          <span>Details</span>
          <ChevronRight className="size-3" />
        </div>
      </div>
    </div>
  );
});
