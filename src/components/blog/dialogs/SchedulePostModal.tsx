"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Undo2,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isPast,
  addHours,
  startOfTomorrow,
  startOfToday,
  setHours,
  setMinutes,
  addDays,
} from "date-fns";

export interface SchedulePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentScheduledAt?: string | Date | null;
  onConfirmSchedule: (date: Date) => Promise<boolean | void>;
  onCancelSchedule?: () => Promise<boolean | void>;
  isSubmitting?: boolean;
}

export function SchedulePostModal({
  open,
  onOpenChange,
  currentScheduledAt,
  onConfirmSchedule,
  onCancelSchedule,
  isSubmitting = false,
}: SchedulePostModalProps) {
  // Initialize date & time
  const getInitialDate = (): Date => {
    if (currentScheduledAt) {
      const d = new Date(currentScheduledAt);
      if (!isNaN(d.getTime())) return d;
    }
    // Default to tomorrow at 9:00 AM
    return setMinutes(setHours(startOfTomorrow(), 9), 0);
  };

  const [date, setDate] = useState<Date>(getInitialDate);
  const [hour, setHour] = useState<number>(() => {
    const initial = getInitialDate();
    const h = initial.getHours() % 12;
    return h === 0 ? 12 : h;
  });
  const [minute, setMinute] = useState<number>(() => {
    return Math.floor(getInitialDate().getMinutes() / 5) * 5;
  });
  const [period, setPeriod] = useState<"AM" | "PM">(() => {
    return getInitialDate().getHours() >= 12 ? "PM" : "AM";
  });

  // Sync state when modal opens or currentScheduledAt changes
  useEffect(() => {
    if (open) {
      const initial = getInitialDate();
      setDate(initial);
      const h = initial.getHours() % 12;
      setHour(h === 0 ? 12 : h);
      setMinute(Math.floor(initial.getMinutes() / 5) * 5);
      setPeriod(initial.getHours() >= 12 ? "PM" : "AM");
    }
  }, [open, currentScheduledAt]);

  // Compute final composite Date object
  const finalScheduledDate = useMemo(() => {
    let resolvedHour = hour;
    if (period === "AM" && hour === 12) resolvedHour = 0;
    if (period === "PM" && hour !== 12) resolvedHour = hour + 12;

    const composite = new Date(date);
    composite.setHours(resolvedHour);
    composite.setMinutes(minute);
    composite.setSeconds(0);
    composite.setMilliseconds(0);
    return composite;
  }, [date, hour, minute, period]);

  const isInPast = useMemo(() => {
    return finalScheduledDate.getTime() <= Date.now();
  }, [finalScheduledDate]);

  // Clean human-friendly schedule preview
  const previewText = useMemo(() => {
    if (isInPast) {
      return "Selected time is in the past. Please pick a future time.";
    }

    const timeStr = format(finalScheduledDate, "h:mm a");
    const relativeStr = formatDistanceToNow(finalScheduledDate, { addSuffix: true });

    if (isToday(finalScheduledDate)) {
      return `Today at ${timeStr} (${relativeStr})`;
    }
    if (isTomorrow(finalScheduledDate)) {
      return `Tomorrow at ${timeStr} (${relativeStr})`;
    }
    return `${format(finalScheduledDate, "MMM d, yyyy 'at' h:mm a")} (${relativeStr})`;
  }, [finalScheduledDate, isInPast]);

  // Presets
  const applyPreset = (presetDate: Date) => {
    setDate(presetDate);
    const h = presetDate.getHours() % 12;
    setHour(h === 0 ? 12 : h);
    setMinute(presetDate.getMinutes());
    setPeriod(presetDate.getHours() >= 12 ? "PM" : "AM");
  };

  const handleConfirm = async () => {
    if (isInPast) return;
    const ok = await onConfirmSchedule(finalScheduledDate);
    if (ok !== false) {
      onOpenChange(false);
    }
  };

  const isAlreadyScheduled = Boolean(currentScheduledAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-6 md:p-8 rounded-xl shadow-2xl border border-border bg-card">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                {isAlreadyScheduled ? "Reschedule Blog Post" : "Schedule Blog Post"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pick a target release date and time for automated publishing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Presets Bar */}
        <div className="pt-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-foreground">Quick Presets</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => applyPreset(addHours(new Date(), 3))}
              className="px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/80 text-xs font-medium transition-all text-center cursor-pointer hover:border-purple-500/40"
            >
              In 3 Hours
            </button>
            <button
              type="button"
              onClick={() => applyPreset(setMinutes(setHours(startOfTomorrow(), 9), 0))}
              className="px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/80 text-xs font-medium transition-all text-center cursor-pointer hover:border-purple-500/40"
            >
              Tomorrow 9:00 AM
            </button>
            <button
              type="button"
              onClick={() => applyPreset(setMinutes(setHours(startOfTomorrow(), 18), 0))}
              className="px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/80 text-xs font-medium transition-all text-center cursor-pointer hover:border-purple-500/40"
            >
              Tomorrow 6:00 PM
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset(setMinutes(setHours(addDays(startOfTomorrow(), 2), 10), 0))
              }
              className="px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/80 text-xs font-medium transition-all text-center cursor-pointer hover:border-purple-500/40"
            >
              In 2 Days
            </button>
          </div>
        </div>

        {/* Date and Time Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Calendar Picker */}
          <div className="rounded-lg border border-border p-3 bg-muted/20 flex flex-col items-center">
            <div className="text-xs font-semibold text-muted-foreground mb-1 w-full text-left px-1">
              Select Date
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) setDate(newDate);
              }}
              disabled={(d) => d < startOfToday()}
              className="rounded-md border-0"
            />
          </div>

          {/* Time Picker & Preview Panel */}
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-border p-4 bg-muted/20">
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Select Time</span>
              </div>

              {/* Time Pickers */}
              <div className="flex items-center gap-2">
                {/* Hour */}
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                    Hour
                  </label>
                  <select
                    value={hour}
                    onChange={(e) => setHour(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-lg font-bold text-muted-foreground pt-4">:</span>

                {/* Minute */}
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                    Minute
                  </label>
                  <select
                    value={minute}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AM / PM Toggle */}
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                    AM / PM
                  </label>
                  <div className="grid grid-cols-2 h-10 rounded-md border border-border bg-background p-0.5">
                    <button
                      type="button"
                      onClick={() => setPeriod("AM")}
                      className={`text-xs font-bold rounded-sm transition-all cursor-pointer ${
                        period === "AM"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriod("PM")}
                      className={`text-xs font-bold rounded-sm transition-all cursor-pointer ${
                        period === "PM"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Schedule Live Preview */}
            <div
              className={`p-3 rounded-md border transition-colors ${
                isInPast
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  : "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
              }`}
            >
              <div className="flex items-start gap-2">
                {isInPast ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                )}
                <div>
                  <p className="text-xs font-bold">
                    {isInPast ? "Invalid Schedule Time" : "Scheduled For"}
                  </p>
                  <p className="text-xs mt-0.5 font-medium">{previewText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
          <div>
            {isAlreadyScheduled && onCancelSchedule && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await onCancelSchedule();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
                className="h-10 px-4 text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Cancel Schedule (Draft)</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={isSubmitting || isInPast}
              className="h-10 px-6 text-xs font-bold gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  <span>{isAlreadyScheduled ? "Confirm Reschedule" : "Confirm Schedule"}</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
